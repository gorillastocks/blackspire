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

// Companions and Auto: with the AI playing (Auto on) the sorcerer hero and the wizard companion cast fire; every attack-roll result (hit or miss) of a
// projectile spell must fly a projectile caster → target, and every area spell must burst. Accounted from the real combat events vs. the renderer's calls.
const AUTO_CONFIGS = [
  { name: 'bolt + fireball', hero: ['fireBolt'], wiz: ['fireBolt', 'fireball'], want: { hero: ['fireBolt'], wiz: ['fireball'] } },
  { name: 'scorching ray (hero) + ray (wizard)', hero: ['fireBolt', 'scorchingRay'], wiz: ['fireBolt', 'scorchingRay'], want: { hero: ['scorchingRay'], wiz: ['scorchingRay'] } },
  { name: 'burning hands (wizard)', hero: ['fireBolt'], wiz: ['fireBolt', 'burningHands'], want: { hero: ['fireBolt'], wiz: ['burningHands'] } },
];
for (const cfg of AUTO_CONFIGS) {
  test(`Auto on: hero and companion fire spells fly/burst — ${cfg.name}`, async ({ page }, info) => {
    test.setTimeout(420000);
    const errors = trackErrors(page); const P = info.project.name;
    await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 }); await page.click('#btn-new');
    await page.selectOption('#ccls', 'sorcerer'); await page.click('#btn-begin');
    await page.click('#btn-spell-rec').catch(() => {}); await page.click('#btn-spell-ok');
    await skipPrologue(page); await expect(townSquare(page)).toBeVisible();
    const skip = page.locator('#tip-skip'); if (await skip.isVisible()) await skip.click();
    await page.evaluate(({ cfg }) => {
      const g = window.__gw, R = g.R; const hero = g.state.party[0], wiz = g.state.party.find((c) => c.cls === 'wizard');
      hero.level = 9; hero.spells = cfg.hero; hero.slots = [9, 9, 9, 9, 9]; wiz.level = 9; wiz.spells = cfg.wiz; wiz.slots = [9, 9, 9, 9, 9];
      for (const c of g.state.party) { c.maxHp = 9999; c.hp = 9999; }
      window.__sc = []; window.__proj = []; window.__area = 0; window.__ev = [];
      const os = R.spellCast.bind(R); R.spellCast = (s, t, i, d) => { window.__sc.push({ s, i, area: t == null }); return os(s, t, i, d); };
      const p = R.cfx.projectile.bind(R.cfx); R.cfx.projectile = (a, b, l, d) => { window.__proj.push({ from: a.toArray(), to: b.toArray() }); return p(a, b, l, d); };
      const ar = R.cfx.area.bind(R.cfx); R.cfx.area = (...x) => { window.__area++; return ar(...x); };
      localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'double', battleSpeedSet: true }));
      g.startCombat({ groups: [{ key: 'animatedArmor', count: 3 }, { key: 'giantRat', count: 2 }] });
      const c = g.combat; const od = c.drain.bind(c); c.drain = () => { const r = od(); window.__ev.push(...r.events.map((e) => ({ type: e.type, att: e.att?.name, who: e.who?.name, tgt: e.tgt?.side, spell: e.spell }))); return r; };
      for (const m of c.monsters) { m.hp = m.maxHp = 99999; m.ac = 99; }
    }, { cfg });
    const auto = page.locator('#autobtn'); await expect(auto).toBeVisible({ timeout: 60000 }); await auto.click(); await expect(auto).toHaveAttribute('aria-pressed', 'true');
    // rounds 1-2 everything misses, rounds 3-4 everything hits, then the foes fall so the fight ends
    await expect.poll(() => page.evaluate(() => { const c = window.__gw.combat; if (!c) return 9; if (c.round >= 3) for (const m of c.monsters) m.ac = 1; if (c.round >= 5) for (const m of c.monsters) m.hp = 1; return c.round; }), { timeout: 240000, intervals: [300] }).toBeGreaterThanOrEqual(5);
    await page.screenshot({ path: `/workspace/shots/autofire-${P}-${cfg.name.replace(/\W+/g, '_')}.png` }).catch(() => {});
    const r = await page.evaluate(() => {
      const names = { hero: window.__gw.state.party[0].name, wiz: window.__gw.state.party.find((c) => c.cls === 'wizard').name };
      const AREA = ['fireball', 'burningHands']; const PROJ = ['fireBolt', 'scorchingRay']; let pend = null; let expectProj = 0, expectArea = 0; const seen = {}; const results = { hit: 0, miss: 0 };
      for (const e of window.__ev) {
        if (e.type === 'cutin' || e.type === 'partyAttack' || e.type === 'monsterAttack') pend = null;
        else if (e.type === 'spell') { pend = e.who && (AREA.includes(e.spell) || PROJ.includes(e.spell)) ? { who: e.who, spell: e.spell } : null; if (pend) { const k = e.who === names.hero ? 'hero' : e.who === names.wiz ? 'wiz' : 'other'; (seen[k] ||= new Set()).add(e.spell); if (AREA.includes(e.spell)) expectArea++; } }
        else if ((e.type === 'hit' || e.type === 'miss') && e.tgt === 'monster' && pend && pend.who === e.att && PROJ.includes(pend.spell)) { expectProj++; results[e.type]++; }
      }
      return { expectProj, expectArea, seen: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v]])), results, sc: window.__sc, proj: window.__proj, area: window.__area, nEvents: window.__ev.length };
    });
    console.log(P, cfg.name, JSON.stringify({ expectProj: r.expectProj, expectArea: r.expectArea, seen: r.seen, results: r.results, spellCasts: r.sc.length, projs: r.proj.length, areas: r.area }));
    for (const [who, spells] of Object.entries(cfg.want)) for (const s of spells) expect(r.seen[who] || [], `${P}: ${who} cast ${s} under Auto`).toContain(s);
    expect(r.results.miss, 'misses were exercised').toBeGreaterThan(0); expect(r.results.hit, 'hits were exercised').toBeGreaterThan(0);
    expect(r.sc.filter((c) => !c.area).length, `${P}: a projectile flew for every hit/miss of a projectile spell`).toBeGreaterThanOrEqual(r.expectProj);
    expect(r.proj.length, `${P}: cfx projectiles spawned`).toBeGreaterThanOrEqual(r.expectProj);
    expect(r.sc.filter((c) => c.area).length, `${P}: every area spell burst`).toBeGreaterThanOrEqual(r.expectArea);
    expect(r.area, `${P}: cfx area bursts spawned`).toBeGreaterThanOrEqual(r.expectArea);
    expect(r.proj.every((c) => c.from[2] > c.to[2]), `${P}: every projectile starts at the party, in front of the foes`).toBe(true);
    expect(errors).toEqual([]);
  });
}
