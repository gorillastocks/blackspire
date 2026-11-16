import { test, expect } from '@playwright/test';
import { newGame } from './helpers.js';

// Sean: "Make it easy to unlock full game. Put a button here if they didn't buy yet that will take them directly to purchase screen."
test('town menu: unlock button shows when the paywall is active and not bought, opens the purchase screen, and disappears after buying', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('blackspire.paywall', '1'); });
  await newGame(page);
  const unlock = page.locator('#btn-town-unlock');
  await expect(unlock).toBeVisible(); await expect(unlock).toContainText('Unlock Full Game');
  // "Not now" returns to the town square, still showing the button
  await unlock.click();
  await expect(page.locator('#btn-unlock')).toBeVisible(); await expect(page.locator('#btn-restore')).toBeVisible();
  await page.locator('#btn-notnow').click();
  await expect(page.locator('#btn-tavern')).toBeVisible(); await expect(unlock).toBeVisible();
  // buy (web dev paywall: placeholder purchase grants the entitlement): back in town, button gone, no descent
  await unlock.click();
  await page.locator('#btn-unlock').click();
  await expect(page.locator('#btn-tavern')).toBeVisible();
  await expect(page.locator('#btn-town-unlock')).toHaveCount(0);
  expect(await page.evaluate(() => window.__gw.state.mode)).toBe('town');
});

test('town menu: no unlock button on the web build (paywall off)', async ({ page }) => {
  await newGame(page);
  await expect(page.locator('#btn-tavern')).toBeVisible();
  await expect(page.locator('#btn-town-unlock')).toHaveCount(0);
});
