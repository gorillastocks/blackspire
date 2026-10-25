import { readSave } from './storage.js';
// In-game main menu (☰ Menu / Esc): Resume, Save to slot, Load, Settings, Save & Quit, Quit without saving.
// It is its own overlay (#gmenu) above everything, so Resume returns to exactly what was on screen.
export const SLOT_KEYS = ['blackspire.save.slot1', 'blackspire.save.slot2', 'blackspire.save.slot3'];
export const SETTINGS_KEY = 'blackspire.settings';

const DEFAULTS = { sound: true, music: 0.6, sfx: 0.8, amb: 0.6, tutorialDone: false, battleSpeed: 'normal' };
/** Battle speed: f scales animation waits; hold = how long each action caption stays before the next action (0 = wait for a tap). */
export const BATTLE_SPEEDS = {
  pause: { label: '⏸ Pause after each action', short: 'Pause', f: 1, hold: 0 },
  slow: { label: '🐢 Slow', short: 'Slow', f: 1.6, hold: 2400 },
  normal: { label: '▶ Normal', short: 'Normal', f: 1, hold: 1100 },
  fast: { label: '⏩ Fast', short: 'Fast', f: 0.35, hold: 300 },
};
export function loadSettings() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { ...DEFAULTS }; } }
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

/** Summary of a stored save (or null). */
export function slotInfo(key) {
  const got = readSave(key, { repair: false }); if (!got) return null; const raw = got.raw;
  try {
    const s = JSON.parse(raw); const hero = s.party.find((c) => !c.companion && !c.recruit) || s.party[0];
    const where = s.mode === 'dungeon' ? `B${(s.level | 0) + 1}` : 'Town';
    return { t: s.savedAt || 0, text: `${hero.name} · L${hero.level} · ${where} · ${s.gold} gp${s.savedAt ? ' · ' + new Date(s.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}` };
  } catch { return { t: 0, text: 'Unreadable save' }; }
}
