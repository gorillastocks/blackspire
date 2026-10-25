// Save storage layer.
//  • Web: localStorage.
//  • iOS (Capacitor): also mirrored to @capacitor/preferences (UserDefaults — survives WebView storage purges)
//    and, when the app has the iCloud Key-value capability, to the bundled ICloudKV plugin (NSUbiquitousKeyValueStore),
//    so saves follow the player across devices. On launch the newest copy (by savedAt) wins.
//  • Robust writes: validate → write temp → keep the previous good copy as .bak → write main → drop temp.
//    Reads fall back main → .bak → .tmp, so a corrupt or half-written save is recovered automatically.
import { Capacitor, registerPlugin } from '@capacitor/core';

/** One-time migration of saves/settings from the game's old name (same origin on GitHub Pages, so old saves are visible). */
export function migrateLegacy(store = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!store) return 0; let n = 0;
  const OLD = 'grok' + 'wizard.'; // old prefix, kept only to find pre-rename saves
  for (const suf of ['save.v1', 'save.slot1', 'save.slot2', 'save.slot3', 'settings']) for (const ext of ['', '.bak']) {
    try { const v = store.getItem(OLD + suf + ext); if (v != null && store.getItem('blackspire.' + suf + ext) == null) { store.setItem('blackspire.' + suf + ext, v); n++; } } catch { /* ignore */ }
  }
  return n;
}
try { migrateLegacy(); } catch { /* ignore */ }

const native = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
let Prefs = null; let ICloud = null;
export const isNative = native;

function valid(raw) { try { const s = JSON.parse(raw); return !!(s && Array.isArray(s.party) && s.party.length) && s; } catch { return false; } }
const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { localStorage.setItem(k, v); },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

/** Write a save atomically with a backup. Throws if the data is not a valid save or storage is full. */
export function writeSave(key, raw) {
  if (!valid(raw)) throw new Error('refusing to write an invalid save');
  ls.set(key + '.tmp', raw);
  const prev = ls.get(key); if (prev && valid(prev)) ls.set(key + '.bak', prev);
  ls.set(key, raw);
  if (ls.get(key) !== raw) throw new Error('save did not stick');
  ls.del(key + '.tmp');
  mirror(key, raw);
}
/** Read a save, recovering from .bak/.tmp if the main copy is missing or corrupt. Returns {raw, recovered} or null. */
export function readSave(key, { repair = true } = {}) {
  for (const [k, rec] of [[key, false], [key + '.bak', true], [key + '.tmp', true]]) {
    const raw = ls.get(k); if (raw && valid(raw)) { if (rec && repair) { try { ls.set(key, raw); } catch { /* ignore */ } } return { raw, recovered: rec }; }
  }
  return null;
}
export function hasSave(key) { return !!readSave(key); }
export function deleteSave(key) { for (const k of [key, key + '.bak', key + '.tmp']) ls.del(k); if (Prefs) Prefs.remove({ key }).catch(() => {}); }

function mirror(key, raw) {
  if (Prefs) Prefs.set({ key, value: raw }).catch(() => {});
  if (ICloud) ICloud.set({ key, value: raw }).catch(() => {});
}
/** On native launch: pull the newest copy of each save from Preferences / iCloud into the local cache. */
export async function initStorage(keys) {
  if (!native()) return 'web';
  try { ({ Preferences: Prefs } = await import('@capacitor/preferences')); } catch { Prefs = null; }
  try { ICloud = registerPlugin('ICloudKV'); await ICloud.get({ key: '__probe' }); } catch { ICloud = null; } // absent on web / older builds
  for (const key of keys) {
    const cands = [ls.get(key)];
    try { if (Prefs) cands.push((await Prefs.get({ key })).value); } catch { /* ignore */ }
    try { if (ICloud) cands.push((await ICloud.get({ key })).value); } catch { /* ignore */ }
    let best = null, bt = -1; for (const c of cands) { const s = c && valid(c); if (s && (s.savedAt || 0) > bt) { bt = s.savedAt || 0; best = c; } }
    if (best && best !== ls.get(key)) { try { writeSave(key, best); } catch { /* ignore */ } }
  }
  return ICloud ? 'icloud' : Prefs ? 'preferences' : 'local';
}

/* ---------- export / import (backup) ---------- */
const b64e = (s) => btoa(unescape(encodeURIComponent(s)));
const b64d = (s) => decodeURIComponent(escape(atob(s)));
export function exportCode(raw) { return 'BS1:' + b64e(raw); }
export function importCode(text) {
  let t = String(text || '').trim();
  if (/^(BS1|GW1):/.test(t)) t = b64d(t.slice(4).replace(/\s+/g, '')); // GW1 = codes exported before the rename
  if (!valid(t)) throw new Error('That is not a Blackspire save (code or .json file).');
  return t;
}
