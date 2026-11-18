import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test('long rests tell the player the moon clock, which follows the live difficulty', async ({ page }) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  // New games default to Normal: 5 long rests per moon.
  expect(await page.evaluate(() => window.__gw.state.difficulty || 'normal')).toBe('normal');

  await page.locator('#btn-inn').click();
  await expect(page.locator('#log')).toContainText('☾ Long rests until next moonrise: 4 · Seals broken: 0 of 5');
  await expect(page.locator('#toast')).toHaveText('☾ Long rests until next moonrise: 4 · Seals broken: 0 of 5');

  await page.locator('#btn-journal').click();
  await expect(page.locator('#quests-clock')).toHaveText('Moon 1 of 5 · Seals broken: 0/5 · 4 long rests until next moonrise (5 per moon)');
  await page.locator('#btn-journal-close').click();

  await page.evaluate(() => {
    const g = window.__gw, s = g.state;
    s.rests = 4; s.moon = 0; s.gold = 100; s.difficulty = 'normal';
    delete s.restsAtLastMoon;
    g.handle(g.G.innRest(s));
  });
  await expect(page.locator('#log')).toContainText('The moon rises over Emberhollow');
  await expect(page.locator('#log')).toContainText('☾ Long rests until next moonrise: 5 · Seals broken: 1 of 5');

  await page.evaluate(() => {
    const g = window.__gw, s = g.state;
    s.difficulty = 'hard';
    s.rests = 14; s.moon = 4; delete s.restsAtLastMoon; // old-save layout: last moon at rest 12
    s.gold = 100; s.mode = 'town';
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

  const heard = await page.evaluate(() => {
    const g = window.__gw, s = g.state, out = {};
    s.moon = 1; s.rumors = { heard: {}, taps: 0 };
    s.difficulty = 'normal';
    const n = g.G.Tavern.overhear(s, () => 0);
    out.normal = n.lines.find((l) => l.who === 'brogan')?.text;
    s.difficulty = 'hard'; s.rumors = { heard: {}, taps: 0 };
    const h = g.G.Tavern.overhear(s, () => 0);
    out.hard = h.lines.find((l) => l.who === 'brogan')?.text;
    const has = g.voice().has;
    out.hasFifth = !!(has && has(out.normal, 'brogan'));
    out.hasThird = !!(has && has(out.hard, 'brogan'));
    return out;
  });
  expect(heard.normal).toBe('Every fifth rest, another one breaks. Count your naps.');
  expect(heard.hard).toBe('Every third rest, another one breaks. Count your naps.');
  expect(heard.hasFifth).toBe(true);
  expect(heard.hasThird).toBe(true);

  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
