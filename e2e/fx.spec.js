import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

// Combat animation overhaul: every effect runs without errors, frames stay smooth, mid-animation frames look right.
const fps = (page, ms) => page.evaluate((ms) => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(n * 1000 / (performance.now() - t0)); }; requestAnimationFrame(f); }), ms);

test('combat animations: projectiles, impacts, death, floaters — no errors, acceptable FPS', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { for (const c of window.__gw.state.party) { c.maxHp = 999; c.hp = 999; } window.__gw.startCombat({ groups: [{ key: 'animatedArmor', count: 3 }] }); });
  for (let i = 0; i < 300 && !(await page.locator('.combatmenu').isVisible()); i++) { if (await page.locator('#caption.show').isVisible()) await page.locator('#caption').click({ force: true }).catch(() => {}); await page.waitForTimeout(250); }
  await page.waitForSelector('.combatmenu', { timeout: 30000 });
  const base = await fps(page, 1500);
  const shot = (n) => page.screenshot({ path: `/workspace/shots/fx-${n}-${info.project.name}.png` });
  const ids = await page.evaluate(() => [...window.__gw.R.monsterObjs.keys()]);
  // fire bolt mid-flight
  await page.evaluate((id) => { window.__gw.R.spellCast('fireBolt', id, 0, 900); }, ids[0]);
  await page.waitForTimeout(450); await shot('firebolt');
  await page.waitForTimeout(700);
  await page.evaluate((id) => { window.__gw.R.spellCast('magicMissile', id, 1, 900); window.__gw.R.spellCast('rayOfFrost', id, 2, 900); }, ids[1]);
  await page.waitForTimeout(400); await shot('missiles');
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.__gw.R.spellCast('fireball', null, 0, 900); });
  await page.waitForFunction(() => window.__gw.R.cfx.activeCount > 8, null, { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(180); await shot('fireball'); // mid-burst
  await page.waitForTimeout(900);
  await page.evaluate(() => { window.__gw.R.spellCast('sleep', null, 0, 900); });
  await page.waitForTimeout(200); await shot('sleep-burst');
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__gw.R.spellCast('thunderwave', null, 0, 900); });
  await page.waitForTimeout(200); await shot('thunder-burst');
  await page.waitForTimeout(700);
  // monster leap toward camera (mid-lunge): bigger + closer, then recoil
  await page.evaluate((id) => window.__gw.R.monsterAttack(id), ids[0]);
  // poll until the leap is past its peak (scale/z up), then screenshot — the box can skip frames
  const leap = await page.waitForFunction((id) => {
    const v = window.__gw.R.monsterObjs.get(id); if (!v || !v.baseSc) return null;
    const sc = v.holder.scale.x, z = v.o.position.z;
    return (sc > 1.12 && z > 0.5) ? { leapZ: v.leapZ, grow: v.leapGrow, sc, z, lunge: v.lunge } : null;
  }, ids[0], { timeout: 3000 }).then((h) => h.jsonValue());
  await shot('leap');
  expect(leap.leapZ, 'leap reaches toward the camera').toBeGreaterThan(0.8);
  expect(leap.sc, 'attacker scales up mid-lunge').toBeGreaterThan(1.1);
  expect(leap.z, 'attacker moves toward camera (+z)').toBeGreaterThan(0.4);
  await page.waitForTimeout(500);
  // reduce-motion leap is subtle
  await page.evaluate(() => { window.__gw.R.reduceMotion = true; });
  await page.evaluate((id) => window.__gw.R.monsterAttack(id), ids[1]);
  await page.waitForTimeout(200);
  const soft = await page.evaluate((id) => { const v = window.__gw.R.monsterObjs.get(id); return { leapZ: v.leapZ, grow: v.leapGrow }; }, ids[1]);
  expect(soft.leapZ).toBeLessThan(0.5); expect(soft.grow).toBeLessThan(0.1);
  await page.evaluate(() => { window.__gw.R.reduceMotion = false; });
  await page.waitForTimeout(400);
  await page.evaluate((id) => { window.__gw.R.monsterHit(id, true, 'slashing', true); window.__gw.R.partyHit(true); }, ids[2]);
  const busy = fps(page, 1200);
  await page.waitForTimeout(120); await shot('crit-slash');
  const during = await busy;
  await page.evaluate((id) => window.__gw.R.monsterDie(id), ids[0]);
  await page.waitForTimeout(800); await shot('dissolve');
  // weapon strikes, caught mid-swing (slowed down for the camera)
  for (const k of ['sword', 'dagger', 'bow', 'crossbow', 'axe', 'mace', 'spear', 'fist']) {
    await page.evaluate(([k, id]) => { window.__gw.R.weaponStrike(k, id, false, 1400, 0); }, [k, ids[1]]);
    await page.waitForTimeout(['bow', 'crossbow'].includes(k) ? 900 : 700); await shot('weapon-' + k);
    await page.waitForTimeout(1300);
  }
  const active = await page.evaluate(() => window.__gw.R.cfx.activeCount);
  expect(active).toBeLessThanOrEqual(96);
  // real fights on Fast with auto-battle: floaters + spell flow, captions still advance
  await page.locator('#autobtn').click();
  await page.waitForSelector('.floater', { timeout: 60000 }); await shot('floater');
  console.log(`${info.project.name}: fps idle ${base.toFixed(1)} during fx ${during.toFixed(1)} pool ${active}`);
  expect(during).toBeGreaterThan(Math.min(24, base * 0.6));
  // boss leap stays capped so Gorvax/Malthrax don't clip out of view
  await page.evaluate(async () => { window.__gw.R.clearMonsters(); await window.__gw.R.showMonsters([{ id: 'boss1', key: 'tyrannosaurus', name: 'Gorvax', hp: 100, maxHp: 100 }], 0xaa44ff); });
  await page.waitForTimeout(1200);
  const bid = await page.evaluate(() => [...window.__gw.R.monsterObjs.keys()][0]);
  await page.evaluate((id) => window.__gw.R.monsterAttack(id), bid);
  await page.waitForFunction((id) => { const v = window.__gw.R.monsterObjs.get(id); return v && v.o.position.z > 0.2; }, bid, { timeout: 3000 });
  await shot('leap-gorvax');
  const boss = await page.evaluate((id) => { const v = window.__gw.R.monsterObjs.get(id); return { leapZ: v.leapZ, grow: v.leapGrow, height: v.height }; }, bid);
  expect(boss.height).toBeGreaterThan(3); expect(boss.leapZ).toBeLessThan(1.2); expect(boss.grow).toBeLessThan(0.4);
  expect(errors).toEqual([]);
});
