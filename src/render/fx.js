/* Pooled combat effects for the arena: particles, impact sprites, projectiles, area blasts. No external assets. */
import { AdditiveBlending, CanvasTexture, Sprite, SpriteMaterial, Vector3, Color, Mesh, SphereGeometry, MeshBasicMaterial, PointLight } from 'three';

function tex(draw, s = 64) { const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'); draw(g, s); const t = new CanvasTexture(c); return t; }
const TEX = {};
function textures() {
  if (TEX.glow) return TEX;
  TEX.glow = tex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  TEX.slash = tex((g, s) => { g.strokeStyle = '#fff'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 8; for (const [w, o] of [[7, 0], [3, 10]]) { g.lineWidth = w; g.beginPath(); g.arc(s * 0.15, s * 1.0 + o, s * 0.85, -1.25, -0.25); g.stroke(); } }, 128);
  TEX.pierce = tex((g, s) => { g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10; g.beginPath(); g.moveTo(s / 2, 4); g.lineTo(s / 2 + 7, s / 2); g.lineTo(s / 2, s - 4); g.lineTo(s / 2 - 7, s / 2); g.fill(); g.fillRect(8, s / 2 - 2, s - 16, 4); }, 128);
  TEX.smash = tex((g, s) => { g.strokeStyle = '#fff'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 8; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * s * 0.14, s / 2 + Math.sin(a) * s * 0.14); g.lineTo(s / 2 + Math.cos(a) * s * (i % 2 ? 0.34 : 0.46), s / 2 + Math.sin(a) * s * (i % 2 ? 0.34 : 0.46)); g.stroke(); } g.beginPath(); g.arc(s / 2, s / 2, s * 0.12, 0, 7); g.stroke(); }, 128);
  return TEX;
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
    this.tmp = new Vector3(); this.speed = 1;
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
  clear() { for (const o of this.live) { o.s.visible = false; this.pool.push(o.s); } this.live = []; for (const j of this.jobs) j.res?.(); this.jobs = []; this.ball.visible = false; this.light.intensity = 0; }
  update(dt) {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i]; j.t += dt; const k = Math.min(1, j.t / j.dur);
      if (j.kind === 'proj') {
        const p = this.tmp.copy(j.a).lerp(j.b, k); p.y += Math.sin(k * Math.PI) * (0.25 + Math.abs(j.arc) * 0.3); p.x += Math.sin(k * Math.PI) * j.arc;
        const L = j.look; this.spawn({ pos: p, life: L.kind === 'ray' ? 0.18 : 0.06, size: L.size * (L.kind === 'ray' ? 1 : 1.8), color: L.color });
        if (L.trail && j.t - j.last > 0.016) { j.last = j.t; this.spawn({ pos: p, vel: new Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.5, (Math.random() - 0.5) * 0.4), life: 0.35, size: L.size, grow: -L.size, color: L.color, opacity: 0.8 }); }
        if (k >= 1) { this.burst(j.b, L.color, L.kind === 'dart' ? 8 : 14, 1.8, L.kind === 'dart' ? 0.14 : 0.22); this.jobs.splice(i, 1); j.res(); }
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
