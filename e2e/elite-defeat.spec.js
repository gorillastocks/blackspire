import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, dismissCards } from './helpers.js';

/** Defeating an elite must clear its 3D skull, its map ☠ and its pin, and drop the floor count. */
test('a defeated elite loses its 3D skull, map marker, pin and count', async ({ page }) => {
  test.setTimeout(200000); const errors = trackErrors(page);
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let i = 0; i < 12; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await dismissCards(page); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
  await page.evaluate(() => window.__gw.hideCaption());
  const total = await page.evaluate(() => { const { state: S, G } = window.__gw; for (const e of G.liveElites(S)) S.eliteSeen[`0:${e.id}`] = 1; return G.liveElites(S).length; });
  expect(total).toBeGreaterThanOrEqual(2);
  // put every live elite in the 3D scene and drop a pin for one, as the telegraph does
  await page.evaluate(() => { const { state: S, G } = window.__gw; const e = G.liveElites(S)[0]; G.Prog.addPin(S, e.path[0][0], e.path[0][1], '☠', `Elite: ${e.title} (guards here)`); window.__gw.refresh(); });
  await expect.poll(() => page.evaluate(() => window.__gw.R.eliteObjs.size), { timeout: 60000 }).toBe(total);
  await page.locator('#controls button', { hasText: 'Map' }).click();
  await expect(page.locator('#map-secrets')).toContainText(`Elites ${total} on this floor`);
  await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('#modal .close, #modal button')?.click());
  // defeat the first elite
  await page.evaluate(() => { const { state: S, G } = window.__gw; const e = G.liveElites(S)[0]; G.Prog.discover(S, 'elite', e.id, 'defeated'); window.__gw.refresh(); });
  await expect.poll(() => page.evaluate(() => window.__gw.R.eliteObjs.size), { timeout: 30000 }).toBe(total - 1);
  expect(await page.evaluate(() => (window.__gw.state.pins?.[0] || []).filter((p) => p.icon === '☠').length)).toBe(0);
  await page.evaluate(() => window.__gw.showMap());
  await expect(page.locator('#map-secrets')).toContainText(`Elites ${total - 1} on this floor`);
  await expect(page.locator('.pinlist')).toHaveCount(0);
  expect(errors.filter((e) => !/favicon|WebGL|GPU/i.test(e))).toEqual([]);
});
