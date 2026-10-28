import { playVictorySynth } from './victory-synth.js';
// Blackspire audio: royalty-free music files (lazy-loaded) + procedural SFX/ambience via WebAudio.
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
    // Decode the victory sting now so the first win is not racing a cold fetch/decode.
    prefetchMusic('victory');
  }
}
for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend().catch(() => {}); else if (unlocked) ctx.resume().catch(() => {}); });

/* ---------------- file-based music (lazy-load AAC/OGG, crossfade) ---------------- */
/** Track catalog: path stem under /music (browser picks .m4a or .ogg). */
export const TRACKS = {
  title:    { stem: 'music/title',    loop: true },
  town:     { stem: 'music/town',     loop: true },
  dungeon0: { stem: 'music/dungeon0', loop: true },
  dungeon1: { stem: 'music/dungeon1', loop: true },
  dungeon2: { stem: 'music/dungeon2', loop: true },
  dungeon3: { stem: 'music/dungeon3', loop: true },
  dungeon4: { stem: 'music/dungeon4', loop: true },
  combat:   { stem: 'music/combat',   loop: true },
  boss:     { stem: 'music/boss',     loop: true },
  ending:   { stem: 'music/ending',   loop: true },
};

const bufCache = new Map(); // stem → AudioBuffer | Promise
function assetUrl(path) {
  const clean = String(path).replace(/^\//, '');
  const base = import.meta.env.BASE_URL || './';
  try { return new URL(clean, new URL(base, typeof document !== 'undefined' ? document.baseURI : 'http://local/')).href; }
  catch { return base + clean; }
}
function musicUrl(stem, { preferMp3 = false } = {}) {
  // Paths are base-relative (./music/…). Scene beds: m4a on Safari, ogg elsewhere.
  // Victory sting: prefer mp3 — same container voices already decode reliably on iOS.
  if (preferMp3 || /\/victory$/.test(stem) || stem.endsWith('victory')) return assetUrl(`${stem}.mp3`);
  const a = typeof document !== 'undefined' ? document.createElement('audio') : { canPlayType: () => '' };
  const ext = (a.canPlayType('audio/mp4; codecs="mp4a.40.2"') || a.canPlayType('audio/aac')) ? 'm4a'
    : a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
  return assetUrl(`${stem}.${ext}`);
}
async function loadTrack(stem) {
  const preferMp3 = /victory$/.test(stem);
  const cacheKey = preferMp3 ? stem + '#mp3' : stem;
  if (bufCache.has(cacheKey)) return bufCache.get(cacheKey);
  const p = (async () => {
    const url = musicUrl(stem, { preferMp3 });
    const r = await fetch(url);
    if (!r.ok) throw new Error(`music ${url} ${r.status}`);
    const ab = await r.arrayBuffer();
    const c = ac();
    if (!c) throw new Error('no audio');
    if (c.state !== 'running') await c.resume().catch(() => {});
    return await c.decodeAudioData(ab.slice(0));
  })();
  bufCache.set(cacheKey, p);
  try {
    const buf = await p;
    bufCache.set(cacheKey, buf);
    return buf;
  } catch (e) {
    bufCache.delete(cacheKey);
    throw e;
  }
}
/** Prefetch a track in the background (no play). */
export function prefetchMusic(name) {
  const t = TRACKS[name]; if (!t || !ac()) return;
  loadTrack(t.stem).catch(() => {});
}

let cur = null, want = null, trackGain = null, trackSrc = null, onDone = null, playGen = 0;

function stopMusic(fade = 0.8) {
  const g = trackGain, s = trackSrc;
  trackGain = null; trackSrc = null; cur = null;
  if (g && ctx) {
    try { g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.05, fade / 4)); } catch { /* ignore */ }
    setTimeout(() => { try { s?.stop?.(); } catch { /* ignore */ } try { g.disconnect(); } catch { /* ignore */ } }, fade * 1500);
  }
}

/** Switch music track (crossfades). name null = silence. then: callback when a one-shot track (victory) ends. */
export function play(name, force = false, then = null) {
  want = name; onDone = then;
  if (!ctx || !unlocked) return;
  if (name === cur && !force) return;
  const gen = ++playGen;
  const prevFade = 1.0;
  stopMusic(prevFade);
  if (!name || !TRACKS[name]) return;
  const meta = TRACKS[name];
  cur = name; // optimistic — cleared if load fails / superseded
  loadTrack(meta.stem).then((buf) => {
    if (gen !== playGen || want !== name || !ctx || !unlocked) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.2);
    g.connect(bus.music);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = !!meta.loop;
    src.connect(g);
    src.onended = () => {
      if (trackSrc !== src) return;
      trackSrc = null; trackGain = null; cur = null;
      const d = onDone; onDone = null;
      if (d) d();
    };
    trackGain = g; trackSrc = src;
    try { src.start(0); } catch { /* ignore */ }
  }).catch(() => {
    if (gen === playGen) cur = null;
  });
}
export function currentTrack() { return cur || want; }

/* ---------------- victory sting (synth A + bed duck) ---------------- */
let stingGain = null, duckSaved = null, stingStartedAt = 0, stingPlaying = false, stingUntil = 0, stingHandle = null;
export function unduckBed() {
  if (duckSaved == null || !trackGain || !ctx) { duckSaved = null; return; }
  try {
    const g = trackGain.gain, now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.linearRampToValueAtTime(duckSaved, now + 0.6);
  } catch { /* ignore */ }
  duckSaved = null;
}
export function duckBed(to = 0.12) {
  if (!trackGain || !ctx) return;
  try {
    const g = trackGain.gain, now = ctx.currentTime;
    const cur = g.value;
    duckSaved = duckSaved != null ? duckSaved : (cur > 0.2 ? cur : 1);
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(cur, 0.0001), now);
    g.linearRampToValueAtTime(to, now + 0.1);
  } catch { /* ignore */ }
}
export function victoryStingState() {
  let gain = 0;
  try { gain = stingGain ? stingGain.gain.value : 0; } catch { /* ignore */ }
  return {
    playing: !!stingPlaying && !!ctx && ctx.currentTime < stingUntil,
    gain,
    startedAt: stingStartedAt,
    hasBuf: true,
  };
}
/** Legacy alias — procedural brass arpeggio (variant A) to destination. */
export function playVictorySting(then = null) {
  unlock();
  if (!ctx || !unlocked) { if (then) setTimeout(then, 0); return false; }
  try { stingHandle?.cancel?.(); } catch { /* ignore */ }
  try { stingGain?.disconnect(); } catch { /* ignore */ }
  stingGain = null; stingPlaying = false;
  duckBed(0.12);
  setTimeout(() => duckBed(0.12), 200);
  setTimeout(() => duckBed(0.12), 500);
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 1.35;
  master.connect(ctx.destination);
  stingGain = master; stingPlaying = true; stingStartedAt = ctx.currentTime;
  stingHandle = playVictorySynth(ctx, 'A', {
    dest: master,
    then: () => {
      stingPlaying = false; stingGain = null;
      try { master.disconnect(); } catch { /* ignore */ }
      unduckBed();
      if (then) then();
    },
  });
  stingUntil = ctx.currentTime + (stingHandle?.duration || 1.75);
  return true;
}


/* ---------------- ambience ---------------- */
let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
let ambWant = null, ambCur = null, ambNodes = [], ambTimer = null;
export function ambience(name, force = false) {
  ambWant = name;
  if (!ctx || !unlocked || (name === ambCur && !force)) return;
  for (const n of ambNodes) { try { n.stop?.(); n.disconnect(); } catch { /* ignore */ } } ambNodes = []; clearTimeout(ambTimer); ambCur = name;
  if (!name) return;
  if (name.startsWith('outdoor')) { outdoorBed(name); return; }
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

/** Phase E: synthesised open-air bed. name = 'outdoor:<rain|mist|clear>:<day|night>' — wind swells, a rain hiss or soft mist, birds by day, crickets at night. */
function outdoorBed(name) {
  const [, wx = 'rain', tod = 'day'] = name.split(':'); const t = ctx.currentTime;
  const wind = ctx.createBufferSource(); wind.buffer = noise(); wind.loop = true; wind.playbackRate.value = 0.6;
  const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 520; wf.Q.value = 0.9;
  const wg = ctx.createGain(); wg.gain.value = wx === 'mist' ? 0.075 : 0.06;
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 260; lfo.connect(lg).connect(wf.frequency);
  const lfo2 = ctx.createOscillator(), lg2 = ctx.createGain(); lfo2.frequency.value = 0.19; lg2.gain.value = 0.03; lfo2.connect(lg2).connect(wg.gain); // gusts
  wind.connect(wf).connect(wg).connect(bus.amb); wind.start(t); lfo.start(t); lfo2.start(t); ambNodes.push(wind, lfo, lfo2, wf, wg, lg, lg2);
  if (wx === 'rain') {
    const rn = ctx.createBufferSource(); rn.buffer = noise(); rn.loop = true; rn.playbackRate.value = 1.3;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2400; const rg = ctx.createGain(); rg.gain.value = 0.05;
    rn.connect(hp).connect(rg).connect(bus.amb); rn.start(t); ambNodes.push(rn, hp, rg);
  }
  const tick = () => {
    if (ambCur !== name || !ctx) return; const t0 = ctx.currentTime; let next = 1200 + Math.random() * 3000;
    if (tod === 'night') { // crickets: a short train of high pulses
      const f = 3900 + Math.random() * 500; for (let k = 0; k < 5; k++) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; gg.gain.setValueAtTime(0.0001, t0 + k * 0.07); gg.gain.linearRampToValueAtTime(0.012, t0 + k * 0.07 + 0.015); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.07 + 0.05); o.connect(gg).connect(bus.amb); o.start(t0 + k * 0.07); o.stop(t0 + k * 0.07 + 0.06); }
      next = 700 + Math.random() * 1800;
    } else if (wx !== 'rain' || Math.random() < 0.35) { // birds, fewer in the rain
      const b = 2300 + Math.random() * 1500; for (let k = 0; k < 2 + (Math.random() * 3 | 0); k++) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(b, t0 + k * 0.1); o.frequency.exponentialRampToValueAtTime(b * 1.35, t0 + k * 0.1 + 0.06); gg.gain.setValueAtTime(0.0001, t0 + k * 0.1); gg.gain.linearRampToValueAtTime(0.02, t0 + k * 0.1 + 0.01); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.1 + 0.08); o.connect(gg).connect(bus.amb); o.start(t0 + k * 0.1); o.stop(t0 + k * 0.1 + 0.1); }
      next = 2200 + Math.random() * 4200;
    }
    ambTimer = setTimeout(tick, next);
  };
  ambTimer = setTimeout(tick, 600);
}
