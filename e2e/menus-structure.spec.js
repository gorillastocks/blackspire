import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, dismissCards, expectReachable } from './helpers.js';

test.describe.configure({ timeout: 300000 });
const snap = async (page, info, name) => { if (info.project.name !== 'iphone') return; await page.waitForTimeout(500); await page.screenshot({ path: `/workspace/shots/menus-after-${name}-iphone.png` }); };
const fits = async (page, sel) => page.evaluate((s) => { const p = document.querySelector(s); return { sh: p.scrollHeight, ch: p.clientHeight }; }, sel);

test('menus are split into short tabbed pages with big tap targets and a reachable Back/Close', async ({ page }, info) => {
  const errors = trackErrors(page);
  await newGame(page);
  const phone = info.project.name.startsWith('iphone');

  // ---- Tavern: Party / Roster / Hire / Bar
  await openLocation(page, 'Tavern');
  const tabs = page.locator('#modal .maintabs button');
  await expect(tabs).toHaveCount(4); await snap(page, info, 'tavern');
  for (const id of ['party', 'roster', 'hire', 'bar']) {
    const t = page.locator(`#modal [data-tab="${id}"]`); await expectReachable(page, t, `Tavern tab ${id}`);
    expect((await t.boundingBox()).height, `tab ${id} tap height`).toBeGreaterThanOrEqual(44);
    await t.click();
    await expectReachable(page, page.locator('#modal .backbtn').first(), `Back on Tavern ${id}`);
  }
  await page.locator('#modal [data-tab="bar"]').click();
  if (phone) { const m = await fits(page, '#modal .panel'); expect(m.sh, 'Tavern Bar fits one phone screen').toBeLessThanOrEqual(m.ch + 2); }
  await page.locator('#modal .backbtn').first().click();

  // ---- Town: the Trading Post (Potions / Weapons / Armor / Sell & Equip)
  await snap(page, info, 'town-square');
  await openLocation(page, 'Trading Post'); await expect(page.locator('#modal .maintabs button')).toHaveCount(4); await snap(page, info, 'town');
  await page.locator('#modal .backbtn').first().click();

  // ---- Camp: Rest / Heal / Spells / Party, each short enough that Rest/Heal/Spells need no scrolling on a phone
  await page.evaluate(() => { const w = window.__gw; w.state.mode = 'dungeon'; w.showCamp(); });
  await snap(page, info, 'camp');
  for (const id of ['rest', 'heal', 'spells', 'party']) {
    const t = page.locator(`#modal [data-tab="${id}"]`); await expectReachable(page, t, `Camp tab ${id}`);
    await t.click();
    await expectReachable(page, page.locator('#modal .closebtn').first(), `Close on Camp ${id}`);
    if (phone && id !== 'party') { const m = await fits(page, '#modal .panel'); expect(m.sh, `Camp ${id} fits one phone screen`).toBeLessThanOrEqual(m.ch + 2); }
  }
  await page.locator('#modal .closebtn').first().click();

  // ---- Main menu + Settings tabs
  await page.evaluate(() => { window.__gw.state.mode = 'town'; });
  await page.locator('#btn-menu').click();
  await expect(page.locator('#gmenu h2')).toContainText('Main Menu');
  await page.click('#menu-settings');
  for (const id of ['audio', 'game', 'more']) { const t = page.locator(`#gmenu [data-tab="${id}"]`); await expectReachable(page, t, `Settings tab ${id}`); await t.click(); }
  await expectReachable(page, page.locator('#menu-back'), 'Settings Back');
  await page.click('#menu-back');
  await expect(page.locator('#menu-settings')).toBeVisible();
  await page.click('#menu-close');
  expect(errors, 'no page errors').toEqual([]);
});
