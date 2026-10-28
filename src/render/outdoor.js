// Phase E renderer for the open-air region: sky dome with sun/moon/stars, grass + dirt ground, trees / boulders / cliffs for walls,
// ruined arches, a sun-or-moon light, rain or mist particles, and a day/night cycle. Everything is instanced or a single mesh,
// so it stays light on phones (about a dozen draw calls and ~300 particles).
import { AdditiveBlending, BackSide, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DodecahedronGeometry, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Points, PointsMaterial, Quaternion, SRGBColorSpace, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector3, Euler } from 'three';
import { inRegion, hourAt } from '../dungeon/outdoor.js';

const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

/* ---- sky colours by hour: [hour, top, horizon, hemiSky, hemiGround, sun, sunInt, hemiInt, stars, day] ---- */
const C = (h) => new Color(h);
const KEYS = [
  [0, 0x050a1e, 0x16224a, 0x3a4a8a, 0x0a1018, 0x9db4ff, 0.35, 0.36, 1.0, 0],
  [5, 0x0a1230, 0x28305a, 0x4a58a0, 0x101820, 0x9db4ff, 0.35, 0.4, 0.9, 0],
  [6.5, 0x4a4a8a, 0xff9a6a, 0xffb090, 0x2a2418, 0xffa060, 1.0, 0.7, 0.2, 0.5],
  [9, 0x3a7ad0, 0xa8d0f0, 0xcfe4ff, 0x3a4a28, 0xfff0d0, 1.7, 1.0, 0, 1],
  [13, 0x2f78e0, 0xb8dcf8, 0xd8ecff, 0x3a4a28, 0xffffff, 1.9, 1.05, 0, 1],
  [17, 0x3a74c8, 0xcfd8e0, 0xffe8c8, 0x3a4024, 0xffd8a0, 1.6, 0.95, 0, 1],
  [18.5, 0x4a3a8a, 0xff7a4a, 0xffa070, 0x2a2018, 0xff7a40, 1.1, 0.7, 0.15, 0.5],
  [20, 0x141a4a, 0x6a4a7a, 0x7a70b0, 0x181820, 0xb0b8ff, 0.6, 0.55, 0.7, 0.1],
  [22, 0x070c26, 0x1c2850, 0x3a4a8a, 0x0a1018, 0x9db4ff, 0.35, 0.36, 1.0, 0],
  [24, 0x050a1e, 0x16224a, 0x3a4a8a, 0x0a1018, 0x9db4ff, 0.35, 0.36, 1.0, 0],
];
const WEATHER = {
  rain: { grey: 0x4a5560, mixSky: 0.6, sun: 0.35, density: 0.052, hemi: 0.9, stars: 0.15 },
  mist: { grey: 0xb8c4cc, mixSky: 0.5, sun: 0.55, density: 0.085, hemi: 1.0, stars: 0.3 },
  clear: { grey: 0xffffff, mixSky: 0, sun: 1, density: 0.03, hemi: 1, stars: 1 },
};
export function skyAt(hour, weather = 'clear') {
  const h = ((hour % 24) + 24) % 24; let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const a = KEYS[i], b = KEYS[i + 1], u = clamp01((h - a[0]) / (b[0] - a[0]));
  const col = (k) => C(a[k]).lerp(C(b[k]), u), num = (k) => a[k] + (b[k] - a[k]) * u;
  const W_ = WEATHER[weather] || WEATHER.clear; const grey = C(W_.grey);
  const day = num(9);
  const top = col(1).lerp(grey.clone().multiplyScalar(0.12 + 0.88 * day), W_.mixSky), horizon = col(2).lerp(grey.clone().multiplyScalar(0.1 + 0.9 * day), W_.mixSky);
  return {
    top, horizon, fog: horizon.clone().multiplyScalar(0.8 + 0.2 * day), hemiSky: col(3).lerp(grey, W_.mixSky * 0.5), hemiGround: col(4), sun: col(5), sunInt: num(6) * W_.sun, hemiInt: num(7) * W_.hemi,
    stars: num(8) * W_.stars, day, fogDensity: W_.density,
  };
}

/* ---- little canvas painters ---- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rep = null) { const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; if (rep) { t.wrapS = t.wrapT = 1000; t.repeat.set(rep, rep); } t.anisotropy = 4; return t; }
function hashf(x, y, s) { let n = Math.imul((x + 11) * 73856093 ^ (y + 7) * 19349663 ^ (s + 3) * 83492791, 2654435761) >>> 0; n ^= n >>> 13; n = Math.imul(n, 1274126177) >>> 0; return (n % 100000) / 100000; }
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function glowTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, g] = canvas(128, 128); const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new CanvasTexture(c);
}
function groundTexture(R, tileFn, seed, CELL_PX = 48) {
  const cw = R.x1 - R.x0 + 1, ch = R.y1 - R.y0 + 1; const [c, g] = canvas(cw * CELL_PX, ch * CELL_PX); const r = rng(seed ^ 0x9e3779b9);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const x = R.x0 + cx, y = R.y0 + cy, open = tileFn(x, y) !== '#' && tileFn(x, y) !== 'S'; const X = cx * CELL_PX, Y = cy * CELL_PX;
    const l = 30 + hashf(x, y, 1) * 10; g.fillStyle = `hsl(${96 + hashf(x, y, 2) * 22},${42 + hashf(x, y, 3) * 14}%,${open ? l : l - 7}%)`; g.fillRect(X, Y, CELL_PX, CELL_PX);
  }
  // dirt paths: soft brown blobs along open cells, joined to open neighbours
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    const x = R.x0 + cx, y = R.y0 + cy, t = tileFn(x, y); if (t === '#' || t === 'S') continue;
    const px = cx * CELL_PX + CELL_PX / 2, py = cy * CELL_PX + CELL_PX / 2; const nb = DIRS4.filter(([dx, dy]) => { const n = tileFn(x + dx, y + dy); return n && n !== '#' && n !== 'S'; });
    const room = nb.length >= 4; const rad = room ? CELL_PX * 0.3 : CELL_PX * 0.34;
    const blob = (bx, by, rr) => { const gr = g.createRadialGradient(bx, by, 1, bx, by, rr); gr.addColorStop(0, 'rgba(112,84,52,0.95)'); gr.addColorStop(0.6, 'rgba(104,78,48,0.7)'); gr.addColorStop(1, 'rgba(104,78,48,0)'); g.fillStyle = gr; g.fillRect(bx - rr, by - rr, rr * 2, rr * 2); };
    blob(px, py, rad * (room ? 1.25 : 1.45));
    for (const [dx, dy] of nb) for (const k of [0.5, 1]) blob(px + dx * CELL_PX * 0.5 * k, py + dy * CELL_PX * 0.5 * k, rad * 1.3);
  }
  // grass blades, flowers, pebbles
  for (let i = 0; i < cw * ch * 70; i++) {
    const x = r() * c.width, y = r() * c.height; const k = r();
    if (k < 0.78) { g.strokeStyle = `hsla(${90 + r() * 40},55%,${26 + r() * 22}%,0.55)`; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4); g.stroke(); }
    else if (k < 0.9) { g.fillStyle = `rgba(${90 + r() * 30},${72 + r() * 20},${54 + r() * 16},0.6)`; g.fillRect(x, y, 2, 1.5); }
    else if (k < 0.96) { g.fillStyle = ['#c8bf70', '#d8d8c8', '#d890b8', '#90a8d8'][(r() * 4) | 0]; g.fillRect(x, y, 2, 2); }
  }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; t.anisotropy = 4; return t;
}
function rockTexture(seed) {
  const [c, g] = canvas(128, 128); const r = rng(seed); g.fillStyle = '#6a665e'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${60 + r() * 50},${58 + r() * 46},${52 + r() * 40},0.5)`; g.fillRect(0, r() * 128, 128, 2 + r() * 8); }
  for (let i = 0; i < 380; i++) { const v = (r() - 0.5) * 50; g.fillStyle = `rgba(${128 + v},${126 + v},${118 + v},0.35)`; g.fillRect(r() * 128, r() * 128, 2, 2); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(70,${100 + r() * 40},50,0.35)`; g.fillRect(r() * 128, r() * 128, 6 + r() * 8, 3 + r() * 5); } // moss
  return tex(c);
}
function barkTexture() { const [c, g] = canvas(32, 64); g.fillStyle = '#4a3322'; g.fillRect(0, 0, 32, 64); for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${30 + Math.random() * 40},${20 + Math.random() * 25},12,0.6)`; g.fillRect(Math.random() * 32, 0, 2, 64); } return tex(c); }
function leafTexture() { const [c, g] = canvas(64, 64); g.fillStyle = '#2f5a2a'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 220; i++) { g.fillStyle = `hsla(${95 + Math.random() * 40},50%,${22 + Math.random() * 20}%,0.6)`; g.fillRect(Math.random() * 64, Math.random() * 64, 3, 2); } return tex(c); }

export class Outdoor {
  /** reg: {x0,y0,x1,y1,weather,seed}, tileFn(x,y), CELL, WALL_H, W, H, wallMat */
  constructor({ reg, tileFn, CELL, WALL_H, W, H, wallMat, indoorFog }) {
    Object.assign(this, { reg, tileFn, CELL, WALL_H, W, H, wallMat }); this.group = new Group(); this.group.name = 'outdoor'; this.fx = new Group(); this.fx.name = 'outdoor-fx'; this.group.add(this.fx); this._rest = false;
    this.weather = reg.weather || 'rain'; this.mix = 0; this.hour = null; this._skyHour = -99; this.indoorFog = new Color(indoorFog); this.forceHour = null; this.reduce = false; this.lastSeen = { x: -1, y: -1 };
    this.wx0 = reg.x0 * CELL - CELL / 2; this.wx1 = (reg.x1 + 1) * CELL - CELL / 2; this.wz0 = reg.y0 * CELL - CELL / 2; this.wz1 = (reg.y1 + 1) * CELL - CELL / 2;
    this.buildGround(); this.buildWalls(); this.buildArches(); this.buildSky(); this.buildWeather(); this.buildLight();
  }
  isWall(x, y) { const t = this.tileFn(x, y); return t === '#' || t === 'S'; }
  inMap(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  /* ---------- ground ---------- */
  buildGround() {
    const { reg, CELL } = this; const w = (reg.x1 - reg.x0 + 1) * CELL, d = (reg.y1 - reg.y0 + 1) * CELL;
    this.groundMat = new MeshStandardMaterial({ map: groundTexture(reg, this.tileFn, reg.seed), roughness: 0.95, metalness: 0 });
    const m = new Mesh(new PlaneGeometry(w, d), this.groundMat); m.rotation.x = -Math.PI / 2; m.position.set((this.wx0 + this.wx1) / 2, 0.02, (this.wz0 + this.wz1) / 2); this.group.add(m);
  }
  /* ---------- walls become trees, boulders and cliffs ---------- */
  buildWalls() {
    const { reg, CELL } = this; const cliffs = [], trees = [], rocks = [];
    for (let y = reg.y0; y <= reg.y1; y++) for (let x = reg.x0; x <= reg.x1; x++) {
      if (!this.isWall(x, y)) continue;
      if (!DIRS4.some(([dx, dy]) => this.inMap(x + dx, y + dy) && !this.isWall(x + dx, y + dy))) continue; // hidden walls are not drawn
      const edge = x === reg.x0 || x === reg.x1 || y === reg.y0 || y === reg.y1; const hsh = hashf(x, y, reg.seed);
      if (edge) cliffs.push([x, y, hsh]); else if (hsh < 0.62) trees.push([x, y, hsh]); else rocks.push([x, y, hsh]);
    }
    const rockMat = new MeshStandardMaterial({ map: rockTexture(reg.seed), roughness: 0.95, flatShading: true, color: 0xc8c4bc });
    const m4 = new Matrix4(), q = new Quaternion(), e = new Euler(), s = new Vector3(), p = new Vector3();
    const put = (mesh, i, px, py, pz, sx, sy, sz, ry = 0, rx = 0) => { e.set(rx, ry, 0); q.setFromEuler(e); p.set(px, py, pz); s.set(sx, sy, sz); m4.compose(p, q, s); mesh.setMatrixAt(i, m4); };
    // cliffs: two tall, flat-shaded rocks per cell so the border reads as a rough rock face
    if (cliffs.length) {
      const im = new InstancedMesh(new DodecahedronGeometry(1, 0), rockMat, cliffs.length * 2); let i = 0;
      for (const [x, y, h] of cliffs) for (let k = 0; k < 2; k++) { const ox = (hashf(x, y, 5 + k) - 0.5) * 0.9, oz = (hashf(x, y, 8 + k) - 0.5) * 0.9, hh = 2.1 + hashf(x, y, 11 + k) * 1.5; put(im, i++, x * CELL + ox, hh * 0.78, y * CELL + oz, 1.25 + h * 0.2, hh, 1.25 + hashf(x, y, 14 + k) * 0.2, h * 6 + k); }
      im.instanceMatrix.needsUpdate = true; this.group.add(im);
    }
    if (rocks.length) {
      const im = new InstancedMesh(new DodecahedronGeometry(1, 0), rockMat, rocks.length); rocks.forEach(([x, y, h], i) => put(im, i, x * CELL, 0.55, y * CELL, 1.05 + h * 0.3, 0.8 + h * 0.6, 1.0 + h * 0.3, h * 20, 0.1)); im.instanceMatrix.needsUpdate = true; this.group.add(im);
    }
    if (trees.length) {
      const bark = new MeshStandardMaterial({ map: barkTexture(), roughness: 0.95 }), leaf = new MeshStandardMaterial({ map: leafTexture(), roughness: 0.9, flatShading: true });
      const trunk = new InstancedMesh(new CylinderGeometry(0.14, 0.22, 1.7, 7), bark, trees.length);
      const f1 = new InstancedMesh(new ConeGeometry(1.15, 1.5, 8), leaf, trees.length), f2 = new InstancedMesh(new ConeGeometry(0.9, 1.3, 8), leaf, trees.length), f3 = new InstancedMesh(new ConeGeometry(0.6, 1.1, 8), leaf, trees.length);
      trees.forEach(([x, y, h], i) => {
        const k = 0.9 + hashf(x, y, 21) * 0.5, px = x * CELL + (hashf(x, y, 22) - 0.5) * 0.25, pz = y * CELL + (hashf(x, y, 23) - 0.5) * 0.25;
        put(trunk, i, px, 0.85 * k, pz, k, k, k); put(f1, i, px, 1.45 * k + 0.2, pz, k, k, k, h * 9); put(f2, i, px, 2.2 * k + 0.2, pz, k, k, k, h * 5); put(f3, i, px, 2.85 * k + 0.2, pz, k, k, k, h * 3);
        const tint = new Color().setHSL(0.27 + hashf(x, y, 24) * 0.08, 0.45, 0.28 + hashf(x, y, 25) * 0.1); for (const f of [f1, f2, f3]) f.setColorAt(i, tint);
      });
      for (const im of [trunk, f1, f2, f3]) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; this.group.add(im); }
    }
    this.counts = { cliffs: cliffs.length, trees: trees.length, rocks: rocks.length };
  }
  /* ---------- ruined arches where the passages leave the region, and broken columns in the roomy cells ---------- */
  buildArches() {
    const { reg, CELL } = this; const mat = this.wallMat; this.arches = [];
    const arch = (px, pz, ang, broken) => {
      const g = new Group(); g.position.set(px, 0, pz); g.rotation.y = ang;
      const post = new BoxGeometry(0.34, 2.3, 0.34);
      const p1 = new Mesh(post, mat); p1.position.set(-0.86, 1.15, 0); g.add(p1);
      const p2 = new Mesh(new BoxGeometry(0.34, broken ? 1.35 : 2.3, 0.34), mat); p2.position.set(0.86, broken ? 0.675 : 1.15, 0); g.add(p2);
      const arc = new Mesh(new TorusGeometry(0.86, 0.15, 6, 14, broken ? Math.PI * 0.62 : Math.PI), mat); arc.position.set(0, 2.2, 0); arc.rotation.z = broken ? Math.PI * 0.38 : 0; g.add(arc);
      const cap = new Mesh(new BoxGeometry(0.5, 0.18, 0.5), mat); cap.position.set(-0.86, 2.38, 0); g.add(cap);
      this.group.add(g); this.arches.push(g);
    };
    for (let y = reg.y0; y <= reg.y1; y++) for (let x = reg.x0; x <= reg.x1; x++) {
      if (this.isWall(x, y)) continue;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy; if (!this.inMap(nx, ny) || this.isWall(nx, ny) || inRegion(reg, nx, ny)) continue; // a passage leaving the window
        arch(x * CELL + dx * 0.6, y * CELL + dy * 0.6, dx !== 0 ? Math.PI / 2 : 0, hashf(x, y, 31) < 0.5);
      }
    }
    // doors inside the window turn into a free-standing ruined arch too
    for (let y = reg.y0; y <= reg.y1; y++) for (let x = reg.x0; x <= reg.x1; x++) if ('Dd'.includes(this.tileFn(x, y))) { const ns = !this.isWall(x, y - 1) && !this.isWall(x, y + 1); arch(x * CELL, y * CELL, ns ? 0 : Math.PI / 2, true); }
    // broken columns at the corners of open cells that have four open neighbours
    const stumps = []; for (let y = reg.y0; y <= reg.y1; y++) for (let x = reg.x0; x <= reg.x1; x++) {
      if (this.tileFn(x, y) !== '.' || !DIRS4.every(([dx, dy]) => !this.isWall(x + dx, y + dy)) || hashf(x, y, 41) < 0.35) continue;
      const sx = hashf(x, y, 42) < 0.5 ? -1 : 1, sz = hashf(x, y, 43) < 0.5 ? -1 : 1; stumps.push([x * CELL + sx * 0.72, y * CELL + sz * 0.72, 0.5 + hashf(x, y, 44) * 0.9]);
    }
    if (stumps.length) { const im = new InstancedMesh(new CylinderGeometry(0.22, 0.26, 1, 8), mat, stumps.length); const m4 = new Matrix4(); stumps.forEach(([px, pz, h], i) => { m4.compose(new Vector3(px, h / 2, pz), new Quaternion(), new Vector3(1, h, 1)); im.setMatrixAt(i, m4); }); this.group.add(im); }
  }
  /* ---------- sky ---------- */
  buildSky() {
    const geo = new SphereGeometry(46, 24, 14); const n = geo.attributes.position.count; geo.setAttribute('color', new BufferAttribute(new Float32Array(n * 3), 3));
    this.dome = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, toneMapped: false, depthWrite: false })); this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    // stars on the upper half
    const sp = []; const r = rng(77); for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, e = 0.15 + r() * 1.3, R = 44; sp.push(Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R, Math.sin(a) * Math.cos(e) * R); }
    const sg = new BufferGeometry(); sg.setAttribute('position', new BufferAttribute(new Float32Array(sp), 3));
    this.stars = new Points(sg, new PointsMaterial({ size: 2, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false, toneMapped: false })); this.stars.frustumCulled = false;
    this.glowTex = glowTex(); this.sunSprite = new Sprite(new SpriteMaterial({ map: this.glowTex, color: 0xfff0c0, fog: false, depthWrite: false, toneMapped: false, transparent: true })); this.sunSprite.scale.set(16, 16, 1);
    this.moonSprite = new Sprite(new SpriteMaterial({ map: this.glowTex, color: 0xcfe0ff, fog: false, depthWrite: false, toneMapped: false, transparent: true })); this.moonSprite.scale.set(7, 7, 1);
    for (const o of [this.dome, this.stars, this.sunSprite, this.moonSprite]) this.fx.add(o);
  }
  paintSky(sky) {
    const pos = this.dome.geometry.attributes.position, col = this.dome.geometry.attributes.color; const c = new Color();
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 46; c.copy(sky.horizon).lerp(sky.top, Math.pow(clamp01(y * 1.25), 0.65)); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true;
  }
  /* ---------- weather ---------- */
  buildWeather() {
    const { CELL } = this; const w = this.wx1 - this.wx0, d = this.wz1 - this.wz0; const r = rng(this.reg.seed ^ 55);
    this.rainN = 260; const rp = new Float32Array(this.rainN * 6); this.rainV = new Float32Array(this.rainN);
    for (let i = 0; i < this.rainN; i++) { const x = this.wx0 + r() * w, y = r() * 4.2, z = this.wz0 + r() * d; rp.set([x, y, z, x - 0.04, y + 0.36, z], i * 6); this.rainV[i] = 7 + r() * 3; }
    const rg = new BufferGeometry(); rg.setAttribute('position', new BufferAttribute(rp, 3));
    this.rain = new LineSegments(rg, new LineBasicMaterial({ color: 0xb8d0ff, transparent: true, opacity: 0.45, depthWrite: false, fog: true })); this.rain.frustumCulled = false;
    this.mistN = 70; const mp = new Float32Array(this.mistN * 3); this.mistV = new Float32Array(this.mistN * 2);
    for (let i = 0; i < this.mistN; i++) { mp.set([this.wx0 + r() * w, 0.35 + r() * 1.5, this.wz0 + r() * d], i * 3); this.mistV[i * 2] = (r() - 0.5) * 0.25; this.mistV[i * 2 + 1] = (r() - 0.5) * 0.25; }
    const mg = new BufferGeometry(); mg.setAttribute('position', new BufferAttribute(mp, 3));
    this.mist = new Points(mg, new PointsMaterial({ size: 3.4, map: this.glowTex, color: 0xdfe8ee, transparent: true, opacity: 0.2, depthWrite: false, sizeAttenuation: true })); this.mist.frustumCulled = false;
    this.fx.add(this.rain, this.mist); this.setWeather(this.weather);
  }
  setWeather(k) { this.weather = k; this.rain.visible = k === 'rain'; this.mist.visible = k === 'mist'; this._skyHour = -99; }
  buildLight() {
    this.sun = new DirectionalLight(0xffffff, 0); this.sun.target.position.set(0, 0, 0); this.fx.add(this.sun, this.sun.target);
  }
  /** Put the scene back exactly as the indoor dungeon wants it. */
  restore(r) {
    const fog = r.scene.fog; if (fog) { fog.color.copy(this.indoorFog); fog.density = 0.075; }
    if (r.scene.background?.isColor) r.scene.background.copy(this.indoorFog);
    if (r.hemi) { r.hemi.color.set(0x6c7cff); r.hemi.groundColor.set(0x221122); r.hemi.intensity = 0.35; }
    r.scene.environmentIntensity = 0.25; r.torchK = 1;
  }
  /** Per-frame: ease the indoor⇄outdoor mix by how close the camera is to the open window, then dress the scene. Returns {mix, hour, weather, day}. */
  update(dt, t, r, steps = 0) {
    const cam = r.camera.position; const dx = Math.max(this.wx0 - cam.x, 0, cam.x - this.wx1), dz = Math.max(this.wz0 - cam.z, 0, cam.z - this.wz1);
    const target = clamp01(1 - Math.hypot(dx, dz) / (this.CELL * 4)); this.mix += (target - this.mix) * (1 - Math.pow(0.02, dt)); const m = smooth(this.mix);
    const hour = this.forceHour ?? hourAt(steps); this.hour = hour;
    if (m < 0.002) { if (!this._rest) { this._rest = true; this.fx.visible = false; this.restore(r); } return { mix: 0, hour, weather: this.weather, day: 0 }; }
    this._rest = false; this.fx.visible = true;
    if (Math.abs(hour - this._skyHour) > 0.04) { this._skyHour = hour; this.sky = skyAt(hour, this.weather); this.paintSky(this.sky); }
    const sky = this.sky;
    // dome follows the camera; sun and moon ride arcs across it
    this.dome.position.copy(cam); this.stars.position.copy(cam); this.stars.material.opacity = sky.stars;
    const hs = ((hour - 6) / 12) * Math.PI, hm = (((hour + 6) % 24) / 12 - 1) * Math.PI;
    const sd = new Vector3(Math.cos(hs), Math.sin(hs) * 0.95, -0.35).normalize(), md = new Vector3(Math.cos(hm), Math.sin(hm) * 0.95, 0.3).normalize();
    this.sunSprite.position.copy(cam).addScaledVector(sd, 40); this.moonSprite.position.copy(cam).addScaledVector(md, 40);
    const wk = this.weather === 'clear' ? 1 : this.weather === 'mist' ? 0.5 : 0.25;
    this.sunSprite.material.opacity = sd.y > 0 ? clamp01(sd.y * 4) * wk : 0; this.sunSprite.material.color.copy(sky.sun);
    this.moonSprite.material.opacity = md.y > 0 && hour >= 17.5 || hour < 6.5 ? clamp01(md.y * 4) * wk * (1 - sky.day) : 0;
    // fog, background, lights
    const fog = r.scene.fog; if (fog) { fog.color.copy(this.indoorFog).lerp(sky.fog, m); fog.density = 0.075 + (sky.fogDensity - 0.075) * m; }
    if (r.scene.background?.isColor) r.scene.background.copy(this.indoorFog).lerp(sky.fog, m);
    if (r.hemi) { r.hemi.color.set(0x6c7cff).lerp(sky.hemiSky, m); r.hemi.groundColor.set(0x221122).lerp(sky.hemiGround, m); r.hemi.intensity = 0.35 + (sky.hemiInt - 0.35) * m * 1.0; }
    const useSun = sky.day >= 0.15 && sd.y > 0.05; const ld = useSun ? sd : md; this.sun.position.copy(cam).addScaledVector(ld.clone().setY(Math.max(0.3, ld.y)).normalize(), 20); this.sun.target.position.copy(cam); this.sun.target.updateMatrixWorld();
    this.sun.color.copy(sky.sun); this.sun.intensity = sky.sunInt * m * (useSun ? 1 : 0.6);
    r.scene.environmentIntensity = 0.25 + 0.3 * m * sky.day;
    r.torchK = 1 - m * (0.15 + 0.6 * sky.day * (this.weather === 'rain' ? 0.6 : 1)); // the party's torch matters less in daylight
    this.groundMat.color.setScalar(0.5 + 0.5 * sky.day);
    // particles
    const slow = this.reduce ? 0.4 : 1;
    if (this.rain.visible) {
      const a = this.rain.geometry.attributes.position; const arr = a.array; const n = this.reduce ? this.rainN >> 1 : this.rainN; this.rain.geometry.setDrawRange(0, n * 2);
      for (let i = 0; i < n; i++) { const dy = this.rainV[i] * dt * slow; arr[i * 6 + 1] -= dy; arr[i * 6 + 4] -= dy; if (arr[i * 6 + 4] < 0) { arr[i * 6 + 1] += 4.4; arr[i * 6 + 4] += 4.4; } }
      a.needsUpdate = true; this.rain.material.opacity = 0.18 + 0.32 * (0.4 + 0.6 * sky.day);
    }
    if (this.mist.visible) {
      const a = this.mist.geometry.attributes.position; const arr = a.array; const w = this.wx1 - this.wx0, d = this.wz1 - this.wz0;
      for (let i = 0; i < this.mistN; i++) { arr[i * 3] += this.mistV[i * 2] * dt * slow; arr[i * 3 + 2] += this.mistV[i * 2 + 1] * dt * slow; if (arr[i * 3] < this.wx0) arr[i * 3] += w; if (arr[i * 3] > this.wx1) arr[i * 3] -= w; if (arr[i * 3 + 2] < this.wz0) arr[i * 3 + 2] += d; if (arr[i * 3 + 2] > this.wz1) arr[i * 3 + 2] -= d; }
      a.needsUpdate = true; this.mist.material.color.copy(sky.horizon).lerp(new Color(0xffffff), 0.35); this.mist.material.opacity = 0.14 + 0.1 * sky.day;
    }
    return { mix: m, hour, weather: this.weather, day: sky.day };
  }
}
