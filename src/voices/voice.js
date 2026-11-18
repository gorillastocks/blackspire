// Spoken dialogue clips (ElevenLabs). Lazy-loads MP3s; looks up by speaker+normalized text.
// Asset URLs must respect Vite base (./ → /blackspire/ on GitHub Pages) — never fetch from "/voice/...".
import index from './index.json';
import { ac, unlock as unlockAudio, duckBed, resumeCtx, onAudioReset } from '../audio.js';
import { playVictorySynth } from '../victory-synth.js';
import { victorySeq } from './victory-sequence.js';
import { normVoiceText } from './norm.js';
import { fetchAudioBytes } from '../audio-fetch.js';

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

const norm = normVoiceText;

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
    const ab = await fetchAudioBytes(url, 'voice'); // tolerates Capacitor iOS status-0 responses
    const c = ac();
    if (!c) throw new Error('no audio');
    await resumeCtx(c); // bounded: a stuck resume() must not wedge the voice queue
    return await (ac() || c).decodeAudioData(ab.slice(0)); // ac(): the context may have been recreated while resuming
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

export function setVoicesEnabled(on) { enabled = !!on; if (!enabled) { waiting.length = 0; stopVoice(); } }
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

export function stopVoice({ drain = true } = {}) {
  voiceGen++; // an explicit stop also cancels a clip that is still loading
  if (!current) return;
  const ended = current.onEnded;
  current.onEnded = null;
  try { current.src.stop?.(); } catch { /* ignore */ }
  try { current.src.pause?.(); } catch { /* ignore */ }
  try { current.gain.disconnect(); } catch { /* ignore */ }
  current = null;
  if (typeof ended === 'function') ended();
  if (drain && waiting.length) setTimeout(drainWaiting, 0); // an explicit stop (tap to continue) lets a queued line follow
}

/** Lines waiting for the current clip to finish (opts.queue). Each expires so a stale reaction never plays late. */
const waiting = [];
let starting = 0; // clips whose decode/start is in flight
const MAX_WAITING = 3;
export function voiceBusy() { return !!current || starting > 0 || victoryHold; }
/** Drop queued clips, e.g. stale combat barks when a victory/chest sequence starts. */
export function dropQueuedVoices(pred = () => true) {
  for (let i = waiting.length - 1; i >= 0; i--) if (pred(waiting[i])) waiting.splice(i, 1);
}
/** Pull matching queued clips (oldest first) so a victory sequence can play them after the narrator. */
export function takeQueuedVoices(pred = () => true) {
  const out = [];
  for (let i = 0; i < waiting.length; ) {
    if (pred(waiting[i])) out.push(waiting.splice(i, 1)[0]);
    else i++;
  }
  return out;
}
export function queuedVoices() {
  return waiting.map((w) => ({ file: w.file, expires: w.expires, opts: { ...w.opts } }));
}
export function quotedVoiceOpts({ combat = false } = {}) {
  return { kind: 'battle', queue: true, maxWait: combat ? 20000 : 14000, keepForVictory: true };
}
function drainWaiting() {
  if (current || starting > 0 || victoryHold || victorySeq.isActive()) return;
  while (waiting.length) {
    const w = waiting.shift();
    if (Date.now() > w.expires) continue;
    if (w.opts.ambient && !ambientGate()) continue;
    if (typeof w.opts.stillValid === 'function' && !w.opts.stillValid(w.opts.token)) continue;
    if (startVoice(w.file, w.opts)) return;
  }
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
  for (let i = waiting.length - 1; i >= 0; i--) if (waiting[i].opts.ambient) waiting.splice(i, 1);
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
  const o = { ...opts, kind, ambient, speaker, text: String(text) };
  // During the loot/victory sequence, leftover attack barks are dropped; quoted character lines fold in after the narrator.
  if (!opts.victory && victorySeq.isActive()) {
    if (opts.keepForVictory) {
      return victorySeq.enqueue({ role: 'character', text, who: speaker, kind });
    }
    if (opts.combatBark || kind === 'battle') return false;
    victorySeq.enqueue({ role: (kind === 'other' || speaker === 'narrator' || speaker === 'dm') ? 'narrator' : 'character', text, who: speaker, kind });
    return true;
  }
  // ifIdle: a passing remark (companion bark) is simply dropped when something is already being said.
  if (opts.ifIdle && voiceBusy()) return false;
  // queue: wait for the current clip to finish instead of cutting it off (expires after maxWait ms).
  if (opts.queue && voiceBusy()) {
    if (waiting.some((w) => w.file === file)) return true;
    while (waiting.length >= MAX_WAITING) {
      const evict = waiting.findIndex((w) => !w.opts?.keepForVictory);
      waiting.splice(evict >= 0 ? evict : 0, 1);
    }
    waiting.push({ file, opts: o, expires: Date.now() + (opts.maxWait || 12000) });
    return true;
  }
  // Don't cut off a battle line with ambient, and vice-versa: ambient yields to non-ambient.
  if (ambient && current && !current.ambient) return false;
  return startVoice(file, o);
}

function startVoice(file, opts) {
  const { kind, ambient } = opts;
  stopVoiceNow();
  unlockVoices();
  const c = ac();
  const myVoiceGen = ++voiceGen;
  const myAmbientGen = ambientGen;
  const token = opts.token;
  const stillValid = opts.stillValid;
  const runWA = async () => {
    starting++;
    try {
      if (c) await resumeCtx(c);
      const buf = await loadBuf(file);
      // Drop if a newer play superseded us, ambient was invalidated, or the host gate closed.
      const abort = () => {
        if (myVoiceGen === voiceGen && typeof opts.onEnded === 'function') {
          const fn = opts.onEnded; opts.onEnded = null; fn();
        }
      };
      if (myVoiceGen !== voiceGen) return;
      if (ambient && myAmbientGen !== ambientGen) return;
      if (ambient && !ambientGate()) { abort(); return; }
      if (typeof stillValid === 'function' && !stillValid(token)) { abort(); return; }
      if (!enabled) { abort(); return; }
      const ctx = ac();
      if (!ctx) throw new Error('no ctx');
      await resumeCtx(ctx);
      const src = ctx.createBufferSource();
      const g = ctx.createGain();
      g.gain.value = vol * vol;
      src.buffer = buf;
      // Voice sits on destination (not music bus) so Music volume / ducking never mutes dialogue.
      src.connect(g).connect(ctx.destination);
      src.onended = () => {
        const ended = current?.src === src ? current.onEnded : null;
        if (current?.src === src) { current.onEnded = null; current = null; lastEnd = Date.now(); }
        if (typeof ended === 'function') ended();
        setTimeout(drainWaiting, 60);
      };
      current = { src, gain: g, file, startedAt: ctx.currentTime, duration: buf.duration, ambient, kind, speaker: opts.speaker, token, onEnded: opts.onEnded };
      src.start(0);
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[voice play fail]', file, e);
      if (myVoiceGen === voiceGen && typeof opts.onEnded === 'function') {
        const fn = opts.onEnded; opts.onEnded = null; fn();
      }
    } finally {
      starting--;
      if (!current && starting === 0) setTimeout(drainWaiting, 0);
    }
  };
  if (c) runWA();
  else {
    if (typeof console !== 'undefined') console.warn('[voice] no AudioContext');
    if (typeof opts.onEnded === 'function') setTimeout(opts.onEnded, 0);
  }
  return true;
}
/** stopVoice without scheduling a queue drain (a new clip is about to start). */
function stopVoiceNow() {
  if (!current) return;
  try { current.src.stop?.(); } catch { /* ignore */ }
  try { current.src.pause?.(); } catch { /* ignore */ }
  try { current.gain.disconnect(); } catch { /* ignore */ }
  current = null;
}
let lastEnd = 0;
// The AudioContext was recreated after a background/interruption: nodes of the old graph are dead, drop them.
onAudioReset(() => { stopVoiceNow(); stopVictoryMusic(); });
/** Milliseconds since the last clip ended (Infinity if none yet): used to space out companion barks. */
export function msSinceVoiceEnd() { return voiceBusy() ? 0 : (lastEnd ? Date.now() - lastEnd : Infinity); }

/** Approximate length in seconds of the clip for this text (MP3 128 kbps = 16000 bytes/s), or null if unvoiced. */
export function clipSeconds(text, speaker = null) {
  const f = resolve(text, castKey(speaker));
  if (!f) return null;
  if (!byFile) { byFile = {}; for (const c of Object.values(index.clips || {})) byFile[c.file] = c.bytes; }
  const bytes = byFile[f]; return bytes ? bytes / 16000 : null;
}
let byFile = null;

const WHO = {
  elowen: 'elowen', 'princess elowen': 'elowen',
  narrator: 'narrator', 'dungeon master': 'dm', dm: 'dm',
  malthrax: 'malthrax', 'malthrax the dread': 'malthrax',
  grumsh: 'grumsh', vexrath: 'vexrath', brambur: 'brambur', pip: 'pip', fizzwick: 'fizzwick',
  liora: 'liora', 'liora wardenfall': 'liora', zizzy: 'zizzy', nettle: 'nettle',
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
  const { who = 'dm', ...rest } = opts; return playVoiceLine(text, who, { ...rest, ambient: true, kind: 'ambient' });
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
let victoryHold = false; // true from the moment a sting is requested until it ends (so narrator/barks queue instead of overlapping the async start)
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

export function stopVictoryMusic() {
  if (victoryCurrent) {
    try { victoryCurrent.handle?.cancel?.(); } catch { /* ignore */ }
    try { victoryCurrent.gain.disconnect(); } catch { /* ignore */ }
    victoryCurrent = null;
  }
  releaseVictoryHold();
}

/**
 * Play synth victory A into ctx.destination (same unlock/resume path as voices).
 * Loud master gain; not routed through the music bus so bed ducking cannot silence it.
 */
function releaseVictoryHold() {
  if (!victoryHold) return;
  victoryHold = false;
  setTimeout(drainWaiting, 0);
}
export function playVictoryMusic(then = null) {
  unlockVoices();
  const c = ac();
  victoryLast = { at: Date.now(), ok: false, error: null, ctxState: c?.state || null, variant: VICTORY_VARIANT };
  const done = () => { releaseVictoryHold(); if (then) then(); };
  if (!c) {
    victoryLast.error = 'no AudioContext';
    setTimeout(done, 0);
    return false;
  }
  stopVictoryMusic();
  victoryHold = true;
  const run = async () => {
    try {
      await resumeCtx(c);
      const ctx = ac();
      if (!ctx) throw new Error('no ctx');
      await resumeCtx(ctx);
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
          done();
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
      done();
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

