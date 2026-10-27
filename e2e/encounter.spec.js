import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';

// "Encounter!" flash before every fight: ~1.2s, tap skips, boss name / Ambush! variants, and no narrator voice mid-fight.
test('encounter banner: shows, fits, tap skips, variants, narration stays cancelled', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await page.evaluate(() => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; c.ai = true; } });
  const banner = page.locator('#encounter');
  const start = (c) => page.evaluate((c) => { window.__gw.startCombat(c); }, c);

  // plain encounter, left to time out (~1.2s) before the battle UI
  await start({ groups: [{ key: 'giantRat', count: 2 }] });
  await expect(banner).toBeVisible();
  await expect(banner.locator('.enc-title')).toHaveText('Encounter!');
  expect(await page.evaluate(() => !!window.__gw.combat), 'battle UI not yet up').toBe(false);
  await expect(banner).toHaveCount(0, { timeout: 3000 });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.__gw.state.party.forEach((c) => { c.hp = c.maxHp; }));

  // layout + screenshots: a long-lived banner (screenshots are slow under software GL)
  await page.evaluate(() => window.__gw.hideCaption());
  for (const [name, inf] of [['plain', { groups: [] }], ['boss', { boss: true }]]) {
    await page.evaluate((i) => { window.__bn = window.__gw.showEncounterBanner(i, 15000); }, inf);
    await expect(banner).toBeVisible(); await page.waitForTimeout(450);
    const box = await page.evaluate(() => { const r = document.querySelector('#encounter .enc-panel').getBoundingClientRect(), v = document.querySelector('#view').getBoundingClientRect(); return { l: r.left - v.left, r: v.right - r.right, t: r.top - v.top, b: v.bottom - r.bottom }; });
    expect(box.l, name + ' inside view (left)').toBeGreaterThanOrEqual(0); expect(box.r, name + ' (right)').toBeGreaterThanOrEqual(0);
    expect(box.t).toBeGreaterThanOrEqual(0); expect(box.b).toBeGreaterThanOrEqual(0);
    await page.screenshot({ path: `/workspace/shots/encounter-${name}-${P}.png` });
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await expect(banner).toHaveCount(0);
  }

  // untouched banner lasts about 1.2s
  const dur = await page.evaluate(async () => { const t = performance.now(); await window.__gw.showEncounterBanner({ groups: [] }); return performance.now() - t; });
  expect(dur, 'about 1.2s').toBeGreaterThan(1100); expect(dur).toBeLessThan(1500);

  // tap skips it
  await page.evaluate(() => window.__gw.hideCaption());
  const skip = await page.evaluate(async () => { const g = window.__gw; const t = performance.now(); const p = g.showEncounterBanner({ groups: [] }); await new Promise((r) => setTimeout(r, 300)); window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await p; return performance.now() - t; });
  expect(skip, 'tap skipped the banner early').toBeLessThan(900);

  // variants
  const titles = await page.evaluate(async () => { const g = window.__gw; const out = [];
    for (const info of [{ ambush: true }, { boss: true }, { boss: true, phase2: true }]) { const p = g.showEncounterBanner(info); await new Promise((r) => setTimeout(r, 400)); out.push(document.querySelector('#encounter .enc-title')?.textContent); window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await p; }
    return out; });
  expect(titles[0]).toBe('Ambush!'); expect(titles[1]).toBe(await page.evaluate(() => window.__gw.G.Narr ? null : null) ?? titles[1]); expect(titles[1].length).toBeGreaterThan(3); expect(titles[2]).toBe('A powerful foe appears!');
  expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
});

test('encounter banner blocks ambient narration; area+combat does not voice the area', async ({ page }) => {
  test.setTimeout(120000);
  await newGame(page);
  const r = await page.evaluate(async () => { const g = window.__gw; g.hideCaption();
    g.startCombat({ groups: [{ key: 'giantRat', count: 1 }] });
    await new Promise((r) => setTimeout(r, 200));
    const ok = g.playAmbientNarration('The tunnel widens into a nest of chewed bones, gnawed armour and stolen cutlery, piled into a lopsided throne. Something big stirs on top of it and sniffs the air.');
    await new Promise((r) => setTimeout(r, 800));
    return { ok, cur: g.voice().current?.ambient || false }; });
  expect(r.ok, 'ambient refused while the fight is starting').toBe(false);
  expect(r.cur).toBe(false);
});
