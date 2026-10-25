// All GrokWizard audio is ORIGINAL and generated live with WebAudio — no audio files, no licensing, 0 bytes of assets.
// Three buses (music / sfx / ambience) under a master gain, each with its own volume setting.
// iOS/Safari: the AudioContext starts suspended until a user gesture, so unlock() runs on the first tap/key.
let ctx = null, master, bus = {};
const vol = { music: 0.6, sfx: 0.8, amb: 0.6 }; let muted = false;

export function ac() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  for (const k of ['music', 'sfx', 'amb']) { bus[k] = ctx.createGain(); bus[k].connect(master); }
  applyVolumes(); return ctx;
}
export function out(name) { ac(); return bus[name]; }
function applyVolumes() { if (!ctx) return; master.gain.value = muted ? 0 : 1; for (const k in bus) bus[k].gain.value = vol[k] * vol[k]; }
export function setVolumes(v) { Object.assign(vol, v); applyVolumes(); }
export function setMuted(m) { muted = m; applyVolumes(); }
export function isMuted() { return muted; }
export function sfxVolume() { return vol.sfx; }

let unlocked = false;
export function unlock() {
  const c = ac(); if (!c) return;
  if (c.state !== 'running') c.resume().catch(() => {});
  if (!unlocked) { // play one silent buffer — required by older iOS to fully open the audio session
    try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch { /* ignore */ }
    unlocked = true; if (want) play(want, true); if (ambWant) ambience(ambWant, true);
  }
}
for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (unlocked) ctx.resume().catch(() => {}); });

/* ---------------- procedural music ---------------- */
const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz
// Each track: tempo, scale degrees (semitones), chord roots per bar (scale steps), lead pattern (scale steps / null), bass + pad voices.
export const TRACKS = {
  title:   { bpm: 76, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bars: [0, 5, 3, 4], lead: [7, null, 9, 8, 7, null, 4, null], lw: 'triangle', pad: 'sawtooth', drums: 0, padVol: 0.05 },
  town:    { bpm: 104, root: 55, scale: [0, 2, 4, 5, 7, 9, 11], bars: [0, 3, 4, 0, 5, 3, 4, 4], lead: [4, 5, 7, null, 7, 5, 4, 2], lw: 'square', pad: 'triangle', drums: 1, padVol: 0.04 },
  dungeon0:{ bpm: 70, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], bars: [0, 0, 5, 4], lead: [null, 4, null, 3, null, 2, null, null], lw: 'sine', pad: 'triangle', drums: 0, padVol: 0.06 },
  dungeon1:{ bpm: 64, root: 43, scale: [0, 1, 3, 5, 7, 8, 10], bars: [0, 1, 0, 6], lead: [null, null, 7, 8, null, 7, null, 4], lw: 'sine', pad: 'sawtooth', drums: 0, padVol: 0.045 },
  dungeon2:{ bpm: 58, root: 40, scale: [0, 1, 3, 4, 6, 8, 10], bars: [0, 1, 4, 1], lead: [7, null, null, 8, null, null, 4, null], lw: 'triangle', pad: 'sawtooth', drums: 0, padVol: 0.05 },
  combat:  { bpm: 148, root: 45, scale: [0, 2, 3, 5, 7, 8, 10], bars: [0, 0, 5, 6, 0, 0, 3, 4], lead: [7, 7, 9, 7, 10, 9, 7, 4], lw: 'square', pad: 'sawtooth', drums: 2, padVol: 0.03, bassEighths: true },
  boss:    { bpm: 160, root: 40, scale: [0, 1, 3, 5, 6, 8, 10], bars: [0, 1, 0, 4, 0, 1, 5, 4], lead: [7, 8, 7, 4, 7, 8, 11, 10], lw: 'sawtooth', pad: 'sawtooth', drums: 3, padVol: 0.035, bassEighths: true },
  victory: { bpm: 132, root: 60, scale: [0, 2, 4, 5, 7, 9, 11], bars: [0, 3, 4, 0], lead: [0, 2, 4, 7, 4, 7, 9, 11], lw: 'square', pad: 'triangle', drums: 1, padVol: 0.04, once: true },
};
const deg = (t, d) => { const L = t.scale.length; const o = Math.floor(d / L); return t.root + t.scale[((d % L) + L) % L] + 12 * o; };

let cur = null, want = null, timer = null, step = 0, nextT = 0, trackGain = null, onDone = null;
function voice(type, freq, t0, dur, v, dest, attack = 0.01) {
  const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}
let noiseBuf = null;
function noise() { if (noiseBuf) return noiseBuf; noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return noiseBuf; }
function hit(kind, t0, dest) {
  if (kind === 'kick') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.15); g.gain.setValueAtTime(0.35, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2); o.connect(g).connect(dest); o.start(t0); o.stop(t0 + 0.25); return; }
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise();
  f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const d = kind === 'hat' ? 0.04 : 0.14; g.gain.setValueAtTime(kind === 'hat' ? 0.06 : 0.16, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
  s.connect(f).connect(g).connect(dest); s.start(t0, Math.random()); s.stop(t0 + d + 0.02);
}
function schedule() {
  const t = TRACKS[cur]; if (!t) return;
  const e8 = 60 / t.bpm / 2; // eighth-note length
  while (nextT < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 8), i = step % 8;
    if (t.once && bar >= t.bars.length) { const d = onDone; stopMusic(1.2); if (d) setTimeout(d, 600); return; }
    const chord = t.bars[bar % t.bars.length];
    if (i === 0) for (const d of [0, 2, 4]) voice(t.pad, N(deg(t, chord + d)), nextT, e8 * 8.2, t.padVol, trackGain, 0.25);
    if (i % (t.bassEighths ? 1 : 4) === 0) voice('triangle', N(deg(t, chord) - 12), nextT, e8 * (t.bassEighths ? 0.9 : 3.8), 0.16, trackGain);
    const ln = t.lead[(i + (bar % 2 ? 1 : 0) * (t.drums ? 0 : 3)) % 8];
    if (ln !== null && ln !== undefined && (t.drums || Math.random() < 0.85)) voice(t.lw, N(deg(t, ln + (bar % 4 === 3 && t.drums ? 1 : 0))), nextT, e8 * 1.6, t.lw === 'sine' ? 0.07 : 0.035, trackGain);
    if (t.drums) {
      if (i % 4 === 0 || (t.drums >= 2 && i === 6)) hit('kick', nextT, trackGain);
      if (i % 4 === 2 && t.drums >= 1) hit(t.drums >= 2 ? 'snare' : 'hat', nextT, trackGain);
      if (t.drums >= 2) hit('hat', nextT, trackGain);
    }
    nextT += e8; step++;
  }
}
function stopMusic(fade = 0.8) {
  clearInterval(timer); timer = null;
  if (trackGain && ctx) { const g = trackGain; g.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 4); setTimeout(() => g.disconnect(), fade * 1500); }
  trackGain = null; cur = null;
}
/** Switch music track (crossfades). name null = silence. then: callback when a one-shot track (victory) ends. */
export function play(name, force = false, then = null) {
  want = name; onDone = then;
  if (!ctx || !unlocked || (name === cur && !force)) return;
  stopMusic();
  if (!name || !TRACKS[name]) return;
  cur = name; step = 0; nextT = ctx.currentTime + 0.1;
  trackGain = ctx.createGain(); trackGain.gain.setValueAtTime(0.0001, ctx.currentTime); trackGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2); trackGain.connect(bus.music);
  schedule(); timer = setInterval(schedule, 100);
}
export function currentTrack() { return cur || want; }

/* ---------------- ambience ---------------- */
let ambWant = null, ambCur = null, ambNodes = [], ambTimer = null;
export function ambience(name, force = false) {
  ambWant = name;
  if (!ctx || !unlocked || (name === ambCur && !force)) return;
  for (const n of ambNodes) { try { n.stop?.(); n.disconnect(); } catch { /* ignore */ } } ambNodes = []; clearTimeout(ambTimer); ambCur = name;
  if (!name) return;
  // wind / room tone: looping noise through a slowly swept low-pass
  const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = name === 'town' ? 900 : 380; f.Q.value = name === 'town' ? 0.3 : 4;
  const g = ctx.createGain(); g.gain.value = name === 'town' ? 0.05 : 0.09;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = name === 'town' ? 200 : 220; lfo.connect(lg).connect(f.frequency);
  s.connect(f).connect(g).connect(bus.amb); s.start(); lfo.start(); ambNodes.push(s, lfo, f, g, lg);
  const tick = () => {
    if (ambCur !== name || !ctx) return; const t0 = ctx.currentTime;
    if (name === 'town') { // birdsong chirps
      const b = 2200 + Math.random() * 1600; for (let k = 0; k < 2 + (Math.random() * 3 | 0); k++) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(b, t0 + k * 0.09); o.frequency.exponentialRampToValueAtTime(b * 1.4, t0 + k * 0.09 + 0.06); gg.gain.setValueAtTime(0.0001, t0 + k * 0.09); gg.gain.linearRampToValueAtTime(0.025, t0 + k * 0.09 + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.09 + 0.08); o.connect(gg).connect(bus.amb); o.start(t0 + k * 0.09); o.stop(t0 + k * 0.09 + 0.1); }
      ambTimer = setTimeout(tick, 1500 + Math.random() * 4000);
    } else { // water drips with a little echo
      const fr = 900 + Math.random() * 900; for (const [dl, v] of [[0, 0.06], [0.23, 0.02], [0.46, 0.008]]) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(fr, t0 + dl); o.frequency.exponentialRampToValueAtTime(fr * 2.2, t0 + dl + 0.05); gg.gain.setValueAtTime(v, t0 + dl); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + dl + 0.09); o.connect(gg).connect(bus.amb); o.start(t0 + dl); o.stop(t0 + dl + 0.1); }
      ambTimer = setTimeout(tick, 900 + Math.random() * 3500);
    }
  };
  ambTimer = setTimeout(tick, 800);
}
export function currentAmbience() { return ambCur || ambWant; }
