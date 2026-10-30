import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

// Every floor boss (B1-B5 and the B5 phase-2 Gorvax) must be visibly drawn, at the half size, inside the arena frame, on phone and iPad.
test.describe.configure({ timeout: 300000 });
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const shot = async (page, path) => { for (let i = 0; i < 3; i++) { try { return await page.screenshot({ path, timeout: 20000 }); } catch (e) { if (i === 2) throw e; await page.mouse.move(1, 1); } } };
const BOSSES = {
  'b1-skarn': [{ key: 'giantSpider', count: 1 }, { key: 'skarn', count: 1 }],
  'b2-clubtail': [{ key: 'ankylosaurus', count: 1 }, { key: 'giantWasp', count: 3 }],
  'b3-glasshide': [{ key: 'glasshide', count: 1 }, { key: 'gargoyle', count: 2 }, { key: 'darkmantle', count: 2 }],
  'b4-brakk': [{ key: 'brakk', count: 1 }, { key: 'cindermaw', count: 1 }],
  'b5-malthrax': [{ key: 'malthrax', count: 1 }, { key: 'gargoyle', count: 2 }, { key: 'animatedArmor', count: 2 }],
  'b5-gorvax': [{ key: 'tyrannosaurus', count: 1 }],
};
/** Where the lead monster is on screen (CSS px, from its world box), and how big the arena view is. */
const leadRect = (page) => page.evaluate(() => {
  const { R } = window.__gw; const cv = R.container.getBoundingClientRect(); const v = R.monsterObjs.get(window.__gw.combat.monsters[0].id); const b = v.wbox; let l = 1e9, t = 1e9, r = -1e9, bt = -1e9;
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) { const q = new b.min.constructor(x, y, (b.min.z + b.max.z) / 2).project(R.arenaCam); const px = (q.x * 0.5 + 0.5) * cv.width, py = (-q.y * 0.5 + 0.5) * cv.height; l = Math.min(l, px); r = Math.max(r, px); t = Math.min(t, py); bt = Math.max(bt, py); }
  return { cv: { x: cv.x, y: cv.y, w: cv.width, h: cv.height }, l, t, r, b: bt, zoom: R.arenaCam.zoom, dist: R.arenaCam.position.distanceTo(R.arenaLook) };
});

for (const [name, groups] of Object.entries(BOSSES)) {
  test(`boss ${name} is drawn at half size inside the arena`, async ({ page }, info) => {
    const errors = trackErrors(page); const P = info.project.name;
    await newGame(page); await page.evaluate(() => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'fast', battleSpeedSet: true })));
    await page.evaluate(async (groups) => {
      const g = window.__gw, S = g.state; for (const c of S.party) { c.maxHp = 999; c.hp = 999; c.ai = true; } S.party[0].ai = false;
      g.hideCaption?.(); g.startCombat({ groups });
      await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); });
      for (const m of g.combat.monsters) m.hp = m.maxHp = 99999;
    }, groups);
    await expect.poll(() => page.evaluate(() => { const g = window.__gw; return !!g.combat && g.combat.current() === g.state.party[0] && g.R.monsterObjs.size > 0; }), { timeout: 90000 }).toBe(true);
    await expect(page.locator('#cmenu .combatmenu button', { hasText: /^\d+\. Attack/ }).first()).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(2000);
    const rc = await leadRect(page);
    const withBoss = await shot(page, `/workspace/shots/front-boss-${name}-${P}.png`);
    // the same frame with only the lead boss hidden: the pixels that differ are the boss
    await page.evaluate(() => { const { R } = window.__gw; const v = R.monsterObjs.get(window.__gw.combat.monsters[0].id); v.holder.visible = false; }); await page.waitForTimeout(400);
    const without = await page.screenshot({ timeout: 20000 });
    await page.evaluate(() => { const { R } = window.__gw; const v = R.monsterObjs.get(window.__gw.combat.monsters[0].id); v.holder.visible = true; });
    const frac = await page.evaluate(async ({ a, b, rc }) => {
      const load = async (s) => { const bm = await createImageBitmap(await (await fetch(`data:image/png;base64,${s}`)).blob()); const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0); return { x, w: bm.width, h: bm.height }; };
      const A = await load(a), B = await load(b); const sc = A.w / innerWidth;
      const x0 = Math.max(0, Math.floor((rc.cv.x + rc.l) * sc)), y0 = Math.max(0, Math.floor((rc.cv.y + rc.t) * sc)), x1 = Math.min(A.w, Math.ceil((rc.cv.x + rc.r) * sc)), y1 = Math.min(A.h, Math.ceil((rc.cv.y + rc.b) * sc));
      if (x1 <= x0 || y1 <= y0) return 0; const da = A.x.getImageData(x0, y0, x1 - x0, y1 - y0).data, db = B.x.getImageData(x0, y0, x1 - x0, y1 - y0).data; let n = 0; const tot = da.length / 4;
      for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) n++;
      return n / tot;
    }, { a: withBoss.toString('base64'), b: without.toString('base64'), rc });
    console.log(`${name} ${P}: boss pixels ${(frac * 100).toFixed(0)}% of its box; box ${Math.round(rc.l)},${Math.round(rc.t)}-${Math.round(rc.r)},${Math.round(rc.b)} of ${Math.round(rc.cv.w)}x${Math.round(rc.cv.h)}; zoom ${rc.zoom}, camera distance ${rc.dist.toFixed(1)}`);
    expect(frac, 'the boss sprite has visible (non-background) pixels in frame').toBeGreaterThan(0.08);
    expect(rc.zoom, 'about half size (a little more on a short stage)').toBeGreaterThanOrEqual(0.56); expect(rc.zoom).toBeLessThanOrEqual(0.7);
    expect(rc.dist, 'camera not dollied out into the fog (distance to the look point; the stage and camera stand forward together, so the old distance from the origin grew with SPR_Z0 alone: 14 there is 12.8 here)').toBeLessThan(13);
    // mostly inside the arena view, and not the full height (half size)
    expect(rc.l).toBeGreaterThanOrEqual(-4); expect(rc.r).toBeLessThanOrEqual(rc.cv.w + 4); expect(rc.t).toBeGreaterThanOrEqual(-rc.cv.h * 0.08); expect(rc.b).toBeLessThanOrEqual(rc.cv.h * 1.02);
    expect((rc.b - rc.t) / rc.cv.h, 'boss height as a share of the arena view').toBeLessThan(0.6);
    expect(okErr(errors)).toEqual([]);
  });
}
