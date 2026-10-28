import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, dismissCards } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));

async function inDungeon(page) {
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let i = 0; i < 12; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await dismissCards(page); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
  await page.evaluate(() => window.__gw.hideCaption());
}
const teleport = (page, x, y, dir) => page.evaluate(async ([x, y, dir]) => { const g = window.__gw, S = g.state; S.x = x; S.y = y; S.dir = dir; await g.loadState(g.G.serialize(S)); }, [x, y, dir]);
const clear = async (page) => { await page.evaluate(() => { const b = document.querySelector('#banter'); if (b) b.innerHTML = ''; }); for (let i = 0; i < 6; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await page.keyboard.press('Enter'); await page.waitForTimeout(250); } await page.evaluate(() => window.__gw.hideCaption()); };
/** Stand one tile before the event, facing it, on open floor. */
const approach = (page, idx) => page.evaluate((idx) => { const { state: S, G } = window.__gw; const e = window.__gw.getLevel(S.level).events[idx];
  for (const [dir, [dx, dy]] of [[0, [0, -1]], [1, [1, 0]], [2, [0, 1]], [3, [-1, 0]]]) if (!['#', 'S'].includes(G.tile(S, e.x - dx, e.y - dy))) return { x: e.x - dx, y: e.y - dy, dir, id: e.id }; return null; }, idx);

test('Liora: painted portrait on her hire card, intro dialogue, recruit from the tavern', async ({ page }, info) => {
  test.setTimeout(180000); const errors = trackErrors(page);
  await newGame(page); await openLocation(page, 'Tavern');
  const card = page.locator('#hire .hirecard', { hasText: 'Liora' }); await expect(card).toBeVisible();
  await expect(card.locator('img.hirepic')).toBeVisible();
  const loaded = await card.locator('img.hirepic').evaluate((i) => i.complete && i.naturalWidth > 100); expect(loaded).toBe(true);
  await card.scrollIntoViewIfNeeded(); await shot(page, { path: `/workspace/shots/phaseC-liora-hire-${info.project.name}.png` });
  await page.locator('[data-recruit="liora"]').click();
  await expect(page.locator('.dialogue .dlgportrait img')).toBeVisible(); await page.waitForTimeout(500);
  await shot(page, { path: `/workspace/shots/phaseC-liora-portrait-${info.project.name}.png` });
  for (let i = 0; i < 6 && await page.locator('#dlg-next').count(); i++) { await page.locator('#dlg-next').click(); await page.waitForTimeout(150); if (await page.locator('.dialogue').count() === 0) break; }
  const inParty = await page.evaluate(() => window.__gw.state.party.some((c) => c.companion === 'liora') || window.__gw.state.roster.some((c) => c.companion === 'liora'));
  expect(inParty).toBe(true); expect(okErr(errors)).toEqual([]);
});

test('level 1 showcase: banter, an event card with choices, consequences and the map marker', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await inDungeon(page);
  const L = await page.evaluate(() => window.__gw.getLevel(0).events); expect(L.length).toBeGreaterThanOrEqual(2);
  // map shows the open events once seen
  const sp = await approach(page, 0); expect(sp).toBeTruthy(); expect(sp.id).toBe('b1-liora');
  await teleport(page, sp.x, sp.y, sp.dir); await clear(page);
  await page.evaluate(() => { const S = window.__gw.state; const e = window.__gw.getLevel(0).events; for (const v of e) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) S.explored[0].push(`${v.x + dx},${v.y + dy}`); window.__gw.refresh(); });
  await expect.poll(() => page.evaluate(() => window.__gw.R.evObjs?.size || 0), { timeout: 20000 }).toBeGreaterThan(0); await page.waitForTimeout(500);
  await shot(page, { path: `/workspace/shots/phaseC-event-marker-${info.project.name}.png` });
  // a banter moment from a companion (the same path as walking into a new area)
  await page.evaluate(() => { const g = window.__gw; g.say(g.G.PC.reactive(g.state, 'room', {}, 1)); });
  await expect(page.locator('#banter .bubble')).toBeVisible(); await page.waitForTimeout(400);
  await shot(page, { path: `/workspace/shots/phaseC-banter-${info.project.name}.png` });
  // step onto the event: the card appears with a portrait and 2-3 choices plus Not now
  await page.locator('#controls button', { hasText: '▲' }).click();
  const ev = page.locator('.evcard[data-event="b1-liora"]'); await expect(ev).toBeVisible({ timeout: 10000 });
  await expect(ev.locator('.dlgportrait img')).toBeVisible();
  const n = await ev.locator('[data-choice]').count(); expect(n).toBeGreaterThanOrEqual(2); expect(n).toBeLessThanOrEqual(3);
  await shot(page, { path: `/workspace/shots/phaseC-event-card-${info.project.name}.png` });
  // Not now never locks it out
  await page.locator('#ev-later').click(); await expect(ev).toHaveCount(0);
  expect(await page.evaluate(() => window.__gw.G.PC.eventDone(window.__gw.state, 'b1-liora'))).toBe(false);
  await teleport(page, sp.x, sp.y, sp.dir); await page.locator('#controls button', { hasText: '▲' }).click();
  await expect(ev).toBeVisible({ timeout: 10000 });
  await ev.locator('[data-choice="join"]').click();
  const res = page.locator('[data-event-result="b1-liora"]'); await expect(res).toBeVisible(); await expect(res.locator('.fx').first()).toBeVisible();
  await shot(page, { path: `/workspace/shots/phaseC-event-result-${info.project.name}.png` });
  await page.locator('#ev-continue').click(); await clear(page);
  expect(await page.evaluate(() => window.__gw.state.party.some((c) => c.companion === 'liora'))).toBe(true);
  expect(await page.evaluate(() => window.__gw.G.PC.eventDone(window.__gw.state, 'b1-liora'))).toBe(true);
  await expect(page.locator('#modal.hidden, #modal:not(:has(.evcard))').first()).toBeAttached();
  // journal: bonds and omens
  await page.evaluate(() => window.__gw.state.pc.buffs.push({ id: 'hush', steps: 50, fights: 0, chests: 0 }));
  await page.locator('#controls button', { hasText: 'Camp' }).click(); await page.locator('#btn-talk').click();
  await expect(page.locator('.dialogue')).toBeVisible(); await shot(page, { path: `/workspace/shots/phaseC-liora-talk-${info.project.name}.png` });
  expect(okErr(errors)).toEqual([]);
});

test('Liora conversation: choices raise hearts, journal shows bonds, save round-trips', async ({ page }, info) => {
  test.setTimeout(180000); const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { const g = window.__gw; g.G.joinLiora(g.state); g.refresh(); });
  await page.evaluate(() => window.__gw.showTown('tavern'));
  await page.locator('#btn-listen').click(); await expect(page.locator('.dialogue')).toBeVisible();
  for (let i = 0; i < 8; i++) { if (await page.locator('.dialogue [data-choice]').count() > 1) break; await page.locator('#dlg-next').click(); await page.waitForTimeout(120); }
  await page.locator('.dialogue [data-choice]').first().click(); await page.waitForTimeout(300);
  for (let i = 0; i < 6 && await page.locator('.dialogue').count(); i++) { await page.locator('#dlg-next').click(); await page.waitForTimeout(150); }
  expect(await page.evaluate(() => window.__gw.G.PC.aff(window.__gw.state, 'liora'))).toBeGreaterThan(0);
  await page.evaluate(() => window.__gw.showTown());
  await page.locator('#btn-journal').click(); await expect(page.locator('.bonds .heart').first()).toBeVisible();
  await shot(page, { path: `/workspace/shots/phaseC-journal-${info.project.name}.png` });
  const ok = await page.evaluate(() => { const { G, state } = window.__gw; const d = G.deserialize(G.serialize(state)); return d.version === 5 && d.pc.moments[0] !== undefined; }); expect(ok).toBe(true);
  expect(okErr(errors)).toEqual([]);
});
