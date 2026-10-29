import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors } from './helpers.js';
// screenshots are evidence, not assertions: retry a stalled frame, never fail the test on it
const shot = async (page, path) => { for (let i = 0; i < 4; i++) { try { await page.screenshot({ path, timeout: 25000 }); return; } catch { await page.mouse.move(1, 1); } } };

/** Stand next to the first chest on the floor, facing it. */
async function faceChest(page) {
  return page.evaluate(() => { const { state: S, G, R } = window.__gw; let c = null;
    for (let y = 0; y < 30 && !c; y++) for (let x = 0; x < 30 && !c; x++) if (['C', 'o'].includes(G.tile(S, x, y))) c = [x, y];
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const i = dirs.findIndex(([dx, dy]) => { const t = G.tile(S, c[0] + dx, c[1] + dy); return t && t !== '#'; });
    const [dx, dy] = dirs[i]; S.x = c[0] + dx; S.y = c[1] + dy; S.dir = (i + 2) % 4; R.setView(S.x, S.y, S.dir, true); return c; });
}
const chestView = (page, c) => page.evaluate(([x, y]) => { const { R, G, state: S } = window.__gw; return { tile: G.tile(S, x, y), ...R.chestState(x, y) }; }, c);

test('looted chest: renders opened and empty, cannot be looted again, survives save/load and leaving the floor', async ({ page }, info) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let k = 0; k < 6 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  const c = await faceChest(page);
  await page.waitForTimeout(1200);
  await shot(page, `/workspace/shots/chest-closed-${info.project.name}.png`);
  const closed = await chestView(page, c); expect(closed.tile).toBe('C'); expect(closed.open).toBe(false); expect(closed.goldMeshes).toBeGreaterThan(0);
  // loot it through the real card
  await page.evaluate(([x, y]) => { const { state: S } = window.__gw; S.x = x; S.y = y; for (const q of S.party) { q.maxHp = 60; q.hp = 60; } window.__gw.prompt('chest'); }, c);
  await page.locator('#modal button', { hasText: 'Open it' }).click();
  await page.waitForTimeout(2500);
  for (let k = 0; k < 5 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  await page.evaluate(() => { const g = window.__gw; if (g.hideCaption) g.hideCaption(); });
  await expect.poll(async () => (await chestView(page, c)).open, 'the lid opens and the heap is gone').toBe(true);
  const done = await chestView(page, c); expect(done.tile).toBe('o'); expect(done.goldMeshes, 'no treasure left inside').toBe(0); expect(done.glow, 'treasure glow out').toBe(0);
  await page.evaluate(([x, y]) => { const { state: S, R } = window.__gw; const d = [[0, -1], [1, 0], [0, 1], [-1, 0]]; for (let i = 0; i < 4; i++) { const t = window.__gw.G.tile(S, x + d[i][0], y + d[i][1]); if (t && t !== '#') { S.x = x + d[i][0]; S.y = y + d[i][1]; S.dir = (i + 2) % 4; break; } } R.setView(S.x, S.y, S.dir, true); }, c);
  await page.waitForTimeout(1500);
  await shot(page, '/workspace/shots/chest-looted.png');
  // the chest is no longer a prompt: stepping onto the opened tile does nothing
  const again = await page.evaluate(([x, y]) => { const { state: S, G } = window.__gw; S.x = x; S.y = y; const ev = G.enterTile(S); return ev ? JSON.stringify(ev) : null; }, c);
  if (again) expect(again).not.toContain('"prompt":"chest"');
  // save/load
  await page.evaluate(async () => { const g = window.__gw; await g.loadState(g.G.serialize(g.state)); });
  await page.waitForTimeout(1500);
  const c2 = await faceChest(page); await page.waitForTimeout(1200);
  expect((await chestView(page, c2)).tile).toBe('o');
  const re = await chestView(page, c2); expect(re.open, 'still open after load').toBe(true); expect(re.goldMeshes).toBe(0); expect(re.glow).toBe(0);
  await shot(page, '/workspace/shots/chest-looted-reload.png');
  // leave the floor and come back: the rebuilt level still has it open and empty
  await page.evaluate(async () => { const { R, G, state: S, getLevel } = window.__gw; const L = S.level; S.level = L + 1; await R.buildLevel(S, (x, y) => G.tile(S, x, y), getLevel(S.level).def); S.level = L; await R.buildLevel(S, (x, y) => G.tile(S, x, y), getLevel(S.level).def); });
  const back = await chestView(page, c2); expect(back.tile).toBe('o'); expect(back.open).toBe(true); expect(back.goldMeshes).toBe(0); expect(back.glow).toBe(0);
  expect(errors).toEqual([]);
});
