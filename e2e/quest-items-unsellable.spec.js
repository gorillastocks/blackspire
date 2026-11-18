import { test, expect } from '@playwright/test';
import { newGame, trackErrors, openLocation } from './helpers.js';

test('quest items and keys cannot be sold at the Trading Post', async ({ page }) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => {
    const s = window.__gw.state;
    s.inventory = ['signetRing', 'royalWrit', 'warhorn', 'dawnstoneAmulet', 'key1', 'tinCup'];
  });
  await openLocation(page, 'Trading Post');
  await page.locator('#modal [data-tab="sell"]').click();
  for (const k of ['signetRing', 'royalWrit', 'warhorn', 'dawnstoneAmulet', 'key1']) {
    await expect(page.locator(`[data-unsellable="${k}"]`)).toHaveText(/Quest item, can't be sold/);
    await expect(page.locator(`[data-sell="${k}"]`)).toHaveCount(0);
  }
  await expect(page.locator('[data-sell="tinCup"]')).toBeVisible();
  const before = await page.evaluate(() => window.__gw.G.sell(window.__gw.state, window.__gw.state.inventory.indexOf('warhorn')));
  expect(before).toEqual([]);
  expect(await page.evaluate(() => window.__gw.state.inventory.includes('warhorn'))).toBe(true);
  await page.locator('[data-sell="tinCup"]').click();
  await expect.poll(() => page.evaluate(() => window.__gw.state.inventory.includes('tinCup'))).toBe(false);
  expect(await page.evaluate(() => ['signetRing', 'royalWrit', 'warhorn', 'dawnstoneAmulet', 'key1'].every((k) => window.__gw.state.inventory.includes(k)))).toBe(true);
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
