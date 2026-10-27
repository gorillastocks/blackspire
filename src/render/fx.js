/* Pooled combat effects for the arena: particles, impact sprites, projectiles, area blasts. No external assets. */
import { NormalBlending, AdditiveBlending, CanvasTexture, Sprite, SpriteMaterial, Vector3, Color, Mesh, SphereGeometry, MeshBasicMaterial, PointLight } from 'three';

function tex(draw, s = 64) { const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'); draw(g, s); const t = new CanvasTexture(c); return t; }
const TEX = {};
function textures() {
  if (TEX.glow) return TEX;
  TEX.glow = tex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  TEX.slash = tex((g, s) => { g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 8; for (const [w, o] of [[7, 0], [3, 10]]) { g.lineWidth = w; g.beginPath(); g.arc(s * 0.15, s * 1.0 + o, s * 0.85, -1.25, -0.25); g.stroke(); } }, 128);
  TEX.pierce = tex((g, s) => { g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.moveTo(s / 2, 4); g.lineTo(s / 2 + 7, s / 2); g.lineTo(s / 2, s - 4); g.lineTo(s / 2 - 7, s / 2); g.fill(); g.fillRect(8, s / 2 - 2, s - 16, 4); }, 128);
  TEX.smash = tex((g, s) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 8; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * s * 0.14, s / 2 + Math.sin(a) * s * 0.14); g.lineTo(s / 2 + Math.cos(a) * s * (i % 2 ? 0.34 : 0.46), s / 2 + Math.sin(a) * s * (i % 2 ? 0.34 : 0.46)); g.stroke(); } g.beginPath(); g.arc(s / 2, s / 2, s * 0.12, 0, 7); g.stroke(); }, 128);
  // stylized weapons, drawn pointing up (tip at the top), 128 px, transparent
  const W = (draw) => tex((g, s) => { g.lineJoin = 'round'; g.lineCap = 'round'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 4; draw(g, s); }, 128);
  const blade = (g, x0, y0, x1, y1, w, fill = '#e8eef8', edge = '#9aa6bd') => { g.fillStyle = fill; g.strokeStyle = edge; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - w, y1); g.lineTo(x0 - w, y0 + w * 2); g.lineTo(x0, y0); g.lineTo(x0 + w, y0 + w * 2); g.lineTo(x0 + w, y1); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = '#ffffffaa'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y0 + 6); g.lineTo(x0, y1 - 2); g.stroke(); };
  const grip = (g, x, y0, y1, w = 4, col = '#6b4426') => { g.fillStyle = col; g.fillRect(x - w, y0, w * 2, y1 - y0); };
  TEX.w_sword = W((g) => { blade(g, 64, 6, 64, 88, 7); g.fillStyle = '#c9a03a'; g.fillRect(44, 88, 40, 7); grip(g, 64, 95, 116); g.fillStyle = '#c9a03a'; g.beginPath(); g.arc(64, 119, 5, 0, 7); g.fill(); });
  TEX.w_dagger = W((g) => { blade(g, 64, 30, 64, 84, 6); g.fillStyle = '#b08a3a'; g.fillRect(50, 84, 28, 6); grip(g, 64, 90, 110, 4); });
  TEX.w_spear = W((g) => { grip(g, 64, 30, 126, 3, '#7a5530'); g.fillStyle = '#d9e2ee'; g.strokeStyle = '#8b97ac'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 2); g.lineTo(74, 30); g.lineTo(64, 36); g.lineTo(54, 30); g.closePath(); g.fill(); g.stroke(); });
  TEX.w_axe = W((g) => { grip(g, 64, 14, 124, 4, '#7a5530'); g.fillStyle = '#cfd8e6'; g.strokeStyle = '#7f8aa0'; g.lineWidth = 2; g.beginPath(); g.moveTo(66, 18); g.quadraticCurveTo(112, 14, 116, 34); g.quadraticCurveTo(110, 58, 66, 52); g.closePath(); g.fill(); g.stroke(); });
  TEX.w_mace = W((g) => { grip(g, 64, 40, 124, 4, '#6b4426'); g.fillStyle = '#9aa3b4'; g.strokeStyle = '#5d6577'; g.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 14, 28 + Math.sin(a) * 14); g.lineTo(64 + Math.cos(a) * 26, 28 + Math.sin(a) * 26); g.lineTo(64 + Math.cos(a + 0.3) * 14, 28 + Math.sin(a + 0.3) * 14); g.fill(); } g.beginPath(); g.arc(64, 28, 17, 0, 7); g.fill(); g.stroke(); });
  TEX.w_arrow = W((g) => { g.strokeStyle = '#a8794a'; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 20); g.lineTo(64, 116); g.stroke(); g.fillStyle = '#d9e2ee'; g.beginPath(); g.moveTo(64, 4); g.lineTo(73, 24); g.lineTo(55, 24); g.closePath(); g.fill(); g.fillStyle = '#e04848'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(64, 96); g.lineTo(64 + sx * 11, 106); g.lineTo(64 + sx * 11, 122); g.lineTo(64, 112); g.closePath(); g.fill(); } });
  TEX.w_bolt = W((g) => { g.strokeStyle = '#7a5530'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 26); g.lineTo(64, 100); g.stroke(); g.fillStyle = '#c8d2e0'; g.beginPath(); g.moveTo(64, 8); g.lineTo(74, 30); g.lineTo(54, 30); g.closePath(); g.fill(); g.fillStyle = '#d8d0b0'; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(64, 86); g.lineTo(64 + sx * 9, 100); g.lineTo(64, 100); g.fill(); } });
  TEX.w_fist = W((g) => { g.fillStyle = '#e8b48a'; g.strokeStyle = '#8a5a3a'; g.lineWidth = 3; g.beginPath(); g.roundRect(34, 28, 60, 52, 14); g.fill(); g.stroke(); for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(49 + i * 15, 30); g.lineTo(49 + i * 15, 50); g.stroke(); } g.beginPath(); g.roundRect(28, 52, 26, 18, 8); g.fill(); g.stroke(); g.fillStyle = '#6b4426'; g.fillRect(40, 80, 48, 34); });
  return TEX;
}
/** Visual family of a weapon (by its WEAPONS key). Unknown → null (plain slash). */
export function weaponKind(base) {
  if (!base) return null; if (base === 'unarmed') return 'fist';
  if (/longbow|shortbow/.test(base)) return 'bow'; if (/crossbow/i.test(base)) return 'crossbow';
  if (/axe/i.test(base)) return 'axe'; if (/mace|hammer|maul|club|quarterstaff|morningstar|flail/i.test(base)) return 'mace';
  if (/dagger|rapier|shortsword/.test(base)) return 'dagger'; if (/spear|javelin|pike|trident|glaive|halberd/.test(base)) return 'spear';
  if (/sword|scimitar|sickle/.test(base)) return 'sword'; return null;
}
export const TYPE_COLOR = { fire: 0xff6a20, cold: 0x8ae8ff, lightning: 0x9fd0ff, thunder: 0x7aa0ff, force: 0xc080ff, radiant: 0xfff2a0, necrotic: 0x9a60d0, poison: 0x7dff5a, acid: 0xb0ff40, psychic: 0xff7ae0, slashing: 0xffffff, piercing: 0xffffff, bludgeoning: 0xffffff };
export const IMPACT = { slashing: 'slash', piercing: 'pierce', bludgeoning: 'smash' };
/** Spell → projectile look. kind: bolt (single travelling orb + trail), ray (fast thin beam of orbs), darts, column, area. */
export const SPELL_FX = {
  fireBolt: { kind: 'bolt', color: 0xff5020, trail: true, size: 0.28 },
  rayOfFrost: { kind: 'ray', color: 0x90f0ff, size: 0.16 },
  eldritchBlast: { kind: 'bolt', color: 0xb060ff, trail: true, size: 0.3 },
  magicMissile: { kind: 'dart', color: 0xb070ff, trail: true, size: 0.16 },
  scorchingRay: { kind: 'ray', color: 0xff5020, size: 0.18 },
  guidingBolt: { kind: 'bolt', color: 0xfff0a0, trail: true, size: 0.3 },
  produceFlame: { kind: 'bolt', color: 0xff8030, trail: true, size: 0.24 },
  shockingGrasp: { kind: 'ray', color: 0x9fd0ff, size: 0.14 },
  inflictWounds: { kind: 'bolt', color: 0x8a40c0, size: 0.24 },
  spiritualWeapon: { kind: 'bolt', color: 0xfff0b0, size: 0.24 },
  viciousMockery: { kind: 'bolt', color: 0xff7ae0, size: 0.2 },
  sacredFlame: { kind: 'column', color: 0xfff080 },
  moonbeam: { kind: 'column', color: 0xd8e8ff },
  flameStrike: { kind: 'column', color: 0xff9030 },
  fireball: { kind: 'area', color: 0xff6020 },
  iceStorm: { kind: 'area', color: 0x90e0ff },
  shatter: { kind: 'area', color: 0x7aa0ff },
  thunderwave: { kind: 'area', color: 0x6aa0ff },
  burningHands: { kind: 'area', color: 0xff8030 },
  lightningBolt: { kind: 'ray', color: 0x9fd0ff, size: 0.24 },
  callLightning: { kind: 'column', color: 0x9fd0ff },
  breath: { kind: 'area', color: 0xff4000 },
};

export class FX {
  constructor(scene, cam, size = 96) {
    const T = textures(); this.scene = scene; this.cam = cam; this.live = []; this.pool = []; this.jobs = [];
    for (let i = 0; i < size; i++) { const s = new Sprite(new SpriteMaterial({ map: T.glow, color: 0xffffff, blending: AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })); s.visible = false; s.renderOrder = 10; scene.add(s); this.pool.push(s); }
    this.light = new PointLight(0xffffff, 0, 9, 2); scene.add(this.light); this.lightT = 0;
    this.ball = new Mesh(new SphereGeometry(1, 20, 14), new MeshBasicMaterial({ color: 0xff6020, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false })); this.ball.visible = false; scene.add(this.ball); this.ballT = -1;
    this.tmp = new Vector3(); this.speed = 1; this.reduceMotion = false;
    this.wsp = [0, 1].map(() => { const w = new Sprite(new SpriteMaterial({ map: T.w_sword, blending: NormalBlending, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })); w.visible = false; w.renderOrder = 10; scene.add(w); return w; }); this.wi = 0;
  }
  /** Take a sprite from the pool (recycles the oldest when exhausted). */
  spawn({ pos, vel = null, life = 0.5, size = 0.3, grow = 0, color = 0xffffff, map = 'glow', rot = 0, spin = 0, gravity = 0, opacity = 1 }) {
    let s = this.pool.pop(); if (!s) { const o = this.live.shift(); s = o.s; }
    s.material.map = TEX[map]; s.material.color.setHex(color); s.material.rotation = rot; s.material.opacity = opacity; s.position.copy(pos); s.scale.setScalar(size); s.visible = true;
    this.live.push({ s, vel: vel ? vel.clone() : null, life, t: 0, size, grow, spin, gravity, opacity }); return s;
  }
  flashLight(pos, color, power = 30, t = 0.3) { this.light.position.copy(pos); this.light.color.setHex(color); this.light.intensity = power; this.lightPow = power; this.lightT = t; this.lightT0 = t; }
  burst(pos, color, n = 14, spread = 2.2, size = 0.22) {
    for (let i = 0; i < n; i++) { const v = new Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(spread * (0.4 + Math.random() * 0.8)); this.spawn({ pos, vel: v, life: 0.35 + Math.random() * 0.3, size: size * (0.6 + Math.random() * 0.8), grow: -size, color, gravity: -2 }); }
    this.spawn({ pos, life: 0.25, size: size * 4, grow: size * 6, color, opacity: 0.9 }); this.flashLight(pos, color, 35, 0.3);
  }
  impact(pos, dtype, crit = false) {
    const map = IMPACT[dtype]; const col = TYPE_COLOR[dtype] || 0xffffff;
    if (map) this.spawn({ pos: this.tmp.copy(pos).add(new Vector3(0, 0, 0.3)), life: 0.32, size: crit ? 1.5 : 1.0, grow: 1.2, color: crit ? 0xffe060 : 0xffffff, map, rot: map === 'pierce' ? Math.random() * 0.6 - 0.3 + 0.8 : Math.random() * 1.2 - 0.6, spin: map === 'smash' ? 2 : 0 });
    this.burst(pos, crit ? 0xffd040 : col, crit ? 16 : 8, crit ? 2.6 : 1.6, 0.14);
  }
  /** Travel from a → b; resolves on arrival (after the burst is spawned). */
  projectile(a, b, look, durMs) {
    return new Promise((res) => this.jobs.push({ kind: 'proj', a: a.clone(), b: b.clone(), look, t: 0, dur: Math.max(0.08, durMs / 1000), res, last: 0, arc: look.kind === 'dart' ? (Math.random() - 0.5) * 1.6 : 0 }));
  }
  column(pos, color, durMs) {
    return new Promise((res) => this.jobs.push({ kind: 'column', pos: pos.clone(), color, t: 0, dur: Math.max(0.1, durMs / 1000), res, last: 0 }));
  }
  area(pos, color, radius, durMs) {
    this.ball.position.copy(pos); this.ball.material.color.setHex(color); this.ball.visible = true; this.ballT = 0; this.ballDur = Math.max(0.15, durMs / 1000); this.ballR = radius;
    this.burst(pos, color, 30, 4, 0.35); this.flashLight(pos, color, 60, 0.5);
    return new Promise((r) => setTimeout(r, durMs * 0.5));
  }
  /** Dust/wind whoosh past the camera as a monster leaps in (no-op under reduceMotion). */
  rush(pos, reduce = false) {
    if (reduce || !pos) return;
    const p = pos.clone();
    for (let i = 0; i < 8; i++) {
      const vel = new Vector3((Math.random() - 0.5) * 1.2, Math.random() * 0.6 - 0.1, 2.5 + Math.random() * 2.5);
      this.spawn({ pos: p.clone().add(new Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.2) * 0.8, 0)), vel, life: 0.28 + Math.random() * 0.18, size: 0.1 + Math.random() * 0.08, grow: -0.12, color: 0xd8c8ff, opacity: 0.7, gravity: 0 });
    }
    this.flashLight(p, 0xffffff, 18, 0.18);
  }
  /** A stylized weapon striking the target at `pos` (monster centre). from: world point the shot starts at (bows).
   *  Resolves at the moment of contact; the weapon lingers briefly afterwards. */
  weaponStrike(kind, pos, { from = null, crit = false, durMs = 240, size = 1.3 } = {}) {
    const map = { sword: 'w_sword', dagger: 'w_dagger', spear: 'w_spear', axe: 'w_axe', mace: 'w_mace', bow: 'w_arrow', crossbow: 'w_bolt', fist: 'w_fist' }[kind];
    if (!map) return Promise.resolve(false);
    const sp = this.wsp[this.wi++ % this.wsp.length]; sp.material.map = TEX[map]; sp.material.needsUpdate = true; sp.material.opacity = 1; sp.visible = true;
    const dur = Math.max(0.09, durMs / 1000) * (kind === 'dagger' || kind === 'fist' ? 0.7 : 1);
    return new Promise((res) => this.jobs.push({ kind: 'weapon', w: kind, sp, pos: pos.clone(), from: from ? from.clone() : null, crit, size: kind === 'spear' ? size * 1.5 : kind === 'bow' || kind === 'crossbow' ? size * 0.75 : size, t: 0, dur, hold: kind === 'bow' || kind === 'crossbow' ? 0.35 : 0.14, res, hit: false }));
  }
  /** Weapon pose at progress k (0..1 → contact): offset in view units, screen rotation, scale factor. */
  static pose(w, k) {
    const e = 1 - (1 - k) * (1 - k); // ease-out
    switch (w) {
      case 'sword': return { x: -0.7 + 1.4 * e, y: 0.45 - 0.55 * Math.sin(e * Math.PI) * 0.6, r: 1.0 - 2.1 * e, s: 1 };
      case 'axe': return { x: 0.35 - 0.25 * e, y: 0.9 - 0.85 * e * e, r: 0.9 - 1.6 * e * e, s: 1 };
      case 'mace': return { x: 0.25, y: 0.85 - 0.8 * k * k, r: 0.7 - 1.3 * k * k, s: 1 };
      case 'dagger': return { x: 0.15 - 0.1 * e, y: -1.1 + 1.05 * e, r: 0.25, s: 1.35 - 0.45 * e };
      case 'spear': return { x: 0.2 - 0.15 * e, y: -1.6 + 1.4 * e, r: 0.12, s: 1.2 - 0.3 * e };
      case 'fist': return { x: 0, y: -0.9 + 0.85 * e, r: 0, s: 1.6 - 0.7 * e };
      default: return { x: 0, y: 0, r: 0, s: 1 };
    }
  }
  clear() { for (const w of this.wsp || []) w.visible = false; for (const o of this.live) { o.s.visible = false; this.pool.push(o.s); } this.live = []; for (const j of this.jobs) j.res?.(); this.jobs = []; this.ball.visible = false; this.light.intensity = 0; }
  update(dt) {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i]; j.t += dt; const k = Math.min(1, j.t / j.dur);
      if (j.kind === 'proj') {
        const p = this.tmp.copy(j.a).lerp(j.b, k); p.y += Math.sin(k * Math.PI) * (0.25 + Math.abs(j.arc) * 0.3); p.x += Math.sin(k * Math.PI) * j.arc;
        const L = j.look; this.spawn({ pos: p, life: L.kind === 'ray' ? 0.18 : 0.06, size: L.size * (L.kind === 'ray' ? 1 : 1.8), color: L.color });
        if (L.trail && j.t - j.last > 0.016) { j.last = j.t; this.spawn({ pos: p, vel: new Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.5, (Math.random() - 0.5) * 0.4), life: 0.35, size: L.size, grow: -L.size, color: L.color, opacity: 0.8 }); }
        if (k >= 1) { this.burst(j.b, L.color, L.kind === 'dart' ? 8 : 14, 1.8, L.kind === 'dart' ? 0.14 : 0.22); this.jobs.splice(i, 1); j.res(); }
      } else if (j.kind === 'weapon') {
        const sp = j.sp, rm = this.reduceMotion; const kk = rm ? 1 : k;
        if (j.w === 'bow' || j.w === 'crossbow') {
          const a = j.from || this.tmp.copy(j.pos).add(new Vector3(0, -2.2, 3));
          sp.position.copy(a).lerp(j.pos, kk); sp.position.z += 0.2; sp.scale.setScalar(j.size);
          const p0 = a.clone().project(this.cam), p1 = j.pos.clone().project(this.cam); sp.material.rotation = Math.atan2(-(p1.x - p0.x), p1.y - p0.y);
          if (!rm && j.t - (j.last || 0) > 0.03) { j.last = j.t; this.spawn({ pos: sp.position, life: 0.18, size: 0.08, color: 0xfff2c0, opacity: 0.6 }); }
        } else {
          const P = FX.pose(j.w, kk); sp.position.copy(j.pos).add(new Vector3(P.x * j.size * 0.6, P.y * j.size * 0.6 + j.size * 0.15, 0.45)); sp.material.rotation = P.r; sp.scale.setScalar(j.size * P.s);
          if (j.w === 'sword' && !rm && j.t - (j.last || 0) > 0.02) { j.last = j.t; this.spawn({ pos: sp.position, life: 0.16, size: 0.35, color: j.crit ? 0xffe060 : 0xdfe8ff, opacity: 0.5 }); }
        }
        if (k >= 1 && !j.hit) { j.hit = true; j.res(true); this.burst(j.pos, j.crit ? 0xffd040 : 0xffffff, j.w === 'mace' || j.crit ? 14 : 6, j.w === 'mace' ? 2.4 : 1.4, 0.14); if (j.w === 'mace') this.spawn({ pos: j.pos, life: 0.3, size: 1.1, grow: 1.4, map: 'smash', color: 0xffffff }); }
        if (j.t >= j.dur + j.hold) { sp.visible = false; this.jobs.splice(i, 1); } else if (k >= 1) sp.material.opacity = 1 - (j.t - j.dur) / j.hold;
      } else if (j.kind === 'column') {
        if (j.t - j.last > 0.02) { j.last = j.t; for (let n = 0; n < 2; n++) this.spawn({ pos: this.tmp.copy(j.pos).add(new Vector3((Math.random() - 0.5) * 0.5, 2.6 - k * 2.6 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3)), vel: new Vector3(0, -3, 0), life: 0.3, size: 0.3, grow: -0.3, color: j.color }); }
        if (k >= 1) { this.burst(j.pos, j.color, 16, 2, 0.24); this.jobs.splice(i, 1); j.res(); }
      }
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const o = this.live[i]; o.t += dt; const f = o.t / o.life;
      if (f >= 1) { o.s.visible = false; this.pool.push(o.s); this.live.splice(i, 1); continue; }
      if (o.vel) { o.vel.y += o.gravity * dt; o.s.position.addScaledVector(o.vel, dt); }
      o.s.scale.setScalar(Math.max(0.001, o.size + o.grow * o.t)); o.s.material.opacity = o.opacity * (1 - f * f); if (o.spin) o.s.material.rotation += o.spin * dt;
    }
    if (this.lightT > 0) { this.lightT -= dt; this.light.intensity = Math.max(0, this.lightPow * (this.lightT / this.lightT0)); }
    if (this.ballT >= 0) { this.ballT += dt; const k = this.ballT / this.ballDur; this.ball.scale.setScalar(0.2 + this.ballR * Math.min(1, k * 1.6)); this.ball.material.opacity = Math.max(0, 0.85 * (1 - k)); if (k >= 1) { this.ballT = -1; this.ball.visible = false; } }
  }
  get activeCount() { return this.live.length; }
}
void Color;
