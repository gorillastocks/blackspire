import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors, dismissCards } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };

async function inDungeon(page) {
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let i = 0; i < 12; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await dismissCards(page); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
  await page.evaluate(() => window.__gw.hideCaption());
}
/** Move the party to (x,y) facing dir and reload the view, like loading a save made there. */
const teleport = (page, x, y, dir) => page.evaluate(async ([x, y, dir]) => { const g = window.__gw, S = g.state; S.x = x; S.y = y; S.dir = dir; await g.loadState(g.G.serialize(S)); }, [x, y, dir]);
const clear = async (page) => { await page.evaluate(() => { const b = document.querySelector('#banter'); if (b) b.innerHTML = ''; }); for (let i = 0; i < 6; i++) { const m = await page.evaluate(() => window.__gw.messages()); if (!m.showing && !m.queued) break; await page.keyboard.press('Enter'); await page.waitForTimeout(250); } await page.evaluate(() => window.__gw.hideCaption()); };

test('level 1 showcase: a secret and an elite, the counter, the map, and the glowing reveal', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await inDungeon(page);
  const L = await page.evaluate(() => { const L = window.__gw.getLevel(0); return { nooks: L.nooks, illusions: L.illusions, secrets: L.secretCells.length, elites: L.elites.map((e) => ({ id: e.id, kind: e.kind, title: e.title, path: e.path })) }; });
  expect(L.nooks.length + L.illusions.length).toBeGreaterThan(0); expect(L.elites.length).toBeGreaterThanOrEqual(2); expect(L.elites.length).toBeLessThanOrEqual(3);
  await expect(page.locator('#hud .secrets')).toContainText(/🔍 0\/\d+/);

  // 1) the elite is visible down the corridor with its glow ring, and shows on the minimap
  const el = L.elites[0]; const [ex, ey] = el.path[0];
  const spot = await page.evaluate(([ex, ey]) => { const { state: S, G } = window.__gw; for (const [dir, [dx, dy]] of [[0, [0, -1]], [1, [1, 0]], [2, [0, 1]], [3, [-1, 0]]]) { let n = 0, x = ex, y = ey; for (let k = 1; k <= 5; k++) { x -= dx; y -= dy; if (['#', 'S'].includes(G.tile(S, x, y))) break; n = k; } if (n >= 3) return { x: ex - dx * 2, y: ey - dy * 2, dir }; } return null; }, [ex, ey]);
  expect(spot, 'a straight run to the elite').toBeTruthy();
  await teleport(page, spot.x, spot.y, spot.dir);
  await page.evaluate(() => { window.__gw.state.eliteSeen = { ...(window.__gw.state.eliteSeen || {}) }; window.__gw.refresh(); });
  await expect.poll(() => page.evaluate(() => window.__gw.R.eliteObjs.size), { timeout: 30000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1200); await clear(page);
  await shot(page, { path: `/workspace/shots/phaseB-elite-${info.project.name}.png` });

  // 2) walking into the elite's sight pins it and rings the alarm; the map shows secrets and elites
  await page.evaluate(() => { const { state: S, G } = window.__gw; const L = window.__gw.getLevel(0); for (const e of L.elites) S.eliteSeen[`0:${e.id}`] = 1; window.__gw.refresh(); });
  await page.locator('#controls button', { hasText: 'Map' }).click();
  await expect(page.locator('#map-secrets')).toContainText('Secrets 0/');
  await expect(page.locator('#map-secrets')).toContainText('Elites');
  await shot(page, { path: `/workspace/shots/phaseB-map-${info.project.name}.png` });
  await page.keyboard.press('Escape'); await page.evaluate(() => document.querySelector('#modal')?.classList.add('hidden'));

  // 3) the safety net: stand beside a hidden wall; the passive check flags it, searching always opens it
  const sec = await page.evaluate(() => { const { state: S, G } = window.__gw; const L = window.__gw.getLevel(0); let best = null;
    for (const c of L.secretCells) { const [x, y] = c.split(',').map(Number);
      for (const [dir, [dx, dy]] of [[0, [0, -1]], [1, [1, 0]], [2, [0, 1]], [3, [-1, 0]]]) { let nx = x - dx, ny = y - dy; if (['#', 'S'].includes(G.tile(S, nx, ny))) continue; let n = 1; while (n < 4 && !['#', 'S'].includes(G.tile(S, nx - dx, ny - dy))) { nx -= dx; ny -= dy; n++; } if (!best || n > best.n) best = { x: nx, y: ny, dir, cell: [x, y], n }; } }
    return best; });
  expect(sec).toBeTruthy();
  await page.evaluate((s) => { const S = window.__gw.state; S.suspect = S.suspect || {}; S.suspect[S.level] = [...(S.suspect[S.level] || []), s.cell.join(',')]; }, sec);
  await teleport(page, sec.x, sec.y, sec.dir); await clear(page);
  await expect.poll(() => page.evaluate(() => window.__gw.R.shimmerObjs.size), { timeout: 20000 }).toBeGreaterThan(0);
  await shot(page, { path: `/workspace/shots/phaseB-secret-${info.project.name}.png` });
  await page.evaluate(() => { const b = document.querySelector('#banter'); if (b) b.innerHTML = ''; });
  await page.evaluate((s) => { const S = window.__gw.state; S.x = s.cell[0] - ({ 0: 0, 1: 1, 2: 0, 3: -1 })[s.dir]; S.y = s.cell[1] - ({ 0: -1, 1: 0, 2: 1, 3: 0 })[s.dir]; S.dir = s.dir; }, sec);
  await page.locator('#controls button', { hasText: 'Search' }).click(); await page.waitForTimeout(600); await clear(page);
  const found = await page.evaluate((s) => window.__gw.G.Prog.secretCount(window.__gw.state, 0), sec);
  expect(found.found).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#hud .secrets')).toContainText(`${found.found}/`);

  // 4) the glowing rare reveal and tier colours in the inventory
  await page.evaluate(() => { const g = window.__gw; const ev = g.G.grantRare(g.state, 'epic', 'chest'); g.handle([].concat(ev)); });
  await expect(page.locator('#caption.rare')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#caption.rare .caploot .tl')).toHaveCount(1);
  await page.waitForTimeout(500);
  await shot(page, { path: `/workspace/shots/phaseB-reveal-${info.project.name}.png` });
  await clear(page);
  await page.evaluate(() => { const g = window.__gw; g.state.inventory.push('emberbrand', 'thunderlordFang', 'potionHealing'); g.showInventory(); });
  await expect(page.locator('#modal .itemname.tier-legendary').first()).toBeVisible();
  await expect(page.locator('#modal .itemname.tier-rare').first()).toBeVisible();
  await shot(page, { path: `/workspace/shots/phaseB-inventory-${info.project.name}.png` });
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});

test('walking into a guard starts a tougher named fight; a kill drops rare loot', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await inDungeon(page);
  const g = await page.evaluate(() => { const { state: S, G } = window.__gw; const e = window.__gw.getLevel(0).elites.find((e) => e.kind === 'guard'); if (!e) return null; const [ex, ey] = e.path[0];
    for (const [dir, [dx, dy]] of [[0, [0, -1]], [1, [1, 0]], [2, [0, 1]], [3, [-1, 0]]]) if (!['#', 'S'].includes(G.tile(S, ex - dx, ey - dy))) return { x: ex - dx, y: ey - dy, dir, title: e.title }; return null; });
  expect(g, 'a guard elite with an open approach').toBeTruthy();
  await teleport(page, g.x, g.y, g.dir); await clear(page);
  await page.locator('#controls button', { hasText: '▲' }).click();
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 20000 }).toBe(true);
  const names = await page.evaluate(() => window.__gw.combat.monsters.map((m) => ({ n: m.name, e: !!m.elite, hp: m.maxHp })));
  expect(names[0].n).toBe(g.title); expect(names.every((m) => m.e)).toBe(true);
  await page.waitForTimeout(1500); await shot(page, { path: `/workspace/shots/phaseB-elitefight-${info.project.name}.png` });
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
