import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, townSquare, expectReachable, auditText } from './helpers.js';

test.describe.configure({ timeout: 400000 });
const st = (page, f, a) => page.evaluate(f, a);
const minPx = (info) => (info.project.name.startsWith('iphone') ? 16 : 13);
const menuBtn = (page) => page.locator('#btn-menu');
const enterDungeon = async (page) => { await openLocation(page, 'Edge of Town'); await page.click('#btn-enter'); await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon'); };

test('save & quit to title, then Continue and Load restore the game', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await expectReachable(page, menuBtn(page), 'Menu button (town)');
  await enterDungeon(page);
  await expectReachable(page, menuBtn(page), 'Menu button (dungeon)');
  await page.locator('#controls button', { hasText: '▲' }).first().click().catch(() => {});
  await st(page, () => { window.__gw.state.gold = 1234; });
  const pos = await st(page, () => { const s = window.__gw.state; return { x: s.x, y: s.y, level: s.level, mode: s.mode }; });
  await menuBtn(page).click();
  await expect(page.locator('#gmenu h2')).toContainText('Main Menu');
  await page.screenshot({ path: `screenshots/menu-${P}-main.png` });
  await auditText(page, '#gmenu .panel', minPx(info));
  await page.click('#menu-savequit');
  await expect(page.locator('#gmenu button.slot')).toHaveCount(3);
  await page.locator('#gmenu button[data-slot="2"]').click();
  await expect(page.locator('#gmenu .warn')).toContainText('empty');
  await page.screenshot({ path: `screenshots/menu-${P}-confirm-save.png` });
  await auditText(page, '#gmenu .panel', minPx(info));
  await page.click('#btn-confirm');
  await expect(page.locator('#btn-new')).toBeVisible();
  await expect(menuBtn(page)).toBeHidden();
  expect(await st(page, () => window.__gw.state)).toBeNull();
  // Continue picks the newest save (slot 2)
  await page.click('#btn-continue');
  await expect.poll(() => st(page, () => window.__gw.state?.gold)).toBe(1234);
  expect(await st(page, () => { const s = window.__gw.state; return { x: s.x, y: s.y, level: s.level, mode: s.mode }; })).toEqual(pos);
  await expect(page.locator('#controls button').first()).toBeVisible();
  // quit again, then Load → Slot 2 from the title
  await menuBtn(page).click(); await page.click('#menu-quit'); await page.click('#btn-confirm');
  await page.click('#btn-title-load');
  await expect(page.locator('#gmenu button[data-load="2"]')).toBeEnabled();
  await auditText(page, '#gmenu .panel', minPx(info));
  await page.screenshot({ path: `screenshots/menu-${P}-title-load.png` });
  await page.locator('#gmenu button[data-load="2"]').click();
  await expect.poll(() => st(page, () => window.__gw.state?.gold)).toBe(1234);
  // the existing Save button still quick-saves
  await page.locator('#controls button', { hasText: 'Save' }).click();
  expect(await st(page, () => JSON.parse(localStorage.getItem('grokwizard.save.v1')).gold)).toBe(1234);
  // and the town square Save Game button too (after a reload, Continue still works)
  await page.reload(); await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.click('#btn-continue'); await expect.poll(() => st(page, () => window.__gw.state?.gold)).toBe(1234);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('quit without saving loses progress (with warning); combat: save disabled, quit allowed', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await menuBtn(page).click(); await page.click('#menu-save'); await page.locator('#gmenu button[data-slot="1"]').click(); await page.click('#btn-confirm');
  await expect(page.locator('#gmenu h2')).toContainText('Saved'); await page.click('#menu-resume');
  await expect(townSquare(page)).toBeVisible();
  await st(page, () => { window.__gw.state.gold = 7; });
  await menuBtn(page).click(); await page.click('#menu-quit');
  await expect(page.locator('#gmenu .warn')).toContainText('Progress since your last save will be lost');
  await auditText(page, '#gmenu .panel', minPx(info));
  await page.click('#btn-confirm');
  await page.click('#btn-continue'); await expect(townSquare(page)).toBeVisible();
  expect(await st(page, () => window.__gw.state.gold)).toBe(5000);
  // combat
  await enterDungeon(page);
  await st(page, () => window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 2 }] }));
  await expect.poll(() => st(page, () => !!window.__gw.combat)).toBe(true);
  await expectReachable(page, menuBtn(page), 'Menu button (combat)');
  await menuBtn(page).click();
  await expect(page.locator('#gmenu .warn')).toContainText('Saving is disabled');
  await expect(page.locator('#menu-save')).toBeDisabled(); await expect(page.locator('#menu-savequit')).toBeDisabled();
  await page.screenshot({ path: `screenshots/menu-${P}-combat.png` });
  await auditText(page, '#gmenu .panel', minPx(info));
  await page.click('#menu-resume'); expect(await st(page, () => !!window.__gw.combat)).toBe(true);
  await menuBtn(page).click(); await page.click('#menu-quit'); await page.click('#btn-confirm');
  await expect(page.locator('#btn-new')).toBeVisible();
  // continue and fight again: the combat engine must not be stuck from the abandoned fight
  // newest save is the autosave made on entering the maze
  await page.click('#btn-continue'); await expect.poll(() => st(page, () => window.__gw.state?.mode)).toBe('dungeon');
  await expect(page.locator('#controls button').first()).toBeVisible();
  await st(page, () => { for (const c of window.__gw.state.party) c.ai = true; window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }] }); });
  await page.waitForFunction(() => !window.__gw.combat, null, { timeout: 180000 });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('menu click-through: every button leaves a way back; Esc opens/closes it on desktop', async ({ page }, info) => {
  const errors = trackErrors(page);
  await newGame(page);
  for (const where of ['town', 'dungeon']) {
    if (where === 'dungeon') await enterDungeon(page);
    for (const view of ['menu-save', 'menu-load', 'menu-settings', 'menu-savequit']) {
      await menuBtn(page).click();
      await page.click(`#${view}`);
      const labels = await page.locator('#gmenu button:visible').evaluateAll((bs) => bs.map((b) => (b.disabled ? null : b.textContent.trim())));
      for (const l of labels) {
        if (!l || /Close|Back/.test(l)) continue;
        if (!(await page.locator('#gmenu').isVisible())) { await menuBtn(page).click(); await page.click(`#${view}`); }
        const b = page.locator('#gmenu button:visible', { hasText: l }).first(); if (!(await b.count())) continue;
        await b.click();
        if (await page.locator('#btn-cancel').count()) { await expectReachable(page, page.locator('#btn-cancel'), `Cancel after ${l}`); await page.click('#btn-cancel'); }
        if (await page.locator('#gmenu').isVisible()) await expectReachable(page, page.locator('#menu-close'), `Close after ${l}`);
      }
      if (await page.locator('#gmenu').isVisible()) { const back = page.locator('#gmenu .menuback'); if (await back.count()) await back.click(); await page.click('#menu-close'); }
      await expect(page.locator('#gmenu')).toBeHidden();
      expect(await st(page, () => !!window.__gw.state)).toBe(true);
    }
    // settings: sound toggle persists
    await menuBtn(page).click(); await page.click('#menu-settings'); const was = (await page.locator('#set-sound').textContent()).includes('On'); await page.click('#set-sound');
    await expect(page.locator('#set-sound')).toContainText(was ? 'Off' : 'On'); expect(await st(page, () => JSON.parse(localStorage.getItem('grokwizard.settings')).sound)).toBe(!was);
    await page.click('#set-sound'); await expect(page.locator('#set-sound')).toContainText(was ? 'On' : 'Off');
    await page.click('#menu-close');
  }
  if (!info.project.name.startsWith('iphone')) {
    await page.keyboard.press('Escape'); await expect(page.locator('#gmenu h2')).toContainText('Main Menu');
    await page.click('#menu-load'); await page.keyboard.press('Escape'); await expect(page.locator('#gmenu h2')).toContainText('Main Menu');
    await page.keyboard.press('Escape'); await expect(page.locator('#gmenu')).toBeHidden();
  }
  expect(errors, errors.join('\n')).toEqual([]);
});
