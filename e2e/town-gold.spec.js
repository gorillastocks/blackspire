import { test, expect } from '@playwright/test';
import { newGame, trackErrors, openLocation, recoverToTown } from './helpers.js';

test('town screens show party gold and mark unaffordable temple services', async ({ page }) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { window.__gw.state.gold = 1234; window.__gw.showTown(); });
  await expect(page.locator('#party-gold')).toHaveText('💰 1,234 gp');

  await openLocation(page, 'Temple');
  await expect(page.locator('#party-gold')).toHaveText('💰 1,234 gp');

  await page.evaluate(() => {
    const g = window.__gw, s = g.state, c = s.party[0];
    s.gold = 50; c.dead = true; c.hp = 0;
    g.showTown('temple');
  });
  await expect(page.locator('#party-gold')).toHaveText('💰 50 gp');
  const raise = page.locator('#modal button', { hasText: 'Raise Dead' });
  await expect(raise).toBeDisabled();
  await expect(raise).toContainText(/Need 100 gp/);

  await page.evaluate(() => { window.__gw.state.gold = 150; window.__gw.showTown('temple'); });
  await expect(page.locator('#party-gold')).toHaveText('💰 150 gp');
  await expect(raise).toBeEnabled();
  await raise.click();
  await expect(page.locator('#party-gold')).toHaveText('💰 50 gp');
  expect(await page.evaluate(() => window.__gw.state.party[0].dead)).toBe(false);

  await recoverToTown(page, 'temple');
  await page.evaluate(() => { window.__gw.state.gold = 40; window.__gw.showTown(); });
  await openLocation(page, 'Trading Post');
  await expect(page.locator('#party-gold')).toHaveText('💰 40 gp');
  const potion = page.locator('#modal [data-buy="potionHealing"]');
  await expect(potion).toBeDisabled();
  await expect(potion).toContainText(/Need 50 gp/);

  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
