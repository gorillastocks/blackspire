import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, expectReachable } from './helpers.js';

// There is no Sheet button: the exploring row has a Journal button instead (quests, bonds, notes, entries), and tapping any party card opens that hero's sheet.
test('Journal button replaces Sheet in the maze; party cards open the sheet (maze and town)', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  // town: Journal is a town button; the party card opens a sheet
  await expect(page.locator('#btn-journal')).toBeVisible();
  // (on a phone the town square is a full-screen sheet that deliberately covers the party cards; the Training Grounds rows carry a Sheet button per hero there)
  const vp = page.viewportSize(); const phone = vp.width <= 760 || (vp.height <= 520 && vp.width > vp.height);
  if (!phone) {
    await page.locator('#party .card').nth(1).click();
    await expect(page.locator('#modal .sheethead')).toBeVisible();
    const second = await page.evaluate(() => window.__gw.state.party[1].name);
    await expect(page.locator('#modal .tabs button.on')).toHaveText(second);
    await page.keyboard.press('Escape'); await expect(page.locator('#modal')).toBeHidden();
    await page.evaluate(() => window.__gw.showTown());
  } else {
    await openLocation(page, 'Training Grounds');
    const sheets = page.locator('#modal button', { hasText: /^Sheet$/ }); await expect(sheets).toHaveCount(4);
    await sheets.nth(1).click(); await expect(page.locator('#modal .sheethead')).toBeVisible();
    await page.locator('#modal .closebtn:visible').first().click(); await page.locator('#modal .backbtn:visible').first().click().catch(() => {});
    await page.evaluate(() => window.__gw.showTown());
  }
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let k = 0; k < 8 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  const ctl = page.locator('#controls');
  await expect(ctl.locator('button', { hasText: 'Sheet' })).toHaveCount(0);
  const jb = ctl.locator('button', { hasText: 'Journal' }); await expect(jb).toHaveCount(1);
  await expectReachable(page, jb, 'Journal button');
  await page.screenshot({ path: `/workspace/shots/journal-button-${P}.png` });
  await jb.click();
  await expect(page.locator('#modal')).toBeVisible(); await expect(page.locator('#modal')).toContainText('Journal');
  await expect(page.locator('#modal [data-page="quests"]')).toBeVisible();
  for (const t of ['bonds', 'notes', 'entries']) { await page.locator(`#modal [data-tab="${t}"]`).click(); await expect(page.locator(`#modal [data-page="${t}"]`)).toBeVisible(); }
  await page.locator('#btn-journal-close').click(); await expect(page.locator('#modal')).toBeHidden();
  // party card -> that hero's sheet
  await page.locator('#party .card').first().click();
  await expect(page.locator('#modal .sheethead')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#modal')).toBeHidden();
  await page.locator('#party .card').nth(2).click();
  const third = await page.evaluate(() => window.__gw.state.party[2].name);
  await expect(page.locator('#modal .tabs button.on')).toHaveText(third);
  expect(errors).toEqual([]);
});
