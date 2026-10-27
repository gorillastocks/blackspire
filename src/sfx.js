// Tiny procedural sound effects via WebAudio (no audio assets needed), routed through the SFX volume bus.
import { ac, out, isMuted } from './audio.js';
export { setMuted } from './audio.js';
function tone(freq, dur, type = 'square', vol = 0.06, slide = 0) {
  if (isMuted()) return;
  try {
    const ctx = ac(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(out('sfx')); o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}
const S = {
  click: () => tone(660, 0.05, 'square', 0.03), step: () => tone(90, 0.08, 'triangle', 0.05), bump: () => tone(60, 0.15, 'sawtooth', 0.06),
  door: () => tone(140, 0.3, 'sawtooth', 0.05, -60), chest: () => { tone(520, 0.1); setTimeout(() => tone(780, 0.15), 90); },
  swing: () => tone(300, 0.08, 'triangle', 0.04, -200), hit: () => tone(160, 0.1, 'square', 0.06, -80), crit: () => { tone(880, 0.1); setTimeout(() => tone(1320, 0.2), 80); },
  hurt: () => tone(110, 0.2, 'sawtooth', 0.07, -50), kill: () => tone(400, 0.3, 'square', 0.05, -350), spell: () => tone(600, 0.35, 'sine', 0.07, 600),
  heal: () => tone(500, 0.3, 'sine', 0.05, 300), encounter: () => { tone(220, 0.15); setTimeout(() => tone(185, 0.3), 150); },
  alarm: () => { tone(740, 0.12, 'sawtooth', 0.06); setTimeout(() => tone(520, 0.12, 'sawtooth', 0.06), 130); setTimeout(() => tone(740, 0.12, 'sawtooth', 0.06), 260); setTimeout(() => tone(110, 0.45, 'square', 0.08, -40), 400); },
  victory: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.05), i * 120)); }, dice: () => tone(900, 0.04, 'square', 0.03),
};
let sfxOn = true; export function setSfxOn(v) { sfxOn = !!v; }
/** Filtered white-noise burst: the body of whooshes, slashes, crackles and thuds. */
let noiseBuf = null;
function noise(dur, { vol = 0.08, type = 'bandpass', f0 = 1200, f1 = f0, q = 1, attack = 0.005, delay = 0 } = {}) {
  if (isMuted() || !sfxOn) return;
  try {
    const ctx = ac(); if (!ctx) return; const t = ctx.currentTime + delay;
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf;
    f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out('sfx')); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  } catch { /* audio unavailable */ }
}
const later = (ms, f) => setTimeout(f, ms);
// Weapon and spell sounds (all original, generated live).
Object.assign(S, {
  slash: () => { noise(0.16, { f0: 5000, f1: 1400, q: 2.5, vol: 0.09 }); tone(1800, 0.06, 'triangle', 0.015, -900); },
  thud: () => { tone(85, 0.18, 'sine', 0.14, -40); noise(0.1, { type: 'lowpass', f0: 600, f1: 150, vol: 0.12 }); },
  twang: () => { tone(196, 0.22, 'triangle', 0.06, -30); tone(392, 0.1, 'sawtooth', 0.02, -60); later(120, () => noise(0.12, { f0: 2500, f1: 900, q: 3, vol: 0.05 })); },
  stab: () => { noise(0.08, { f0: 3000, f1: 1800, q: 4, vol: 0.08 }); tone(220, 0.07, 'square', 0.03, -120); },
  punch: () => { tone(120, 0.1, 'sine', 0.12, -60); noise(0.06, { type: 'lowpass', f0: 900, f1: 300, vol: 0.08 }); },
  fire: () => { noise(0.45, { type: 'lowpass', f0: 300, f1: 2400, vol: 0.12, attack: 0.08 }); noise(0.3, { f0: 900, f1: 500, q: 0.7, vol: 0.05, delay: 0.15 }); },
  cold: () => { for (let i = 0; i < 6; i++) later(i * 45 + Math.random() * 30, () => noise(0.04, { type: 'highpass', f0: 4000 + Math.random() * 3000, vol: 0.06 })); tone(1400, 0.3, 'sine', 0.02, 600); },
  zap: () => { tone(1200, 0.18, 'sawtooth', 0.04, -900); noise(0.2, { type: 'highpass', f0: 2500, f1: 6000, vol: 0.07 }); later(70, () => tone(900, 0.1, 'square', 0.03, -500)); },
  chime: () => { [784, 988, 1175, 1568].forEach((f, i) => later(i * 70, () => tone(f, 0.45, 'sine', 0.035))); },
  ping: () => { tone(1760, 0.12, 'sine', 0.05, 200); tone(2640, 0.08, 'sine', 0.02); },
  radiant: () => { [660, 990, 1320].forEach((f, i) => later(i * 40, () => tone(f, 0.35, 'triangle', 0.03, 120))); },
  arcane: () => { tone(500, 0.3, 'sine', 0.05, 500); noise(0.25, { f0: 1500, f1: 3500, q: 6, vol: 0.04 }); },
  boom: () => { tone(60, 0.6, 'sine', 0.16, -30); noise(0.7, { type: 'lowpass', f0: 1800, f1: 120, vol: 0.16, attack: 0.01 }); },
  miss: () => noise(0.18, { f0: 700, f1: 2200, q: 1.5, vol: 0.05, attack: 0.04 }),
  crit: () => { tone(880, 0.1, 'square', 0.04); later(70, () => tone(1320, 0.22, 'square', 0.04)); noise(0.15, { type: 'lowpass', f0: 1200, f1: 200, vol: 0.12 }); },
  mhit: () => { tone(70, 0.25, 'sawtooth', 0.07, -30); noise(0.18, { type: 'lowpass', f0: 800, f1: 160, vol: 0.12 }); },
  mdeath: () => { tone(180, 0.7, 'sawtooth', 0.06, -150); noise(0.6, { type: 'lowpass', f0: 1000, f1: 100, vol: 0.08, attack: 0.05 }); },
});
export function sfx(n) { if (!sfxOn) return; S[n]?.(); }
export const SFX_NAMES = Object.keys(S);
/** Sound for a weapon hit, by weapon kind (see weaponKind in fx.js). */
export const WEAPON_SFX = { sword: 'slash', axe: 'slash', dagger: 'stab', spear: 'stab', rapier: 'stab', mace: 'thud', bow: 'twang', crossbow: 'twang', fist: 'punch' };
/** Sound for a spell (by key) or damage type. */
export const SPELL_SFX = { fire: 'fire', cold: 'cold', lightning: 'zap', thunder: 'boom', radiant: 'radiant', force: 'ping', necrotic: 'arcane', poison: 'arcane', acid: 'arcane', psychic: 'arcane' };
