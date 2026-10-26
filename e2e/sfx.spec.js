import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

// Battle sounds: every category plays without errors once audio is unlocked by a tap, and nothing plays when
// Sound effects is switched off in Settings. Counts WebAudio source nodes started.
test('sound effects: all categories play; the Sound effects toggle silences them', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    window.__started = 0; const AC = window.AudioContext || window.webkitAudioContext;
    for (const m of ['createOscillator', 'createBufferSource']) { const orig = AC.prototype[m]; AC.prototype[m] = function (...a) { const n = orig.apply(this, a); const st = n.start.bind(n); n.start = (...b) => { window.__started++; return st(...b); }; return n; }; }
  });
  const errors = trackErrors(page);
  await newGame(page);
  await page.mouse.click(5, 5); // first tap unlocks audio (iOS)
  const names = await page.evaluate(() => window.__gw.SFX_NAMES);
  for (const n of ['slash', 'thud', 'twang', 'stab', 'punch', 'fire', 'cold', 'zap', 'chime', 'ping', 'miss', 'crit', 'mhit', 'mdeath']) expect(names).toContain(n);
  for (const n of names) {
    const c = await page.evaluate(async (n) => { const b = window.__started; window.__gw.sfx(n); await new Promise((r) => setTimeout(r, 350)); return window.__started - b; }, n);
    expect(c, `${n} makes sound`).toBeGreaterThan(0);
  }
  // Settings toggle: off → silent
  await page.locator('#btn-menu, button:has-text("Menu")').first().click();
  await page.locator('#gmenu button', { hasText: 'Settings' }).first().click();
  await expect(page.locator('#set-sfx')).toContainText('On');
  await page.locator('#set-sfx').click();
  await expect(page.locator('#set-sfx')).toContainText('Off');
  await expect(page.locator('#vol-sfx')).toBeVisible();
  // music/ambience keep scheduling notes, so compare against an equal quiet window
  const win = (play) => page.evaluate(async (play) => { const b = window.__started; if (play) for (const n of window.__gw.SFX_NAMES) window.__gw.sfx(n); await new Promise((r) => setTimeout(r, 400)); return window.__started - b; }, play);
  const quiet = await win(false), silent = await win(true);
  expect(silent, `sfx off: ${silent} nodes vs ${quiet} background`).toBeLessThanOrEqual(quiet + 4);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('blackspire.settings'))).sfxOn).toBe(false);
  await page.locator('#set-sfx').click(); await expect(page.locator('#set-sfx')).toContainText('On');
  expect(errors).toEqual([]);
});
