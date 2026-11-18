import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test('long rests at the inn and in camp tell the player the moon and seal clock', async ({ page }) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);

  await page.locator('#btn-inn').click();
  await expect(page.locator('#log')).toContainText('☾ Long rests until next moonrise: 2 · Seals broken: 0 of 5');
  await expect(page.locator('#toast')).toHaveText('☾ Long rests until next moonrise: 2 · Seals broken: 0 of 5');

  await page.evaluate(() => {
    const g = window.__gw, s = g.state;
    s.rests = 2; s.moon = 0; s.gold = 100;
    g.handle(g.G.innRest(s));
  });
  await expect(page.locator('#log')).toContainText('The moon rises over Emberhollow');
  await expect(page.locator('#log')).toContainText('☾ Long rests until next moonrise: 3 · Seals broken: 1 of 5');

  await page.evaluate(() => {
    const g = window.__gw, s = g.state;
    s.rests = 14; s.moon = 4; s.gold = 100; s.mode = 'town';
    g.handle(g.G.rest(s, 'long'));
  });
  await expect(page.locator('#log')).toContainText('Five moons, Emberhollow');
  await expect(page.locator('#log')).toContainText('☾ Malthrax is empowered. All 5 seals are broken.');
  await expect(page.locator('#toast')).toHaveText('☾ Malthrax is empowered. All 5 seals are broken.');

  const after = await page.evaluate(() => {
    const g = window.__gw, s = g.state;
    s.victory = true;
    const ev = g.G.innRest(s);
    return { rests: s.rests, moon: s.moon, logs: ev.map((e) => e.log).filter(Boolean) };
  });
  expect(after.rests).toBe(15);
  expect(after.moon).toBe(5);
  expect(after.logs.some((t) => /moonrise|empowered|seals/i.test(t))).toBe(false);

  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
