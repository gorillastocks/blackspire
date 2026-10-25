import { test, expect } from '@playwright/test';
import { trackErrors, newGame, expectReachable, auditText, skipPrologue } from './helpers.js';

const isPhone = (p) => /iphone/.test(p.name);
const minPx = (ti) => (isPhone(ti.project) ? 16 : 13);
const hold = async (page, loc) => { await loc.scrollIntoViewIfNeeded(); const b = await loc.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); };

test('first-run tutorial shows once and can be skipped', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.click('#btn-new'); await page.click('#btn-begin'); await skipPrologue(page);
  const tip = page.locator('#tip'); await expect(tip).toBeVisible(); await expect(tip).toContainText('1 / 5');
  await expectReachable(page, page.locator('#tip-next'), 'tip Next'); await page.click('#tip-next'); await expect(tip).toContainText('2 / 5');
  await auditText(page, '#tip', 13);
  await page.click('#tip-skip'); await expect(tip).toBeHidden();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('blackspire.settings')).tutorialDone)).toBe(true);
  await page.reload(); await page.waitForSelector('#btn-new', { timeout: 90000 }); await page.click('#btn-new'); await page.click('#btn-begin'); await skipPrologue(page);
  await page.waitForTimeout(400); await expect(tip).toBeHidden();
  expect(errors).toEqual([]);
});

test('settings: volume sliders, difficulty, readable', async ({ page }, ti) => {
  const errors = trackErrors(page);
  await newGame(page);
  await page.click('#btn-menu'); await page.click('#menu-settings');
  for (const k of ['music', 'sfx', 'amb']) await expect(page.locator('#vol-' + k)).toBeVisible();
  await page.locator('#vol-music').fill('20'); await page.locator('#vol-music').dispatchEvent('change');
  await expect(page.locator('#gmenu .slider b').first()).toHaveText('20%');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('blackspire.settings')).music)).toBeCloseTo(0.2);
  await page.click('[data-diff=hard]'); await expect(page.locator('[data-diff=hard]')).toHaveClass(/on/);
  expect(await page.evaluate(() => window.__gw.state.difficulty)).toBe('hard');
  await auditText(page, '#gmenu .panel', minPx(ti));
  await page.screenshot({ path: `test-results/shots/settings-${ti.project.name}.png` });
  expect(errors).toEqual([]);
});

test('companion tactics editor changes AI settings and persists', async ({ page }, ti) => {
  const errors = trackErrors(page);
  await newGame(page);
  await page.click('#btn-tavern'); await page.click('#btn-tavern-tactics');
  const first = page.locator('.tactic').first(); await expect(first).toBeVisible();
  await expectReachable(page, first.locator('[data-style=support]'), 'Support style');
  await first.locator('[data-style=support]').click();
  await page.locator('.tactic').first().locator('[data-tac=aoe]').uncheck();
  await page.locator('.tactic').first().locator('[data-tac=healAt]').fill('70'); await page.locator('.tactic').first().locator('[data-tac=healAt]').dispatchEvent('change');
  const t = await page.evaluate(() => window.__gw.state.party.find((c) => c.companion).tactics);
  expect(t).toMatchObject({ style: 'support', aoe: false, healAt: 70, spells: true, potions: true });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('blackspire.save.v1')).party.find((c) => c.companion).tactics);
  expect(saved.style).toBe('support');
  await auditText(page, '#modal .panel', minPx(ti));
  await page.screenshot({ path: `test-results/shots/tactics-${ti.project.name}.png` });
  expect(errors).toEqual([]);
});

test('export code → import restores the game; corrupt saves recover from backup', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { window.__gw.state.gold = 4321; });
  await page.click('#btn-menu'); await page.click('#menu-backup');
  const code = await page.locator('#export-code').inputValue(); expect(code.startsWith('BS1:')).toBe(true);
  await page.click('#menu-close');
  await page.evaluate(() => { window.__gw.state.gold = 1; });
  await page.click('#btn-menu'); await page.click('#menu-backup');
  await page.fill('#import-code', code); await page.click('#btn-import-code'); await page.click('#btn-confirm');
  await expect.poll(() => page.evaluate(() => window.__gw.state.gold)).toBe(4321);
  // bad code is rejected with a message
  await page.click('#btn-menu'); await page.click('#menu-backup'); await page.fill('#import-code', 'not a save'); await page.click('#btn-import-code');
  await expect(page.locator('#gmenu')).toContainText('Import failed'); await page.click('#menu-close');
  // corrupt the autosave: Continue recovers from .bak
  await page.evaluate(() => { localStorage.setItem('blackspire.save.v1.bak', localStorage.getItem('blackspire.save.v1')); localStorage.setItem('blackspire.save.v1', '{"party":[{"na'); });
  await page.reload(); await page.waitForSelector('#btn-continue', { timeout: 90000 }); await page.click('#btn-continue');
  await expect(page.locator('#log')).toContainText('automatic backup');
  expect(await page.evaluate(() => window.__gw.state.gold)).toBe(4321);
  expect(errors).toEqual([]);
});

test('autosave on stairs and town entry; music follows the game', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  const savedMode = () => page.evaluate(() => JSON.parse(localStorage.getItem('blackspire.save.v1') || '{}').mode);
  expect(await savedMode()).toBe('town');
  await page.click('#btn-edge'); await page.click('#btn-enter');
  await expect.poll(savedMode).toBe('dungeon');
  await page.mouse.click(5, 5); // a tap unlocks iOS audio
  await expect.poll(() => page.evaluate(() => window.__gw.audio().track)).toBe('dungeon0');
  expect(await page.evaluate(() => window.__gw.audio().amb)).toBe('dungeon');
  await page.evaluate(() => { window.__gw.state.savedAt = 0; window.__gw.prompt('up'); });
  await page.locator('#modal button', { hasText: 'Return to Emberhollow' }).click();
  await expect(page.locator('#btn-tavern')).toBeVisible();
  await expect.poll(savedMode).toBe('town');
  await expect.poll(() => page.evaluate(() => window.__gw.audio().track)).toBe('town');
  expect(errors).toEqual([]);
});

test('press-and-hold shows info for party members, items and monsters', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await page.click('#btn-edge'); await page.click('#btn-enter'); await page.waitForTimeout(800);
  const card = page.locator('#party .card').nth(1);
  await hold(page, card); const pop = page.locator('#infopop');
  await expect(pop).toBeVisible(); await expect(pop).toContainText('HP'); await expect(pop).toContainText('Tactics');
  await expect(page.locator('#modal')).toBeHidden(); // the hold did not also open the sheet
  await auditText(page, '#infopop', 13);
  await page.mouse.click(5, 5); await expect(pop).toBeHidden();
  await page.evaluate(() => window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }] }));
  const tag = page.locator('.mtag').first(); await expect(tag).toBeVisible({ timeout: 30000 });
  await tag.dispatchEvent('contextmenu', { clientX: 200, clientY: 200 }); await expect(pop).toContainText('Giant Rat'); await expect(pop).toContainText('Bite');
  expect(errors).toEqual([]);
});

test('touch targets are at least 44pt on touch screens', async ({ page }, ti) => {
  test.skip(ti.project.name === 'desktop', 'touch only');
  await newGame(page);
  const small = await page.evaluate(() => [...document.querySelectorAll('button, select')].filter((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden').map((e) => [e.textContent.trim().slice(0, 24) || e.id, e.getBoundingClientRect().height]).filter(([, hh]) => hh < 43.5));
  expect(small).toEqual([]);
  await page.click('#btn-edge'); await page.click('#btn-enter'); await page.waitForTimeout(800);
  const small2 = await page.evaluate(() => [...document.querySelectorAll('button')].filter((e) => e.offsetParent).map((e) => [e.textContent.trim().slice(0, 24), Math.min(e.getBoundingClientRect().height, e.getBoundingClientRect().width)]).filter(([, hh]) => hh < 43.5));
  expect(small2).toEqual([]);
  if (/ipad/.test(ti.project.name)) await page.screenshot({ path: `test-results/shots/${ti.project.name}.png` });
});

test('offline: service worker + no network loads', async ({ page }) => {
  const external = []; page.on('request', (r) => { if (!r.url().startsWith('http://localhost:4173')) external.push(r.url()); });
  await newGame(page);
  const sw = await page.request.get('./sw.js'); expect(sw.ok()).toBe(true);
  const body = await sw.text(); expect(body).toContain('blackspire-'); expect(body).toContain('index.html');
  expect(external.filter((u) => !u.startsWith('data:') && !u.startsWith('blob:'))).toEqual([]);
});
