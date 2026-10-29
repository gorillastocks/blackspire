import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test.describe.configure({ timeout: 300000 });
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const shot = async (page, path) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ path, timeout: 20000 }); return; } catch (e) { if (i === 2) throw e; await page.mouse.move(1, 1); } } };
const menuBtn = (page, re) => page.locator('#cmenu .combatmenu button', { hasText: re }).first();

/** Mixed-group fight: 4 groups (gargoyles, wolves, rats, a cult fanatic caster in the back). The first melee hero is human-controlled, everyone else is on AI; foes are padded with HP. */
async function startMixed(page) {
  await page.evaluate(async () => {
    const g = window.__gw, S = g.state;
    for (const c of S.party) { c.maxHp = 999; c.hp = 999; c.ai = true; }
    const me = S.party.find((c) => c.equip?.weapon && !['wizard', 'sorcerer', 'warlock', 'druid'].includes(c.cls)) || S.party[0]; me.ai = false;
    S.party = [me, ...S.party.filter((c) => c !== me)];
    g.hideCaption?.(); g.startCombat({ groups: [{ key: 'gargoyle', count: 2 }, { key: 'wolf', count: 2 }, { key: 'giantRat', count: 2 }, { key: 'cultFanatic', count: 1 }] });
    await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); });
    for (const m of g.combat.monsters) m.hp = m.maxHp = 9999;
  });
  await expect.poll(() => page.evaluate(() => { const g = window.__gw; return g.combat.current() === g.state.party[0]; }), { timeout: 90000 }).toBe(true);
  await expect(menuBtn(page, /^\d+\. Attack/)).toBeVisible({ timeout: 30000 });
}

test('ranks: the target picker lists groups with counts, greys out far groups as Out of reach, and the battle view staggers the ranks', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await page.evaluate(() => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'fast', battleSpeedSet: true })));
  await startMixed(page);
  await shot(page, `/workspace/shots/ranks-battle-${P}.png`);
  await menuBtn(page, /^\d+\. Attack/).click();
  const grp = page.locator('#cmenu .combatmenu.groups'); await expect(grp).toBeVisible();
  const rows = grp.locator('button'); await expect(rows.nth(0)).toContainText(/G1 .*×2/); await expect(rows.nth(1)).toContainText(/G2 .*×2/);
  await expect(rows.nth(2)).toContainText(/G3 .*×2/); await expect(rows.nth(2)).toContainText('Out of reach'); await expect(rows.nth(2)).toBeDisabled();
  await expect(rows.nth(3)).toContainText(/G4 .*×1/); await expect(rows.nth(3)).toBeDisabled();
  await expect(page.locator('#targets .mtag.far').first()).toBeVisible(); await expect(page.locator('#targets .mtag.pick').first()).toBeVisible();
  expect(await page.locator('#targets .mtag.far').count()).toBe(3); // 2 rats + the caster
  await shot(page, `/workspace/shots/ranks-picker-${P}.png`);
  // a far group cannot be tapped in the arena either
  await page.locator('#targets .mtag.far').first().click({ force: true }); await expect(grp).toBeVisible();
  // hit a reachable group
  await rows.nth(1).click(); await expect.poll(() => page.evaluate(() => window.__gw.combat.monsters.filter((m) => m.hp < m.maxHp).every((m) => m.key !== 'giantRat' && m.key !== 'cultFanatic'))).toBe(true);
  expect(okErr(errors)).toEqual([]);
});
