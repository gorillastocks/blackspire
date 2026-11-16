import { describe, it, expect, beforeEach } from 'vitest';
const store = {}; globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const { loadSettings, saveSettings, SETTINGS_KEY } = await import('../src/menu.js');
describe('battle speed default', () => {
  beforeEach(() => { for (const k in store) delete store[k]; });
  it('new players start on Pause after each action', () => expect(loadSettings().battleSpeed).toBe('pause'));
  it('existing players still on the old Normal default move to Pause', () => { store[SETTINGS_KEY] = JSON.stringify({ sound: true, battleSpeed: 'normal' }); expect(loadSettings().battleSpeed).toBe('pause'); });
  it('a speed the player picked is kept (including Normal once chosen)', () => {
    store[SETTINGS_KEY] = JSON.stringify({ battleSpeed: 'fast' }); expect(loadSettings().battleSpeed).toBe('fast');
    saveSettings({ ...loadSettings(), battleSpeed: 'normal', battleSpeedSet: true }); expect(loadSettings().battleSpeed).toBe('normal');
  });
  it('an unrecognized battle speed falls back to Pause without inventing a saved choice', () => {
    store[SETTINGS_KEY] = JSON.stringify({ sound: true, battleSpeed: 'turbo' });
    const s = loadSettings();
    expect(s.battleSpeed).toBe('pause');
    expect(s.battleSpeedSet).toBeFalsy();
  });
});
