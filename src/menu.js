// In-game main menu (☰ Menu / Esc): Resume, Save to slot, Load, Settings, Save & Quit, Quit without saving.
// It is its own overlay (#gmenu) above everything, so Resume returns to exactly what was on screen.
export const SLOT_KEYS = ['grokwizard.save.slot1', 'grokwizard.save.slot2', 'grokwizard.save.slot3'];
export const SETTINGS_KEY = 'grokwizard.settings';

export function loadSettings() { try { return { sound: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return { sound: true }; } }
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ } }

/** Summary of a stored save (or null). */
export function slotInfo(key) {
  const raw = localStorage.getItem(key); if (!raw) return null;
  try {
    const s = JSON.parse(raw); const hero = s.party.find((c) => !c.companion && !c.recruit) || s.party[0];
    const where = s.mode === 'dungeon' ? `B${(s.level | 0) + 1}` : 'Town';
    return { t: s.savedAt || 0, text: `${hero.name} · L${hero.level} · ${where} · ${s.gold} gp${s.savedAt ? ' · ' + new Date(s.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}` };
  } catch { return { t: 0, text: 'Unreadable save' }; }
}
