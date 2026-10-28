import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const start = (page, groups, prep) => page.evaluate(async ([groups, prep]) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } if (prep) new Function('S', prep)(g.state); g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); for (const m of g.combat.monsters) m.hp = m.maxHp = 999; r(); } }, 2); }); }, [groups, prep || '']);

const fits = (page) => page.evaluate(() => { const m = document.querySelector('#cmenu .panel'); const r = m.getBoundingClientRect(); const cm = document.querySelector('#cmenu').getBoundingClientRect(); const bs = [...document.querySelectorAll('#cmenu .combatmenu button')]; const lastBottom = Math.max(...bs.map((b) => b.getBoundingClientRect().bottom)); return { scroll: m.scrollHeight, client: m.clientHeight, top: r.top, bottom: Math.min(r.bottom, cm.bottom), lastBottom, vh: innerHeight, n: bs.length }; });
for (const [who, idx] of [['fighter', 0], ['cleric', 1], ['wizard', 3]]) {
  test(`combat menu fits without scrolling: ${who}, main page and More page`, async ({ page }, info) => {
    test.setTimeout(200000); const errors = trackErrors(page);
    await newGame(page); await setSpeed(page, 'normal');
    await start(page, [{ key: 'giantRat', count: 2 }, { key: 'wolf', count: 1 }], `for (const c of S.party) c.ai = true; S.party[${idx}].ai = false;`);
    await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
    await page.waitForFunction((i) => window.__gw.combat.current() === window.__gw.state.party[i], idx, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    const main = await fits(page); console.log(who, 'main', JSON.stringify(main));
    expect(main.scroll, 'main menu does not need to scroll').toBeLessThanOrEqual(main.client + 1); expect(main.lastBottom, 'every button is inside the menu').toBeLessThanOrEqual(Math.min(main.bottom, main.vh) + 1);
    await shot(page, { path: `/workspace/shots/phaseE-menu-${who}-${info.project.name}.png` });
    await page.locator('#cmenu .combatmenu button', { hasText: 'More' }).click();
    await expect(page.locator('#cmenu .combatmenu button', { hasText: 'Battle speed' })).toBeVisible();
    const more = await fits(page); console.log(who, 'more', JSON.stringify(more));
    expect(more.scroll, 'More page does not need to scroll').toBeLessThanOrEqual(more.client + 1); expect(more.lastBottom, 'every button is inside the menu').toBeLessThanOrEqual(Math.min(more.bottom, more.vh) + 1);
    await shot(page, { path: `/workspace/shots/phaseE-menu-more-${who}-${info.project.name}.png` });
    await page.locator('#cmenu .combatmenu button', { hasText: /← Back/ }).click();
    await expect(page.locator('#cmenu .combatmenu button', { hasText: 'More' })).toBeVisible();
    expect(okErr(errors)).toEqual([]);
  });
}
