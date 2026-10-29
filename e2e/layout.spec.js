// Phone layout review: screenshots of title/creation, town, menus and a fight on every phone size, plus layout guarantees
// (the arena keeps a minimum height, party cards do not overlap the log, the action buttons sit at the bottom of the screen).
// LAYOUT_TAG=before|after picks the screenshot prefix: /workspace/shots/layout-<tag>-<screen>-<project>.png
import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const TAG = process.env.LAYOUT_TAG || 'after';
const shot = async (page, name, P) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/layout-${TAG}-${name}-${P}.png`, timeout: 15000 }); return; } catch (e) { console.log('shot retry', name, P, i); await page.mouse.move(1, 1); await page.waitForTimeout(500); } } };
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const fight = (page, groups) => page.evaluate(async (groups) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); }); }, groups);
const box = async (page, sel) => page.locator(sel).first().boundingBox().catch(() => null);

test('title and character creation', async ({ page }, info) => {
  test.setTimeout(120000); const P = info.project.name; const errors = trackErrors(page);
  await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 }); await shot(page, 'title', P);
  await page.click('#btn-new'); await page.waitForTimeout(600); await shot(page, 'create', P);
  expect(okErr(errors)).toEqual([]);
});

test('town and menus', async ({ page }, info) => {
  test.setTimeout(180000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page); await page.waitForTimeout(500); await shot(page, 'town', P);
  await page.locator('#btn-tavern').click(); await page.waitForTimeout(600); await shot(page, 'tavern', P);
  const menu = page.locator('#btn-menu'); await page.evaluate(() => window.__gw.closeModal?.());
  if (await menu.isVisible()) { await menu.click(); await page.waitForTimeout(600); await shot(page, 'menu', P); }
  expect(okErr(errors)).toEqual([]);
});

test('fight: the arena keeps its height, nothing overlaps, buttons stay at the bottom', async ({ page }, info) => {
  test.setTimeout(240000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'double');
  await fight(page, [{ key: 'giantRat', count: 3 }, { key: 'giantCentipede', count: 3 }]);
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 }); await page.waitForTimeout(1500); await shot(page, 'fight', P);
  const vp = page.viewportSize(); const view = await box(page, '#view'), menu = await box(page, '#cmenu'), party = await box(page, '#party');
  const cards = await page.evaluate(() => [...document.querySelectorAll('#party .card')].map((c) => { const r = c.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; }));
  const log = await box(page, '#log');
  console.log(P, JSON.stringify({ vp, view, menu, party, log }));
  if (vp.width < 761 && vp.height > vp.width) {
    expect(view.height, 'arena minimum height').toBeGreaterThanOrEqual(Math.min(300, vp.height * 0.36));
    expect(menu.y + menu.height, 'action menu reaches the bottom').toBeGreaterThan(vp.height - 40);
  }
  for (const a of cards) for (const b of cards) if (a !== b) expect(a.t >= b.b - 1 || b.t >= a.b - 1 || a.l >= b.r - 1 || b.l >= a.r - 1, 'party cards overlap').toBe(true);
  if (vp.width >= 761 && vp.height < vp.width) expect(log.width, 'the log is a readable strip, not a sliver').toBeGreaterThanOrEqual(Math.min(300, vp.width * 0.4));
  if (log && log.height > 0 && party && vp.height > vp.width) { const bottom = Math.max(...cards.map((c) => c.b)); expect(log.y, 'log starts below the party cards').toBeGreaterThanOrEqual(bottom - 1); }
  expect(okErr(errors)).toEqual([]);
});
