import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, dismissCards } from './helpers.js';
// Visual sweep: every floor's boss fight, sheet and map — no console errors, no NaN/undefined text, boss on screen.
const BOSSES = [[['giantSpider', 1], ['skarn', 1]], [['ankylosaurus', 1], ['giantWasp', 1]], [['glasshide', 1], ['darkmantle', 2]], [['brakk', 1], ['cindermaw', 1]], [['malthrax', 1], ['animatedArmor', 2]]].map((b) => b.map(([key, count]) => ({ key, count })));
test('sweep: each floor boss in view, sheet/map clean', async ({ page }, info) => {
  test.setTimeout(400000);
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon'); await dismissCards(page);
  const bad = () => page.evaluate(() => document.body.innerText.match(/\bNaN\b|\bundefined\b|\[object Object\]/g));
  for (let L = 0; L < 5; L++) {
    await page.evaluate(async (L) => { const s = JSON.parse(window.__gw.G.serialize(window.__gw.state)); s.level = L; for (const c of s.party) { c.hp = c.maxHp = 999; } await window.__gw.loadState(JSON.stringify(s)); }, L);
    await dismissCards(page);
    const groups = BOSSES[L];
    await page.evaluate((groups) => { for (const c of window.__gw.state.party) c.ai = true; window.__gw.startCombat({ groups, boss: true }); }, groups);
    await expect.poll(() => page.evaluate(() => !!window.__gw.combat)).toBe(true);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => window.__gw.R.mode), 'arena on screen during the fight').toBe('combat');
    await page.screenshot({ path: `/workspace/shots/sweep-B${L + 1}-boss-${P}.png` });
    expect(await bad(), `B${L + 1} combat text`).toBeNull();
    await page.evaluate(() => { const c = window.__gw.combat; for (const m of c.monsters) { m.hp = 0; window.__gw.R.monsterDie?.(m.id); } });
    const settle = async () => { for (let i = 0; i < 80 && await page.evaluate(() => !!window.__gw.combat); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(300); } await dismissCards(page); await page.waitForTimeout(1500); await dismissCards(page); };
    await settle();
    if (L === 4) { // Malthrax falls → Gorvax the Tyrant rises (phase 2): the real transition, arena and pose in view
      await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 30000, message: 'Gorvax phase 2 starts' }).toBe(true);
      await page.waitForTimeout(4000);
      expect(await page.evaluate(() => window.__gw.R.mode), 'Gorvax arena on screen').toBe('combat');
      await page.screenshot({ path: `/workspace/shots/sweep-B5-gorvax-${P}.png` });
      expect(await bad(), 'Gorvax combat text').toBeNull();
      await page.evaluate(() => { for (const m of window.__gw.combat.monsters) m.hp = 0; });
      await settle();
    }
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

