import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test.describe.configure({ timeout: 300000 });
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const shot = async (page, path) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ path, timeout: 20000 }); return; } catch (e) { if (i === 2) throw e; await page.mouse.move(1, 1); } } };

async function stage(page, groups) {
  await page.evaluate(async (groups) => {
    const g = window.__gw, S = g.state;
    for (const c of S.party) { c.maxHp = 999; c.hp = 999; c.ai = true; } S.party[0].ai = false; // the hero waits for input: a still frame
    g.hideCaption?.(); g.startCombat({ groups });
    await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); });
    for (const m of g.combat.monsters) m.hp = m.maxHp = 9999;
  }, groups);
  await expect.poll(() => page.evaluate(() => { const g = window.__gw; return !!g.combat && g.combat.current() === g.state.party[0]; }), { timeout: 90000 }).toBe(true);
  await expect(page.locator('#cmenu .combatmenu button', { hasText: /^\d+\. Attack/ }).first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500);
}
/** The tallest front-rank (rank 0) monster, as a share of the 3D view's height (0..100). */
const frontHeight = (page) => page.evaluate(() => {
  const { R } = window.__gw; const cv = R.container.getBoundingClientRect(); const pp = document.querySelector('#party')?.getBoundingClientRect(); const cap = document.querySelector('#caption.show')?.getBoundingClientRect(); const beside = (r) => r && r.left < cv.right - 20 && r.right > cv.left + 20 && r.top > cv.top; const bottoms = [cv.bottom, beside(pp) ? pp.top : cv.bottom, beside(cap) ? cap.top : cv.bottom]; const stage = Math.min(...bottoms) - cv.top; let best = 0;
  for (const [, v] of R.monsterObjs) { if (v.dead || !v.wbox || (v.spr?.rank ?? 0) > 0) continue; const b = v.wbox; let top = 1e9, bot = -1e9;
    for (const y of [b.min.y, b.max.y]) for (const x of [b.min.x, b.max.x]) { const p = { x, y, z: (b.min.z + b.max.z) / 2 }; const q = new b.min.constructor(p.x, p.y, p.z).project(R.arenaCam); const py = ((-q.y * 0.5 + 0.5) * cv.height) / stage * 100; top = Math.min(top, py); bot = Math.max(bot, py); }
    best = Math.max(best, bot - top); }
  return Math.round(best * 10) / 10;
});

const SCENES = {
  b1: [{ key: 'giantRat', count: 3 }, { key: 'giantCentipede', count: 2 }],
  groups: [{ key: 'gargoyle', count: 2 }, { key: 'wolf', count: 2 }, { key: 'giantRat', count: 2 }, { key: 'cultFanatic', count: 1 }],
  boss: [{ key: 'tyrannosaurus', count: 1 }],
};

for (const [name, groups] of Object.entries(SCENES)) {
  test(`big monsters: ${name} fills the arena`, async ({ page }, info) => {
    const errors = trackErrors(page); const P = info.project.name; const ipad = P.startsWith('ipad');
    await newGame(page); await page.evaluate(() => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'fast', battleSpeedSet: true })));
    await stage(page, groups);
    const hpct = await frontHeight(page); console.log(`${name} ${P}: tallest foe ${hpct}% of the arena`);
    await shot(page, `/workspace/shots/big-${name}-${P}.png`);
    if (P === 'iphone') await shot(page, `/workspace/shots/big-${name}.png`);
    if (P === 'ipad-portrait' && name === 'boss') await shot(page, '/workspace/shots/big-ipad.png');
    expect(hpct).toBeGreaterThan(name === 'groups' ? 45 : 55); expect(hpct).toBeLessThan(95);
    expect(okErr(errors)).toEqual([]);
  });
}
