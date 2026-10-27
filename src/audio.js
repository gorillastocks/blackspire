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
  victory:  { stem: 'music/victory',  loop: false, once: true },
  ending:   { stem: 'music/ending',   loop: true },
};

const bufCache = new Map(); // stem → AudioBuffer | Promise
function musicUrl(stem) {
  // Prefer m4a (Safari/iOS); ogg as fallback for older Firefox.
  const a = document.createElement('audio');
  if (a.canPlayType('audio/mp4; codecs="mp4a.40.2"') || a.canPlayType('audio/aac')) return `/${stem}.m4a`;
  if (a.canPlayType('audio/ogg; codecs="vorbis"')) return `/${stem}.ogg`;
  return `/${stem}.m4a`;
}
async function loadTrack(stem) {
  if (bufCache.has(stem)) return bufCache.get(stem);
  const p = (async () => {
    const url = musicUrl(stem);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`music ${url} ${r.status}`);
    const ab = await r.arrayBuffer();
    const c = ac();
    return await c.decodeAudioData(ab.slice(0));
  })();
  bufCache.set(stem, p);
  try {
    const buf = await p;
    bufCache.set(stem, buf);
    return buf;
  } catch (e) {
    bufCache.delete(stem);
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
