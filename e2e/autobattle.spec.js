// The in-battle Auto toggle (replaces the old Skip button): on = every hero, the player's own character too, acts on the AI at the
// current battle speed (nothing is skipped); off = control comes back at the next player turn. The action menu has no Auto-battle entry of its own: turning Auto on while the menu waits hands that turn to the AI.
import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const start = (page, groups) => page.evaluate(async (groups) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); }); }, groups);
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));

test('Auto button: shows off/on, the AI plays every hero (you too), and tapping again hands control back', async ({ page }, info) => {
  test.setTimeout(300000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await setSpeed(page, 'double');
  await start(page, [{ key: 'giantRat', count: 3 }, { key: 'giantCentipede', count: 3 }]);
  const btn = page.locator('#autobtn');
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#skipbtn')).toHaveCount(0); await expect(page.locator('#speedbtn')).toBeVisible();
  await expect(btn).toBeVisible(); await expect(btn).toHaveAttribute('aria-pressed', 'false'); await expect(btn).not.toHaveClass(/\bon\b/); await expect(btn).toContainText('Auto');
  expect((await btn.textContent()).length).toBeLessThan(12); // short label
  await shot(page, { path: `/workspace/shots/auto-off-${P}.png` }); if (P === 'iphone') await shot(page, { path: '/workspace/shots/auto-off.png' });
  // sample the menu and who acts from now on
  await page.evaluate(() => { window.__menuSeen = 0; window.__acted = new Set(); window.__samp = setInterval(() => { if (document.querySelector('#cmenu .combatmenu')) window.__menuSeen++; const c = window.__gw.combat; if (c && c.current && c.current().side === 'party') window.__acted.add(c.current().name); }, 40); });
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true'); await expect(btn).toHaveClass(/\bon\b/);
  await page.waitForTimeout(500); await shot(page, { path: `/workspace/shots/auto-on-${P}.png` }); if (P === 'iphone') await shot(page, { path: '/workspace/shots/auto-on.png' });
  // the menu closes at once (this very turn is taken by the AI) and the player's own hero acts without it
  await expect(page.locator('#cmenu .combatmenu')).toHaveCount(0, { timeout: 5000 });
  const me = await page.evaluate(() => window.__gw.state.party[0].name);
  await expect.poll(() => page.evaluate(() => { const c = window.__gw.combat; return !c || c.round > 1 || c.monsters.some((m) => m.hp <= 0); }), { timeout: 120000 }).toBe(true);
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  // hand control back: the menu returns at the next player turn (or the fight is already over)
  await btn.click({ timeout: 20000 }).catch(() => {});
  const stillIn = await page.evaluate(() => !!window.__gw.combat);
  if (stillIn) {
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => page.evaluate(() => !window.__gw.combat || !!document.querySelector('#cmenu .combatmenu')), { timeout: 120000 }).toBe(true);
  }
  const acted = await page.evaluate(() => { clearInterval(window.__samp); return [...window.__acted]; });
  console.log(P, 'heroes that acted while Auto was on:', acted.join(', '), 'player hero:', me);
  expect(acted).toContain(me);
  expect(okErr(errors)).toEqual([]);
});

test('turning Auto on while the action menu waits hands the turn to the AI, and Auto resets with the fight', async ({ page }, info) => {
  test.setTimeout(300000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'double');
  await start(page, [{ key: 'giantRat', count: 2 }]);
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  await page.locator('#autobtn').first().click();
  await expect(page.locator('#autobtn')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => !window.__gw.combat), { timeout: 180000 }).toBe(true);
  await expect(page.locator('#autobtn')).toHaveAttribute('aria-pressed', 'false'); // a new fight starts with Auto off
  expect(okErr(errors)).toEqual([]);
});
