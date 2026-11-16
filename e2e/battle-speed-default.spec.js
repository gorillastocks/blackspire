import { test, expect } from '@playwright/test';
import { trackErrors } from './helpers.js';

test('first-time players default to Pause battle speed', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  const errors = trackErrors(page);
  // Playwright's shared storageState pins an old Normal speed for other tests; a first launch has no settings.
  await page.addInitScript(() => { localStorage.removeItem('blackspire.settings'); });
  await page.goto('./');
  await page.waitForSelector('#btn-title-settings', { timeout: 90000 });
  const speed = await page.evaluate(() => {
    const raw = localStorage.getItem('blackspire.settings');
    return { raw, loaded: window.__gw ? null : 'no-gw-yet' };
  });
  await page.click('#btn-title-settings');
  await page.locator('#gmenu [data-tab="game"]').click();
  const pause = page.locator('#gmenu [data-speed="pause"]');
  await expect(pause).toBeVisible();
  await expect(pause).toHaveAttribute('aria-checked', 'true');
  await expect(pause).toHaveClass(/on/);
  const on = await page.locator('#gmenu [data-speed][aria-checked="true"]').getAttribute('data-speed');
  expect(on).toBe('pause');
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
  void speed;
});

test('a saved battle speed is not overwritten', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  await page.addInitScript(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'fast', battleSpeedSet: true, tutorialDone: true }));
  });
  await page.goto('./');
  await page.waitForSelector('#btn-title-settings', { timeout: 90000 });
  await page.click('#btn-title-settings');
  await page.locator('#gmenu [data-tab="game"]').click();
  await expect(page.locator('#gmenu [data-speed="fast"]')).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#gmenu [data-speed="pause"]')).toHaveAttribute('aria-checked', 'false');
});
