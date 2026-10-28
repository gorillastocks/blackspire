// Three.js renderer: neon-wireframe-era dungeon in modern PBR 3D, plus a combat arena with animated glTF monsters.
import { Shape, Path, ShapeGeometry, ACESFilmicToneMapping, AdditiveBlending, AnimationMixer, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Clock, Color, CylinderGeometry, DirectionalLight, DoubleSide, EdgesGeometry, Float32BufferAttribute, Fog, FogExp2, GridHelper, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, LoopOnce, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PMREMGenerator, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, PolarGridHelper, RepeatWrapping, RingGeometry, SRGBColorSpace, Scene, SphereGeometry, SpotLight, Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget, HalfFloatType } from 'three';
import { FX, SPELL_FX, IMPACT } from './fx.js';
const THREE = { Shape, Path, ShapeGeometry, WebGLRenderTarget, HalfFloatType, ACESFilmicToneMapping, AdditiveBlending, AnimationMixer, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Clock, Color, CylinderGeometry, DirectionalLight, DoubleSide, EdgesGeometry, Float32BufferAttribute, Fog, FogExp2, GridHelper, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, LoopOnce, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PMREMGenerator, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, PolarGridHelper, RepeatWrapping, RingGeometry, SRGBColorSpace, Scene, SphereGeometry, SpotLight, Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3, WebGLRenderer };
// three.js addons are lazy-loaded (separate chunks) so the first paint only needs three core.
let SkeletonUtils = null;
let loaderP = null;
function getLoader() {
  if (!loaderP) loaderP = Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/utils/SkeletonUtils.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')])
    .then(([{ GLTFLoader }, SU, { MeshoptDecoder }]) => { SkeletonUtils = SU; const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l; });
  return loaderP;
}
import { W, H, DIRS } from '../dungeon/levels.js';
import { inRegion } from '../dungeon/outdoor.js';
import { Outdoor } from './outdoor.js';
import { ANIM_SLOW } from '../menu.js';
import { MONSTERS } from '../rules/data.js';

const CELL = 2, WALL_H = 2.6;
const gltfCache = {};
export function loadModel(name) {
  // retry with backoff: GitHub Pages' CDN occasionally answers 503 right after a deploy
  const attempt = (loader, n) => new Promise((res) => loader.load(`models/${name}.glb`, res, undefined, (e) => {
    if (n < 3) setTimeout(() => attempt(loader, n + 1).then(res), 600 * 2 ** n);
    else { console.warn('model load failed', name, e?.message); res(null); }
  }));
  if (!gltfCache[name]) gltfCache[name] = getLoader().then((loader) => attempt(loader, 0));
  return gltfCache[name];
}
export function preloadSome(keys) { return Promise.all(keys.map((k) => loadModel(MONSTERS[k]?.model || k))); }
export function preloadAll() { const names = new Set([...Object.values(MONSTERS).map((m) => m.model), 'Chest', 'Torch_wall']); return Promise.all([...names].map(loadModel)); }

function canvasTex(w, h, draw, repeat = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; return t;
}
function noise(g, w, h, a = 30) { const d = g.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) { const n = (Math.random() - 0.5) * a; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; } g.putImageData(d, 0, 0); }
const stoneTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4a4458'; g.fillRect(0, 0, w, h);
  const bh = 32; for (let y = 0; y < h; y += bh) { const off = (y / bh) % 2 ? 32 : 0; for (let x = -64; x < w; x += 64) { const s = 70 + Math.random() * 30; g.fillStyle = `rgb(${s},${s - 6},${s + 12})`; g.fillRect(x + off + 2, y + 2, 60, bh - 4); } }
  noise(g, w, h, 26);
});
const floorTex = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#2b2733'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const s = 44 + Math.random() * 22; g.fillStyle = `rgb(${s},${s - 4},${s + 8})`; g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60); }
  noise(g, w, h, 22);
});
const bumpFrom = (t) => t;

export class Renderer {
  constructor(container) {
    this.container = container;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.outputColorSpace = THREE.SRGBColorSpace; r.shadowMap.enabled = false;
    container.appendChild(r.domElement);
    this.clock = new THREE.Clock(); this.mixers = [];
    // Dungeon scene
    this.scene = new THREE.Scene(); this.scene.environmentIntensity = 0.25;
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60);
    this.scene.add(this.camera);
    this.torch = new THREE.PointLight(0xffb36b, 30, 14, 1.6); this.torch.position.set(0.25, 0.2, 0.1); this.camera.add(this.torch);
    this.hemi = new THREE.HemisphereLight(0x6c7cff, 0x221122, 0.35); this.scene.add(this.hemi); this.torchK = 1; this.steps = 0; this.outdoor = null;
    this.levelGroup = new THREE.Group(); this.scene.add(this.levelGroup);
    this.dyn = new THREE.Group(); this.scene.add(this.dyn); this.eliteObjs = new Map(); this.shimmerObjs = new Map(); // Phase B: moving elites and wall shimmers live outside the static level
    this.wallMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.85, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    this.floorMat = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.7, metalness: 0.1 });
    this.ceilMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95, color: 0x5a5470 });
    this.dust = this.makeDust(); this.scene.add(this.dust);
    // Arena scene for combat
    this.arena = new THREE.Scene(); this.arena.environmentIntensity = 0.6;
    this.arenaCam = new THREE.PerspectiveCamera(50, 1, 0.1, 100); this.arenaCam.position.set(0, 2.1, 5.2); this.arenaCam.lookAt(0, 1.3, -2);
    this.buildArena();
    this.cfx = new FX(this.arena, this.arenaCam); this.speedF = 1; this.reduceMotion = false; this.aShake = 0; this.aBump = 0;
    // Post-processing
    this.composer = null; this.ready = this.initPost();
    this.mode = 'dungeon'; this.monsterObjs = new Map(); this.fx = [];
    this.camPos = new THREE.Vector3(); this.camYaw = 0; this.targetPos = new THREE.Vector3(); this.targetYaw = 0;
    window.addEventListener('resize', () => this.resize()); if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(container); this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (!document.body.classList.contains('titlescreen')) this.update(); }; loop();
  }
  async initPost() {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { RoomEnvironment }] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'), import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'), import('three/examples/jsm/postprocessing/OutputPass.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js')]);
    const r = this.renderer; const pm = new THREE.PMREMGenerator(r); this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.scene.environment = this.envTex; this.arena.environment = this.envTex;
    const c = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    this.renderPass = new RenderPass(this.scene, this.camera); c.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.65, 0.45, 0.85); c.addPass(this.bloom);
    c.addPass(new OutputPass()); this.composer = c; this.setMode(this.mode); this.resize();
  }
  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.composer?.setSize(w, h);
    for (const c of [this.camera, this.arenaCam]) { c.aspect = w / h; c.updateProjectionMatrix(); }
    this.arenaCam.fov = Math.min(72, Math.max(50, 50 * 1.45 / (w / h))); this.arenaCam.updateProjectionMatrix(); if (this.monsterObjs?.size) this.fitArena(); // keep the whole monster line in frame on narrow views
    this.onResize?.(); // let the UI re-place overlays that follow the monsters
  }
  makeDust() {
    const g = new THREE.BufferGeometry(); const n = 400; const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = Math.random() * W * CELL; p[i * 3 + 1] = Math.random() * WALL_H; p[i * 3 + 2] = Math.random() * H * CELL; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.03, color: 0xffd9a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  }

  /* ---------- Dungeon ---------- */
  async buildLevel(s, tileFn, def, reg = null) {
    const grp = this.levelGroup; grp.clear(); this.outdoor = null; this.torchK = 1; this.scene.environmentIntensity = 0.25; this.hemi.color.set(0x6c7cff); this.hemi.groundColor.set(0x221122); this.hemi.intensity = 0.35; this.torches = []; this.animated = []; this.clearDynamic();
    const color = new THREE.Color(def.color);
    this.scene.fog = new THREE.FogExp2(def.fog, 0.075); this.scene.background = new THREE.Color(def.fog);
    this.edgeMat = new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(0.8), toneMapped: false, fog: false }); // steady: opaque, no fog fade, kept under the bloom threshold so it doesn't pump
    const walls = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = tileFn(x, y);
      if (ch === '#' || ch === 'S') {
        // only walls touching open space
        if (!DIRS.some(([dx, dy]) => { const n = tileFn(x + dx, y + dy); return n !== '#' && n !== 'S' && x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H; })) continue;
        if (reg && inRegion(reg, x, y)) continue; // Phase E: the open-air window draws its own trees, rocks and cliffs
        walls.push([x, y]);
      }
    }
    const box = new THREE.BoxGeometry(CELL, WALL_H, CELL);
    const inst = new THREE.InstancedMesh(box, this.wallMat, walls.length); const m = new THREE.Matrix4();
    const edgePos = []; const eg = new THREE.EdgesGeometry(box); const ea = eg.attributes.position.array;
    walls.forEach(([x, y], i) => { m.makeTranslation(x * CELL, WALL_H / 2, y * CELL); inst.setMatrixAt(i, m); for (let k = 0; k < ea.length; k += 3) edgePos.push(ea[k] * 1.004 + x * CELL, ea[k + 1] * 1.002 + WALL_H / 2, ea[k + 2] * 1.004 + y * CELL); });
    grp.add(inst);
    const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3)); grp.add(new THREE.LineSegments(eGeo, this.edgeMat));
    // floor & ceiling with neon grid
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), this.floorMat); fl.material.map.repeat.set(W / 2, H / 2);
    fl.rotation.x = -Math.PI / 2; fl.position.set((W - 1) * CELL / 2, 0, (H - 1) * CELL / 2); grp.add(fl);
    let ce;
    if (reg) { // Phase E: same ceiling, with a rectangular hole where the roof has fallen in
      const x0 = -CELL / 2 - 1, x1 = W * CELL - CELL / 2 + 1, z0 = -CELL / 2 - 1, z1 = H * CELL - CELL / 2 + 1;
      const hx0 = reg.x0 * CELL - CELL / 2, hx1 = (reg.x1 + 1) * CELL - CELL / 2, hz0 = reg.y0 * CELL - CELL / 2, hz1 = (reg.y1 + 1) * CELL - CELL / 2;
      const sh = new THREE.Shape([new THREE.Vector2(x0, z0), new THREE.Vector2(x1, z0), new THREE.Vector2(x1, z1), new THREE.Vector2(x0, z1)]);
      sh.holes.push(new THREE.Path([new THREE.Vector2(hx0, hz0), new THREE.Vector2(hx0, hz1), new THREE.Vector2(hx1, hz1), new THREE.Vector2(hx1, hz0)]));
      const g = new THREE.ShapeGeometry(sh); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + CELL / 2) / (W * CELL), (p.getY(i) + CELL / 2) / (H * CELL));
      g.rotateX(Math.PI / 2); ce = new THREE.Mesh(g, this.ceilMat); ce.material.map.repeat.set(W / 2, H / 2); ce.position.set(0, WALL_H, 0); grp.add(ce);
    } else {
      ce = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), this.ceilMat); ce.material.map.repeat.set(W / 2, H / 2);
      ce.rotation.x = Math.PI / 2; ce.position.set((W - 1) * CELL / 2, WALL_H, (H - 1) * CELL / 2); grp.add(ce);
    }
    const grid = new THREE.GridHelper(W * CELL, W, color, color); grid.material.transparent = true; grid.material.opacity = 0.18; grid.material.toneMapped = false;
    grid.position.set((W - 1) * CELL / 2, 0.005, (H - 1) * CELL / 2); grid.position.x -= 0; grp.add(grid);
    grid.position.x = (W * CELL) / 2 - CELL / 2; grid.position.z = (H * CELL) / 2 - CELL / 2;
    // features
    const chest = await loadModel('Chest'); const torch = await loadModel('Torch_wall');
    const glow = (c, i = 2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 });
    let torchCount = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = tileFn(x, y); const px = x * CELL, pz = y * CELL;
      const add = (o, yy = 0) => { o.position.set(px, yy, pz); grp.add(o); return o; };
      if (ch === 'D' || ch === 'd' || ch === 'L') {
        const ns = tileFn(x, y - 1) !== '#' && tileFn(x, y + 1) !== '#'; // corridor runs N-S -> door spans E-W
        const g = new THREE.Group(); add(g);
        const frameMat = glow(ch === 'L' ? 0xff3050 : def.color, ch === 'L' ? 0.6 : 0.5);
        const postG = new THREE.BoxGeometry(0.12, WALL_H, 0.25);
        const p1 = new THREE.Mesh(postG, frameMat); p1.position.set(-CELL / 2 + 0.06, WALL_H / 2, 0); g.add(p1);
        const p2 = p1.clone(); p2.position.x = CELL / 2 - 0.06; g.add(p2);
        const lint = new THREE.Mesh(new THREE.BoxGeometry(CELL, 0.12, 0.25), frameMat); lint.position.y = WALL_H - 0.06; g.add(lint);
        if (ch !== 'd') {
          const door = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.24, WALL_H - 0.12, 0.12), new THREE.MeshStandardMaterial({ color: ch === 'L' ? 0x5a2a2a : 0x6b4424, roughness: 0.6, metalness: ch === 'L' ? 0.6 : 0.1 }));
          door.position.y = (WALL_H - 0.12) / 2; g.add(door);
          if (ch === 'L') { const lock = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), glow(0xffcc00, 3)); lock.position.set(0, 1.1, 0.1); g.add(lock); const lock2 = lock.clone(); lock2.position.z = -0.1; g.add(lock2); }
        }
        if (!ns) g.rotation.y = 0; else g.rotation.y = 0; // door faces along corridor axis
        g.rotation.y = ns ? 0 : Math.PI / 2;
      } else if ((ch === 'C' || ch === 'o') && chest) {
        const o = SkeletonUtils.clone(chest.scene); o.scale.setScalar(0.55); add(o);
        o.rotation.y = this.faceOpen(tileFn, x, y);
        const mx = new THREE.AnimationMixer(o); const clip = chest.animations.find((a) => /Open/.test(a.name));
        if (ch === 'o' && clip) { const a = mx.clipAction(clip); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play(); mx.update(5); }
        this.chestMixers = this.chestMixers || {}; this.chestMixers[`${x},${y}`] = { mx, clip };
        this.mixers.push(mx);
        const l = new THREE.PointLight(0xffc040, 4, 3, 2); l.position.set(0, 1, 0); o.add(l);
      } else if (ch === '>' || ch === '<') {
        const down = ch === '>';
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 40), glow(down ? 0x40ffd0 : 0x80a0ff, 3)); ring.rotation.x = -Math.PI / 2; add(ring, 0.03);
        if (down) { const hole = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.rotation.x = -Math.PI / 2; add(hole, 0.02); }
        else for (let i = 0; i < 5; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), this.wallMat); st.position.set(px, 0.09 + i * 0.36, pz - 0.6 + i * 0.3); grp.add(st); }
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, WALL_H, 24, 1, true), new THREE.MeshBasicMaterial({ color: down ? 0x40ffd0 : 0x80a0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); add(beam, WALL_H / 2);
        this.animated.push({ obj: ring, spin: 0.5 });
      } else if (ch === 'B') {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.85, 6), glow(0xff2040, 3)); ring.rotation.x = -Math.PI / 2; add(ring, 0.03); this.animated.push({ obj: ring, spin: -0.8 });
        const l = new THREE.PointLight(0xff2040, 6, 6, 2); add(l, 1);
      } else if (ch === 'F' || ch === 'f') {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.5, 24), this.wallMat); add(basin, 0.25);
        const water = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), glow(ch === 'F' ? 0x30a0ff : 0x203040, ch === 'F' ? 2.5 : 0.3)); water.rotation.x = -Math.PI / 2; add(water, 0.51);
      } else if (ch === 'A') {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1, 8), this.wallMat); add(ped, 0.5);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), glow(0xffd040, 4)); add(gem, 1.35); this.animated.push({ obj: gem, spin: 1.5, bob: true });
      } else if (ch === 'K') {
        const key = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 8, 16), glow(0xffd040, 3)); add(key, 1.0); this.animated.push({ obj: key, spin: 2, bob: true });
      } else if (ch === 'M') {
        const rune = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.3, 5), glow(0xb060ff, 2.5)); rune.rotation.x = -Math.PI / 2; add(rune, 0.03); this.animated.push({ obj: rune, spin: 0.6 });
      } else if (ch === 'Q') {
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), glow(0xffd77a, 3.5)); add(orb, 1.1); this.animated.push({ obj: orb, spin: 1.2, bob: true });
      } else if (ch === 'N') {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.18), this.wallMat); add(slab, 0.6);
        const rune = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.28, 6), glow(0xffd77a, 3)); rune.position.set(0, 0.8, 0.1); slab.add(rune); this.animated.push({ obj: rune, spin: 0.9 });
        const pl = new THREE.PointLight(0xffd77a, 3, 4, 2); pl.position.set(0, 1.2, 0.4); slab.add(pl);
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 24), glow(0xffd77a, 2)); ring.rotation.x = -Math.PI / 2; add(ring, 0.03); this.animated.push({ obj: ring, spin: 0.4 });
      } else if (ch === 't') {
        const xg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), glow(0xff3030, 1.5)); xg.rotation.set(-Math.PI / 2, 0, Math.PI / 4); add(xg, 0.02);
        const xg2 = xg.clone(); xg2.rotation.z = -Math.PI / 4; add(xg2, 0.02);
      }
      // wall torches on some corridor walls
      if (torch && ch !== '#' && ch !== 'S' && !(reg && inRegion(reg, x, y)) && (x * 7 + y * 13) % 11 === 0 && torchCount < 14) {
        for (const [d, [dx, dy]] of DIRS.entries()) {
          if (tileFn(x + dx, y + dy) !== '#') continue;
          const t = torch.scene.clone(); t.scale.setScalar(0.8); t.position.set(px + dx * (CELL / 2 - 0.05), 1.4, pz + dy * (CELL / 2 - 0.05)); t.rotation.y = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][d] + Math.PI; grp.add(t);
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glow(0xff9020, 6)); flame.position.set(px + dx * (CELL / 2 - 0.25), 1.75, pz + dy * (CELL / 2 - 0.25)); grp.add(flame);
          if (torchCount < 8) { const l = new THREE.PointLight(0xff8a30, 6, 5, 2); l.position.copy(flame.position); grp.add(l); this.torches.push(l); }
          torchCount++; break;
        }
      }
    }
    if (reg) { this.outdoor = new Outdoor({ reg, tileFn, CELL, WALL_H, W, H, wallMat: this.wallMat, indoorFog: def.fog }); this.outdoor.reduce = this.reduceMotion; grp.add(this.outdoor.group); }
  }
  /* ---------- Phase B: wall shimmers and telegraphed elites ---------- */
  clearDynamic() {
    for (const o of this.eliteObjs?.values() || []) { if (o.mixer) this.mixers = this.mixers.filter((m) => m !== o.mixer); }
    this.dyn?.clear(); this.eliteObjs = new Map(); this.shimmerObjs = new Map(); this.evObjs = new Map();
    this._dynGen = (this._dynGen | 0) + 1; this._eliteLoading = new Set(); // an elite still loading for the old floor must not appear on the new one
  }
  shimmerTex() {
    if (this._shTex) return this._shTex;
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,226,122,0)'); gr.addColorStop(0.5, 'rgba(255,190,80,0.4)'); gr.addColorStop(1, 'rgba(255,226,122,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
    g.strokeStyle = 'rgba(255,215,130,0.7)'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(4 + i * 13, 128); g.lineTo(14 + i * 13, 0); g.stroke(); }
    g.fillStyle = 'rgba(255,240,190,0.85)'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('?', 32, 76);
    const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; this._shTex = tx; return tx;
  }
  iconSprite(ch, color, size = 0.75) {
    const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
    g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color; g.font = '64px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 48, 52);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, toneMapped: false })); sp.scale.set(size, size, 1); return sp;
  }
  /** Phase C: a floating, softly pulsing glyph over each open story event ({id,x,y,icon,color}). */
  syncEvents(list = []) {
    if (!this.dyn) return; const m = (this.evObjs ||= new Map()); const want = new Set(list.map((e) => e.id));
    for (const [id, o] of m) if (!want.has(id)) { this.dyn.remove(o.sp); m.delete(id); }
    for (const e of list) {
      if (m.has(e.id)) continue; const sp = this.iconSprite(e.icon || '✦', e.color || '#ffd77a', 0.8);
      sp.position.set(e.x * CELL, 1.15, e.y * CELL); this.dyn.add(sp); m.set(e.id, { sp });
    }
  }
  /** Sync flagged secret walls ({x,y} cells still solid) and live elites ({id,kind,title,key,x,y}). */
  async syncDynamic(tileFn, suspects = [], elites = []) {
    if (!this.dyn) return;
    const want = new Set(suspects.map(([x, y]) => `${x},${y}`));
    for (const [k, o] of this.shimmerObjs) if (!want.has(k)) { this.dyn.remove(o.grp); this.shimmerObjs.delete(k); }
    for (const [x, y] of suspects) {
      const k = `${x},${y}`; if (this.shimmerObjs.has(k)) continue;
      const grp = new THREE.Group(); grp.position.set(x * CELL, 0, y * CELL);
      const mat = new THREE.MeshBasicMaterial({ map: this.shimmerTex(), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      for (const [d, [dx, dy]] of DIRS.entries()) {
        const n = tileFn(x + dx, y + dy); if (n === '#' || n === 'S' || x + dx < 0 || y + dy < 0 || x + dx >= W || y + dy >= H) continue;
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(CELL * 0.96, WALL_H * 0.96), mat); pl.position.set(dx * (CELL / 2 + 0.03), WALL_H / 2, dy * (CELL / 2 + 0.03)); pl.rotation.y = Math.atan2(dx, dy); grp.add(pl);
      }
      this.dyn.add(grp); this.shimmerObjs.set(k, { grp, mat });
    }
    const alive = new Set(elites.map((e) => e.id));
    for (const [id, o] of this.eliteObjs) if (!alive.has(id)) { this.dyn.remove(o.holder); if (o.mixer) this.mixers = this.mixers.filter((m) => m !== o.mixer); this.eliteObjs.delete(id); }
    const gen = this._dynGen | 0; this._eliteWant = new Map(elites.map((e) => [e.id, e]));
    for (const e of elites) {
      let o = this.eliteObjs.get(e.id);
      if (!o) {
        if (this._eliteLoading?.has(e.id)) continue; const loading = (this._eliteLoading ||= new Set()); loading.add(e.id);
        try { o = await this.makeElite(e); } catch { o = null; } // a model that fails to load still gets its red marker
        if (gen !== (this._dynGen | 0)) { if (o) this.disposeElite?.(o); continue; } // the floor changed while loading: drop it
        loading.delete(e.id); if (!o) continue;
        const cur = this._eliteWant?.get(e.id); if (!cur) continue; // no longer alive / no longer on this floor
        this.eliteObjs.set(e.id, o); this.dyn.add(o.holder); o.holder.position.set(cur.x * CELL, 0, cur.y * CELL); o.target.set(cur.x * CELL, 0, cur.y * CELL); continue;
      }
      o.target.set(e.x * CELL, 0, e.y * CELL);
    }
  }
  disposeElite(o) { if (o?.mixer) this.mixers = this.mixers.filter((m) => m !== o.mixer); }
  async makeElite(e) {
    const T = MONSTERS[e.key]; const g = T ? await loadModel(T.model).catch(() => null) : null; const holder = new THREE.Group(); const target = new THREE.Vector3();
    let mixer = null, h = 1.6;
    if (g) {
      const o = SkeletonUtils.clone(g.scene); const mats = [];
      o.traverse((ch) => { if (ch.isMesh) { ch.material = ch.material.clone(); ch.frustumCulled = false; if (T.tint) ch.material.color.lerp(new THREE.Color(T.tint), 0.4); if (ch.material.emissive) { ch.material.emissive.set(0xff3010); ch.material.emissiveIntensity = 0.28; } mats.push(ch.material); } });
      o.updateMatrixWorld(true); const bb = new THREE.Box3(); const v = new THREE.Vector3();
      o.traverse((ch) => { if (!ch.isMesh) return; if (ch.isSkinnedMesh) ch.skeleton.update(); const pos = ch.geometry.attributes.position; const step = Math.max(1, Math.floor(pos.count / 1500)); for (let k = 0; k < pos.count; k += step) { if (ch.isSkinnedMesh) ch.getVertexPosition(k, v); else v.fromBufferAttribute(pos, k); v.applyMatrix4(ch.matrixWorld); if (Number.isFinite(v.x + v.y + v.z)) bb.expandByPoint(v); } if (ch.isSkinnedMesh) { ch.boundingBox = null; ch.boundingSphere = null; } });
      const size = bb.getSize(new THREE.Vector3()); h = Math.min(1.9, Math.max(1.0, (T.size || 1.5) * 0.8));
      const sc = h / Math.max(size.y, size.x * 0.7, size.z * 0.6, 0.01); o.scale.setScalar(sc); o.position.y = -bb.min.y * sc; if (T.flying) o.position.y += 0.6;
      holder.add(o); mixer = new THREE.AnimationMixer(o); this.mixers.push(mixer);
      const idle = g.animations.find((a) => /Idle$|Idle(?!_2)|Flying|Swim/i.test(a.name)) || g.animations[0]; if (idle) { const a = mixer.clipAction(idle); a.time = Math.random() * 2; a.play(); }
    }
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 40), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide }));
    aura.rotation.x = -Math.PI / 2; aura.position.y = 0.04; holder.add(aura);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, WALL_H, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff4020, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); beam.position.y = WALL_H / 2; holder.add(beam);
    const light = new THREE.PointLight(0xff4020, 7, 7, 2); light.position.y = 1.2; holder.add(light);
    const icon = this.iconSprite('☠', '#ff5a3a', 0.8); icon.position.y = h + 0.55; holder.add(icon);
    return { holder, target, mixer, aura, icon, light, h, heading: 0, prev: new THREE.Vector3() };
  }
  faceOpen(tileFn, x, y) { for (const [d, [dx, dy]] of DIRS.entries()) if (!['#', 'S'].includes(tileFn(x + dx, y + dy))) return [Math.PI, Math.PI / 2, 0, -Math.PI / 2][d]; return 0; }
  openChestAnim(x, y) { const c = this.chestMixers?.[`${x},${y}`]; if (c?.clip) { const a = c.mx.clipAction(c.clip); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play(); } }
  setView(x, y, dir, instant = false) {
    this.targetPos.set(x * CELL, 1.25, y * CELL);
    let yaw = -dir * Math.PI / 2; // N = looking -z
    while (yaw - this.camYaw > Math.PI) yaw -= Math.PI * 2; while (yaw - this.camYaw < -Math.PI) yaw += Math.PI * 2;
    this.targetYaw = yaw;
    if (instant) { this.camPos.copy(this.targetPos); this.camYaw = yaw; }
  }
  bump() { this.bumpT = 0.25; }
  shake() { this.shakeT = 0.5; }

  /* ---------- Combat arena ---------- */
  buildArena() {
    const a = this.arena; a.background = new THREE.Color(0x07040f); a.fog = new THREE.Fog(0x07040f, 8, 22);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x1a1428, roughness: 0.35, metalness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -2; a.add(floor);
    this.arenaRing = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: 0x22e6ff, toneMapped: false })); this.arenaRing.rotation.x = -Math.PI / 2; this.arenaRing.position.set(0, 0.02, -2); a.add(this.arenaRing);
    const grid = new THREE.PolarGridHelper(9, 16, 8, 64, 0x3a2a6a, 0x3a2a6a); grid.position.set(0, 0.01, -2); a.add(grid);
    a.add(new THREE.HemisphereLight(0x99aaff, 0x331133, 0.9));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.4); key.position.set(2, 6, 6); a.add(key);
    const rimL = new THREE.SpotLight(0xff30c0, 60, 20, 0.6, 0.5); rimL.position.set(-5, 5, -6); rimL.target.position.set(0, 0, -2); a.add(rimL, rimL.target);
    const rimR = new THREE.SpotLight(0x30e0ff, 60, 20, 0.6, 0.5); rimR.position.set(5, 5, -6); rimR.target.position.set(0, 0, -2); a.add(rimR, rimR.target);
    // pillars with neon
    for (let i = 0; i < 8; i++) { const ang = Math.PI * (0.1 + 0.8 * i / 7); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 6, 8), new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.9 })); p.position.set(Math.cos(ang) * 8, 3, -2 - Math.sin(ang) * 7); a.add(p); const band = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff40d0 : 0x40e0ff, toneMapped: false })); band.rotation.x = Math.PI / 2; band.position.copy(p.position); band.position.y = 2.2; a.add(band); }
    this.monsterGroup = new THREE.Group(); a.add(this.monsterGroup);
    const sp = new THREE.BufferGeometry(); const n = 300; const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = -Math.random() * 12 + 2; }
    sp.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const spm = new THREE.PointsMaterial({ size: 0.05, color: 0xff80ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    // Points are screen-aligned squares whose size grows as 1/distance: a spark drifting past the camera became a big flat pink square.
    // Make them round, cap their pixel size, and fade out any spark closer than ~1.5 units.
    spm.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <fog_vertex>', '#include <fog_vertex>\n gl_PointSize = min(gl_PointSize, 6.0); vNear = smoothstep(0.6, 2.0, -mvPosition.z);').replace('void main() {', 'varying float vNear;\nvoid main() {');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying float vNear;\nvoid main() {\n if (length(gl_PointCoord - 0.5) > 0.5) discard;').replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.a *= vNear;');
    };
    this.sparks = new THREE.Points(sp, spm); a.add(this.sparks);
  }
  async showMonsters(monsters, themeColor = 0x22e6ff) {
    this.clearMonsters(); this.arenaRing.material.color.set(themeColor);
    const n = monsters.length; const width = Math.min(9, 2.6 * n); const crowd = n > 3 ? 3 / n + 0.15 : 1;
    await Promise.all(monsters.map(async (m, i) => {
      const T = MONSTERS[m.key]; const g = await loadModel(T.model); if (!g) return;
      const o = SkeletonUtils.clone(g.scene);
      const mats = [];
      o.traverse((ch) => { if (ch.isMesh) { ch.material = ch.material.clone(); ch.frustumCulled = false; if (T.tint) ch.material.color.lerp(new THREE.Color(T.tint), 0.55); ch.material.roughness = Math.min(ch.material.roughness ?? 0.6, 0.55); ch.material.metalness = Math.max(ch.material.metalness ?? 0, 0.08); ch.material.envMapIntensity = 1; ch.material.emissive = ch.material.color.clone().multiplyScalar(0.08); mats.push(ch.material); } });
      const measure = () => { // robust box: skips NaN verts (some skinned GLBs have zero-weight verts)
        o.updateMatrixWorld(true); const bb = new THREE.Box3(); const v = new THREE.Vector3();
        o.traverse((ch) => { if (!ch.isMesh) return; if (ch.isSkinnedMesh) ch.skeleton.update(); const pos = ch.geometry.attributes.position; const step = Math.max(1, Math.floor(pos.count / 2000));
          for (let k = 0; k < pos.count; k += step) { if (ch.isSkinnedMesh) ch.getVertexPosition(k, v); else v.fromBufferAttribute(pos, k); v.applyMatrix4(ch.matrixWorld); if (Number.isFinite(v.x + v.y + v.z)) bb.expandByPoint(v); }
          if (ch.isSkinnedMesh) { ch.boundingBox = null; ch.boundingSphere = null; } });
        return bb; };
      const box = measure(); const size = box.getSize(new THREE.Vector3());
      const target = T.size * crowd * (n === 1 ? 0.95 : 0.85);
      const sc = target / Math.max(size.y, size.x * 0.6, size.z * 0.5); o.scale.setScalar(sc);
      const holder = new THREE.Group(); holder.add(o);
      const x = n === 1 ? 0 : -width / 2 + (width * i) / (n - 1); const z = -2 - (i % 2) * 0.8 - (T.boss ? 1 : 0);
      holder.position.set(x, T.flying ? 0.9 : 0, z);
      const box2 = measure(); o.position.y -= box2.min.y; // feet on ground
      holder.lookAt(this.arenaCam.position.x * 0.3, holder.position.y, this.arenaCam.position.z);
      this.monsterGroup.add(holder);
      const mixer = new THREE.AnimationMixer(o); this.mixers.push(mixer);
      const find = (re) => g.animations.find((a) => re.test(a.name));
      const clips = { idle: find(/Idle$|Idle(?!_2)|Flying|Swim/i) || g.animations[0], attack: find(/Attack|Bite_Front|Bite|Punch|Headbutt/i), death: find(/Death|Dead/i), hit: find(/Hit|Jump/i) };
      if (clips.idle) { const a = mixer.clipAction(clips.idle); a.time = Math.random() * 2; a.play(); }
      this.monsterGroup.updateMatrixWorld(true); const wbox = measure(); // world-space bounds, for keeping UI clear of the monsters
      // include the attack/hit poses (e.g. Gorvax rearing up), so framing keeps the whole animation inside the view
      for (const nm of ['attack', 'hit']) { const cl = clips[nm]; if (!cl || cl === clips.idle) continue; const act = mixer.clipAction(cl); act.reset().play(); act.setEffectiveWeight(1);
        if (clips.idle) mixer.clipAction(clips.idle).setEffectiveWeight(0);
        for (let k = 0; k <= 8; k++) { act.time = (cl.duration * k) / 8; mixer.update(0); this.monsterGroup.updateMatrixWorld(true); const bb = measure(); if (!bb.isEmpty()) wbox.union(bb); }
        act.stop(); if (clips.idle) mixer.clipAction(clips.idle).setEffectiveWeight(1); }
      mixer.update(0);
      this.monsterObjs.set(m.id, { id: m.id, holder, o, mixer, clips, mats, dead: false, height: target, wbox });
    }));
    this.fitArena();
  }
  /** Frame the arena camera so every monster sits in the upper part of the view, leaving a clear band at the
   *  bottom for the narration caption (captionReservePx tall, between 24% and 62% of the view). */
  fitArena() {
    const cam = this.arenaCam; const h = this.container.clientHeight || 1; const w = this.container.clientWidth || 1;
    const base = new THREE.Vector3(0, 2.1, 5.2), look = new THREE.Vector3(0, 1.3, -2); this.arenaLook = look;
    const phonePortrait = window.innerWidth <= 760 && window.innerHeight > window.innerWidth; // there the view itself grows while a caption is up
    const reserve = phonePortrait && !this.captionUp ? 0.1 : Math.min(0.62, Math.max(0.24, (this.captionReservePx || (w < 520 ? 150 : 140)) / h)); // no caption up: just room for floaters
    const hud = this.container.querySelector('#hud'), top = Math.max(3, hud && hud.offsetHeight ? ((hud.offsetTop + hud.offsetHeight) / h) * 100 + 1 : 3), limit = 100 * (1 - reserve) - 2;
    cam.clearViewOffset(); let k = 1; this._co?.set(0, 0, 0);
    // never dolly in so far that the padded monster box reaches the camera: points behind it project mirrored, the fit then
    // "sees" a gigantic/flipped rect and throws the whole picture off the top of the screen (tall phone view, no menu yet)
    let nearZ = -Infinity; for (const [, v] of this.monsterObjs) { if (v.dead || !v.wbox || v.wbox.isEmpty()) continue; const sz = v.wbox.getSize(new THREE.Vector3()); nearZ = Math.max(nearZ, v.wbox.max.z + sz.z * 0.1 + 0.4); }
    const kMin = Number.isFinite(nearZ) ? Math.min(1.5, Math.max(0.4, (nearZ + 2.2 - look.z) / (base.z - look.z))) : 0.4;
    for (let i = 0; i < 8; i++) {
      cam.position.copy(look).addScaledVector(base.clone().sub(look), k); cam.lookAt(look); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const r = this.monsterRect(); if (!r) break;
      const span = r.bottom - r.top, avail = limit - top, wide = (r.right - r.left) / 90, half = Math.max(50 - r.left, r.right - 50) / 45;
      const need = Math.max(span / avail, wide, half); if (Math.abs(need - 0.97) < 0.03) break;
      const nk = Math.max(kMin, k * Math.min(2.5, need * 1.03)); if (Math.abs(nk - k) < 0.002) break; k = nk; // pull back if too big, push in if small
    }
    const r = this.monsterRect(); this.arenaShift = 0;
    if (r) { const shift = (r.top + r.bottom) / 2 - (top + limit) / 2; // centre the monsters in the band above the caption (+ moves the picture up)
      const s = Number.isFinite(shift) ? Math.max(-45, Math.min(45, shift)) : 0; // a bigger shift can only mean a bad measurement
      if (s) { cam.setViewOffset(w, h, 0, (s / 100) * h, w, h); this.arenaShift = s; } }
    cam.updateProjectionMatrix();
  }
  clearMonsters() { this.aBump = 0; this.aShake = 0; this._co?.set(0, 0, 0); this.arenaCam?.clearViewOffset?.(); this.arenaShift = 0; this.cfx?.clear(); for (const [, v] of this.monsterObjs) { this.monsterGroup.remove(v.holder); const i = this.mixers.indexOf(v.mixer); if (i >= 0) this.mixers.splice(i, 1); } this.monsterObjs.clear(); }
  playOnce(id, name, then = 'idle') {
    const v = this.monsterObjs.get(id); if (!v || v.dead && name !== 'death') return; const clip = v.clips[name]; if (!clip) return;
    const a = v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play();
    if (name !== 'death') { const back = () => { v.mixer.removeEventListener('finished', back); if (!v.dead && v.clips[then]) { v.mixer.stopAllAction(); v.mixer.clipAction(v.clips[then]).reset().play(); } }; v.mixer.addEventListener('finished', back); }
  }
  /** Leap/strike toward the camera: scale up, move closer, brief camera push near the peak, then recoil.
   *  Strength scales with monster size; big bosses are capped so they stay framed. Reduce-motion is a subtle nudge. */
  monsterAttack(id) {
    const v = this.monsterObjs.get(id); if (!v || v.dead) return; this.playOnce(id, 'attack');
    const h = v.height || 1.5, sizeK = Math.min(1, h / 2.2), bossCap = h >= 2.8 ? 0.55 : h >= 2.2 ? 0.72 : 1;
    const rm = this.reduceMotion, f = Math.min(1.15, Math.max(0.55, this.speedF || 1));
    v.baseSc ??= 1; v.o.userData.y0 ??= v.o.position.y;
    v.lunge = v.lungeT = Math.max(0.4 * ANIM_SLOW, Math.min(0.6 * ANIM_SLOW, (rm ? 0.4 : 0.52) * f * ANIM_SLOW)); // 1.5x longer lunge
    v.leapZ = (rm ? 0.35 : 1.15 + sizeK * 0.55) * bossCap;
    v.leapGrow = (rm ? 0.06 : 0.22 + sizeK * 0.28) * bossCap;
    v.leapLift = (rm ? 0.02 : 0.08 + sizeK * 0.05) * bossCap;
    v.leapPitch = rm ? 0.03 : 0.1 + sizeK * 0.04;
    v.leapPushed = false;
  }
  /** Centre of a monster in world space. */
  monsterCenter(id, out = new THREE.Vector3()) { const v = this.monsterObjs.get(id); if (!v) return out.set(0, 1.2, -2); out.copy(v.holder.position); out.y += v.height * 0.5; return out; }
  partyOrigin(i = 0) { return new THREE.Vector3(this.arenaCam.position.x + (i % 2 ? 0.5 : -0.5), this.arenaCam.position.y - 0.7, this.arenaCam.position.z - 1.2); }
  monsterHit(id, crit, dtype = null, weapon = true) {
    const v = this.monsterObjs.get(id); if (!v) return;
    v.flash = crit ? 0.5 : 0.28; v.flashColor = crit ? 0xffee55 : 0xffffff; // slightly longer impact hold at the hit frame
    v.stagger = v.staggerT = (crit ? 0.45 : 0.32) * 1.4; v.knock = crit ? 0.45 : 0.25;
    if (v.clips.hit && !v.dead) this.playOnce(id, 'hit');
    if (weapon && dtype) this.cfx.impact(this.monsterCenter(id), dtype, crit); else if (dtype) this.cfx.burst(this.monsterCenter(id), 0xffffff, crit ? 12 : 6, 1.4, 0.12);
    if (crit && !this.reduceMotion) this.aShake = 0.35;
  }
  monsterDie(id) {
    const v = this.monsterObjs.get(id); if (!v || v.dead) return; v.dead = true; v.id = id;
    const f = Math.max(0.45, this.speedF);
    if (v.clips.death) { this.playOnce(id, 'death'); v.dieT = 0; v.dieDur = 1.5 * f; v.dissolveAt = 0.55; }
    else { v.dieT = 0; v.dieDur = 1.1 * f; v.dissolveAt = 0.35; v.collapse = true; }
    for (const m of v.mats) { m.transparent = true; m.needsUpdate = true; }
    this.cfx.burst(this.monsterCenter(id), 0x9a70ff, 10, 1.2, 0.18);
  }
  /** Spell visuals. Returns a promise that resolves when the effect lands (so the UI can sync numbers to it). */
  spellCast(spell, targetId, casterIdx = 0, dur = 420) {
    const look = SPELL_FX[spell]; if (!look) return Promise.resolve(false);
    const to = targetId ? this.monsterCenter(targetId) : this.monsterLineCenter();
    if (look.kind === 'column') return this.cfx.column(to.clone().setY(0.1), look.color, dur).then(() => true);
    if (look.kind === 'area') {
      const rad = /fireball|breath/i.test(spell) ? 2.8 : /thunderwave|shatter/i.test(spell) ? 2.4 : 2.0;
      const kk = Math.min(1.6, Math.max(0.4, this.speedF || 1));
      // flash every living monster so the blast clearly hits the whole group
      for (const [, v] of this.monsterObjs) if (!v.dead) { v.flash = 0.45; v.flashColor = look.color; }
      return this.cfx.area(this.monsterLineCenter(), look.color, rad, Math.max(650 * ANIM_SLOW * kk, Math.min(900 * ANIM_SLOW * kk, dur * 1.8)), { element: look.element, reduce: this.reduceMotion }).then(() => {
        if (!this.reduceMotion) this.aShake = Math.max(this.aShake, 0.32); else this.aShake = Math.max(this.aShake, 0.1);
        return true;
      });
    }
    return this.cfx.projectile(this.partyOrigin(casterIdx), to, look, look.kind === 'ray' ? dur * 0.6 : dur).then(() => true);
  }
  monsterLineCenter() { const p = new THREE.Vector3(); let n = 0; for (const [, v] of this.monsterObjs) if (!v.dead) { p.add(v.holder.position); p.y += v.height * 0.5; n++; } return n ? p.divideScalar(n) : p.set(0, 1.2, -2); }
  weaponStrike(kind, targetId, crit = false, durMs = 240, casterIdx = 0) {
    this.cfx.reduceMotion = this.reduceMotion; const to = this.monsterCenter(targetId);
    return this.cfx.weaponStrike(kind, to, { from: this.partyOrigin(casterIdx), crit, durMs, size: Math.min(3.2, Math.max(1.4, (this.monsterObjs.get(targetId)?.height || 1.6) * 1.25)) });
  }
  partyHit(crit) { if (this.reduceMotion) { this.aBump = Math.max(this.aBump, 0.08); return; } this.aBump = Math.max(this.aBump, crit ? 0.34 : 0.28); this.aShake = Math.max(this.aShake, crit ? 0.48 : 0.24); }
  spellFx(color = 0xff7020, targetId = null) {
    const v = targetId && this.monsterObjs.get(targetId);
    const pos = v ? v.holder.position.clone().add(new THREE.Vector3(0, v.height * 0.5, 0)) : new THREE.Vector3(0, 1.2, -2);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 1 }));
    m.position.copy(pos); this.arena.add(m); const l = new THREE.PointLight(color, 40, 8, 2); l.position.copy(pos); this.arena.add(l);
    this.fx.push({ m, l, t: 0 });
  }
  /** Screen rectangle (in % of the view) covered by all living monsters, padded for idle/attack animation. */
  monsterRect() {
    let r = null; const v3 = new THREE.Vector3();
    for (const [, v] of this.monsterObjs) {
      if (v.dead || !v.wbox || v.wbox.isEmpty()) continue; const b = v.wbox.clone(); const sz = b.getSize(new THREE.Vector3());
      b.min.x -= sz.x * 0.1; b.max.x += sz.x * 0.1; b.max.y += sz.y * 0.12; b.min.z -= sz.z * 0.1; b.max.z += sz.z * 0.1 + 0.4; // lunge toward camera
      for (let i = 0; i < 8; i++) { v3.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(this.arenaCam);
        const x = (v3.x * 0.5 + 0.5) * 100, y = (-v3.y * 0.5 + 0.5) * 100;
        if (!r) r = { left: x, right: x, top: y, bottom: y }; else { r.left = Math.min(r.left, x); r.right = Math.max(r.right, x); r.top = Math.min(r.top, y); r.bottom = Math.max(r.bottom, y); } }
    }
    return r;
  }
  /** Where the living monsters really are on screen right now (in % of the view, clipped to it): precise bounds of the
   *  current, animated meshes projected through the arena camera (including its view offset and sway). For tests/layout checks. */
  monsterScreenRect() {
    let r = null; const v3 = new THREE.Vector3(); this.arenaCam.updateMatrixWorld();
    for (const [, v] of this.monsterObjs) {
      if (v.dead) continue; v.holder.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(v.holder, true); if (b.isEmpty()) continue;
      for (let i = 0; i < 8; i++) { v3.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(this.arenaCam);
        const x = (v3.x * 0.5 + 0.5) * 100, y = (-v3.y * 0.5 + 0.5) * 100;
        if (!r) r = { left: x, right: x, top: y, bottom: y }; else { r.left = Math.min(r.left, x); r.right = Math.max(r.right, x); r.top = Math.min(r.top, y); r.bottom = Math.max(r.bottom, y); } }
    }
    if (!r) return null; const c = (n) => Math.max(0, Math.min(100, n));
    return { left: c(r.left), right: c(r.right), top: c(r.top), bottom: c(r.bottom), raw: r };
  }
  screenPos(id) {
    const v = this.monsterObjs.get(id); if (!v) return null;
    const p = v.holder.position.clone(); p.y = v.wbox && !v.wbox.isEmpty() ? v.wbox.max.y + 0.05 : p.y + v.height * 0.9; p.project(this.arenaCam); // just above the head
    return { x: (p.x * 0.5 + 0.5) * 100, y: (-p.y * 0.5 + 0.5) * 100 };
  }
  setMode(mode) { this.mode = mode; if (!this.composer) return; this.renderPass.scene = mode === 'combat' ? this.arena : this.scene; this.renderPass.camera = mode === 'combat' ? this.arenaCam : this.camera; this.bloom.strength = mode === 'combat' ? 0.7 : 0.85; }

  update() {
    const dt = Math.min(0.05, this.clock.getDelta()); const t = this.clock.elapsedTime;
    for (const mx of this.mixers) mx.update(dt);
    // camera easing
    this.camPos.lerp(this.targetPos, 1 - Math.pow(0.0005, dt));
    this.camYaw += (this.targetYaw - this.camYaw) * (1 - Math.pow(0.0005, dt));
    this.camera.position.copy(this.camPos); this.camera.rotation.order = 'YXZ'; this.camera.rotation.set(this.pitch || 0, this.camYaw, 0);
    if (this.bumpT > 0) { this.bumpT -= dt; this.camera.translateZ(-Math.sin(this.bumpT * 12) * 0.08); }
    if (this.shakeT > 0) { this.shakeT -= dt; this.camera.position.x += (Math.random() - 0.5) * 0.08; this.camera.position.y += (Math.random() - 0.5) * 0.08; }
    this.camera.position.y += Math.sin(t * 1.7) * 0.01;
    this.torch.intensity = (26 + Math.sin(t * 11) * 2 + Math.sin(t * 23.3) * 1.5) * this.torchK;
    if (this.outdoor && this.mode !== 'combat') this.outState = this.outdoor.update(dt, t, this, this.steps);
    for (const [i, l] of (this.torches || []).entries()) l.intensity = 5 + Math.sin(t * 9 + i) * 1.2;
    for (const a of this.animated || []) { a.obj.rotation[a.bob ? 'y' : 'z'] += dt * a.spin; if (a.bob) a.obj.position.y += Math.sin(t * 2) * 0.002; }
    this.dust.rotation.y = Math.sin(t * 0.05) * 0.02;
    for (const o of this.evObjs?.values() || []) { o.sp.position.y = 1.15 + Math.sin(t * 2.1 + o.sp.position.x) * 0.1; o.sp.material.opacity = 0.75 + Math.sin(t * 3) * 0.25; }
    for (const o of this.shimmerObjs?.values() || []) { o.mat.opacity = 0.3 + Math.sin(t * 2.4) * 0.14; this._shTex.offset.y = (t * 0.15) % 1; }
    for (const o of this.eliteObjs?.values() || []) {
      const hp = o.holder.position; o.prev.copy(hp); hp.lerp(o.target, 1 - Math.pow(0.04, dt));
      const mx = hp.x - o.prev.x, mz = hp.z - o.prev.z; if (mx * mx + mz * mz > 1e-6) { const yaw = Math.atan2(mx, mz); let d = yaw - o.heading; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; o.heading += d * Math.min(1, dt * 8); o.holder.rotation.y = o.heading; }
      o.aura.rotation.z += dt * 1.2; o.aura.material.opacity = 0.65 + Math.sin(t * 3) * 0.3; o.icon.position.y = o.h + 0.55 + Math.sin(t * 2.2) * 0.07; o.light.intensity = 6 + Math.sin(t * 5) * 1.5;
    }
    // arena
    if (this.mode === 'combat') {
      this.sparks.rotation.y += dt * 0.03; this.arenaRing.rotation.z += dt * 0.2;
      const co = (this._co ||= new THREE.Vector3()); this.arenaCam.position.y -= co.y; this.arenaCam.position.z -= co.z; co.set(0, 0, 0);
      this.arenaCam.position.x = Math.sin(t * 0.25) * 0.25; // gentle sway; fitArena leaves margin for it
      this.arenaCam.lookAt(this.arenaLook || new THREE.Vector3(0, 1.3, -2));
      if (this.aBump > 0) { const bumpT = Math.max(this.aBump, 0.22); this.aBump -= dt; co.z = -Math.sin(Math.max(0, this.aBump) / bumpT * Math.PI) * (this.reduceMotion ? 0.1 : 0.42); }
      if (this.aShake > 0) { this.aShake -= dt; const a = Math.max(0, this.aShake) * 0.25; this.arenaCam.rotation.z += (Math.random() - 0.5) * a * 0.5; this.arenaCam.position.x += (Math.random() - 0.5) * a; co.y = (Math.random() - 0.5) * a; }
      this.arenaCam.position.y += co.y; this.arenaCam.position.z += co.z;
      this.cfx.update(dt);
      for (const [mid, v] of this.monsterObjs) {
        if (v.flash > 0) { v.flash -= dt; const k = Math.max(0, v.flash) * 6; for (const m of v.mats) m.emissive.setHex(v.flashColor).multiplyScalar(k * 0.4); if (v.flash <= 0) for (const m of v.mats) m.emissive.copy(m.color).multiplyScalar(0.08); }
        let z = 0, rx = 0, yOff = 0, sc = v.baseSc ?? null;
        if (v.lunge > 0) {
          v.lunge -= dt; const u = 1 - Math.max(0, v.lunge) / v.lungeT, wave = Math.sin(u * Math.PI);
          z += wave * (v.leapZ ?? 0.5); rx += wave * (v.leapPitch ?? 0.05); yOff += wave * (v.leapLift ?? 0);
          if (sc != null) sc *= 1 + wave * (v.leapGrow ?? 0);
          // brief camera push-in + shake near the peak of the leap (the strike lands)
          if (!v.leapPushed && u >= 0.42) {
            v.leapPushed = true;
            this.aBump = Math.max(this.aBump, this.reduceMotion ? 0.12 : 0.3);
            this.aShake = Math.max(this.aShake, this.reduceMotion ? 0.08 : 0.22);
            this.cfx?.rush?.(this.monsterCenter(v.id || mid), this.reduceMotion);
          }
          if (v.lunge <= 0) v.holder.scale.setScalar(1);
        }
        if (v.stagger > 0) { v.stagger -= dt; const k = Math.sin((1 - Math.max(0, v.stagger) / v.staggerT) * Math.PI); z -= k * v.knock; rx -= k * 0.22; }
        if (v.lunge !== undefined || v.stagger !== undefined) {
          v.o.position.z = z; v.o.rotation.x = rx;
          if (v.lunge > 0 || yOff) v.o.position.y = (v.o.userData.y0 ?? v.o.position.y) + yOff;
          if (sc != null && v.lunge > 0) v.holder.scale.setScalar(sc);
        }
        if (v.dieT !== undefined) {
          v.dieT += dt; const k = Math.min(1, v.dieT / v.dieDur);
          if (v.collapse) { const c = Math.min(1, k / 0.45); v.o.rotation.x = -c * c * 1.35; v.o.position.y = (v.o.userData.y0 ??= v.o.position.y) - c * v.height * 0.15; }
          if (k > v.dissolveAt) { const d = (k - v.dissolveAt) / (1 - v.dissolveAt); for (const m of v.mats) m.opacity = 1 - d; v.holder.position.y -= dt * 0.4; if (!this.reduceMotion && Math.random() < 0.5) this.cfx.spawn({ pos: this.monsterCenter(v.id).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, (Math.random() - 0.3) * v.height * 0.6, 0)), vel: new THREE.Vector3(0, 0.8, 0), life: 0.5, size: 0.14, grow: -0.1, color: 0xa080ff }); }
          if (k >= 1) { v.holder.visible = false; v.dieT = undefined; }
        }
      }
      for (const f of this.fx) { f.t += dt; f.m.scale.setScalar(1 + f.t * 8); f.m.material.opacity = Math.max(0, 1 - f.t * 2); f.l.intensity = Math.max(0, 40 * (1 - f.t * 2)); }
      this.fx = this.fx.filter((f) => { if (f.t > 0.6) { this.arena.remove(f.m, f.l); return false; } return true; });
    }
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.mode === 'combat' ? this.arena : this.scene, this.mode === 'combat' ? this.arenaCam : this.camera);
  }
}
