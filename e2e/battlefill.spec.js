// Battle fills the screen: no dead black band under the party/log (the old '▾ log' + caption bug left ~30% of a phone empty while the stage shrank),
// the 3D canvas keeps most of the screen, monster plates stay clear of the HUD header. Also after visiting the tavern first.
import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const shot = async (page, name) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/${name}.png`, timeout: 15000 }); return; } catch (e) { await page.mouse.move(1, 1); await page.waitForTimeout(500); } } };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const fight = (page, groups) => page.evaluate(async (groups) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); }); }, groups);
const FOES = [{ key: 'giantCrab', count: 2 }, { key: 'giantRat', count: 2 }];
const geo = (page) => page.evaluate(() => {
  const R = (s) => { const e = document.querySelector(s); if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const r = e.getBoundingClientRect(); return r.width && r.height ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height } : null; };
  const tags = [...document.querySelectorAll('#targets .mtag')].map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; });
  return { vh: innerHeight, vw: innerWidth, view: R('#view'), canvas: R('#view canvas'), side: R('#side'), party: R('#party'), bottom: R('#bottom'), log: R('#log'), cmenu: R('#cmenu'), hud: R('#hud'), tags, cls: document.body.className };
});
async function expectFilled(page, where) {
  const g = await geo(page);
  const lowest = Math.max(...['party', 'log', 'cmenu'].map((k) => g[k]?.bottom ?? 0));
  expect(g.vh - lowest, `${where}: no empty band under the party/log/menu (lowest content ends ${lowest} of ${g.vh}) ${g.cls}`).toBeLessThanOrEqual(40);
  if (g.vh > g.vw) expect(g.canvas.height, `${where}: canvas fills most of the screen (${g.canvas.height} of ${g.vh}) ${g.cls}`).toBeGreaterThan(g.vh * 0.35);
  // the canvas runs from the top down to the party/action area: nothing but those sits below it
  if (g.vw <= 760 && g.vh > g.vw) {
    expect(Math.abs(g.canvas.bottom - g.side.top), `${where}: canvas meets the party cards`).toBeLessThanOrEqual(4);
    for (const t of g.tags) expect(t.top >= g.hud.bottom - 1 || t.bottom <= g.hud.top + 1 || t.left >= g.hud.right || t.right <= g.hud.left, `${where}: monster plate overlaps the HUD header ${JSON.stringify({ t, hud: g.hud })}`).toBe(true);
  }
  return g;
}
async function scenario(page, info, viaTavern) {
  const P = info.project.name; const errors = trackErrors(page);
  await newGame(page); await page.evaluate(() => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'double', battleSpeedSet: true })));
  if (viaTavern) { await page.locator('#btn-tavern').click(); await page.waitForTimeout(700); await page.evaluate(() => window.__gw.closeModal?.()); await page.waitForTimeout(500); }
  await fight(page, FOES);
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 }); await page.waitForTimeout(1200);
  await expectFilled(page, 'menu up'); await shot(page, `battle-after-${P}${viaTavern ? '-tavern' : ''}-menu`);
  // a dungeon header wraps to two lines on a phone: the plates must still keep clear of it
  await page.evaluate(() => { const h = document.querySelector('#hud'); h.innerHTML = '<span>B2: The Drowned Grotto · 🔍 2/3</span><span>Earned 752 gp</span>'; window.dispatchEvent(new Event('resize')); window.__gw.renderCombatUI(); });
  await page.waitForTimeout(600); await expectFilled(page, 'long HUD header'); await shot(page, `battle-after-${P}${viaTavern ? '-tavern' : ''}-hud`);
  // open the log, then a caption comes up (tap-to-continue hides the menu and log): the old layout kept a 30dvh empty track for the hidden log
  await page.evaluate(() => { document.body.classList.add('logopen'); window.__gw.caption({ text: "Golden light flows from Vexrath's palms into Pip.", sub: 'Lay on Hands: +15 HP' }, false); });
  await page.waitForTimeout(900); await expectFilled(page, 'log open + caption'); await shot(page, `battle-after-${P}${viaTavern ? '-tavern' : ''}`);
  await page.evaluate(() => window.__gw.hideCaption?.()); await page.waitForTimeout(1200);
  await expectFilled(page, 'log open, caption gone');
  await page.evaluate(() => document.body.classList.remove('logopen')); await page.waitForTimeout(500);
  await expectFilled(page, 'log closed');
  expect(okErr(errors)).toEqual([]);
}
test('battle fills the screen: no empty band, big canvas, plates clear of the header', async ({ page }, info) => { test.setTimeout(240000); await scenario(page, info, false); });
test('battle after visiting the tavern fills the screen too', async ({ page }, info) => { test.setTimeout(240000); await scenario(page, info, true); });
