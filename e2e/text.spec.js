import { test, expect } from '@playwright/test';
import { trackErrors, newGame, auditText } from './helpers.js';

test.describe.configure({ timeout: 300000 });
// A big tablet viewport with the WebGL arena rendering (software GL) behind the dialog can starve a single screenshot past 15s: retry with a longer timeout before failing.
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { return await shot(page, { ...o, timeout: 40000 }); } catch (e) { if (i === 2) throw e; await page.mouse.move(1, 1); await page.waitForTimeout(500); } } };


test('chest + trap search, companion talk and banter text is crisp and readable', async ({ page }, info) => {
  const errors = trackErrors(page);
  const phone = info.project.name.startsWith('iphone'); const minPx = phone ? 16 : 13;
  await newGame(page);
  // tavern chatter
  await page.locator('#modal button', { hasText: 'Tavern' }).click();
  await page.locator('#modal [data-tab="bar"]').click();
  await page.locator('#modal button', { hasText: 'Listen in' }).click();
  if (await page.locator('.dialogue').count()) { // a patron exchange (about one tap in four is the party's banter instead)
    await auditText(page, '#modal .panel', minPx);
    await shot(page, { path: `screenshots/text-${info.project.name}-tavern-talk.png` });
    for (let i = 0; i < 4 && await page.locator('.dialogue').count(); i++) { await page.locator('#dlg-next').click(); await page.waitForTimeout(150); }
  }
  await expect(page.locator('#modal .dlgout')).toBeVisible();
  await auditText(page, '#modal .panel', minPx);
  await page.locator('#modal .backbtn').first().click();
  // dungeon: stand on a chest and search it for traps
  await page.locator('#modal button', { hasText: 'Edge of Town' }).click(); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const { state: S, G } = window.__gw; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (G.tile(S, x, y) === 'C') { S.x = x; S.y = y; } window.__gw.prompt('chest'); });
  await page.locator('#modal button', { hasText: 'Inspect' }).click();
  await page.locator('#modal button', { hasText: 'Disarm' }).click();
  await expect(page.locator('#modal .dlgout div')).not.toHaveCount(0);
  await page.evaluate(() => window.__gw.banter('trap'));
  await auditText(page, '#modal .panel', minPx);
  await shot(page, { path: `screenshots/text-${info.project.name}-chest-trap-search.png` });
  await page.locator('#modal button', { hasText: 'Leave it' }).click();
  // camp: companion conversation
  await page.evaluate(() => window.__gw.showCamp());
  await page.click('#btn-talk'); await page.locator('#talk-picker [data-talk]').first().click(); // pick a companion for a heart to heart
  await expect(page.locator('.dialogue')).toBeVisible();
  await auditText(page, '#modal .panel', minPx);
  await shot(page, { path: `screenshots/text-${info.project.name}-camp-talk.png` });
  await page.keyboard.press('Escape'); await page.evaluate(() => { const m = document.querySelector('#modal'); if (!m.classList.contains('hidden')) m.querySelector('.closebtn')?.click(); });
  // banter bubbles over the 3D view
  await page.evaluate(() => { window.__gw.banter('loot'); window.__gw.banter('secret'); });
  await page.waitForTimeout(300);
  await auditText(page, '#banter', minPx);
  await shot(page, { path: `screenshots/text-${info.project.name}-banter.png` });
  // the combat log itself
  await auditText(page, '#log', phone ? 16 : 13);
  expect(errors, errors.join('\n')).toEqual([]);
});
