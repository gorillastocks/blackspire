import { test, expect } from '@playwright/test';

// Bug (TestFlight 1.0.0 (7)): in "Create Your Adventurer" the page would only scroll when the finger started at the very top,
// because the portrait grid and the voice list were their own scroll boxes that swallowed touch swipes.
// A real touch swipe that STARTS ON the portrait grid / voice list must scroll the whole modal.
async function swipeUp(page, x, y, dist = 260) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 20; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - (dist * i) / 20 }] }); await page.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(500);
}
const panelTop = (page) => page.evaluate(() => document.querySelector('#modal .panel').scrollTop);

test('creator: a touch swipe starting on the portrait grid / voice list scrolls the whole modal', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'touch only');
  await page.goto('./');
  await page.click('#btn-new', { timeout: 90000 });
  await page.waitForSelector('#pgrid');
  // the grid and the voice list must not be nested scroll boxes on touch screens
  const nested = await page.evaluate(() => ['#pgrid', '#voice-list'].map((s) => { const e = document.querySelector(s); const cs = getComputedStyle(e); return { s, ov: cs.overflowY, scrollable: e.scrollHeight > e.clientHeight + 1 }; }));
  for (const n of nested) expect(n.ov === 'visible' || !n.scrollable, `${n.s} is not a nested scroller ${JSON.stringify(n)}`).toBe(true);
  expect(await panelTop(page)).toBe(0);
  const g = await page.locator('#pgrid').boundingBox();
  const vp = page.viewportSize();
  const x = g.x + g.width / 2, y = Math.min(g.y + g.height / 2, vp.height - 80);
  await swipeUp(page, x, y);
  const t1 = await panelTop(page);
  expect(t1, 'modal scrolled after swiping on the portrait grid').toBeGreaterThan(50);
  // now swipe starting on the voice list (scroll back to it first if needed)
  await page.locator('#voice-list').scrollIntoViewIfNeeded();
  const v = await page.locator('#voice-list').boundingBox();
  const before = await panelTop(page);
  await swipeUp(page, v.x + v.width / 2, Math.min(Math.max(v.y + 20, 120), vp.height - 80), 200);
  expect(await panelTop(page), 'modal scrolled after swiping on the voice list').toBeGreaterThan(before);
});
