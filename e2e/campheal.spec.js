import { test, expect } from '@playwright/test';
// screenshots are evidence, not assertions: retry a stalled frame, never fail the test on it
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
import { newGame, openLocation, trackErrors } from './helpers.js';

const dismissCards = async (page) => { for (let k = 0; k < 8 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); } };
const openCamp = async (page) => { await page.locator('#controls button', { hasText: 'Camp' }).first().click(); await page.locator('#modal [data-tab="heal"]').click(); await expect(page.locator('#camp-heal')).toBeVisible(); };

test('camp healing: caster → spell/slot (upcast) → target; revives a downed ally; potion; disabled reasons', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  await dismissCards(page);
  const ids = await page.evaluate(() => { const p = window.__gw.state.party; const cl = p.find((c) => c.cls === 'cleric');
    cl.slots = [2, 1]; p[0].hp = 0; p[0].deathSaves = { s: 0, f: 0 }; p[3].dead = true; p[3].hp = 0; const other = p.find((c) => c !== cl && c !== p[0] && !c.dead); other.hp = 2;
    return { cl: cl.id, down: p[0].id, other: other.id, dead: p[3].id }; });
  await openCamp(page);
  await page.locator(`[data-heal-caster="${ids.cl}"]`).click();
  await expect(page.locator('[data-heal-spell="cureWounds:1"]')).toBeVisible();
  await page.locator('[data-heal-spell="cureWounds:2"]').click(); // upcast
  await expect(page.locator(`[data-heal-target="${ids.dead}"]`), 'the dead are not healable').toHaveCount(0);
  await page.locator(`[data-heal-target="${ids.down}"]`).click();
  const card = page.locator('#caption.show.loot'); await expect(card).toBeVisible();
  await expect(card).toContainText(/HP 0 → \d+\//); await expect(card).toContainText('back on their feet'); await expect(card).toContainText('level 2 slot');
  const after = await page.evaluate((i) => { const p = window.__gw.state.party; const c = p.find((x) => x.id === i.cl); return { hp: p.find((x) => x.id === i.down).hp, slots: c.slots }; }, ids);
  expect(after.hp).toBeGreaterThan(0); expect(after.slots).toEqual([2, 0]);
  expect(await page.locator('#log').textContent()).toMatch(/casts Cure Wounds at level 2/);
  await page.waitForTimeout(600); await shot(page, { path: `/workspace/shots/campheal-spell-${P}.png` });
  const m = await page.evaluate(() => { const c = document.querySelector('#caption'); return c.scrollHeight <= c.clientHeight + 1; }); expect(m, 'card fits').toBe(true);
  await dismissCards(page);
  // potion on the other hurt ally
  await page.locator('[data-heal-potion]').click(); await page.locator(`[data-heal-target="${ids.other}"]`).click();
  await expect(card).toContainText(/HP 2 → \d+\//); await page.waitForTimeout(600); await shot(page, { path: `/workspace/shots/campheal-potion-${P}.png` });
  await dismissCards(page);
  // nobody hurt → disabled with a reason
  await page.evaluate(() => { for (const c of window.__gw.state.party) if (!c.dead) c.hp = c.maxHp; window.__gw.showCamp(); });
  await expect(page.locator('#heal-none')).toBeVisible();
  await expect(page.locator(`[data-heal-caster="${ids.cl}"]`)).toBeDisabled(); await expect(page.locator(`[data-heal-caster="${ids.cl}"]`)).toContainText('nobody is hurt');
  await expect(page.locator('[data-heal-potion]')).toBeDisabled();
  // no slots → disabled with a reason
  await page.evaluate((i) => { const p = window.__gw.state.party; p[0].hp = 1; p.find((x) => x.id === i.cl).slots = [0, 0]; window.__gw.showCamp(); }, ids);
  await expect(page.locator(`[data-heal-caster="${ids.cl}"]`)).toBeDisabled(); await expect(page.locator(`[data-heal-caster="${ids.cl}"]`)).toContainText('no spell slots left');
  await page.locator('#camp-heal').scrollIntoViewIfNeeded(); await shot(page, { path: `/workspace/shots/campheal-disabled-${P}.png` });
  expect(errors).toEqual([]);
});
