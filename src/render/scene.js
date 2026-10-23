// Three.js renderer: neon-wireframe-era dungeon in modern PBR 3D, plus a combat arena with animated glTF monsters.
import { ACESFilmicToneMapping, AdditiveBlending, AnimationMixer, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Clock, Color, CylinderGeometry, DirectionalLight, DoubleSide, EdgesGeometry, Float32BufferAttribute, Fog, FogExp2, GridHelper, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, LoopOnce, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PMREMGenerator, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, PolarGridHelper, RepeatWrapping, RingGeometry, SRGBColorSpace, Scene, SphereGeometry, SpotLight, TorusGeometry, Vector2, Vector3, WebGLRenderer } from 'three';
const THREE = { ACESFilmicToneMapping, AdditiveBlending, AnimationMixer, Box3, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CircleGeometry, Clock, Color, CylinderGeometry, DirectionalLight, DoubleSide, EdgesGeometry, Float32BufferAttribute, Fog, FogExp2, GridHelper, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, LoopOnce, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PMREMGenerator, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial, PolarGridHelper, RepeatWrapping, RingGeometry, SRGBColorSpace, Scene, SphereGeometry, SpotLight, TorusGeometry, Vector2, Vector3, WebGLRenderer };
// three.js addons are lazy-loaded (separate chunks) so the first paint only needs three core.
let SkeletonUtils = null;
let loaderP = null;
function getLoader() {
  if (!loaderP) loaderP = Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/utils/SkeletonUtils.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')])
    .then(([{ GLTFLoader }, SU, { MeshoptDecoder }]) => { SkeletonUtils = SU; const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); return l; });
  return loaderP;
}
import { W, H, DIRS } from '../dungeon/levels.js';
import { MONSTERS } from '../rules/data.js';

const CELL = 2, WALL_H = 2.6;
const gltfCache = {};
export function loadModel(name) {
  if (!gltfCache[name]) gltfCache[name] = getLoader().then((loader) => new Promise((res) => loader.load(`models/${name}.glb`, res, undefined, (e) => { console.warn('model load failed', name, e?.message); res(null); })));
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
    this.scene.add(new THREE.HemisphereLight(0x6c7cff, 0x221122, 0.35));
    this.levelGroup = new THREE.Group(); this.scene.add(this.levelGroup);
    this.wallMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.85, metalness: 0.05 });
    this.floorMat = new THREE.MeshStandardMaterial({ map: floorTex(), roughness: 0.7, metalness: 0.1 });
    this.ceilMat = new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95, color: 0x5a5470 });
    this.dust = this.makeDust(); this.scene.add(this.dust);
    // Arena scene for combat
    this.arena = new THREE.Scene(); this.arena.environmentIntensity = 0.6;
    this.arenaCam = new THREE.PerspectiveCamera(50, 1, 0.1, 100); this.arenaCam.position.set(0, 2.1, 5.2); this.arenaCam.lookAt(0, 1.3, -2);
    this.buildArena();
    // Post-processing
    this.composer = null; this.ready = this.initPost();
    this.mode = 'dungeon'; this.monsterObjs = new Map(); this.fx = [];
    this.camPos = new THREE.Vector3(); this.camYaw = 0; this.targetPos = new THREE.Vector3(); this.targetYaw = 0;
    window.addEventListener('resize', () => this.resize()); this.resize();
    const loop = () => { this.raf = requestAnimationFrame(loop); this.update(); }; loop();
  }
  async initPost() {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { RoomEnvironment }] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'), import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'), import('three/examples/jsm/postprocessing/OutputPass.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js')]);
    const r = this.renderer; const pm = new THREE.PMREMGenerator(r); this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.scene.environment = this.envTex; this.arena.environment = this.envTex;
    const c = new EffectComposer(r);
    this.renderPass = new RenderPass(this.scene, this.camera); c.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.65, 0.45, 0.85); c.addPass(this.bloom);
    c.addPass(new OutputPass()); this.composer = c; this.setMode(this.mode); this.resize();
  }
  resize() {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false); this.composer?.setSize(w, h);
    for (const c of [this.camera, this.arenaCam]) { c.aspect = w / h; c.updateProjectionMatrix(); }
    this.arenaCam.fov = Math.min(72, Math.max(50, 50 * 1.45 / (w / h))); // keep the whole monster line in frame on narrow views this.arenaCam.updateProjectionMatrix();
  }
  makeDust() {
    const g = new THREE.BufferGeometry(); const n = 400; const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = Math.random() * W * CELL; p[i * 3 + 1] = Math.random() * WALL_H; p[i * 3 + 2] = Math.random() * H * CELL; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.03, color: 0xffd9a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  }

  /* ---------- Dungeon ---------- */
  async buildLevel(s, tileFn, def) {
    const grp = this.levelGroup; grp.clear(); this.torches = []; this.animated = [];
    const color = new THREE.Color(def.color);
    this.scene.fog = new THREE.FogExp2(def.fog, 0.075); this.scene.background = new THREE.Color(def.fog);
    this.edgeMat = new THREE.LineBasicMaterial({ color: color.clone().multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.85 });
    const walls = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = tileFn(x, y);
      if (ch === '#' || ch === 'S') {
        // only walls touching open space
        if (!DIRS.some(([dx, dy]) => { const n = tileFn(x + dx, y + dy); return n !== '#' && n !== 'S' && x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H; })) continue;
        walls.push([x, y]);
      }
    }
    const box = new THREE.BoxGeometry(CELL, WALL_H, CELL);
    const inst = new THREE.InstancedMesh(box, this.wallMat, walls.length); const m = new THREE.Matrix4();
    const edgePos = []; const eg = new THREE.EdgesGeometry(box); const ea = eg.attributes.position.array;
    walls.forEach(([x, y], i) => { m.makeTranslation(x * CELL, WALL_H / 2, y * CELL); inst.setMatrixAt(i, m); for (let k = 0; k < ea.length; k += 3) edgePos.push(ea[k] * 0.999 + x * CELL, ea[k + 1] + WALL_H / 2, ea[k + 2] * 0.999 + y * CELL); });
    grp.add(inst);
    const eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3)); grp.add(new THREE.LineSegments(eGeo, this.edgeMat));
    // floor & ceiling with neon grid
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), this.floorMat); fl.material.map.repeat.set(W / 2, H / 2);
    fl.rotation.x = -Math.PI / 2; fl.position.set((W - 1) * CELL / 2, 0, (H - 1) * CELL / 2); grp.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), this.ceilMat); ce.material.map.repeat.set(W / 2, H / 2);
    ce.rotation.x = Math.PI / 2; ce.position.set((W - 1) * CELL / 2, WALL_H, (H - 1) * CELL / 2); grp.add(ce);
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
        const frameMat = glow(ch === 'L' ? 0xff3050 : def.color, 1.5);
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
      } else if (ch === 't') {
        const xg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), glow(0xff3030, 1.5)); xg.rotation.set(-Math.PI / 2, 0, Math.PI / 4); add(xg, 0.02);
        const xg2 = xg.clone(); xg2.rotation.z = -Math.PI / 4; add(xg2, 0.02);
      }
      // wall torches on some corridor walls
      if (torch && ch !== '#' && ch !== 'S' && (x * 7 + y * 13) % 11 === 0 && torchCount < 14) {
        for (const [d, [dx, dy]] of DIRS.entries()) {
          if (tileFn(x + dx, y + dy) !== '#') continue;
          const t = torch.scene.clone(); t.scale.setScalar(0.8); t.position.set(px + dx * (CELL / 2 - 0.05), 1.4, pz + dy * (CELL / 2 - 0.05)); t.rotation.y = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][d] + Math.PI; grp.add(t);
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), glow(0xff9020, 6)); flame.position.set(px + dx * (CELL / 2 - 0.25), 1.75, pz + dy * (CELL / 2 - 0.25)); grp.add(flame);
          if (torchCount < 8) { const l = new THREE.PointLight(0xff8a30, 6, 5, 2); l.position.copy(flame.position); grp.add(l); this.torches.push(l); }
          torchCount++; break;
        }
      }
    }
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
    sp.setAttribute('position', new THREE.BufferAttribute(pos, 3)); this.sparks = new THREE.Points(sp, new THREE.PointsMaterial({ size: 0.05, color: 0xff80ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); a.add(this.sparks);
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
          ch.boundingBox = null; ch.boundingSphere = null; });
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
      const clips = { idle: find(/Idle$|Idle(?!_2)|Flying|Swim/i) || g.animations[0], attack: find(/Attack|Bite_Front|Bite/i), death: find(/Death|Dead/i), hit: find(/Hit|Jump/i) };
      if (clips.idle) { const a = mixer.clipAction(clips.idle); a.time = Math.random() * 2; a.play(); }
      this.monsterObjs.set(m.id, { holder, o, mixer, clips, mats, dead: false, height: target });
    }));
  }
  clearMonsters() { for (const [, v] of this.monsterObjs) { this.monsterGroup.remove(v.holder); const i = this.mixers.indexOf(v.mixer); if (i >= 0) this.mixers.splice(i, 1); } this.monsterObjs.clear(); }
  playOnce(id, name, then = 'idle') {
    const v = this.monsterObjs.get(id); if (!v || v.dead && name !== 'death') return; const clip = v.clips[name]; if (!clip) return;
    const a = v.mixer.clipAction(clip); v.mixer.stopAllAction(); a.reset(); a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.play();
    if (name !== 'death') { const back = () => { v.mixer.removeEventListener('finished', back); if (!v.dead && v.clips[then]) { v.mixer.stopAllAction(); v.mixer.clipAction(v.clips[then]).reset().play(); } }; v.mixer.addEventListener('finished', back); }
  }
  monsterAttack(id) { this.playOnce(id, 'attack'); const v = this.monsterObjs.get(id); if (v) v.lunge = 0.4; }
  monsterHit(id, crit) { const v = this.monsterObjs.get(id); if (!v) return; v.flash = crit ? 0.5 : 0.3; v.flashColor = crit ? 0xffee55 : 0xffffff; if (v.clips.hit && !v.dead) this.playOnce(id, 'hit'); }
  monsterDie(id) { const v = this.monsterObjs.get(id); if (!v || v.dead) return; v.dead = true; if (v.clips.death) this.playOnce(id, 'death'); v.fade = 1.6; }
  spellFx(color = 0xff7020, targetId = null) {
    const v = targetId && this.monsterObjs.get(targetId);
    const pos = v ? v.holder.position.clone().add(new THREE.Vector3(0, v.height * 0.5, 0)) : new THREE.Vector3(0, 1.2, -2);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 1 }));
    m.position.copy(pos); this.arena.add(m); const l = new THREE.PointLight(color, 40, 8, 2); l.position.copy(pos); this.arena.add(l);
    this.fx.push({ m, l, t: 0 });
  }
  screenPos(id) {
    const v = this.monsterObjs.get(id); if (!v) return null;
    const p = v.holder.position.clone(); p.y += v.height * 0.9; p.project(this.arenaCam);
    return { x: (p.x * 0.5 + 0.5) * 100, y: (-p.y * 0.5 + 0.5) * 100 };
  }
  setMode(mode) { this.mode = mode; if (!this.composer) return; this.renderPass.scene = mode === 'combat' ? this.arena : this.scene; this.renderPass.camera = mode === 'combat' ? this.arenaCam : this.camera; this.bloom.strength = mode === 'combat' ? 0.7 : 0.85; }

  update() {
    const dt = Math.min(0.05, this.clock.getDelta()); const t = this.clock.elapsedTime;
    for (const mx of this.mixers) mx.update(dt);
    // camera easing
    this.camPos.lerp(this.targetPos, 1 - Math.pow(0.0005, dt));
    this.camYaw += (this.targetYaw - this.camYaw) * (1 - Math.pow(0.0005, dt));
    this.camera.position.copy(this.camPos); this.camera.rotation.set(0, this.camYaw, 0);
    if (this.bumpT > 0) { this.bumpT -= dt; this.camera.translateZ(-Math.sin(this.bumpT * 12) * 0.08); }
    if (this.shakeT > 0) { this.shakeT -= dt; this.camera.position.x += (Math.random() - 0.5) * 0.08; this.camera.position.y += (Math.random() - 0.5) * 0.08; }
    this.camera.position.y += Math.sin(t * 1.7) * 0.01;
    this.torch.intensity = 26 + Math.sin(t * 11) * 2 + Math.sin(t * 23.3) * 1.5;
    for (const [i, l] of (this.torches || []).entries()) l.intensity = 5 + Math.sin(t * 9 + i) * 1.2;
    for (const a of this.animated || []) { a.obj.rotation[a.bob ? 'y' : 'z'] += dt * a.spin; if (a.bob) a.obj.position.y += Math.sin(t * 2) * 0.002; }
    this.dust.rotation.y = Math.sin(t * 0.05) * 0.02;
    // arena
    if (this.mode === 'combat') {
      this.sparks.rotation.y += dt * 0.03; this.arenaRing.rotation.z += dt * 0.2;
      this.arenaCam.position.x = Math.sin(t * 0.25) * 0.4;
      this.arenaCam.lookAt(0, 1.2, -2.5);
      for (const [, v] of this.monsterObjs) {
        if (v.flash > 0) { v.flash -= dt; const k = Math.max(0, v.flash) * 6; for (const m of v.mats) m.emissive.setHex(v.flashColor).multiplyScalar(k * 0.4); if (v.flash <= 0) for (const m of v.mats) m.emissive.copy(m.color).multiplyScalar(0.08); }
        if (v.lunge > 0) { v.lunge -= dt; v.o.position.z = Math.sin((0.4 - v.lunge) / 0.4 * Math.PI) * 0.6; }
        if (v.fade !== undefined && v.dead) { v.fade -= dt; if (v.fade < 0.6) { const s = Math.max(0.001, v.fade / 0.6); v.holder.scale.setScalar(s); } }
      }
      for (const f of this.fx) { f.t += dt; f.m.scale.setScalar(1 + f.t * 8); f.m.material.opacity = Math.max(0, 1 - f.t * 2); f.l.intensity = Math.max(0, 40 * (1 - f.t * 2)); }
      this.fx = this.fx.filter((f) => { if (f.t > 0.6) { this.arena.remove(f.m, f.l); return false; } return true; });
    }
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.mode === 'combat' ? this.arena : this.scene, this.mode === 'combat' ? this.arenaCam : this.camera);
  }
}
