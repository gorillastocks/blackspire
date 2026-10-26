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
  await page.waitForTimeout(700); await shot('fireball');
  await page.waitForTimeout(800);
  await page.evaluate((id) => { window.__gw.R.monsterHit(id, true, 'slashing', true); window.__gw.R.partyHit(true); }, ids[2]);
  const busy = fps(page, 1200);
  await page.waitForTimeout(120); await shot('crit-slash');
  const during = await busy;
  await page.evaluate((id) => window.__gw.R.monsterDie(id), ids[0]);
  await page.waitForTimeout(800); await shot('dissolve');
  const active = await page.evaluate(() => window.__gw.R.cfx.activeCount);
  expect(active).toBeLessThanOrEqual(96);
  // real fights on Fast with auto-battle: floaters + spell flow, captions still advance
  await page.locator('.combatmenu button', { hasText: 'Auto-battle' }).click();
  await page.waitForSelector('.floater', { timeout: 60000 }); await shot('floater');
  console.log(`${info.project.name}: fps idle ${base.toFixed(1)} during fx ${during.toFixed(1)} pool ${active}`);
  expect(during).toBeGreaterThan(Math.min(24, base * 0.6));
  expect(errors).toEqual([]);
});
