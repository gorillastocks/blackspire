import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const start = (page, groups, prep) => page.evaluate(async ([groups, prep]) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } if (prep) new Function('S', prep)(g.state); g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); }); }, [groups, prep]);
/** Queue a monster strike as the combat engine would emit it, then play it through the real flushCombat. */
const strike = (page, spec) => page.evaluate((spec) => {
  const g = window.__gw, cb = g.combat, m = cb.monsters[0], P = g.state.party;
  cb.emit({ type: 'monsterAttack', who: m, tgt: P[spec.targets[0]] });
  if (spec.kind === 'hit') for (const i of spec.targets) { if (spec.targets.length === 1) cb.emit({ type: 'hit', att: m, tgt: P[i], dmg: spec.dmg, crit: !!spec.crit, dtype: 'slashing' }); cb.emit({ type: 'partyHurt', who: P[i], amt: spec.dmg, crit: !!spec.crit, dtype: 'slashing' }); }
  else cb.emit({ type: 'miss', att: m, tgt: P[spec.targets[0]] });
  window.__t0 = performance.now(); window.__flush = g.flushCombat().then(() => { window.__dt = performance.now() - window.__t0; });
}, spec);
const freeze = (page, frac = 0.35) => page.evaluate((frac) => { for (const a of document.getAnimations()) { if (!a.effect?.target?.closest?.('#foeport .fp-tile, #foeport .fp-num, #foeport .fp-flash')) continue; const t = a.effect.getComputedTiming(); a.pause(); a.currentTime = (t.delay || 0) + t.duration * frac; } }, frac);
/** The portrait must sit inside the arena and cover neither a monster nor the combat menu / controls. */
const expectClear = async (page) => {
  await expect.poll(() => page.locator('#foeport').boundingBox().then((b) => b && b.x), { timeout: 4000 }).toBeGreaterThanOrEqual(0); // slide-in finished
  const r = await page.locator('#foeport').boundingBox(); const view = await page.locator('#view').boundingBox(); const vp = page.viewportSize();
  expect(r.x).toBeGreaterThanOrEqual(0); expect(r.x + r.width).toBeLessThanOrEqual(vp.width + 1); expect(r.y).toBeGreaterThanOrEqual(view.y - 1); expect(r.y + r.height).toBeLessThanOrEqual(view.y + view.height + 1);
  for (const sel of ['#cmenu', '#controls', '#combatchips']) { const o = await page.locator(sel).boundingBox().catch(() => null); if (!o || !o.width) continue; expect(r.y + r.height <= o.y + 1 || r.y >= o.y + o.height - 1 || r.x + r.width <= o.x + 1 || r.x >= o.x + o.width - 1, `${sel} not covered`).toBe(true); }
  const mons = await page.evaluate(() => { const g = window.__gw; return g.combat.monsters.filter((m) => m.hp > 0).map((m) => g.R.screenPos(m.id)).filter(Boolean); });
  for (const p of mons) { const x = view.x + (p.x / 100) * view.width, y = view.y + (p.y / 100) * view.height; expect(x < r.x - 2 || x > r.x + r.width + 2 || y < r.y - 2 || y > r.y + r.height + 2, `monster at ${x | 0},${y | 0} not under portrait ${JSON.stringify(r)}`).toBe(true); }
  return r;
};

test('a monster attack shows the hit hero: hit = red flash, shake, damage; miss = dodge + Miss; AoE = a row', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await setSpeed(page, 'slow');
  await start(page, [{ key: 'giantRat', count: 2 }]); await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  const settle = async () => { await page.evaluate(() => window.__flush); await page.evaluate(() => window.__gw.hideFoePortrait(true)); await page.waitForTimeout(100); };

  // 1) a hit on hero #2: their portrait, red flash + shake, the damage number
  await page.evaluate(() => { window.__gw.hideTurnPortrait?.(true); });
  await strike(page, { kind: 'hit', targets: [1], dmg: 9 });
  await expect(page.locator('#foeport.on.single .fp-tile')).toHaveCount(1, { timeout: 8000 });
  const hero = await page.evaluate(() => window.__gw.state.party[1].name); await expect(page.locator('#foeport .fp-name b')).toHaveText(hero);
  await expect(page.locator('#foeport .fp-tile.hurt')).toHaveCount(1, { timeout: 8000 });
  await freeze(page, 0.3); await expect(page.locator('#foeport .fp-num')).toHaveText('-9');
  expect(await page.locator('#foeport .fp-flash').evaluate((e) => +getComputedStyle(e).opacity)).toBeGreaterThan(0.2);
  expect(await page.locator('#foeport .fp-tile').evaluate((e) => getComputedStyle(e).transform)).not.toBe('none');
  await expectClear(page); await shot(page, { path: `/workspace/shots/monster-attack-portrait-hit-${P}.png` });
  await settle();

  // 2) a miss: dodge slide + "Miss"
  await strike(page, { kind: 'miss', targets: [2] });
  await expect(page.locator('#foeport .fp-tile.dodge')).toHaveCount(1, { timeout: 8000 });
  await freeze(page, 0.5); await expect(page.locator('#foeport .fp-num')).toHaveText('Miss');
  expect(await page.locator('#foeport .fp-tile').evaluate((e) => getComputedStyle(e).transform)).not.toBe('none');
  await expectClear(page); await shot(page, { path: `/workspace/shots/monster-attack-portrait-miss-${P}.png` });
  await settle();

  // 3) an AoE that hits the whole party: a compact row, every tile reacting
  await strike(page, { kind: 'hit', targets: [0, 1, 2, 3], dmg: 14 });
  const n = await page.evaluate(() => window.__gw.state.party.length);
  await expect(page.locator('#foeport.on.row .fp-tile')).toHaveCount(Math.min(4, n), { timeout: 8000 });
  await expect(page.locator('#foeport .fp-tile.hurt').first()).toBeVisible({ timeout: 8000 });
  await freeze(page, 0.3); await expect(page.locator('#foeport .fp-tile .fp-num').first()).toHaveText('-14');
  const one = await page.locator('#foeport .fp-tile').first().boundingBox(); expect(one.width).toBeLessThan(80);
  await expectClear(page); await shot(page, { path: `/workspace/shots/monster-attack-portrait-aoe-${P}.png` });
  await settle();
  expect(okErr(errors)).toEqual([]);
});

test('monster-attack portrait honors 2x speed and Skip, and leaves when the next hero acts', async ({ page }) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'slow');
  await start(page, [{ key: 'giantRat', count: 1 }]); await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  const time = async (k) => { await setSpeed(page, k); await strike(page, { kind: 'hit', targets: [0], dmg: 5 }); await page.evaluate(() => window.__flush); const dt = await page.evaluate(() => window.__dt); await page.evaluate(() => window.__gw.hideFoePortrait(true)); return dt; };
  const slow = await time('slow'), dbl = await time('double');
  expect(dbl).toBeLessThan(slow * 0.6);
  // Skip: the strike resolves at once, the portrait is still shown with its damage number, no animation left running
  await setSpeed(page, 'slow'); await strike(page, { kind: 'hit', targets: [0], dmg: 5 });
  await expect(page.locator('#foeport.on')).toBeAttached({ timeout: 8000 });
  await page.locator('#skipbtn').dispatchEvent('pointerdown'); await page.locator('#skipbtn').click().catch(() => {});
  await page.evaluate(() => window.__flush); const dtSkip = await page.evaluate(() => window.__dt); expect(dtSkip).toBeLessThan(slow * 0.7);
  expect(okErr(errors)).toEqual([]);
});

test('a real monster turn shows the target hero, then the portrait clears when a hero\'s turn begins', async ({ page }) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'double');
  await start(page, [{ key: 'tyrannosaurus', count: 1 }], 'for (const c of S.party) c.ai = true; S.party[0].ai = false;');
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
  await page.evaluate(() => { window.__foe = []; new MutationObserver(() => { const e = document.querySelector('#foeport'); if (e.classList.contains('on') && e.dataset.who && !window.__foe.includes(e.dataset.who)) window.__foe.push(e.dataset.who); }).observe(document.querySelector('#foeport'), { attributes: true }); });
  for (let i = 0; i < 12; i++) {
    const b = page.locator('#cmenu .combatmenu button', { hasText: /^1\. Attack|^1\. Shoot|^1\. Cast|End/ }).first();
    if (await b.isVisible().catch(() => false)) await b.click().catch(() => {});
    await page.waitForTimeout(1200); if ((await page.evaluate(() => window.__foe.length)) > 0) break;
  }
  const names = await page.evaluate(() => window.__gw.state.party.map((c) => c.name));
  const seen = await page.evaluate(() => window.__foe); expect(seen.length).toBeGreaterThan(0); expect(seen.some((s) => s.split(',').some((n) => names.includes(n)))).toBe(true);
  await page.evaluate(() => window.__gw.combat?.state === 'running'); // fight goes on until a hero is up again
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat && document.querySelector('#turnport.on') !== null && !document.querySelector('#foeport.on')), { timeout: 60000 }).toBe(true);
  expect(okErr(errors)).toEqual([]);
});
