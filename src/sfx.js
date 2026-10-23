// Tiny procedural sound effects via WebAudio (no audio assets needed).
let ctx = null; let muted = false;
export function setMuted(m) { muted = m; }
function tone(freq, dur, type = 'square', vol = 0.06, slide = 0) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), ctx.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  } catch { /* audio unavailable */ }
}
const S = {
  click: () => tone(660, 0.05, 'square', 0.03), step: () => tone(90, 0.08, 'triangle', 0.05), bump: () => tone(60, 0.15, 'sawtooth', 0.06),
  door: () => tone(140, 0.3, 'sawtooth', 0.05, -60), chest: () => { tone(520, 0.1); setTimeout(() => tone(780, 0.15), 90); },
  swing: () => tone(300, 0.08, 'triangle', 0.04, -200), hit: () => tone(160, 0.1, 'square', 0.06, -80), crit: () => { tone(880, 0.1); setTimeout(() => tone(1320, 0.2), 80); },
  hurt: () => tone(110, 0.2, 'sawtooth', 0.07, -50), kill: () => tone(400, 0.3, 'square', 0.05, -350), spell: () => tone(600, 0.35, 'sine', 0.07, 600),
  heal: () => tone(500, 0.3, 'sine', 0.05, 300), encounter: () => { tone(220, 0.15); setTimeout(() => tone(185, 0.3), 150); },
  victory: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.05), i * 120)); }, dice: () => tone(900, 0.04, 'square', 0.03),
};
export function sfx(n) { S[n]?.(); }
