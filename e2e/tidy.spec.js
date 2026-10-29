// Battle tidy-up: companion bubbles stay off the monsters, the acting-hero portrait and the 2x / Auto chips (one bubble at a time),
// and the action menu no longer carries a redundant Auto-battle entry (the Auto button does that). Also: the HUD has no leftover spoon counter.
// Screenshot: /workspace/shots/tidy-fight-<project>.png
import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const fight = (page, groups) => page.evaluate(async (groups) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); }); }, groups);
const shot = async (page, P) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/tidy-fight-${P}.png`, timeout: 15000 }); return; } catch (e) { await page.mouse.move(1, 1); await page.waitForTimeout(800); } } };

test('fight: no Auto-battle menu item, numbered 1..N; one bubble that clears the monsters, the portrait and the chips', async ({ page }, info) => {
  test.setTimeout(240000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'double');
  await expect(page.locator('#hud')).not.toContainText(/🥄|🔧|spoon/i);
  await fight(page, [{ key: 'giantRat', count: 3 }, { key: 'giantCentipede', count: 3 }]);
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  await expect.poll(() => page.evaluate(() => !!document.querySelector('#turnport.in') && !document.querySelector('#caption.show') && !!document.querySelector('#cmenu .combatmenu')), { timeout: 60000 }).toBe(true); await page.waitForTimeout(400);
  const labels = await page.locator('#cmenu .combatmenu button').allTextContents();
  expect(labels.some((l) => /Auto-battle/i.test(l)), 'no Auto-battle item in the menu').toBe(false);
  labels.forEach((l, i) => expect(l.trim().startsWith(`${i + 1}.`), `item ${i + 1} is numbered in order: ${l}`).toBe(true));
  await expect(page.locator('#autobtn')).toBeVisible();
  // three companions talk at once: only one bubble remains
  await page.evaluate(() => { const g = window.__gw; for (const [who, text] of [['Fizzwick', 'Emberhollow! Where Fizzwick\'s genius is, regrettably, underappreciated.'], ['Fizzwick', 'Fizzwick notes the enemy\'s poor posture. Advantage: Fizzwick.'], ['Pip', 'Stay behind me. Not because I\'m brave. Because I\'m cheaper to replace.']]) g.say({ who, color: '#ff9bf0', text }); });
  await page.waitForTimeout(700);
  const m = await page.evaluate(() => {
    const view = document.querySelector('#view').getBoundingClientRect(); const R = window.__gw.R; const mr = R.monsterScreenRect(); const rect = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const bn = document.querySelector('#banter'); const bubbles = [...bn.querySelectorAll('.bubble')].map(rect);
    const vis = getComputedStyle(bn).visibility !== 'hidden';
    const others = ['#turnport', '#foeport', '#combatchips', '#hud', '#btn-menu'].map((s) => document.querySelector(s)).filter((e) => e && (e.offsetParent || getComputedStyle(e).position === 'fixed')).map((e) => ({ s: e.id || e.getAttribute('id'), ...rect(e) }));
    const mon = mr && { l: view.left + mr.left / 100 * view.width, r: view.left + mr.right / 100 * view.width, t: view.top + mr.top / 100 * view.height, b: view.top + mr.bottom / 100 * view.height };
    return { n: bubbles.length, bubbles, vis, others, mon, view: rect(document.querySelector('#view')) };
  });
  console.log(P, JSON.stringify({ n: m.n, vis: m.vis, bubble: m.bubbles[0], mon: m.mon, others: m.others.map((o) => `${o.s}:${Math.round(o.t)}-${Math.round(o.b)}`) }));
  expect(m.n, 'one bubble at a time in a fight').toBe(1);
  if (m.vis) {
    const b = m.bubbles[0]; const hit = (a, c) => a.l < c.r && a.r > c.l && a.t < c.b - 1 && a.b > c.t + 1;
    expect(b.t >= m.view.t - 1 && b.b <= m.view.b + 1, 'bubble inside the stage').toBe(true);
    if (m.mon) expect(hit(b, m.mon), 'bubble does not cover the monsters').toBe(false);
    for (const o of m.others.filter((o) => o.s !== 'hud')) expect(hit(b, { l: o.l, r: o.r, t: o.t, b: o.b }), `bubble does not collide with ${o.s}`).toBe(false);
  }
  await shot(page, P);
  expect(okErr(errors)).toEqual([]);
});
