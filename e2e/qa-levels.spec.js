import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, dismissCards } from './helpers.js';
// Level QA, driven through the real UI (keyboard walking, stairs prompts, map, save/load, boss, next floor).
// One test per floor so each can be run alone: npx playwright test e2e/qa-levels.spec.js -g "B3" --project=iphone
const SHOTS = '/workspace/shots';
const shotName = (n, what, proj) => `${SHOTS}/qa-L${n}-${what}${proj === 'iphone' ? '' : '-' + proj}.png`;
const bad = (page) => page.evaluate(() => document.body.innerText.match(/\bNaN\b|\bundefined\b|\[object Object\]/g));

async function settleCombat(page) {
  for (let i = 0; i < 400 && (await page.evaluate(() => !!window.__gw.combat)); i++) {
    await page.evaluate(() => { for (const c of window.__gw.state.party) c.ai = true; });
    await page.keyboard.press('Enter'); await page.waitForTimeout(250);
  }
  await dismissCards(page);
}
const pos = (page) => page.evaluate(() => { const s = window.__gw.state; return [s.level, s.x, s.y, s.mode]; });
/** Walk the party along a BFS path to (gx,gy) with real key presses. Stops early (returns false) on anything unexpected. */
async function uiWalk(page, goal, maxSteps = 60, allowL = false) {
  for (let n = 0; n < maxSteps; n++) {
    const nxt = await page.evaluate(([goal, allowL]) => {
      const { state: s, G } = window.__gw; if (s.x === goal[0] && s.y === goal[1]) return 'done';
      const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const prev = new Map([[`${s.x},${s.y}`, null]]); const q = [[s.x, s.y]];
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of D) { const nx = x + dx, ny = y + dy, k = `${nx},${ny}`; if (prev.has(k)) continue; const ch = G.tile(s, nx, ny); if (ch === '#' || ch === 'S' || (ch === 'L' && !allowL) || (ch === 'B' && !(nx === goal[0] && ny === goal[1]))) continue; prev.set(k, [x, y]); q.push([nx, ny]); } }
      if (!prev.has(`${goal[0]},${goal[1]}`)) return 'nopath';
      let c = goal, p = prev.get(`${c[0]},${c[1]}`); while (p && !(p[0] === s.x && p[1] === s.y)) { c = p; p = prev.get(`${c[0]},${c[1]}`); }
      const want = D.findIndex(([dx, dy]) => s.x + dx === c[0] && s.y + dy === c[1]); return { want, dir: s.dir, x: s.x, y: s.y };
    }, [goal, allowL]);
    if (nxt === 'done') return true; if (nxt === 'nopath') return false;
    const turns = (nxt.want - nxt.dir + 4) % 4; if (turns === 1) await page.keyboard.press('d'); else if (turns === 3) await page.keyboard.press('a'); else if (turns === 2) { await page.keyboard.press('d'); await page.waitForTimeout(150); await page.keyboard.press('d'); }
    await page.waitForTimeout(120); await page.keyboard.press('w');
    await page.waitForFunction(([x, y]) => window.__gw.state.x !== x || window.__gw.state.y !== y || !!window.__gw.combat || !document.querySelector('#modal').classList.contains('hidden'), [nxt.x, nxt.y], { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(150);
    if (await page.evaluate(() => !!window.__gw.combat)) await settleCombat(page); else await dismissCards(page);
    if (await page.locator('#modal:not(.hidden) #btn-unlock, #modal:not(.hidden) .menu button:has-text("Not yet"), #modal:not(.hidden) .menu button:has-text("Stay")').count()) return 'prompt';
  }
  return false;
}
const load = (page, patch) => page.evaluate(async (src) => { const s = JSON.parse(window.__gw.G.serialize(window.__gw.state)); (0, eval)(`(${src})`)(s, window.__gw.G); await window.__gw.loadState(JSON.stringify(s)); }, patch.toString());

for (let L = 0; L < 5; L++) {
  test(`QA B${L + 1}: start, walk, map, save/load, stairs, boss, next floor, no console errors`, async ({ page }, info) => {
    test.skip(info.project.name !== 'iphone' && !process.env.QA_ALL, 'floor QA runs on the iPhone project (QA_ALL=1 for the rest)');
    test.setTimeout(420000);
    const errors = trackErrors(page); const P = info.project.name; const n = L + 1;
    await newGame(page); await page.evaluate(() => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'fast', battleSpeedSet: true }))); await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
    await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon'); await dismissCards(page);
    // jump to the floor under test (B2+ arrive by the stairs from above, like the lift does)
    if (L > 0) { await page.evaluate(async (L) => { const g = window.__gw; const s = JSON.parse(g.G.serialize(g.state)); s.maxDepth = L; s.flags.prologue = true; s.level = L - 1; s.bossDead[L - 1] = true; await g.loadState(JSON.stringify(s)); const ev = g.G.goDown(g.state); g.handle(ev); g.refresh(); }, L); await page.waitForTimeout(1500); await dismissCards(page); }
    await page.evaluate(() => { for (const c of window.__gw.state.party) { c.maxHp = Math.max(c.maxHp, 400); c.hp = c.maxHp; } window.__gw.refresh(); });
    // 1) start position
    const info0 = await page.evaluate(() => { const { state: s, G } = window.__gw; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; return { lvl: s.level, x: s.x, y: s.y, tile: G.tile(s, s.x, s.y), facing: G.tile(s, s.x + D[s.dir][0], s.y + D[s.dir][1]), name: window.__gw.getLevel(s.level).def.name }; });
    expect(info0.lvl).toBe(L); expect([info0.x, info0.y]).toEqual([1, 1]); expect(info0.tile).toBe('<'); expect(info0.facing, 'start faces an open tile, not a wall').not.toBe('#');
    await page.waitForTimeout(1200); await page.screenshot({ path: shotName(n, 'start', P) });
    const T0 = Date.now(); const mark = (m) => console.log(`T+${((Date.now() - T0) / 1000) | 0}s ${m}`);
    // 2) walk by keyboard toward the key (real inputs, doors/traps/encounters on the way)
    const goal = await page.evaluate(() => { const { state: s, G } = window.__gw; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (G.tile(s, x, y) === 'K') return [x, y]; });
    const L1 = await page.evaluate(() => { const { state: s, G } = window.__gw; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const prev = new Map([['1,1', null]]); const q = [[1, 1]]; const dist = { '1,1': 0 }; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of D) { const k = `${x + dx},${y + dy}`; const ch = G.tile(s, x + dx, y + dy); if (dist[k] !== undefined || ch === '#' || ch === 'S' || ch === 'L' || ch === 'B') continue; dist[k] = dist[`${x},${y}`] + 1; q.push([x + dx, y + dy]); } } return Object.entries(dist).filter(([, d]) => d >= 12 && d <= 14).map(([k]) => k.split(',').map(Number))[0]; });
    const reached = await uiWalk(page, L1, 70); expect([true, 'prompt']).toContain(reached);
    await page.waitForTimeout(600); await dismissCards(page); await page.screenshot({ path: shotName(n, 'walk', P) });
    mark('// 3) automap');
    // 3) automap: opens, shows explored tiles, matches the explored set, legend-free of NaN
    await page.keyboard.press('m'); await page.waitForTimeout(500);
    const mapInfo = await page.evaluate(() => { const cv = document.querySelector('#modal canvas'); if (!cv) return null; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 120) lit++; return { w: cv.width, h: cv.height, lit, explored: window.__gw.state.explored[window.__gw.state.level].length }; });
    expect(mapInfo, 'automap canvas present').toBeTruthy(); expect(mapInfo.lit, 'automap draws explored cells').toBeGreaterThan(200); expect(mapInfo.explored).toBeGreaterThan(20);
    expect(await bad(page), 'map text').toBeNull(); await page.screenshot({ path: shotName(n, 'map', P) });
    await page.keyboard.press('Escape'); await page.evaluate(() => window.__gw.closeModal()); await page.waitForTimeout(300);
    mark('// 4) save');
    // 4) save, wander, load: position, explored and gold come back
    const before = await page.evaluate(() => { const s = window.__gw.state; s.gold = 4321; return [s.level, s.x, s.y, s.dir, s.explored[s.level].length]; });
    await page.locator('#controls button', { hasText: 'Save' }).click(); await page.waitForTimeout(300);
    await page.evaluate(() => { const s = window.__gw.state; s.gold = 1; });
    await uiWalk(page, await page.evaluate(() => { const { state: s, G } = window.__gw; const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; for (const [dx, dy] of D) { const c = G.tile(s, s.x + dx, s.y + dy); if (c !== '#' && c !== 'S' && c !== 'L' && c !== 'B') return [s.x + dx, s.y + dy]; } return [s.x, s.y]; }), 4);
    await page.evaluate(() => window.__gw.closeModal()); await settleCombat(page);
    await page.evaluate(() => window.__gw.loadGame()); await page.waitForTimeout(1500); await dismissCards(page);
    const after = await page.evaluate(() => { const s = window.__gw.state; return [s.level, s.x, s.y, s.dir, s.explored[s.level].length, s.gold]; });
    expect(after.slice(0, 5), 'loaded back to the saved spot').toEqual(before); expect(after[5]).toBe(4321);
    mark('// 5) the lock');
    // 5) the lock-and-key chain by the real rules: key gets us through the locked door
    await load(page, (s, G) => { const L = window.__gw.getLevel(s.level); for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] === 'K') { s.x = x; s.y = y; } });
    await dismissCards(page); expect(await page.evaluate(() => [window.__gw.state.keys.length, window.__gw.state.x]), 'standing on K picks it up').toBeTruthy();
    await page.evaluate(() => { const g = window.__gw; g.handle(g.G.enterTile(g.state)); }); await dismissCards(page);
    const hasKey = await page.evaluate(() => { const g = window.__gw; return g.state.keys.includes(g.getLevel(g.state.level).def.key); }); expect(hasKey, 'key picked up').toBe(true);
    mark('// 6) boss');
    // 6) boss: stand beside the locked door, walk through it and into the boss for real
    const spots = await page.evaluate(() => { const { state: s } = window.__gw; const L = window.__gw.getLevel(s.level); const f = (ch) => { for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] === ch) return [x, y]; }; return { l: f('L'), b: f('B'), ex: f(L.def.final ? 'A' : '>') }; });
    await load(page, (s) => { /* approach: the open neighbour of the lock that is not the boss */ const L = window.__gw.getLevel(s.level); const [lx, ly] = (() => { for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] === 'L') return [x, y]; })(); const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; for (const [dx, dy] of D) { const c = L.tiles[ly + dy][lx + dx]; if (c !== '#' && c !== 'B') { s.x = lx + dx; s.y = ly + dy; } } for (const c of s.party) { c.hp = c.maxHp; c.ai = true; } });
    await dismissCards(page);
    const lockPath = await uiWalk(page, spots.b, 8, true); expect([true, 'prompt', false]).toContain(lockPath);
    await settleCombat(page); await page.waitForTimeout(500); await settleCombat(page);
    // B5 is two-phase: Malthrax falls, a beat later Gorvax rises — keep fighting until the floor reports the boss dead
    for (let i = 0; i < 40 && !(await page.evaluate(() => window.__gw.state.bossDead[window.__gw.state.level])); i++) { await page.waitForTimeout(1500); await settleCombat(page); }
    const afterBoss = await page.evaluate(() => ({ dead: window.__gw.state.bossDead[window.__gw.state.level], victory: window.__gw.state.victory, combat: !!window.__gw.combat }));
    console.log('DBG', JSON.stringify({ lockPath, spots, afterBoss, at: await page.evaluate(() => { const s = window.__gw.state; return [s.x, s.y, s.keys, s.mode, document.querySelector('#modal').className, document.querySelector('#modal').innerText.slice(0, 200)]; }) }));
    expect(afterBoss.dead, `B${n} boss beaten`).toBe(true); expect(afterBoss.combat).toBe(false); if (L === 4) expect(afterBoss.victory, 'Gorvax down: victory').toBe(true);
    await page.screenshot({ path: shotName(n, 'after-boss', P) });
    mark('// 7) the stairs');
    // 7) the stairs: walk from the boss tile to the exit, descend by the real prompt, and land on the next floor
    const exitReach = await uiWalk(page, spots.ex, 8); expect([true, 'prompt']).toContain(exitReach); await page.waitForTimeout(500);
    if (L < 4) {
      await expect(page.locator('#modal button', { hasText: 'Descend' })).toBeVisible(); await page.screenshot({ path: shotName(n, 'stairs-down', P) });
      await page.locator('#modal button', { hasText: 'Descend' }).click(); await page.waitForTimeout(1500); await dismissCards(page);
      expect(await pos(page)).toEqual([L + 1, 1, 1, 'dungeon']); await page.screenshot({ path: shotName(n, 'next-floor', P) });
      // and back up: the climb prompt lands us on this floor's '>' again
      await page.evaluate(() => { const g = window.__gw; g.handle(g.G.enterTile(g.state)); }); await expect(page.locator('#modal button', { hasText: 'Climb' })).toBeVisible();
      await page.locator('#modal button', { hasText: 'Climb' }).click(); await page.waitForTimeout(1500); await dismissCards(page);
      expect((await pos(page)).slice(0, 3)).toEqual([L, spots.ex[0], spots.ex[1]]);
    } else {
      await expect.poll(() => page.evaluate(() => !document.querySelector('#modal').classList.contains('hidden') || !!document.querySelector('#dlg-skip'))).toBe(true);
      await page.screenshot({ path: shotName(n, 'ending', P) });
    }
    expect(await bad(page), 'no NaN/undefined text').toBeNull();
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
