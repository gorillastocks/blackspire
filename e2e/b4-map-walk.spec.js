import { test, expect } from '@playwright/test';
import { newGame, dismissCards, trackErrors } from './helpers.js';

const shot = async (page, path) => { for (let i = 0; i < 4; i++) { try { await page.screenshot({ path, timeout: 25000 }); return; } catch { await page.mouse.move(1, 1); } } };
const pos = (page) => page.evaluate(() => [window.__gw.state.x, window.__gw.state.y, window.__gw.state.level]);

/** Classic B4 at the up-stairs, floor explored, every secret flagged with a ❓ Go pin (as in Sean's screenshot). */
async function loadAshforge(page) {
  await page.evaluate(async () => {
    const g = window.__gw, s = JSON.parse(g.G.serialize(g.state));
    s.flags.prologue = true; s.maxDepth = 3;
    g.G.enterDungeon(s, 3);
    const L = g.getLevel(3);
    s.explored[3] = [];
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] !== '#') s.explored[3].push(`${x},${y}`);
    s.suspect[3] = [...(L.secretCells || [])];
    s.pins[3] = [];
    for (const c of s.suspect[3]) {
      const [x, y] = c.split(',').map(Number);
      g.G.Prog.addPin(s, x, y, '❓', 'Suspicious wall: search here');
    }
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] === 'M') s.disc[`lore:3:${x},${y}`] = 1;
    for (const e of L.elites || []) s.disc[`elite:3:${e.id}`] = 1;
    s.sinceEncounter = -10000;
    await g.loadState(g.G.serialize(s));
  });
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  await expect.poll(() => page.evaluate(() => window.__gw.state.level)).toBe(3);
  await dismissCards(page);
}

async function tapMapTile(page, x, y) {
  const box = await page.locator('#bigmap').boundingBox();
  expect(box, 'map canvas on screen').toBeTruthy();
  const cx = box.x + ((x + 0.5) / 21) * box.width, cy = box.y + ((y + 0.5) / 21) * box.height;
  const touch = page.viewportSize().width <= 760;
  if (touch) await page.touchscreen.tap(cx, cy);
  else await page.mouse.click(cx, cy);
}

test('B4 tap-to-walk and suspicious-wall Go reach explored tiles on iPhone', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  await loadAshforge(page);
  expect(await pos(page)).toEqual([1, 1, 3]);

  await page.evaluate(() => window.__gw.showMap());
  await expect(page.locator('#bigmap')).toBeVisible();
  await expect(page.locator('#map-walk')).toHaveClass(/on/);
  await expect(page.locator('.pinlist button', { hasText: 'Go' }).first()).toBeVisible();
  await shot(page, `/workspace/shots/b4-map-walk-${info.project.name}.png`);

  // Two steps east of the up-stairs, still in the start alcove (classic B4: 3,1).
  await tapMapTile(page, 3, 1);
  await expect.poll(async () => (await pos(page)).slice(0, 2).join(','), { timeout: 15000 }).toBe('3,1');
  await page.waitForTimeout(400);

  // Stand one step from the approach tile of secret 6,1 so Go is a single step and will not mid-route an event card.
  await page.evaluate(() => {
    const g = window.__gw, S = g.state;
    S.x = 7; S.y = 2; S.dir = 0; S.sinceEncounter = -10000;
    g.refresh();
  });
  await dismissCards(page);
  const path = await page.evaluate(() => window.__gw.G.Prog.findPath(window.__gw.state, 6, 1, (a, b) => window.__gw.G.tile(window.__gw.state, a, b)));
  expect(path, 'findPath should approach the secret wall').toBeTruthy();
  expect(Math.abs(path.at(-1)[0] - 6) + Math.abs(path.at(-1)[1] - 1)).toBe(1);

  await page.evaluate(() => window.__gw.showMap());
  await expect(page.locator('#bigmap')).toBeVisible();
  const goBtn = page.locator('.pinrow').filter({ hasText: '(6,1) Suspicious wall' }).locator('button', { hasText: 'Go' });
  await expect(goBtn).toBeVisible();
  await goBtn.click();
  await expect.poll(async () => {
    const [x, y] = await pos(page);
    return Math.abs(x - 6) + Math.abs(y - 1);
  }, { timeout: 15000 }).toBe(1);

  const stray = errors.filter((e) => !/Failed to load|favicon|net::ERR/i.test(e));
  expect(stray, stray.join('\n')).toEqual([]);
});
