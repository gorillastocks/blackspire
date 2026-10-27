import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';

// Bug: on a tall phone view (all-AI opening turns, no player menu yet) the arena fit dollied the camera into the padded monster
// box, measured a mirrored/gigantic rect and shifted the whole picture off the top: Giant Frog cut off, grid at a weird angle.
// Every fight must start with the monsters framed, a clean camera, no leftover effect sprites, and the player's menu arriving.
test('combat start: monsters framed, camera clean, menu arrives (Giant Frog, rats, wolves)', async ({ page }, info) => {
  test.setTimeout(240000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { for (const c of window.__gw.state.party) { c.maxHp = 999; c.hp = 999; c.ai = true; } window.__gw.state.party[0].ai = false; });
  const state = () => page.evaluate(() => { const R = window.__gw.R; const r = R.monsterScreenRect(); return { shift: R.arenaShift, aBump: R.aBump, aShake: R.aShake, rect: r, menu: !!document.querySelector('#cmenu .combatmenu'), wsp: R.cfx.wsp.filter((w) => w.visible).length, jobs: R.cfx.jobs.length }; });
  for (const key of ['giantFrog', 'giantRat', 'wolf']) {
    await page.evaluate((key) => { window.__gw.hideCaption?.(); window.__gw.startCombat({ groups: [{ key, count: key === 'giantFrog' ? 1 : 2 }] }); }, key);
    await expect.poll(() => page.evaluate(() => !!window.__gw.combat && window.__gw.R.monsterObjs.size > 0), { timeout: 20000, message: key + ' combat up' }).toBe(true);
    for (let i = 0; i < 6; i++) { // the opening exchange (AI turns): framed the whole time
      const s = await state();
      expect(Math.abs(s.shift), `${key}: arena shift sane ${JSON.stringify(s)}`).toBeLessThanOrEqual(45);
      expect(s.rect, `${key}: a monster is on screen`).toBeTruthy();
      const raw = s.rect.raw, cx = (raw.left + raw.right) / 2, cy = (raw.top + raw.bottom) / 2;
      expect(cx > 15 && cx < 85 && cy > 8 && cy < 92, `${key}: monsters centred in view (${cx.toFixed(0)}, ${cy.toFixed(0)}) ${JSON.stringify(raw)}`).toBe(true);
      expect(s.rect.bottom - s.rect.top, `${key}: not cut off`).toBeGreaterThan(8);
      await page.waitForTimeout(500);
    }
    // the player's battle menu always comes up, and nothing is left floating when no effect is running
    await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
    await page.evaluate(() => { const g = window.__gw; g.combat?.monsters?.forEach((m) => { m.hp = 0; }); });
    const s = await state(); expect(Math.abs(s.shift)).toBeLessThanOrEqual(45);
    await expect.poll(() => page.evaluate(() => !window.__gw.combat), { timeout: 60000 }).toBe(true).catch(() => {});
    for (let k = 0; k < 10 && await page.evaluate(() => !!window.__gw.combat); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(500); }
    await page.evaluate(() => window.__gw.hideCaption?.());
  }
  // the geometry itself: whatever the view size, the fit never produces a runaway shift for these monsters
  const sizes = await page.evaluate(async () => {
    const g = window.__gw, R = g.R; const out = [];
    g.startCombat({ groups: [{ key: 'giantFrog', count: 1 }] }); await new Promise((r) => setTimeout(r, 4000));
    for (const hpx of [260, 330, 408, 520, 640]) { R.container.style.height = hpx + 'px'; R.container.style.flex = 'none'; R.resize(); out.push({ hpx, shift: R.arenaShift, rect: R.monsterScreenRect() && R.monsterScreenRect().raw }); }
    R.container.style.height = ''; R.container.style.flex = ''; R.resize(); return out; });
  for (const z of sizes) { expect(Math.abs(z.shift), 'shift @' + z.hpx).toBeLessThanOrEqual(45); expect(z.rect && z.rect.bottom > 0 && z.rect.top < 100, 'frog visible @' + z.hpx + ' ' + JSON.stringify(z.rect)).toBe(true); }
  expect(errors).toEqual([]);
});
