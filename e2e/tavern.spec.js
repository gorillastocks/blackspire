// Tavern sheet: on phones/foldables the town modals are a full-height, scrolling sheet that fully covers the scene/party cards/log behind;
// the Party tab lists all 4 members and the Roster tab lists every waiting hero, each reachable by scrolling. iPad keeps the floating panel.
// Screenshots: /workspace/shots/tavern-after-<project>-<tab>.png
import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test.describe.configure({ timeout: 300000 });
const shot = async (page, name) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/${name}.png`, timeout: 15000 }); return; } catch (e) { await page.mouse.move(1, 1); await page.waitForTimeout(800); } } };
const tab = (page, id) => page.locator(`#modal [data-tab="${id}"]`);

/** Every row is inside the scrolling panel's visible area (after scrolling to it) and is the topmost thing at its centre. */
async function rowsReachable(page, rows, what) {
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const r = rows.nth(i); await r.evaluate((el) => el.scrollIntoView({ block: 'center' })); // the narration echo is sticky at the foot: scroll the row clear of it
    await r.evaluate((el) => { const t = () => { const b = el.getBoundingClientRect(); const x = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!x && el.contains(x); }; if (!t()) el.closest('.panel').scrollTop = el.closest('.panel').scrollHeight; });
    const ok = await r.evaluate((el) => {
      const b = el.getBoundingClientRect(); const p = el.closest('.panel').getBoundingClientRect(); const nav = el.closest('.panel').querySelector('.navbar')?.getBoundingClientRect();
      const t = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      const clear = b.top >= (nav ? nav.bottom : p.top) - 1 && b.bottom <= p.bottom + 1 && b.left >= p.left - 1 && b.right <= p.right + 1;
      return { clear, top: !!t && el.contains(t), cover: t ? (t.id || t.className || t.tagName) + ' in ' + (t.closest('[id]')?.id || '') : 'none', h: b.height, fs: parseFloat(getComputedStyle(el.querySelector('.pname, span') || el).fontSize) };
    });
    if (!ok.top) await page.screenshot({ path: `/workspace/shots/tavern-debug-${i}.png`, timeout: 20000 }).catch(() => {});
    expect(ok.clear, `${what} row ${i} sits inside the scrolling sheet`).toBe(true);
    expect(ok.top, `${what} row ${i} is not covered by anything (top element: ${ok.cover})`).toBe(true);
    expect(ok.fs, `${what} row ${i} legible`).toBeGreaterThanOrEqual(14);
  }
  return n;
}

test('tavern: full-height sheet on phones; all party members and all waiting heroes visible', async ({ page }, info) => {
  const P = info.project.name; const errors = trackErrors(page);
  await newGame(page);
  // a full party (4/4) and three heroes waiting at the bar
  await page.evaluate(() => { const s = window.__gw.state; ['Wanda Waits', 'Rosco Roster', 'Tilly Tavern'].forEach((n, i) => { const c = JSON.parse(JSON.stringify(s.party[(i % 3) + 1])); c.id = 'wait' + i; c.name = n; c.companion = null; c.hp = c.maxHp; s.roster.push(c); }); });
  await page.locator('#btn-tavern').click(); await page.waitForTimeout(700);
  const vp = page.viewportSize(); const phone = vp.width <= 760 || vp.height <= 700;
  const sheetCheck = async (what) => {
    const m = await page.evaluate(() => {
      const p = document.querySelector('#modal .panel').getBoundingClientRect(); const W = innerWidth, H = innerHeight; let leaks = 0;
      // sample a grid: anything under the modal must not show through (the topmost element is inside #modal)
      for (let x = 4; x < W; x += Math.max(8, Math.floor(W / 24))) for (let y = 4; y < H; y += Math.max(8, Math.floor(H / 40))) { const t = document.elementFromPoint(x, y); if (t && !t.closest('#modal') && !t.closest('#tip') && !t.closest('#hud') && !t.closest('#btn-menu')) leaks++; }
      return { l: p.left, r: p.right, t: p.top, b: p.bottom, W, H, leaks };
    });
    if (phone) {
      expect(m.r - m.l, `${what}: sheet spans the screen width`).toBeGreaterThanOrEqual(Math.min(m.W - 24, 740));
      expect(m.b - m.t, `${what}: sheet is full height`).toBeGreaterThanOrEqual(m.H - 70);
      expect(m.leaks, `${what}: nothing from behind (party cards, log, scene) is tappable around the sheet`).toBe(0);
    }
  };
  // Party tab: all four members
  await expect(tab(page, 'party')).toBeVisible(); await sheetCheck('party');
  const members = page.locator('#modal .partyrow');
  expect(await rowsReachable(page, members, 'party')).toBe(4);
  const names = await page.evaluate(() => window.__gw.state.party.map((c) => c.name));
  for (const n of names) await expect(page.locator('#modal .partyrow .pname', { hasText: n })).toBeVisible();
  await page.evaluate(() => { const p = document.querySelector('#modal .panel'); p.scrollTop = 0; }); await page.waitForTimeout(150);
  await shot(page, `tavern-after-${P}-party`);
  // Roster tab: every waiting hero
  await tab(page, 'roster').click(); await page.waitForTimeout(300); await sheetCheck('roster');
  await expect(page.locator('#modal h3')).toContainText('party 4/4');
  expect(await rowsReachable(page, page.locator('#roster .rosterrow'), 'roster')).toBe(3);
  for (const n of ['Wanda Waits', 'Rosco Roster', 'Tilly Tavern']) await expect(page.locator('#roster .rosterrow', { hasText: n })).toBeVisible();
  await page.evaluate(() => { document.querySelector('#modal .panel').scrollTop = 0; }); await page.waitForTimeout(150);
  await shot(page, `tavern-after-${P}-roster`);
  for (const t of ['hire', 'bar']) { await tab(page, t).click(); await page.waitForTimeout(250); await sheetCheck(t); }
  await shot(page, `tavern-after-${P}-bar`);
  // the other town sheets cover the scene too
  for (const [btn, key] of [['Temple', 'temple'], ['Training Grounds', 'train']]) {
    await page.locator('#modal .backbtn').first().click(); await page.waitForTimeout(300);
    await page.locator('#modal button', { hasText: btn }).first().click(); await page.waitForTimeout(500);
    const sk = page.locator('#tip-skip'); if (await sk.isVisible().catch(() => false)) await sk.click();
    await sheetCheck(key);
    if (key === 'temple') await shot(page, `tavern-after-${P}-temple`);
  }
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
