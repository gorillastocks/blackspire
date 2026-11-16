import { test, expect } from '@playwright/test';

// App Review 2.1(b): the one-time purchase must be findable without playing. Title > Settings > More > Full game.
test('Settings > More > Full game offers Unlock Full Game next to Restore Purchases (paywall build)', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('blackspire.paywall', '1'); });
  await page.goto('./');
  await page.click('#btn-title-settings', { timeout: 90000 });
  await page.getByRole('tab', { name: /More/ }).click();
  const unlock = page.locator('#set-unlock');
  await expect(unlock).toBeVisible(); await expect(unlock).toContainText('Unlock Full Game');
  await expect(page.locator('#set-restore')).toBeVisible();
  await unlock.scrollIntoViewIfNeeded();
  await unlock.click(); // web dev paywall: placeholder purchase grants the entitlement
  await expect(page.locator('#set-unlocked')).toContainText('Unlocked');
  await expect(page.locator('#set-unlock')).toHaveCount(0);
});

test('web build (paywall off) shows no purchase button, only Restore', async ({ page }) => {
  await page.goto('./');
  await page.click('#btn-title-settings', { timeout: 90000 });
  await page.getByRole('tab', { name: /More/ }).click();
  await expect(page.locator('#set-restore')).toBeVisible();
  await expect(page.locator('#set-unlock')).toHaveCount(0);
});
