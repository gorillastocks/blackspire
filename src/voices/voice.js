// Spoken dialogue clips (ElevenLabs). Lazy-loads MP3s; looks up by speaker+normalized text.
import index from './index.json';
import { ac, out } from '../audio.js';

const byText = index.byText || {};
const cache = new Map(); // file → AudioBuffer | Promise
let enabled = true;
let vol = 0.85;
let current = null; // { src, gain }
let unlockedHTML = false;

function norm(t) {
  if (!t) return '';
  let s = String(t);
  // strip DM prefix if present ("Dungeon Master: ..." or colored logos)
  s = s.replace(/^Dungeon Master:\s*/i, '').replace(/^\uD83D\uDD6F\uFE0F?\s*/, '').replace(/^🕯\s*/, '');
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
    // try exact speaker key, then short name matches
    const keys = [
      `${sp}|${n}`,
      ...Object.keys(byText).filter((k) => k.includes('|') && k.endsWith('|' + n)).map((k) => k),
    ];
    for (const k of keys) if (byText[k]) return byText[k];
    // fuzzy speaker: "Ser Aldric" → seraldric vs cast keys
    for (const [k, f] of Object.entries(byText)) {
      if (!k.includes('|')) continue;
      const [who, tx] = k.split('|');
      if (tx === n && (sp.includes(who) || who.includes(sp))) return f;
    }
  }
  return byText[n] || null;
}

async function loadBuf(file) {
  if (cache.has(file)) return cache.get(file);
  const p = (async () => {
    const r = await fetch('/' + file.replace(/^\//, ''));
    if (!r.ok) throw new Error(`voice ${file} ${r.status}`);
    const ab = await r.arrayBuffer();
    const c = ac();
    if (!c) throw new Error('no audio');
    return await c.decodeAudioData(ab.slice(0));
  })();
  cache.set(file, p);
  try {
    const buf = await p;
    cache.set(file, buf);
    return buf;
  } catch (e) {
    cache.delete(file);
    throw e;
  }
}

/** Unlock HTMLAudio fallback on iOS (first gesture). */
export function unlockVoices() {
  if (unlockedHTML) return;
  unlockedHTML = true;
  try {
    const a = new Audio();
    a.src = 'data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAA8TEFNRTMuMTAwBK8AAAAAAAAAABUgJAUHQQAB9gAAAnEAMOQ9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

export function setVoicesEnabled(on) { enabled = !!on; if (!enabled) stopVoice(); }
export function setVoiceVolume(v) { vol = Math.max(0, Math.min(1, +v || 0)); if (current?.gain) current.gain.gain.value = vol * vol; }
export function voicesEnabled() { return enabled; }
export function voiceVolume() { return vol; }

export function stopVoice() {
  if (!current) return;
  try { current.src.stop?.(); } catch { /* ignore */ }
  try { current.src.pause?.(); current.src.src = ''; } catch { /* ignore */ }
  try { current.gain.disconnect(); } catch { /* ignore */ }
  current = null;
}

/**
 * Play a voiced line if we have a clip. Returns true if playback started.
 * speaker: cast key or display name (e.g. 'elowen', 'Marga', 'Dungeon Master').
 */
export function playVoice(text, speaker = null) {
  if (!enabled || !text) return false;
  const file = resolve(text, speaker);
  if (!file) return false;
  stopVoice();
  const c = ac();
  // Prefer WebAudio bus so Voices volume shares the master mute path via a dedicated gain into destination
  // (voices sit beside sfx, not under music).
  const runWA = async () => {
    try {
      const buf = await loadBuf(file);
      if (!enabled) return;
      const src = c.createBufferSource();
      const g = c.createGain();
      g.gain.value = vol * vol;
      src.buffer = buf;
      src.connect(g).connect(c.destination);
      src.onended = () => { if (current?.src === src) current = null; };
      current = { src, gain: g, file };
      src.start(0);
    } catch {
      // HTMLAudio fallback
      const a = new Audio('/' + file.replace(/^\//, ''));
      a.volume = vol;
      current = { src: a, gain: null, file };
      a.onended = () => { if (current?.src === a) current = null; };
      a.play().catch(() => {});
    }
  };
  if (c) {
    if (c.state !== 'running') c.resume().catch(() => {});
    runWA();
  } else {
    const a = new Audio('/' + file.replace(/^\//, ''));
    a.volume = vol;
    current = { src: a, gain: null, file };
    a.onended = () => { if (current?.src === a) current = null; };
    a.play().catch(() => {});
  }
  return true;
}

/** Map display who-names to cast keys used in the index. */
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

export function playVoiceLine(text, who) {
  return playVoice(text, castKey(who));
}

export function hasVoice(text, who) {
  return !!resolve(text, castKey(who));
}
