import { test, expect } from '@playwright/test';
import { skipPrologue, trackErrors, townSquare } from './helpers.js';

// Bug: when the player's own hero cast Fire Bolt / Scorching Ray (and any spell whose attack roll MISSED), no fire flew to the monster.
// Cause: the combat log emitted its "Miss" caption BEFORE the miss event, and every caption reset the "which spell is being shown" marker,
// so a missed bolt lost its projectile; for multi-ray spells (Scorching Ray, Eldritch Blast) the first ray's caption wiped the marker so rays 2 and 3 never flew either.
// This drives the REAL combat menu as the hero (a sorcerer) and asserts a projectile / area burst is spawned for each spell, on a hit and on a miss.
const SPELLS = [
  { key: 'fireBolt', label: /^\d+\. Fire Bolt/, kind: 'bolt', n: 1 },
  { key: 'scorchingRay', label: /Scorching Ray/, kind: 'ray', n: 2 },
  { key: 'magicMissile', label: /Magic Missile/, kind: 'dart', n: 3 },
  { key: 'burningHands', label: /Burning Hands/, area: true },
  { key: 'fireball', label: /Fireball/, area: true },
];

test('hero casts fire (and other projectile spells): a visible projectile travels caster → target; area spells burst on the group — hit and miss', async ({ page }, info) => {
  test.setTimeout(420000);
  const errors = trackErrors(page); const P = info.project.name;
  await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 }); await page.click('#btn-new');
  await page.selectOption('#ccls', 'sorcerer'); await page.click('#btn-begin');
  await page.click('#btn-spell-rec').catch(() => {}); await page.click('#btn-spell-ok');
  await skipPrologue(page); await expect(townSquare(page)).toBeVisible();
  const skip = page.locator('#tip-skip'); if (await skip.isVisible()) await skip.click();
  await page.evaluate(() => {
    const g = window.__gw, R = g.R, h = g.state.party[0];
    h.level = 9; h.spells = ['fireBolt', 'scorchingRay', 'magicMissile', 'burningHands', 'fireball']; h.slots = [9, 9, 9, 9];
    for (const c of g.state.party) { c.maxHp = 9999; c.hp = 9999; }
    window.__calls = []; const os = R.spellCast.bind(R);
    R.spellCast = (s, t, i, d) => { window.__calls.push({ t: 'cast', s, i }); return os(s, t, i, d); };
    const p = R.cfx.projectile.bind(R.cfx); R.cfx.projectile = (a, b, l, d) => { window.__calls.push({ t: 'proj', kind: l.kind, from: a.toArray(), to: b.toArray() }); return p(a, b, l, d); };
    const ar = R.cfx.area.bind(R.cfx); R.cfx.area = (...x) => { window.__calls.push({ t: 'area' }); return ar(...x); };
    g.startCombat({ groups: [{ key: 'animatedArmor', count: 3 }] });
  });
  const menu = page.locator('.combatmenu');
  const heroTurn = async () => {
    for (let i = 0; i < 400; i++) {
      if (await page.locator('#caption.show').isVisible()) await page.locator('#caption').click({ force: true }).catch(() => {});
      if (await menu.isVisible()) { const t = await menu.innerText().catch(() => ''); if (/End Turn/.test(t) && !/Cast Spell/.test(t) && await page.evaluate(() => window.__gw.combat?.current() === window.__gw.state.party[0])) { await menu.locator('button', { hasText: 'End Turn' }).click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(300); continue; } }
      if (await menu.isVisible() && /Cast Spell/.test(await menu.innerText().catch(() => '')) && await page.evaluate(() => { const c = window.__gw.combat; return c && c.current() === window.__gw.state.party[0]; })) return;
      await page.waitForTimeout(200);
    }
    await page.screenshot({ path: `/workspace/shots/herofire-stuck-${P}.png` });
    throw new Error('hero turn never came: ' + (await page.evaluate(() => { const c = window.__gw.combat; return c ? `${c.state} cur=${c.current()?.name} ` : 'no combat'; })) + (await menu.innerText().catch(() => 'nomenu')).slice(0, 200));
  };
  for (const miss of [false, true]) {
    for (const sp of SPELLS) {
      await heroTurn(); console.log('turn', sp.key, miss);
      await page.evaluate((miss) => { window.__calls = []; for (const m of window.__gw.combat.monsters) { m.ac = miss ? 99 : 1; m.hp = m.maxHp = 99999; } }, miss);
      await menu.locator('button', { hasText: 'Cast Spell' }).click();
      await menu.locator('button', { hasText: sp.label }).first().click();
      // slot level / target prompts: take the first real option until the cast goes through
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(250);
        if (await page.evaluate(() => window.__calls.length)) break;
        if (await menu.locator('button', { hasText: 'All on one' }).count()) { await menu.locator('button', { hasText: 'All on one' }).click(); await menu.locator('button', { hasText: /Animated Armor/ }).first().click(); await menu.locator('button', { hasText: /Cast ▶/ }).click(); continue; }
        const opts = menu.locator('button:not(:has-text("Back"))');
        if (!(await menu.isVisible()) || !(await opts.count()) || /Cast Spell/.test(await menu.innerText())) continue;
        await opts.first().click({ timeout: 2000 }).catch(() => {});
      }
      const tag = `${P} ${sp.key} ${miss ? 'miss' : 'hit'}`;
      if (sp.area) {
        await page.waitForFunction(() => window.__calls.some((c) => c.t === 'area'), null, { timeout: 15000 });
        await page.waitForFunction(() => window.__gw.R.cfx.activeCount > 8, null, { timeout: 4000 }).catch(() => {});
        if (sp.key === 'fireball' && !miss) await page.screenshot({ path: `/workspace/shots/hero-fireball-${P}.png` });
        const calls = await page.evaluate(() => window.__calls);
        expect(calls.filter((c) => c.t === 'cast' && c.s === sp.key && c.i === 0).length, `${tag}: area burst cast for the hero`).toBeGreaterThanOrEqual(1);
        expect(calls.some((c) => c.t === 'area'), `${tag}: area burst spawned`).toBe(true);
      } else {
        // a projectile job must really be travelling in the scene
        await page.waitForFunction(() => window.__gw.R.cfx.jobs.some((j) => j.kind === 'proj'), null, { timeout: 15000 });
        if (sp.key === 'fireBolt' && !miss) { await page.waitForTimeout(120); await page.screenshot({ path: `/workspace/shots/hero-firebolt-${P}.png` }); }
        await page.waitForFunction((n) => window.__calls.filter((c) => c.t === 'proj').length >= n, sp.n, { timeout: 10000 }).catch(() => {});
        const calls = await page.evaluate(() => window.__calls);
        const proj = calls.filter((c) => c.t === 'proj');
        expect(proj.length, `${tag}: projectiles spawned`).toBeGreaterThanOrEqual(sp.n);
        expect(proj.every((c) => c.kind === sp.kind), `${tag}: right look ${JSON.stringify(proj.map((c) => c.kind))}`).toBe(true);
        expect(proj[0].from[2], `${tag}: starts at the party, in front of the foes`).toBeGreaterThan(proj[0].to[2]);
      }
      await page.waitForTimeout(400);
    }
  }
  expect(errors).toEqual([]);
});
