import { readSave } from './storage.js';
// In-game main menu (☰ Menu / Esc): Resume, Save to slot, Load, Settings, Save & Quit, Quit without saving.
// It is its own overlay (#gmenu) above everything, so Resume returns to exactly what was on screen.
export const SLOT_KEYS = ['blackspire.save.slot1', 'blackspire.save.slot2', 'blackspire.save.slot3'];
/** Every save a player can load, in list order: [key, index] with index -1 = Autosave, -2 = Quick Save, 0.. = numbered slots. */
export function saveEntries(autoKey, quickKey) { return [[autoKey, -1], [quickKey, -2], ...SLOT_KEYS.map((k, i) => [k, i])]; }
/** Display name of a save entry (see saveEntries). */
export function saveName(i) { return i === -1 ? 'Autosave' : i === -2 ? 'Quick Save' : 'Slot ' + (i + 1); }
/** The key of the newest save among the given keys (ties go to the earlier key), or null. */
export function newestKey(keys) { let best = null, bt = -1; for (const k of keys) { const i = slotInfo(k); if (i && i.t > bt) { bt = i.t; best = k; } } return best; }
export const SETTINGS_KEY = 'blackspire.settings';

const DEFAULTS = { sound: true, music: 0.6, sfx: 0.8, amb: 0.6, voices: true, voice: 0.85, tutorialDone: false, battleSpeed: 'pause', areaDesc: true, trivialFights: 'ask' };
/** Battle speed: f scales animation waits; hold = how long each action caption stays before the next action (0 = wait for a tap). */
/** Attack animations (weapon strikes, monster lunges, spell bolts/bursts) run this much longer than the original timings; battle speed still scales on top. */
export const ANIM_SLOW = 1.5;
export const BATTLE_SPEEDS = {
  pause: { label: '⏸ Pause after each action', short: 'Pause', f: 1, hold: 0 },
  slow: { label: '🐢 Slow', short: 'Slow', f: 1.6, hold: 2400 },
  normal: { label: '▶ Normal', short: 'Normal', f: 1, hold: 1100 },
  double: { label: '⏩ 2× Normal', short: '2×', f: 0.5, hold: 550 },
  fast: { label: '⏭ Fast', short: 'Fast', f: 0.35, hold: 300 },
};
export function loadSettings() {
  try {
    const s = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    // the default became Pause after each action: players who never picked a speed (still on the old 'normal' default) move to it
    if (!s.battleSpeedSet && s.battleSpeed === 'normal') s.battleSpeed = 'pause';
    return s;
  } catch { return { ...DEFAULTS }; }
}
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

/** Summary of a stored save (or null). */
export function slotInfo(key) {
  const got = readSave(key, { repair: false }); if (!got) return null; const raw = got.raw;
  try {
    const s = JSON.parse(raw); const hero = s.party.find((c) => !c.companion && !c.recruit) || s.party[0];
    const where = s.mode === 'dungeon' ? `B${(s.level | 0) + 1}` : 'Town';
    return { t: s.savedAt || 0, text: `${hero.name} · L${hero.level} · ${where} · ${s.gold} gp · ${s.randomDungeons ? '🎲 Random dungeons' : 'Classic dungeons'}${s.savedAt ? ' · ' + new Date(s.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}` };
  } catch { return { t: 0, text: 'Unreadable save' }; }
}
