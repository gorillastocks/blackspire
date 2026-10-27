import { test, expect } from '@playwright/test';

// Runs against scripts/serve-blackspire.mjs (dist under /blackspire/) — the live GitHub Pages layout.
const BASE = process.env.SUBPATH_BASE || 'http://127.0.0.1:4177/blackspire/';

test.use({ baseURL: BASE, storageState: 'e2e/no-dm.json' });

test('under /blackspire/: Test voice fetches mp3 and WebAudio plays', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('./');
  await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.click('#btn-new'); await page.click('#btn-begin');
  // skip prologue quickly
  for (let i = 0; i < 12; i++) {
    const skip = page.locator('#dlg-skip');
    const next = page.locator('#dlg-next');
    if (await skip.isVisible().catch(() => false)) { await skip.click(); break; }
    if (await next.isVisible().catch(() => false)) await next.click();
    else break;
    await page.waitForTimeout(200);
  }
  const tip = page.locator('#tip-skip'); if (await tip.isVisible().catch(() => false)) await tip.click();
  await page.waitForTimeout(400);

  // Prove absolute /voice/ still 404s here (the old bug) while relative works
  const paths = await page.evaluate(async () => {
    const abs = await fetch('/voice/manifest.json').then((r) => r.status).catch(() => 0);
    const rel = await fetch(new URL('voice/manifest.json', location.href)).then((r) => r.status);
    return { abs, rel, href: location.href };
  });
  expect(paths.href).toContain('/blackspire/');
  expect(paths.abs).toBe(404);
  expect(paths.rel).toBe(200);

  await page.locator('#btn-menu, button:has-text("Menu")').first().click();
  await page.locator('#gmenu button', { hasText: 'Settings' }).first().click();
  await page.locator('#set-test-voice').click();
  await expect.poll(async () => page.evaluate(() => window.__gw.voice().current?.file || ''), { timeout: 15000 }).toMatch(/elowen/);
  const href = await page.evaluate(() => new URL(window.__gw.voice().current.file, location.href).href);
  expect(href).toContain('/blackspire/voice/');
  expect(await page.evaluate(async (h) => (await fetch(h)).ok, href)).toBe(true);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => !!window.__gw.voice().current)).toBe(true);
});
