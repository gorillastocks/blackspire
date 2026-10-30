// Hand-painted 2D monster sprites for the combat arena: camera-facing billboards that stand on the floor.
// scene.js asks `spriteFor(monster)`; when a painting exists it calls `buildSpriteMonster`, otherwise it falls back to the
// glTF model. The record it registers in `monsterObjs` keeps the same fields as a model (holder, o, height, wbox, dead ...),
// so name tags, HP bars, area flashes, attack lunges and death handling in scene.js keep working unchanged.
import { Box3, CanvasTexture, Color, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, Vector3 } from 'three';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
let manifestP = null;
/** monsters/manifest.json: { monsters: { key: {f,w,h} }, elites: { slug(title): {f,w,h} } }; null when absent (all-3D fallback). */
export function loadSpriteManifest() {
  if (!manifestP) manifestP = fetch('monsters/manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return manifestP;
}
const texCache = new Map();
function loadTexture(file) {
  if (!texCache.has(file)) texCache.set(file, new Promise((res) => {
    new TextureLoader().load(`monsters/${file}`, (t) => { t.colorSpace = SRGBColorSpace; t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter; t.anisotropy = 4; res(t); }, undefined, () => res(null));
  }));
  return texCache.get(file);
}
/** The painting for this combat monster (an elite lead has its own), with its texture; null when it is missing. */
export async function spriteFor(m) {
  if (typeof location !== 'undefined' && /[?&]sprites=0/.test(location.search)) return null; // debug/test switch: force the 3D models
  const man = await loadSpriteManifest(); if (!man) return null;
  const e = (m.elite && man.elites?.[slug(m.name)]) || man.monsters?.[m.key]; if (!e) return null;
  const tex = await loadTexture(e.f); return tex ? { ...e, tex } : null;
}
export const hasSprites = async () => !!(await loadSpriteManifest());
/** Warm the cache for the monsters a floor can show. */
export async function preloadSprites(keys) { const man = await loadSpriteManifest(); if (!man) return; await Promise.all(keys.map((k) => man.monsters?.[k] && loadTexture(man.monsters[k].f))); }

let shadowTex = null;
function blobTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (shadowTex = new CanvasTexture(c));
}

const GLSL_HEAD = 'uniform vec3 uTint; uniform float uFlash; uniform float uDis;\nfloat sprHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat sprNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(sprHash(i), sprHash(i + vec2(1,0)), f.x), mix(sprHash(i + vec2(0,1)), sprHash(i + vec2(1,1)), f.x), f.y); }\n';
const GLSL_BODY = `#include <alphatest_fragment>
 if (uDis > 0.0) { float dn = sprNoise(vMapUv * 14.0) * 0.6 + sprNoise(vMapUv * 41.0) * 0.4; float ed = dn - uDis * 1.12; if (ed < 0.0) discard; diffuseColor.rgb += vec3(1.0, 0.55, 0.2) * smoothstep(0.09, 0.0, ed) * 2.2; }
 diffuseColor.rgb = mix(diffuseColor.rgb, uTint, uFlash);`;
function spriteMaterial(tex) {
  const u = { uTint: { value: new Color(0xff2a1a) }, uFlash: { value: 0 }, uDis: { value: 0 } };
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: DoubleSide, color: 0xffffff, toneMapped: false });
  mat.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, u); sh.fragmentShader = GLSL_HEAD + sh.fragmentShader.replace('#include <alphatest_fragment>', GLSL_BODY); };
  mat.customProgramCacheKey = () => 'spr1'; mat.userData.u = u; return mat;
}

/** World size of a painting at the front rank: bigger creatures are bigger, elite leads and bosses bigger still; a manifest entry may carry `s` (a per-monster size multiplier). */
export function spriteSize(m, T, spr) {
  const aspect = spr.w / spr.h; const sz = Math.max(0.95, Math.min(1.9, Math.pow(T.size || 1, 0.5)));
  const role = T.boss ? 1.22 : m.elite ? 1.16 : T.lieutenant ? 1.08 : 1;
  const h = (SPR_BASE_H * sz * role * (spr.s || 1)) / Math.max(1, aspect * 0.75); // wide beasts are scaled down a little so they do not swamp the row
  return { w: h * aspect, h, aspect };
}
export const SPR_BASE_H = 2.3;

/** Build a sprite monster and register it in scene.monsterObjs. `lay`/`n`/`crowd` come from showMonsters (rank layout). */
export function buildSpriteMonster(scene, m, T, spr, lay, n, crowd) {
  const L = lay.sprite ? lay.pos.get(m.id) : null; const rs = L ? L.s : 1;
  let H, Wd;
  if (L) { ({ w: Wd, h: H } = spriteSize(m, T, spr)); } // painted-sprite layout: real size, rank scale applied per frame
  else { const target = T.size * crowd * (n === 1 ? 0.95 : 0.85); const aspect = spr.w / spr.h; H = target / Math.max(1, aspect * 0.7); Wd = H * aspect; } // legacy: wide beasts scaled down like their 3D models
  const mat = spriteMaterial(spr.tex);
  const geo = new PlaneGeometry(Wd, H); geo.translate(0, H / 2, 0); // origin at the feet
  const mesh = new Mesh(geo, mat); mesh.frustumCulled = false;
  const o = new Group(); o.add(mesh);
  const holder = new Group(); holder.add(o);
  const flying = !!T.flying; const { x, z } = lay.pos.get(m.id) || { x: 0, z: -2 };
  const lift = (L ? L.y : 0) + (flying ? (L ? 0.3 * H * rs : 0.9) : 0); // flyers hover; the shadow stays at the feet of their rank
  holder.position.set(x, lift, z);
  const shadow = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, opacity: flying ? 0.5 : 0.9 }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(Wd * rs * 0.85, Wd * rs * 0.28, 1); shadow.position.y = -(flying ? 0.3 * H * rs : 0) + 0.02; shadow.renderOrder = -1; holder.add(shadow);
  holder.lookAt(scene.arenaCam.position.x * 0.3, holder.position.y, scene.arenaCam.position.z);
  scene.monsterGroup.add(holder); scene.monsterGroup.updateMatrixWorld(true);
  const local = new Box3(new Vector3(-Wd * rs / 2, flying ? -0.3 * H * rs : 0, -0.12), new Vector3(Wd * rs / 2, H * rs, 0.12)); // a flier's box reaches down to its floor shadow, so the caption / plates stay clear of what is drawn // billboards face the camera, so z is small
  const wbox = local.clone().translate(holder.position);
  const rec = { id: m.id, holder, o, mixer: null, clips: {}, mats: [], dead: false, height: H * rs, wbox, spr: { mesh, mat, shadow, local, base: holder.position.clone(), phase: Math.random() * 6.28, flying, Wd, H, rs, rank: L ? L.rank : 0, lastX: x, lastZ: z, lastRs: rs } };
  scene.monsterObjs.set(m.id, rec); return rec;
}

/** Per-frame life: idle breathing/bob, red hit flash, hit shake, dissolve on death. Runs after scene.js has stepped lunge/stagger/death. */
export function updateSprites(scene, dt, t) {
  const rm = scene.reduceMotion;
  for (const [, v] of scene.monsterObjs) {
    const s = v.spr; if (!s) continue; const u = s.mat.userData.u;
    // keep the framing box glued to the holder (ranks slide forward when a front group falls)
    const p = v.holder.position; if (p.x !== s.lastX || p.z !== s.lastZ || s.rs !== s.lastRs) { s.local.min.set(-s.Wd * s.rs / 2, s.flying ? -0.3 * s.H * s.rs : 0, -0.12); s.local.max.set(s.Wd * s.rs / 2, s.H * s.rs, 0.12); v.height = s.H * s.rs; s.shadow.scale.set(s.Wd * s.rs * 0.85, s.Wd * s.rs * 0.28, 1); v.wbox.copy(s.local).translate(p); s.lastX = p.x; s.lastZ = p.z; s.lastRs = s.rs; if (!v.dead) v.wbox.min.y = Math.min(v.wbox.min.y, p.y); }
    // idle: breathing (squash & stretch from the feet) and a slow sway; flyers hover
    const ph = t * 1.9 + s.phase; const live = !v.dead;
    const amp = live ? (rm ? 0 : 1) : 0;
    s.mesh.scale.set((1 - Math.sin(ph) * 0.006 * amp) * s.rs, (1 + Math.sin(ph) * 0.016 * amp) * s.rs, 1);
    s.mesh.rotation.z = Math.sin(ph * 0.5) * 0.012 * amp;
    s.mesh.position.y = s.flying ? Math.sin(ph * 0.8) * 0.09 * s.rs * (rm ? 0.3 : 1) * (live ? 1 : 0) : 0;
    // hit: red flash (spells flash in their own colour) + a quick horizontal shake
    const f = v.flash > 0 ? v.flash : 0;
    if (f > 0) { const spell = v.flashColor !== 0xffffff && v.flashColor !== 0xffee55; if (spell) u.uTint.value.setHex(v.flashColor); else u.uTint.value.setHex(0xff2a1a); u.uFlash.value = Math.min(1, f * 4.5) * (spell ? 0.55 : v.flashColor === 0xffee55 ? 0.85 : 0.7); } else u.uFlash.value = 0;
    s.mesh.position.x = v.stagger > 0 && !rm ? Math.sin(t * 70) * 0.07 * s.rs * Math.min(1, v.stagger * 3) : 0;
    // death: noisy dissolve with an ember edge (plain fade under Reduce motion)
    if (v.dead && v.dieT !== undefined) {
      const k = Math.min(1, v.dieT / v.dieDur), d = k > v.dissolveAt ? (k - v.dissolveAt) / (1 - v.dissolveAt) : 0;
      if (rm) { u.uDis.value = 0; s.mat.opacity = 1 - d; } else u.uDis.value = d;
      s.shadow.material.opacity = Math.max(0, 0.9 * (1 - k * 1.4));
      if (k < v.dissolveAt) { u.uFlash.value = Math.max(u.uFlash.value, 0.45 * (1 - k / v.dissolveAt)); u.uTint.value.setHex(0xff2a1a); }
    }
  }
}
export function disposeSprite(v) { const s = v.spr; if (!s) return; s.mesh.geometry.dispose(); s.mat.dispose(); s.shadow.geometry.dispose(); s.shadow.material.dispose(); }
