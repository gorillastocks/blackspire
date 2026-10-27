// Spoken dialogue clips (ElevenLabs). Lazy-loads MP3s; looks up by speaker+normalized text.
// Asset URLs must respect Vite base (./ → /blackspire/ on GitHub Pages) — never fetch from "/voice/...".
import index from './index.json';
import { ac, unlock as unlockAudio, duckBed } from '../audio.js';
import { playVictorySynth } from '../victory-synth.js';

const byText = index.byText || {};
const cache = new Map(); // url → AudioBuffer | Promise
let enabled = true;
let vol = 0.85;
let current = null; // { src, gain, file, startedAt }
let primed = false;
let missLog = [];

/** Resolve a public asset path against the Vite/deploy base (e.g. "./voice/x.mp3"). */
export function assetUrl(path) {
  const clean = String(path).replace(/^\//, '');
  const base = import.meta.env.BASE_URL || './';
  try {
    return new URL(clean, new URL(base, document.baseURI || location.href)).href;
  } catch {
    return base + clean;
  }
}

function norm(t) {
  if (!t) return '';
  let s = String(t);
  s = s.replace(/^Dungeon Master:\s*/i, '').replace(/^🕯\s*/, '').replace(/^\uD83D\uDD6F\uFE0F?\s*/, '');
  const repl = {
    '\u2014': '-', '\u2013': '-', '\u2018': "'", '\u2019': "'",
    '\u201c': '"', '\u201d': '"', '\u2026': '...',
  };
  for (const [a, b] of Object.entries(repl)) s = s.replaceAll(a, b);
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolve(text, speaker) {
  const n = norm(text);
  if (!n) return null;
  if (speaker) {
    const sp = String(speaker).toLowerCase().replace(/\s+/g, '');
    const direct = byText[`${sp}|${n}`];
    if (direct) return direct;
    for (const [k, f] of Object.entries(byText)) {
      if (!k.includes('|')) continue;
      const [who, tx] = k.split('|');
      if (tx === n && (sp === who || sp.includes(who) || who.includes(sp))) return f;
    }
  }
  return byText[n] || null;
}

async function loadBuf(file) {
  const url = assetUrl(file);
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`voice ${url} ${r.status}`);
    const ab = await r.arrayBuffer();
    const c = ac();
    if (!c) throw new Error('no audio');
    if (c.state !== 'running') await c.resume().catch(() => {});
    return await c.decodeAudioData(ab.slice(0));
  })();
  cache.set(url, p);
  try {
    const buf = await p;
    cache.set(url, buf);
    return buf;
  } catch (e) {
    cache.delete(url);
    throw e;
  }
}

/** Prime WebAudio + a reusable HTMLAudio element on the first user gesture (iOS). */
export function unlockVoices() {
  unlockAudio();
  if (primed) return;
  primed = true;
  try {
    const c = ac();
    if (c && c.state !== 'running') c.resume().catch(() => {});
    // silent buffer through the shared context — ties voice playback to the unlocked session
    if (c) {
      const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource();
      s.buffer = b; s.connect(c.destination); s.start(0);
    }
  } catch { /* ignore */ }
}

export function setVoicesEnabled(on) { enabled = !!on; if (!enabled) stopVoice(); }
export function setVoiceVolume(v) {
  vol = Math.max(0, Math.min(1, +v || 0));
  if (current?.gain) {
    try { current.gain.gain.value = vol * vol; } catch { /* ignore */ }
  }
}
export function voicesEnabled() { return enabled; }
export function voiceVolume() { return vol; }
export function voiceMisses() { return missLog.slice(-20); }
export function currentVoice() { return current; }

export function stopVoice() {
  if (!current) return;
  try { current.src.stop?.(); } catch { /* ignore */ }
  try { current.src.pause?.(); } catch { /* ignore */ }
  try { current.gain.disconnect(); } catch { /* ignore */ }
  current = null;
}

/** Generation token: bump to cancel in-flight ambient/area loads before they reach src.start. */
let voiceGen = 0;
let ambientGen = 0;

/** Optional host gate: return false to block ambient/area starts (combat / menu / dialogue). */
let ambientGate = () => true;
export function setAmbientVoiceGate(fn) { ambientGate = typeof fn === 'function' ? fn : () => true; }

export function voiceGeneration() { return { voiceGen, ambientGen }; }

/**
 * Stop any ambient/area narrator clip and invalidate pending ambient plays.
 * Battle / dialogue / companion lines keep their own gen and are not cancelled.
 */
export function invalidateAmbientVoices() {
  ambientGen++;
  if (current?.ambient) stopVoice();
}

/**
 * Play a voiced line if we have a clip. Returns true if a match was found (playback may still be async).
 * opts:
 *   ambient: true for dungeon/town area DM read-aloud (cancelled on combat/move/menu)
 *   kind: 'ambient' | 'battle' | 'dialog' | 'other'
 *   token: opaque value; if stillValid provided, consulted after decode
 *   stillValid: () => boolean — if false after decode, drop the line
 */
export function playVoice(text, speaker = null, opts = {}) {
  if (!enabled || !text) return false;
  const file = resolve(text, speaker);
  if (!file) {
    const entry = { text: String(text).slice(0, 120), speaker, at: Date.now() };
    missLog.push(entry);
    if (missLog.length > 40) missLog.shift();
    if (typeof console !== 'undefined') console.debug('[voice miss]', speaker, String(text).slice(0, 80));
    return false;
  }
  const kind = opts.kind || (opts.ambient ? 'ambient' : 'other');
  const ambient = kind === 'ambient' || !!opts.ambient;
  // Ambient must not start while the host says we're in combat / menu / dialogue.
  if (ambient && !ambientGate()) return false;

  // Don't cut off a battle line with ambient, and vice-versa: ambient yields to non-ambient.
  if (ambient && current && !current.ambient) return false;
  stopVoice();
  unlockVoices();
  const c = ac();
  const myVoiceGen = ++voiceGen;
  const myAmbientGen = ambientGen;
  const token = opts.token;
  const stillValid = opts.stillValid;
  const runWA = async () => {
    try {
      if (c && c.state !== 'running') await c.resume().catch(() => {});
      const buf = await loadBuf(file);
      // Drop if a newer play superseded us, ambient was invalidated, or the host gate closed.
      if (myVoiceGen !== voiceGen) return;
      if (ambient && myAmbientGen !== ambientGen) return;
      if (ambient && !ambientGate()) return;
      if (typeof stillValid === 'function' && !stillValid(token)) return;
      if (!enabled) return;
      const ctx = ac();
      if (!ctx) throw new Error('no ctx');
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = vol * vol;
      src.buffer = buf;
      // Voice sits on destination (not music bus) so Music volume / ducking never mutes dialogue.
      src.connect(g).connect(ctx.destination);
      src.onended = () => { if (current?.src === src) current = null; };
      current = { src, gain: g, file, startedAt: ctx.currentTime, duration: buf.duration, ambient, kind, speaker, token };
      src.start(0);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[voice play fail]', file, e);
    }
  };
  if (c) runWA();
  else if (typeof console !== 'undefined') console.warn('[voice] no AudioContext');
  return true;
}

const WHO = {
  elowen: 'elowen', 'princess elowen': 'elowen',
  'dungeon master': 'narrator', narrator: 'narrator', dm: 'narrator',
  malthrax: 'malthrax', 'malthrax the dread': 'malthrax',
  grumsh: 'grumsh', vexrath: 'vexrath', brambur: 'brambur', pip: 'pip', fizzwick: 'fizzwick',
  marga: 'marga', rowan: 'rowan', 'captain rowan': 'rowan',
  osric: 'osric', wren: 'wren', dobbin: 'dobbin', tamsin: 'tamsin',
  'ser aldric': 'serAldric', aldric: 'serAldric',
  skarn: 'skarn', brakk: 'brakk', gorvax: 'gorvax',
};

export function castKey(who) {
  if (!who) return null;
  const k = String(who).toLowerCase().trim();
  return WHO[k] || k.replace(/\s+/g, '');
}

export function playVoiceLine(text, who, opts = {}) {
  return playVoice(text, castKey(who), opts);
}

/** Area / DM read-aloud — always ambient, cancelled if combat/menu/dialogue begins before decode finishes. */
export function playAmbientNarration(text, opts = {}) {
  return playVoiceLine(text, 'narrator', { ...opts, ambient: true, kind: 'ambient' });
}

export function hasVoice(text, who) {
  return !!resolve(text, castKey(who));
}

/** Play a known Elowen clip (Settings → Test voice). */
export function testVoice() {
  setVoicesEnabled(true);
  unlockVoices();
  return playVoiceLine('Rise, Knight of the Dawn.', 'elowen', { kind: 'other' });
}

/* ---------------- victory fanfare (procedural synth A — brass arpeggio) ---------------- */
const VICTORY_VARIANT = 'A';
let victoryCurrent = null; // { gain, startedAt, duration, variant, handle }
let victoryLast = { at: 0, ok: false, error: null, ctxState: null, variant: VICTORY_VARIANT };
let victoryPrimed = true; // synth needs no decode

export function victoryMusicState() {
  let gain = 0;
  try { gain = victoryCurrent?.gain ? victoryCurrent.gain.gain.value : 0; } catch { /* ignore */ }
  const playing = !!(victoryCurrent && victoryCurrent.until > (ac()?.currentTime || 0));
  return {
    playing,
    gain,
    startedAt: victoryCurrent?.startedAt || 0,
    hasBuf: true, // procedural — always ready after unlock
    last: { ...victoryLast },
    variant: VICTORY_VARIANT,
    file: null,
  };
}

export function lastVictoryAttempt() { return { ...victoryLast }; }

/** No asset to prefetch; ensure AudioContext is unlocked. */
export function prefetchVictory() {
  unlockVoices();
  victoryPrimed = true;
}

function stopVictoryMusic() {
  if (!victoryCurrent) return;
  try { victoryCurrent.handle?.cancel?.(); } catch { /* ignore */ }
  try { victoryCurrent.gain.disconnect(); } catch { /* ignore */ }
  victoryCurrent = null;
}

/**
 * Play synth victory A into ctx.destination (same unlock/resume path as voices).
 * Loud master gain; not routed through the music bus so bed ducking cannot silence it.
 */
export function playVictoryMusic(then = null) {
  unlockVoices();
  const c = ac();
  victoryLast = { at: Date.now(), ok: false, error: null, ctxState: c?.state || null, variant: VICTORY_VARIANT };
  if (!c) {
    victoryLast.error = 'no AudioContext';
    if (then) setTimeout(then, 0);
    return false;
  }
  stopVictoryMusic();
  const run = async () => {
    try {
      if (c.state !== 'running') await c.resume().catch(() => {});
      const ctx = ac();
      if (!ctx) throw new Error('no ctx');
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      victoryLast.ctxState = ctx.state;
      duckBed(0.12);
      setTimeout(() => duckBed(0.12), 200);
      setTimeout(() => duckBed(0.12), 500);
      // Loud destination bus for the sting
      const master = ctx.createGain();
      master.gain.value = 1.35;
      master.connect(ctx.destination);
      const handle = playVictorySynth(ctx, VICTORY_VARIANT, {
        dest: master,
        then: () => {
          if (victoryCurrent?.gain === master) victoryCurrent = null;
          try { master.disconnect(); } catch { /* ignore */ }
          if (then) then();
        },
      });
      const dur = handle?.duration || 1.75;
      victoryCurrent = {
        gain: master,
        startedAt: ctx.currentTime,
        duration: dur,
        until: ctx.currentTime + dur,
        variant: VICTORY_VARIANT,
        handle,
      };
      victoryLast = {
        at: Date.now(), ok: true, error: null, ctxState: ctx.state,
        variant: VICTORY_VARIANT, startedAt: ctx.currentTime,
      };
      victoryPrimed = true;
    } catch (e) {
      victoryLast = { at: Date.now(), ok: false, error: String(e?.message || e), ctxState: ac()?.state || null, variant: VICTORY_VARIANT };
      if (typeof console !== 'undefined') console.warn('[victory synth fail]', e);
      if (then) then();
    }
  };
  run();
  return true;
}

/** Settings → Test victory music (synth A). */
export function testVictoryMusic() {
  unlockVoices();
  return playVictoryMusic();
}

