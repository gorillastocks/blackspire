import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, dismissCards } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };

async function inDungeon(page) {
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  // read through the floor intro card like a player, then make sure nothing is queued
  for (let i = 0; i < 12; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await dismissCards(page); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
  await page.evaluate(() => window.__gw.hideCaption());
}
/** Mark a short straight-ish run of plain floor next to the party explored and return its far end. */
const exploreRun = (page) => page.evaluate(() => {
  const { state: S, G } = window.__gw; const seen = new Set([`${S.x},${S.y}`]), q = [[S.x, S.y]], cells = [];
  while (q.length && cells.length < 14) { const [x, y] = q.shift(); cells.push([x, y]); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const k = `${x + dx},${y + dy}`; if (!seen.has(k) && G.tile(S, x + dx, y + dy) === '.') { seen.add(k); q.push([x + dx, y + dy]); } } }
  for (const [x, y] of cells) { const k = `${x},${y}`; if (!S.explored[S.level].includes(k)) S.explored[S.level].push(k); }
  return { far: cells[cells.length - 1], cells };
});
const pos = (page) => page.evaluate(() => [window.__gw.state.x, window.__gw.state.y]);

test('automap: tap a tile to walk there, pins and notes survive a save/load', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await inDungeon(page); const { far: [tx, ty], cells } = await exploreRun(page);
  await page.locator('#controls button', { hasText: 'Map' }).click();
  await expect(page.locator('#bigmap')).toBeVisible(); await expect(page.locator('#map-goal')).toContainText('Find');
  await shot(page, { path: `/workspace/shots/phaseA-map-${info.project.name}.png` });
  // pin mode: drop a pin with a note
  await page.click('#map-pin'); await page.locator('[data-pin="❗"]').click(); await page.fill('#pin-note', 'check this wall');
  const box = await page.locator('#bigmap').boundingBox(); const at = (x, y) => [box.x + ((x + 0.5) / 21) * box.width, box.y + ((y + 0.5) / 21) * box.height];
  await page.mouse.click(...at(tx, ty));
  await expect.poll(() => page.evaluate(() => window.__gw.state.pins[window.__gw.state.level].length)).toBe(1);
  await expect(page.locator('.pinlist')).toContainText('check this wall');
  await shot(page, { path: `/workspace/shots/phaseA-pins-${info.project.name}.png` });
  expect(await page.evaluate(() => { const g = window.__gw; return JSON.parse(g.G.serialize(g.state)).pins[0][0].note; })).toBe('check this wall');
  // walk mode: one tap walks the party to the pin tile
  await page.click('#map-walk'); const b2 = await page.locator('#bigmap').boundingBox(); await page.mouse.click(b2.x + ((tx + 0.5) / 21) * b2.width, b2.y + ((ty + 0.5) / 21) * b2.height);
  await page.waitForTimeout(3500); await dismissCards(page); // the walk stops for anything interesting (a new-area card): read it, then tap again
  if ((await pos(page)).join() !== `${tx},${ty}`) { await page.locator('#controls button', { hasText: 'Map' }).click(); const b3 = await page.locator('#bigmap').boundingBox(); await page.mouse.click(b3.x + ((tx + 0.5) / 21) * b3.width, b3.y + ((ty + 0.5) / 21) * b3.height); }
  await expect.poll(() => pos(page), { timeout: 20000 }).toEqual([tx, ty]);
  await dismissCards(page); await expect(page.locator('#modal.hidden')).toHaveCount(1);
  // tapping the little minimap walks too (back to where we started)
  const s = await pos(page); const start = cells.find(([x, y]) => Math.max(Math.abs(x - s[0]), Math.abs(y - s[1])) >= 3 && Math.max(Math.abs(x - s[0]), Math.abs(y - s[1])) <= 6); expect(start, 'a tile inside the minimap window').toBeTruthy();
  const mm = await page.locator('#minimap').boundingBox();
  await page.mouse.click(mm.x + ((start[0] - s[0] + 6 + 0.5) / 13) * mm.width, mm.y + ((start[1] - s[1] + 6 + 0.5) / 13) * mm.height);
  await page.waitForTimeout(3500); await dismissCards(page);
  if ((await pos(page)).join() !== start.join()) { const s2 = await pos(page); await page.mouse.click(mm.x + ((start[0] - s2[0] + 6 + 0.5) / 13) * mm.width, mm.y + ((start[1] - s2[1] + 6 + 0.5) / 13) * mm.height); }
  await expect.poll(() => pos(page), { timeout: 20000 }).toEqual(start);
  await shot(page, { path: `/workspace/shots/phaseA-walk-${info.project.name}.png` });
  expect(errors.filter((e) => !/favicon|WebGL|GPU/.test(e))).toEqual([]);
});

test('easy fight: offer to auto-resolve; 2x speed chip and Skip are in the fight', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await inDungeon(page);
  await page.evaluate(() => { const S = window.__gw.state; for (const c of S.party) { c.level = 5; c.maxHp = 60; c.hp = 60; c.xp = 0; } window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 2 }], random: true }); });
  await expect(page.locator('#btn-autores')).toBeVisible();
  await shot(page, { path: `/workspace/shots/phaseA-easyfight-${info.project.name}.png` });
  await page.click('#btn-autores');
  const card = page.locator('#caption.show.loot'); await expect(card).toBeVisible(); await expect(card).toContainText('Easy fight');
  expect(await page.evaluate(() => window.__gw.state.party[0].xp)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__gw.combat)).toBeNull();
  await page.waitForTimeout(1300); for (let i = 0; i < 6 && await card.isVisible(); i++) { await page.locator('#tapcatch').click({ force: true }).catch(() => {}); await page.waitForTimeout(500); }
  await page.evaluate(() => { for (const c of window.__gw.state.party) c.hp = c.maxHp; });
  // decline: the real fight begins with the speed chip and Skip button on screen
  await page.evaluate(() => { window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 2 }], random: true }); });
  await page.click('#btn-fightit');
  await expect(page.locator('#skipbtn')).toBeVisible({ timeout: 60000 }); await expect(page.locator('#speedbtn')).toBeVisible();
  const before = await page.locator('#speedbtn').textContent(); await page.click('#speedbtn'); expect(await page.locator('#speedbtn').textContent()).not.toBe(before);
  await shot(page, { path: `/workspace/shots/phaseA-fight-chips-${info.project.name}.png` });
  for (let i = 0; i < 6 && !(await page.locator('#speedbtn').textContent()).includes('2×'); i++) await page.click('#speedbtn'); await expect(page.locator('#speedbtn')).toContainText('2×');
  await page.evaluate(() => document.querySelector('#skipbtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); // Skip (the fight may already be over: level-5 AI is quick)
  await expect.poll(() => page.evaluate(() => !window.__gw.combat || !!document.querySelector('#cmenu .combatmenu')), { timeout: 60000 }).toBe(true);
  expect(errors.filter((e) => !/favicon|WebGL|GPU/.test(e))).toEqual([]);
});

test('suspend mid-fight: the pre-fight snapshot resumes the fight', async ({ page }) => {
  test.setTimeout(240000);
  await inDungeon(page);
  await page.evaluate(() => { window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 2 }], random: true }); });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 60000 }).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('blackspire.save.v1')));
  expect(saved.resumeCombat?.groups?.[0]?.key, 'save holds the fight to resume').toBe('giantRat');
  await page.evaluate(async () => { await window.__gw.loadGame(); });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 90000 }).toBe(true);
});

test('fair paywall (dev flag): level 1 free, the cliffhanger offers unlock / restore / not now', async ({ page }, info) => {
  test.setTimeout(240000); await page.addInitScript(() => { localStorage.setItem('blackspire.paywall', '1'); });
  await inDungeon(page);
  await page.evaluate(() => { const { state: S, G } = window.__gw; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (G.tile(S, x, y) === '>') { S.x = x; S.y = y; } window.__gw.prompt('down'); });
  await page.getByRole('button', { name: /Descend/ }).click();
  await expect(page.locator('#btn-unlock')).toBeVisible(); await expect(page.locator('#btn-restore')).toBeVisible(); await expect(page.locator('#modal')).toContainText('Levels 2');
  await shot(page, { path: `/workspace/shots/phaseA-paywall-${info.project.name}.png` });
  await page.click('#btn-restore'); await expect(page.locator('#toast')).toContainText('No purchase');
  await page.click('#btn-notnow'); expect(await page.evaluate(() => window.__gw.state.level)).toBe(0);
  await page.evaluate(() => window.__gw.prompt('down')); await page.getByRole('button', { name: /Descend/ }).click(); await page.click('#btn-unlock');
  await expect.poll(() => page.evaluate(() => window.__gw.state.level), { timeout: 30000 }).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('blackspire.entitlement.full'))).toBe('1');
});

test('web build is unlocked by default: stairs just work', async ({ page }) => {
  test.setTimeout(240000); await inDungeon(page);
  await page.evaluate(() => { const { state: S, G } = window.__gw; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (G.tile(S, x, y) === '>') { S.x = x; S.y = y; } window.__gw.prompt('down'); });
  await page.getByRole('button', { name: /Descend/ }).click();
  await expect.poll(() => page.evaluate(() => window.__gw.state.level), { timeout: 30000 }).toBe(1);
});
