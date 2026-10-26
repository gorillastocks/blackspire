import { test, expect } from '@playwright/test';
import { newGame, openLocation, expectReachable, trackErrors } from './helpers.js';

const st = (page, fn) => page.evaluate(fn);

test('all 4 ready to level up + low HP: action buttons stay visible and tappable', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon');
  const h0 = await page.locator('#party .card').first().evaluate((e) => e.getBoundingClientRect().height);
  await st(page, () => { for (const c of window.__gw.state.party) { c.xp = 300; c.hp = 1; } window.__gw.refresh?.(); });
  // trigger a re-render through a harmless action (turn + turn back)
  await page.keyboard.press('q'); await page.keyboard.press('e'); await page.waitForTimeout(300);
  await expect(page.locator('#party .lvchip')).toHaveCount(4);
  const h1 = await page.locator('#party .card').first().evaluate((e) => e.getBoundingClientRect().height);
  expect(h1, 'card height unchanged by the level-up chip').toBeLessThanOrEqual(h0 + 1);
  for (const name of ['Camp', 'Search', 'Map']) await expectReachable(page, page.locator('#controls button', { hasText: name }).first(), name);
  await page.screenshot({ path: `/workspace/shots/levelup-layout-${P}.png` });
  await page.locator('#controls button', { hasText: 'Camp' }).first().click();
  await expect(page.locator('#camp-levelup')).toBeVisible();
  expect(errors).toEqual([]);
});
