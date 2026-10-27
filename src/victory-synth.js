// Procedural victory fanfares (WebAudio). Shared by in-game preview and offline render.
// Variants A–E — Sean picks one; recorded Curtain Rises remains the win default until then.

export const VICTORY_VARIANTS = {
  A: { id: 'A', label: 'Brass arpeggio', blurb: 'Rising C–E–G then bright C-major chord' },
  B: { id: 'B', label: 'FF triplet', blurb: 'Short Final-Fantasy-style triplet fanfare' },
  C: { id: 'C', label: 'Chiptune', blurb: 'Bright 8-bit square jingle' },
  D: { id: 'D', label: 'Swell + chime', blurb: 'Orchestral-ish chord swell with sparkle chime' },
  E: { id: 'E', label: 'Harp flourish', blurb: 'Quick plucky harp/bell flourish' },
};

const C4 = 261.63, E4 = 329.63, G4 = 392.0;
const C5 = 523.25, E5 = 659.25, G5 = 783.99, A5 = 880.0;
const C6 = 1046.5, E6 = 1318.51, G6 = 1567.98;

function envGain(ctx, t0, attack, hold, release, peak = 0.22) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.max(0.008, attack));
  g.gain.setValueAtTime(Math.max(0.0002, peak), t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + Math.max(0.04, release));
  return g;
}

function osc(ctx, type, freq, t0, dur, dest, peak = 0.18) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  const g = envGain(ctx, t0, 0.012, Math.max(0.02, dur - 0.08), 0.08, peak);
  o.connect(g).connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  return o;
}

function brassVoice(ctx, freq, t0, dur, dest, peak = 0.16) {
  const mix = ctx.createGain();
  mix.gain.value = 1;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = 0.75;
  f.frequency.setValueAtTime(1600, t0);
  f.frequency.linearRampToValueAtTime(3400, t0 + Math.min(0.28, dur * 0.45));
  f.frequency.exponentialRampToValueAtTime(1100, t0 + dur);
  const g = envGain(ctx, t0, 0.018, Math.max(0.04, dur - 0.14), 0.12, peak);
  for (const [type, det, p] of [['sawtooth', 0, 0.55], ['square', 1.2, 0.32], ['sawtooth', -1.8, 0.22]]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq + det), t0);
    const pg = ctx.createGain();
    pg.gain.value = p;
    o.connect(pg).connect(mix);
    o.start(t0);
    o.stop(t0 + dur + 0.08);
  }
  mix.connect(f).connect(g).connect(dest);
}

function convolverTail(ctx, dest, seconds = 0.5, decay = 2.4) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const conv = ctx.createConvolver();
  conv.buffer = buf;
  const wet = ctx.createGain();
  wet.gain.value = 0.26;
  conv.connect(wet).connect(dest);
  return conv;
}

function masterBus(ctx, dest) {
  const dry = ctx.createGain();
  dry.gain.value = 0.9;
  const out = ctx.createGain();
  out.gain.value = 1;
  const verb = convolverTail(ctx, out);
  dry.connect(out);
  dry.connect(verb);
  out.connect(dest);
  return dry;
}

function variantA(ctx, dest, t0) {
  const bus = masterBus(ctx, dest);
  [C4, E4, G4].forEach((f, i) => brassVoice(ctx, f, t0 + i * 0.11, 0.22, bus, 0.22));
  const chordT = t0 + 0.36;
  for (const f of [C5, E5, G5, C6]) brassVoice(ctx, f, chordT, 1.2, bus, f === C5 || f === C6 ? 0.24 : 0.15);
  return 1.75;
}

function variantB(ctx, dest, t0) {
  const bus = masterBus(ctx, dest);
  const steps = [
    [0.0, G4, 0.1, 0.22], [0.11, G4, 0.1, 0.22], [0.24, C5, 0.32, 0.26],
    [0.6, G5, 0.1, 0.2], [0.72, A5, 0.1, 0.2], [0.84, C6, 0.14, 0.22], [1.0, G5, 0.48, 0.24],
  ];
  for (const [dt, f, dur, peak] of steps) brassVoice(ctx, f, t0 + dt, dur, bus, peak);
  return 1.7;
}

function variantC(ctx, dest, t0) {
  const bus = masterBus(ctx, dest);
  const seq = [C5, E5, G5, C6, G5, E5, G5, C6];
  seq.forEach((f, i) => osc(ctx, 'square', f, t0 + i * 0.085, 0.11, bus, 0.17));
  osc(ctx, 'square', C6, t0 + 0.75, 0.55, bus, 0.22);
  osc(ctx, 'square', E6, t0 + 0.75, 0.55, bus, 0.1);
  osc(ctx, 'square', G5, t0 + 0.75, 0.55, bus, 0.08);
  return 1.55;
}

function variantD(ctx, dest, t0) {
  const bus = masterBus(ctx, dest);
  for (const f of [C4, E4, G4, C5]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.13, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.55);
    const ftr = ctx.createBiquadFilter();
    ftr.type = 'lowpass';
    ftr.frequency.setValueAtTime(500, t0);
    ftr.frequency.exponentialRampToValueAtTime(3000, t0 + 0.55);
    o.connect(ftr).connect(g).connect(bus);
    o.start(t0);
    o.stop(t0 + 1.6);
  }
  [G5, C6, E6].forEach((f, i) => osc(ctx, 'sine', f, t0 + 0.55 + i * 0.08, 0.75, bus, 0.11));
  return 1.8;
}

function variantE(ctx, dest, t0) {
  const bus = masterBus(ctx, dest);
  const harp = [C5, E5, G5, C6, E6, G6, C6];
  harp.forEach((f, i) => {
    osc(ctx, 'triangle', f, t0 + i * 0.065, 0.55, bus, 0.15);
    osc(ctx, 'sine', f * 2, t0 + i * 0.065, 0.35, bus, 0.045);
  });
  return 1.45;
}

const BUILDERS = { A: variantA, B: variantB, C: variantC, D: variantD, E: variantE };

/**
 * Schedule a victory variant on ctx into dest.
 * @returns {{ duration: number }}
 */
export function scheduleVictorySynth(ctx, dest, variant = 'A', when = null) {
  const id = String(variant || 'A').toUpperCase();
  const build = BUILDERS[id] || BUILDERS.A;
  const t0 = when == null ? ctx.currentTime + 0.02 : when;
  const duration = build(ctx, dest, t0);
  return { duration, id, t0 };
}

/** Play into ctx.destination (or a provided node). Returns a stop handle. */
export function playVictorySynth(ctx, variant = 'A', { dest = null, then = null } = {}) {
  if (!ctx) { if (then) setTimeout(then, 0); return null; }
  const out = dest || ctx.destination;
  const { duration, id, t0 } = scheduleVictorySynth(ctx, out, variant);
  const stopAt = (t0 + duration + 0.15 - ctx.currentTime) * 1000;
  const timer = setTimeout(() => { if (then) then(); }, Math.max(50, stopAt));
  return { id, duration, cancel: () => clearTimeout(timer) };
}
