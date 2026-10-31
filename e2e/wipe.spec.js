import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, dismissCards } from './helpers.js';

const okErr = (errors) => errors.filter((e) => !/favicon|WebGL|GPU|Failed to load resource|net::/i.test(e));

/** Walk into the maze, then wipe the party in a real fight (everyone at 1 HP, the AI plays, three allosaurs). */
async function wipeInDungeon(page) {
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let i = 0; i < 12; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await dismissCards(page); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
  await page.evaluate(() => window.__gw.hideCaption());
  await page.evaluate(() => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'fast', battleSpeedSet: true, areaDesc: false })));
  // a manual save in slot 1 that is newer than the autosave: this is "the latest save"
  await page.evaluate(() => { const { state: S, G } = window.__gw; localStorage.setItem('blackspire.save.slot1', G.serialize({ ...S, gold: 1234, savedAt: Date.now() + 5000 })); });
  await page.evaluate(() => { const g = window.__gw; g.state.gold = 801; for (const c of g.state.party) { c.maxHp = 6; c.hp = 1; } g.startCombat({ groups: [{ key: 'allosaurus', count: 3 }] }); });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 90000 }).toBe(true);
  await page.locator('#autobtn').first().dispatchEvent('pointerdown');
  await expect(page.locator('#fallen-screen')).toBeVisible({ timeout: 240000 });
}

test('party wipe shows the fallen screen; Return to Town applies the temple penalty', async ({ page }, info) => {
  test.setTimeout(400000); const errors = trackErrors(page);
  await newGame(page); await wipeInDungeon(page);
  const scr = page.locator('#fallen-screen');
  await expect(scr.locator('h2')).toHaveText('Your party has fallen');
  await expect(page.locator('#btn-menu')).toBeHidden();
  const load = page.locator('#btn-fallen-load'), town = page.locator('#btn-fallen-town');
  await expect(load).toContainText('Load Save'); await expect(town).toContainText('Return to Town');
  await expect(load).toContainText('1234 gp'); // the newest save is named on the button
  await expect(town).toContainText('The temple keeps 400 gold');
  // phone-friendly: both buttons fully on screen with 44pt+ targets
  const vp = page.viewportSize();
  for (const [name, b] of [['Load', load], ['Town', town]]) {
    await b.scrollIntoViewIfNeeded(); const box = await b.boundingBox();
    expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44); expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  }
  expect(await page.evaluate(() => document.getElementById('modal').innerText.toLowerCase().includes('grok'))).toBe(false);
  if (info.project.name === 'iphone') await page.screenshot({ path: '/workspace/shots/iphone-wipe.png' });
  // nothing was auto-saved over the real save while the screen was up
  expect(await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('blackspire.save.v1') || '{}'); return r.party?.some((c) => c.hp <= 0 && !c.dead) || false; })).toBe(false);
  await town.click();
  await expect(page.locator('#btn-tavern')).toBeVisible({ timeout: 30000 });
  const st = await page.evaluate(() => { const S = window.__gw.state; return { mode: S.mode, gold: S.gold, hps: S.party.map((c) => [c.hp, !!c.dead]) }; });
  expect(st.mode).toBe('town'); expect(st.gold).toBe(401);
  for (const [hp, dead] of st.hps) if (!dead) expect(hp).toBe(1);
  expect(st.hps.some(([, d]) => !d)).toBe(true);
  expect(okErr(errors)).toEqual([]);
});

test('party wipe: Load Save restores the latest save', async ({ page }) => {
  test.setTimeout(400000); const errors = trackErrors(page);
  await newGame(page); await wipeInDungeon(page);
  await page.locator('#btn-fallen-load').click();
  await expect(page.locator('#fallen-screen')).toHaveCount(0, { timeout: 60000 });
  await expect.poll(() => page.evaluate(() => window.__gw.state.gold), { timeout: 30000 }).toBe(1234);
  expect(await page.evaluate(() => window.__gw.state.party.every((c) => c.hp > 1 || c.maxHp > 6))).toBe(true);
  await expect(page.locator('#btn-menu')).toBeVisible();
  expect(okErr(errors)).toEqual([]);
});
