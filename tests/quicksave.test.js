import { describe, it, expect, beforeEach } from 'vitest';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const { writeSave } = await import('../src/storage.js');
const { SLOT_KEYS, saveEntries, saveName, newestKey, slotInfo } = await import('../src/menu.js');
const { SAVE_KEY, QUICK_KEY } = await import('../src/game/game.js');
const save = (name, t) => JSON.stringify({ party: [{ name, level: 2 }], gold: 5, mode: 'town', savedAt: t });

describe('Quick Save slot', () => {
  beforeEach(() => mem.clear());
  it('has its own key, distinct from autosave and the numbered slots', () => {
    expect(QUICK_KEY).toBe('blackspire.save.quick');
    expect(new Set([SAVE_KEY, QUICK_KEY, ...SLOT_KEYS]).size).toBe(2 + SLOT_KEYS.length);
    expect(SAVE_KEY).toBe('blackspire.save.v1'); // existing autosaves keep working
  });
  it('lists Autosave and Quick Save as separate entries, then the numbered slots', () => {
    const e = saveEntries(SAVE_KEY, QUICK_KEY);
    expect(e.map(([k]) => k)).toEqual([SAVE_KEY, QUICK_KEY, ...SLOT_KEYS]);
    expect(e.map(([, i]) => saveName(i))).toEqual(['Autosave', 'Quick Save', 'Slot 1', 'Slot 2', 'Slot 3']);
  });
  it('writing the quick key never touches the autosave, and overwrites itself every time', () => {
    writeSave(SAVE_KEY, save('Auto', 100));
    writeSave(QUICK_KEY, save('Q1', 200)); writeSave(QUICK_KEY, save('Q2', 300));
    expect(slotInfo(SAVE_KEY).text).toContain('Auto');
    expect(slotInfo(QUICK_KEY).text).toContain('Q2');
    expect(slotInfo(QUICK_KEY).text).not.toContain('Q1');
  });
  it('newestKey picks the newest of autosave, quick save and slots', () => {
    const keys = saveEntries(SAVE_KEY, QUICK_KEY).map(([k]) => k);
    expect(newestKey(keys)).toBeNull();
    writeSave(SAVE_KEY, save('Auto', 100)); expect(newestKey(keys)).toBe(SAVE_KEY);
    writeSave(QUICK_KEY, save('Quick', 200)); expect(newestKey(keys)).toBe(QUICK_KEY);
    writeSave(SLOT_KEYS[1], save('Slot', 150)); expect(newestKey(keys)).toBe(QUICK_KEY);
    writeSave(SAVE_KEY, save('Auto', 400)); expect(newestKey(keys)).toBe(SAVE_KEY);
  });
  it('a quick save alone counts as "has saves" for Continue', () => {
    writeSave(QUICK_KEY, save('Quick', 1));
    expect(saveEntries(SAVE_KEY, QUICK_KEY).some(([k]) => slotInfo(k))).toBe(true);
  });
});
