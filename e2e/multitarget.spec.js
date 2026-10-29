import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test.describe.configure({ timeout: 300000 });
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const shot = async (page, path) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ path, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };

/** A fight where the (human-controlled) wizard knows Magic Missile + Scorching Ray with spare slots; everyone else is AI. Foes are padded with HP so nothing dies by accident. */
async function startFight(page, rats) {
  await page.evaluate(async (rats) => {
    const g = window.__gw, S = g.state;
    for (const c of S.party) { c.maxHp = 999; c.hp = 999; c.ai = true; }
    const w = S.party.find((c) => c.cls === 'wizard'); w.ai = false; w.level = 5;
    w.spells = [...new Set([...(w.spells || []), 'magicMissile', 'scorchingRay'])]; w.prepared = [...new Set([...(w.prepared || []), 'magicMissile', 'scorchingRay'])];
    w.maxSlots = [4, 3, 3, 0, 0, 0, 0, 0, 0].slice(0, Math.max(3, w.maxSlots?.length || 3)); w.slots = [...w.maxSlots];
    S.party = [w, ...S.party.filter((c) => c !== w)];
    g.hideCaption?.(); g.startCombat({ groups: [{ key: 'triceratops', count: rats }] });
    await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); r(); } }, 50); });
    for (const m of g.combat.monsters) { m.hp = m.maxHp = 9999; }
  }, rats);
  // wait for the wizard's own menu
  await expect.poll(() => page.evaluate(() => { const g = window.__gw; return g.combat.current() === g.state.party[0]; }), { timeout: 90000 }).toBe(true);
  await expect(menuBtn(page, /^\d+\. Cast/)).toBeVisible({ timeout: 30000 });
  await page.evaluate(() => { window.__base = window.__gw.combat.monsters.map((m) => m.maxHp - m.hp); });
}
function menuBtn(page, re) { return page.locator('#cmenu .combatmenu button', { hasText: re }).first(); }

/** Damage each foe has taken since the wizard's turn began (AI heroes may have hit them before that). */
const hpOf = (page) => page.evaluate(() => window.__gw.combat.monsters.map((m, i) => m.maxHp - m.hp - (window.__base?.[i] || 0)));
const openSpell = async (page, name, lvl = 1) => { await menuBtn(page, /^\d+\. Cast/).click(); await menuBtn(page, new RegExp(name)).click(); await menuBtn(page, new RegExp(`Level ${lvl} slot`)).click(); };

test('Magic Missile: tap foes to aim each dart, repeats allowed, counts, Undo/Clear/All on one, Cast only when every dart is assigned', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await setSpeed(page, 'fast'); await startFight(page, 3);
  await openSpell(page, 'Magic Missile');
  const aim = page.locator('#cmenu .combatmenu.aim'); await expect(aim).toBeVisible();
  const cast = aim.locator('button', { hasText: /Cast ▶/ }); const mon = (i) => aim.locator('button', { hasText: /Triceratops/i }).nth(i);
  await expect(cast).toContainText('0/3'); await expect(cast).toBeDisabled();
  await expect(page.locator('#cmenu .who')).toContainText('0/3 darts aimed');

  // button taps: rat 1 twice, rat 2 once
  await mon(0).click(); await mon(0).click(); await expect(cast).toBeDisabled(); await mon(1).click();
  await expect(mon(0)).toContainText('×2'); await expect(mon(1)).toContainText('×1'); await expect(mon(2)).not.toContainText('×');
  await expect(cast).toContainText('3/3'); await expect(cast).toBeEnabled();
  await expect(page.locator('#targets .mtag .aimn')).toHaveCount(2); await expect(page.locator('#targets .mtag .aimn').first()).toHaveText(/×2/);
  await expect(page.locator('#cmenu .who')).toContainText('3/3 darts aimed');
  await shot(page, `/workspace/shots/multitarget-${P}.png`);

  // Undo takes back the last dart; Clear takes them all
  await aim.locator('button', { hasText: 'Undo' }).click(); await expect(cast).toContainText('2/3'); await expect(cast).toBeDisabled(); await expect(mon(1)).not.toContainText('×');
  await aim.locator('button', { hasText: 'Clear' }).click(); await expect(cast).toContainText('0/3'); await expect(aim.locator('button', { hasText: 'Undo' })).toBeDisabled();

  // All on one: next tap sends every remaining dart
  await aim.locator('button', { hasText: 'All on one' }).click(); await expect(aim.locator('button', { hasText: 'All on one' })).toHaveClass(/on/);
  await mon(2).click(); await expect(mon(2)).toContainText('×3'); await expect(cast).toContainText('3/3'); await expect(aim.locator('button', { hasText: 'All on one' })).not.toHaveClass(/on/);

  // tapping the monster tags in the arena works too: Clear, then 2 on tag 0 and 1 on tag 1
  await aim.locator('button', { hasText: 'Clear' }).click();
  const tag = (i) => page.locator('#targets .mtag').nth(i);
  await tag(0).dispatchEvent('click'); await tag(0).dispatchEvent('click'); await tag(1).dispatchEvent('click');
  await expect(cast).toContainText('3/3'); await expect(mon(0)).toContainText('×2');

  // Back leaves without casting or spending the slot
  const slots0 = await page.evaluate(() => window.__gw.state.party[0].slots[0]);
  await aim.locator('button', { hasText: 'Back' }).click(); await expect(page.locator('#cmenu .combatmenu.aim')).toHaveCount(0);
  expect(await page.evaluate(() => window.__gw.state.party[0].slots[0])).toBe(slots0); expect(await hpOf(page)).toEqual([0, 0, 0]);

  // cast for real: 2 darts on rat 1, 1 on rat 3; each dart is an auto-hit of 2-5
  await openSpell(page, 'Magic Missile'); await mon(0).click(); await mon(0).click(); await mon(2).click(); await cast.click();
  await expect.poll(() => page.evaluate(() => window.__gw.state.party[0].slots[0]), { timeout: 20000 }).toBe(slots0 - 1);
  await expect.poll(async () => (await hpOf(page)).reduce((a, b) => a + b, 0), { timeout: 60000 }).toBeGreaterThanOrEqual(6);
  const d = await hpOf(page);
  expect(d[0]).toBeGreaterThanOrEqual(4); expect(d[0]).toBeLessThanOrEqual(10); expect(d[1]).toBe(0); expect(d[2]).toBeGreaterThanOrEqual(2); expect(d[2]).toBeLessThanOrEqual(5);
  expect(okErr(errors)).toEqual([]);
});

test('Scorching Ray: an upcast adds a ray; each ray is its own attack at its own target', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'fast'); await startFight(page, 3);
  await openSpell(page, 'Scorching Ray', 3); // 3 rays + 1 for the 3rd-level slot
  const aim = page.locator('#cmenu .combatmenu.aim'); await expect(aim).toBeVisible(); const cast = aim.locator('button', { hasText: /Cast ▶/ });
  await expect(cast).toContainText('0/4'); await expect(page.locator('#cmenu .who')).toContainText('rays');
  const mon = (i) => aim.locator('button', { hasText: /Triceratops/i }).nth(i);
  await mon(0).click(); await mon(1).click(); await mon(0).click(); await expect(cast).toBeDisabled(); await mon(2).click();
  await expect(cast).toBeEnabled(); await expect(mon(0)).toContainText('×2');
  await page.evaluate(() => { window.__atk = []; const cb = window.__gw.combat; const orig = cb.attack.bind(cb); cb.attack = (a, t, o) => { if (o?.label === 'Scorching Ray') window.__atk.push(t.id); return orig(a, t, o); }; });
  const ids = await page.evaluate(() => window.__gw.combat.monsters.map((m) => m.id));
  await cast.click();
  await expect.poll(() => page.evaluate(() => window.__atk.length), { timeout: 30000 }).toBe(4);
  expect(await page.evaluate(() => window.__atk)).toEqual([ids[0], ids[1], ids[0], ids[2]]);
  expect(await page.evaluate(() => window.__gw.state.party[0].slots[2])).toBe(2);
  expect(okErr(errors)).toEqual([]);
});

test('with one foe left there is nothing to aim: the spell just casts', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'fast'); await startFight(page, 1);
  const slots0 = await page.evaluate(() => window.__gw.state.party[0].slots[0]);
  await openSpell(page, 'Magic Missile');
  await expect.poll(() => page.evaluate(() => window.__gw.state.party[0].slots[0]), { timeout: 20000 }).toBe(slots0 - 1);
  await expect(page.locator('#cmenu .combatmenu.aim')).toHaveCount(0);
  await expect.poll(async () => (await hpOf(page))[0], { timeout: 60000 }).toBeGreaterThanOrEqual(6);
  expect(okErr(errors)).toEqual([]);
});
