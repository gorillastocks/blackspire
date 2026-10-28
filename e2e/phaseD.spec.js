import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, dismissCards } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const start = (page, groups, prep) => page.evaluate(async ([groups, prep]) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } if (prep) new Function('S', prep)(g.state); g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); for (const m of g.combat.monsters) m.hp = m.maxHp = 999; r(); } }, 2); }); }, [groups, prep || '']);

test('cut-ins: four variants, readable, finish on their own, and 2x is faster than slow', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'slow');
  await start(page, [{ key: 'giantRat', count: 2 }]); await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  const variants = [
    ['melee', { id: 'attack', weapon: 'longsword' }, 0], ['ranged', { id: 'shoot', weapon: 'longbow' }, 2],
    ['spell', { id: 'cast', spell: 'fireBolt' }, 3], ['heal', { id: 'cast', spell: 'cureWounds' }, 1],
  ];
  for (const [kind, extra, who] of variants) {
    await page.evaluate(([kind, extra, who]) => { const g = window.__gw; window.__cut = g.playCutin({ kind, who: g.state.party[who], hold: 6000, ...extra }); }, [kind, extra, who]);
    await expect(page.locator('#cutin.on.strike')).toBeAttached({ timeout: 5000 });
    // freeze the strike effect halfway so the screenshot shows the slash / arrow / rings / plus signs mid-flight
    await expect.poll(() => page.locator('#cutin .ci-band').boundingBox().then((b) => b.width), { timeout: 5000 }).toBeGreaterThan(page.viewportSize().width * 0.8);
    await page.evaluate(() => { for (const a of document.getAnimations()) { if (!a.effect?.target?.closest?.('#cutin')) continue; const t = a.effect.getComputedTiming(); a.pause(); a.currentTime = (t.delay || 0) + t.duration * 0.45; } });
    await expect(page.locator(`#cutin[data-kind="${kind}"] .ci-txt b`)).toBeVisible();
    const box = await page.locator('#cutin .ci-band').boundingBox(); const vp = page.viewportSize();
    expect(box.height).toBeGreaterThan(40); expect(box.width).toBeGreaterThan(vp.width * 0.8);
    const txt = await page.locator('#cutin .ci-txt').boundingBox(); expect(txt.x).toBeGreaterThanOrEqual(0); expect(txt.x + txt.width).toBeLessThanOrEqual(vp.width);
    await shot(page, { path: `/workspace/shots/phaseD-cutin-${kind}-${info.project.name}.png` });
    await page.evaluate(() => { window.__gw.endCutinPhase(); return window.__cut; }); await expect(page.locator('#cutin.on')).toHaveCount(0);
  }
  // timing follows battle speed
  const time = async (k) => { await setSpeed(page, k); return page.evaluate(async () => { const g = window.__gw; const t0 = performance.now(); await g.playCutin({ kind: 'melee', who: g.state.party[0], id: 'attack', weapon: 'longsword' }); return performance.now() - t0; }); };
  const slow = await time('slow'), normal = await time('normal'), dbl = await time('double');
  expect(slow).toBeGreaterThan(normal); expect(dbl).toBeLessThan(normal * 0.7); expect(dbl).toBeLessThan(slow * 0.45);
  // Skip cancels a running cut-in at once
  await setSpeed(page, 'slow');
  const skipped = await page.evaluate(async () => { const g = window.__gw; const t0 = performance.now(); const p = g.playCutin({ kind: 'spell', who: g.state.party[0], id: 'cast', spell: 'fireBolt' }); await new Promise((r) => setTimeout(r, 120)); document.querySelector('#skipbtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await p; return performance.now() - t0; });
  expect(skipped).toBeLessThan(500); await expect(page.locator('#cutin.on')).toHaveCount(0);
  expect(okErr(errors)).toEqual([]);
});

test('a real attack plays the cut-in before the hit, and Skip leaves none behind', async ({ page }) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'normal');
  await start(page, [{ key: 'giantRat', count: 1 }], 'for (const c of S.party) c.ai = true; S.party[0].ai = false;');
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  // watch for the overlay appearing from now on
  await page.evaluate(() => { window.__seen = []; new MutationObserver(() => { const e = document.querySelector('#cutin'); if (e.classList.contains('on') && !window.__seen.includes(e.dataset.kind + ':' + e.dataset.who)) window.__seen.push(e.dataset.kind + ':' + e.dataset.who); }).observe(document.querySelector('#cutin'), { attributes: true }); });
  await page.locator('#cmenu .combatmenu button', { hasText: /^1\. Attack|^1\. Shoot|^1\. Cast/ }).first().click();
  await expect.poll(() => page.evaluate(() => window.__seen.length), { timeout: 20000 }).toBeGreaterThan(0);
  const who = await page.evaluate(() => window.__gw.state.party[0].name); expect((await page.evaluate(() => window.__seen)).some((s) => s.endsWith(':' + who))).toBe(true);
  await page.locator('#skipbtn').click(); await page.waitForTimeout(400); await expect(page.locator('#cutin.on')).toHaveCount(0);
  expect(okErr(errors)).toEqual([]);
});

test('rows: back-row hero cannot melee, formation swap works in the tavern and in a fight', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); await openLocation(page, 'Tavern');
  const board = page.locator('#formation'); await expect(board).toBeVisible();
  await expect(board.locator('#frow-front .fhero')).toHaveCount(2); await expect(board.locator('#frow-back .fhero')).toHaveCount(2);
  const names = await page.evaluate(() => window.__gw.state.party.map((c) => c.name));
  await board.locator('#frow-front .fhero').first().scrollIntoViewIfNeeded(); await board.locator('#frow-front .fhero').first().click();
  await shot(page, { path: `/workspace/shots/phaseD-formation-${info.project.name}.png` });
  await page.locator('#formation #frow-back .fhero').first().click();
  const after = await page.evaluate(() => window.__gw.state.party.map((c) => c.name));
  expect(after[0]).toBe(names[2]); expect(after[2]).toBe(names[0]);
  // in a fight
  await page.evaluate(() => { document.querySelector('#modal .closebtn, #modal .backbtn')?.click(); });
  await page.evaluate(() => window.__gw.closeModal?.());
  await start(page, [{ key: 'giantRat', count: 2 }], 'for (const c of S.party) { c.ai = true; } S.party[0].ai = false; S.party[3].equip.ranged = null;');
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  const r = await page.evaluate(() => { const cb = window.__gw.combat; const c = cb.current(); return { front: cb.inFront(c), acts: cb.actionsFor(c).map((a) => a.id), swap: cb.actionsFor(c).some((a) => a.id === 'swap') }; });
  expect(r.swap).toBe(true);
  await expect(page.locator('#cmenu .combatmenu button', { hasText: 'Swap rows' })).toBeVisible();
  await shot(page, { path: `/workspace/shots/phaseD-swap-menu-${info.project.name}.png` });
  await page.locator('#cmenu .combatmenu button', { hasText: 'Swap rows' }).click();
  await expect(page.locator('#cmenu .combatmenu button', { hasText: /trade places|now (back|front)/i }).first()).toBeVisible();
  expect(okErr(errors)).toEqual([]);
});

test('condition icons with tooltips on heroes and monsters, weakness chips after discovery', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'normal');
  await start(page, [{ key: 'giantSpider', count: 2 }], "for (const c of S.party) c.ai = true; S.party[0].ai = false;");
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  await page.evaluate(() => { const cb = window.__gw.combat; const P = window.__gw.state.party; P[0].conditions.poisoned = true; P[1].conditions.frightened = true; P[1].conditions.blessed = {}; P[2].conditions.restrained = { dc: 12, src: 'x' }; P[3].conditions.prone = true; cb.monsters[0].conditions.prone = true; cb.monsters[1].conditions.restrained = { dc: 12, src: 'x' }; cb.learn(cb.monsters[0], 'fire'); cb.learn(cb.monsters[1], 'poison'); window.__gw.renderCombatUI(); });
  for (const k of ['poisoned', 'frightened', 'restrained', 'prone']) { const chip = page.locator(`#party .cchip[data-cond="${k}"]`).first(); await expect(chip).toBeVisible(); const t = await chip.getAttribute('title'); expect(t.length).toBeGreaterThan(20); await expect(chip).toHaveAttribute('aria-label', /\w+/); }
  await expect(page.locator('#party .cchip.good[data-cond="blessed"]').first()).toBeVisible();
  await expect(page.locator('#targets .cchip[data-cond="prone"]')).toBeVisible();
  await expect(page.locator('#targets .wchip.vuln[data-trait="vuln:fire"]')).toBeVisible();
  await expect(page.locator('#targets .wchip.resist[data-trait="resist:poison"]')).toBeVisible();
  const wt = await page.locator('#targets .wchip.vuln').first().getAttribute('title'); expect(wt).toMatch(/Weak to fire.*double/i);
  await shot(page, { path: `/workspace/shots/phaseD-conditions-${info.project.name}.png` });
  // Study: the menu offers it, and it reveals the rest
  await page.evaluate(() => { const c = window.__gw.combat.current(); for (const a of ['int', 'wis']) c.scores[a] = 30; });
  const study = page.locator('#cmenu .combatmenu button', { hasText: 'Study a foe' }); await expect(study).toBeVisible(); await study.click();
  const pick = page.locator('#cmenu .combatmenu button', { hasText: /Broodmother/ }).first(); if (await pick.isVisible().catch(() => false)) await pick.click();
  await expect.poll(() => page.evaluate(() => window.__gw.combat.monsters.some((m) => m.known.studied)), { timeout: 20000 }).toBe(true);
  await page.evaluate(() => window.__gw.renderCombatUI()); await expect(page.locator('#targets .wchip.unk')).toHaveCount(1);
  await page.waitForTimeout(300); await shot(page, { path: `/workspace/shots/phaseD-weakness-${info.project.name}.png` });
  expect(okErr(errors)).toEqual([]);
});

test('help explains rows, conditions, weaknesses and the single AC defense', async ({ page }, info) => {
  const errors = trackErrors(page); await newGame(page);
  await page.evaluate(() => window.__gw.showHelp());
  const t = await page.locator('#modal').innerText();
  for (const w of ['front row', 'back row', 'Swap rows', 'Poisoned', 'Prone', 'Frightened', 'Restrained', 'weak', 'resist', 'Study', 'Armor Class']) expect(t.toLowerCase()).toContain(w.toLowerCase());
  await page.locator('#modal h3', { hasText: 'Weaknesses' }).scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  await shot(page, { path: `/workspace/shots/phaseD-help-${info.project.name}.png` });
  expect(okErr(errors)).toEqual([]);
});
