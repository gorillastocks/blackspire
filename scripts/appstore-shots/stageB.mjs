// Stage B: dungeon corridor (frame 1), party battle (frame 3), automap (frame 4). Loads the town state saved by stage A.
import { open, sleep } from './lib.mjs';
import fs from 'node:fs';
const dev = process.argv[2] || 'iphone'; const only = process.argv[3] || 'all';
const { browser, page } = await open(dev);
const raw = `/workspace/appstore-raw/${dev}`;
await page.evaluate((s) => window.__gw.loadState(s), fs.readFileSync(`${raw}/town-state.json`, 'utf8')); await sleep(1200);
await page.click('#btn-edge'); await page.click('#btn-enter');
await page.waitForSelector('#btn-enter', { state: 'detached', timeout: 60000 }).catch(() => {}); await sleep(3000);
for (let i = 0; i < 5; i++) { for (const sel of ['#tip-skip', '#ev-later', '#tapcatch']) { const l = page.locator(sel); if (await l.isVisible().catch(() => false)) await l.click({ force: true }); } await sleep(300); }
console.log(await page.evaluate(() => JSON.stringify({ mode: window.__gw.state.mode, lvl: window.__gw.state.level, x: window.__gw.state.x, y: window.__gw.state.y })));
// best viewpoint: a straight run of open floor with lit wall torches (first 8 torch tiles carry lights) on the side walls ahead
const spot = await page.evaluate(() => {
  const { state: S, G } = window.__gw; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const t = (x, y) => G.tile(S, x, y); const open = (x, y) => !['#', 'S', 'L', 'D'].includes(t(x, y));
  const torches = []; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { if (t(x, y) === '#' || t(x, y) === 'S' || (x * 7 + y * 13) % 11 !== 0) continue; const d = D.findIndex(([dx, dy]) => t(x + dx, y + dy) === '#'); if (d >= 0) torches.push({ x, y, d }); }
  const lit = torches.slice(0, 8); let best = null;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { if (!open(x, y)) continue; for (let d = 0; d < 4; d++) { let n = 0, cx = x, cy = y, nt = 0; let side = 0; while (open(cx + D[d][0], cy + D[d][1]) && n < 8) { cx += D[d][0]; cy += D[d][1]; n++; if (n <= 6) side += [1, 3].filter((k) => open(cx + D[(d + k) % 4][0], cy + D[(d + k) % 4][1])).length; if (lit.some((q) => q.x === cx && q.y === cy && q.d % 2 !== d % 2)) nt += n >= 2 && n <= 5 ? 2 : 1; } const sc = nt * 20 + Math.min(n, 7) * 6 - side * 9; if (n >= 4 && (!best || sc > best.sc)) best = { x, y, d, n, nt, sc }; } }
  return best;
});
console.log('spot', spot);
const want = (k) => only === 'all' || only.split(',').includes(k);
const step = async (name, fn) => { try { await fn(); console.log('ok', name); } catch (e) { console.log('FAIL', name, String(e).slice(0, 300)); } };
const place = (p) => page.evaluate((p) => { const { state: S, G, R, refresh } = window.__gw; S.x = p.x; S.y = p.y; S.dir = p.d; G.markExplored(S); R.setView(S.x, S.y, S.dir); refresh(); }, p);
const clearCards = async () => { for (let i = 0; i < 4; i++) { for (const sel of ['#tip-skip', '#ev-later']) { const l = page.locator(sel); if (await l.isVisible().catch(() => false)) await l.click({ force: true }); } await sleep(200); } };
if (want('corridor')) await step('corridor', async () => { await place(spot); await sleep(2500); await page.screenshot({ path: `${raw}/corridor.png` }); });

if (want('map')) await step('automap', async () => {
  // explore the nearest ~70 floor tiles by flood fill from the start (what a few minutes of crawling reveals), then open the real automap
  await page.evaluate(() => { const { state: S, G } = window.__gw; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const seen = new Set(['1,1']); const q = [[1, 1]]; const add = new Set(S.explored[0]);
    for (let n = 0; q.length && n < 85; n++) { const [x, y] = q.shift(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) add.add(`${x + dx},${y + dy}`); for (const [dx, dy] of D) { const k = `${x + dx},${y + dy}`; const t = G.tile(S, x + dx, y + dy); if (!seen.has(k) && !['#', 'S', 'L'].includes(t)) { seen.add(k); q.push([x + dx, y + dy]); } } }
    S.explored[0] = [...add]; });
  await place(spot); await sleep(500);
  await page.evaluate(() => window.__gw.showMap()); await sleep(1500);
  await page.screenshot({ path: `${raw}/automap.png` });
  await page.evaluate(() => window.__gw.closeModal()); await sleep(300);
});

if (want('floors')) await step('floors', async () => {
  const info = await page.evaluate(() => { const { state: S, getLevel } = window.__gw; return [0, 1, 2, 3, 4].map((i) => { const L = getLevel(i); return { name: L.def.name, boss: L.def.bossName, start: L.start }; }); });
  fs.writeFileSync(`${raw}/floors.json`, JSON.stringify(info, null, 1));
  const keep = await page.evaluate(() => { const { state: S } = window.__gw; return { level: S.level, x: S.x, y: S.y, dir: S.dir, ex: S.explored.map((e) => [...e]) }; });
  for (let i = 0; i < 5; i++) {
    await page.evaluate((i) => { const { state: S } = window.__gw; S.level = i; const all = []; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) all.push(`${x},${y}`); S.explored[i] = all; const L = window.__gw.getLevel(i); S.x = L.start[0]; S.y = L.start[1]; window.__gw.showMap(); }, i);
    await sleep(700); await page.locator('#bigmap').screenshot({ path: `${raw}/floor${i + 1}.png` });
    await page.evaluate(() => window.__gw.closeModal()); await sleep(200);
  }
  await page.evaluate((k) => { const { state: S } = window.__gw; S.level = k.level; S.x = k.x; S.y = k.y; S.dir = k.dir; S.explored = k.ex; }, keep);
});

if (want('camp')) await step('camp', async () => {
  await place(spot); await page.evaluate(() => window.__gw.showCamp()); await sleep(800);
  await page.locator('#btn-talk').click(); await sleep(1200); await page.locator('#modal button', { hasText: 'Brambur' }).first().click(); await sleep(2500); await page.screenshot({ path: `${raw}/camp.png` });
  await page.evaluate(() => window.__gw.closeModal()); await sleep(300);
});

if (want('battle')) await step('battle', async () => {
  await place(spot); await sleep(500);
  await page.evaluate(() => { window.__gw.startCombat({ groups: [{ key: 'wolf', count: 2 }, { key: 'giantFrog', count: 1 }, { key: 'giantRat', count: 2 }] }); });
  const menu = page.locator('.combatmenu'); let ok = false;
  for (let i = 0; i < 300; i++) {
    if (await page.locator('#caption.show').isVisible().catch(() => false)) await page.locator('#caption').click({ force: true }).catch(() => {});
    if (await menu.isVisible().catch(() => false) && /Attack|Shoot|Cast Spell/.test(await menu.innerText().catch(() => '')) && await page.evaluate(() => { const c = window.__gw.combat; return c && c.current() === window.__gw.state.party[0]; })) { ok = true; break; }
    await sleep(300);
  }
  console.log('hero turn', ok); await sleep(2500);
  await page.screenshot({ path: `${raw}/battle.png` });
});
await browser.close();
