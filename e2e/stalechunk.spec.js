import { test, expect } from '@playwright/test';
// Regression: after a deploy, an open tab's dynamic import 404s; the app must reload once instead of breaking.
test('stale chunk after redeploy triggers a single reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!window.__gw);
  const nav = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) nav.push(f.url()); });
  await page.evaluate(() => { const e = new Event('vite:preloadError', { cancelable: true }); window.dispatchEvent(e); });
  await page.waitForFunction(() => !!window.__gw && sessionStorage.getItem('gw-chunk-reload') === '1');
  expect(nav.length).toBe(1);
  // A second failure in the same window must not loop.
  await page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })));
  await page.waitForTimeout(800);
  expect(nav.length).toBe(1);
});
