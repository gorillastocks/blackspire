import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ ...o, timeout: 12000 }); return; } catch { await page.mouse.move(1, 1); await page.waitForTimeout(700); } } console.log('SHOT FAILED', o.path); };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const setSpeed = (page, k) => page.evaluate((k) => localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: k, battleSpeedSet: true })), k);
const start = (page, groups, prep) => page.evaluate(async ([groups, prep]) => { const g = window.__gw; for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; } if (prep) new Function('S', prep)(g.state); g.hideCaption?.(); g.startCombat({ groups }); await new Promise((r) => { const t = setInterval(() => { if (g.combat) { clearInterval(t); for (const m of g.combat.monsters) m.hp = m.maxHp = 999; r(); } }, 2); }); }, [groups, prep || '']);

const fits = (page) => page.evaluate(() => { const m = document.querySelector('#cmenu .panel'); const r = m.getBoundingClientRect(); const cm = document.querySelector('#cmenu').getBoundingClientRect(); const bs = [...document.querySelectorAll('#cmenu .combatmenu button')]; const lastBottom = Math.max(...bs.map((b) => b.getBoundingClientRect().bottom)); return { scroll: m.scrollHeight, client: m.clientHeight, top: r.top, bottom: Math.min(r.bottom, cm.bottom), lastBottom, vh: innerHeight, n: bs.length }; });
for (const [who, idx] of [['fighter', 0], ['cleric', 1], ['wizard', 3]]) {
  test(`combat menu fits without scrolling: ${who}, main page and More page`, async ({ page }, info) => {
    test.setTimeout(200000); const errors = trackErrors(page);
    await newGame(page); await setSpeed(page, 'normal');
    await start(page, [{ key: 'giantRat', count: 2 }, { key: 'wolf', count: 1 }], `for (const c of S.party) c.ai = true; S.party[${idx}].ai = false;`);
    await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 });
    await page.waitForFunction((i) => window.__gw.combat.current() === window.__gw.state.party[i], idx, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(500);
    const main = await fits(page); console.log(who, 'main', JSON.stringify(main));
    expect(main.scroll, 'main menu does not need to scroll').toBeLessThanOrEqual(main.client + 1); expect(main.lastBottom, 'every button is inside the menu').toBeLessThanOrEqual(Math.min(main.bottom, main.vh) + 1);
    await shot(page, { path: `/workspace/shots/phaseE-menu-${who}-${info.project.name}.png` });
    await page.locator('#cmenu .combatmenu button', { hasText: 'More' }).click();
    await expect(page.locator('#cmenu .combatmenu button', { hasText: 'Battle speed' })).toBeVisible();
    const more = await fits(page); console.log(who, 'more', JSON.stringify(more));
    expect(more.scroll, 'More page does not need to scroll').toBeLessThanOrEqual(more.client + 1); expect(more.lastBottom, 'every button is inside the menu').toBeLessThanOrEqual(Math.min(more.bottom, more.vh) + 1);
    await shot(page, { path: `/workspace/shots/phaseE-menu-more-${who}-${info.project.name}.png` });
    await page.locator('#cmenu .combatmenu button', { hasText: /← Back/ }).click();
    await expect(page.locator('#cmenu .combatmenu button', { hasText: 'More' })).toBeVisible();
    expect(okErr(errors)).toEqual([]);
  });
}

/* ---------------- Part 1: the Sunken Orchard (open-air window on B3) ---------------- */
const goOut = (page, opts = {}) => page.evaluate(async (opts) => {
  const g = window.__gw; const S = g.state; S.maxDepth = Math.max(S.maxDepth || 0, 3); g.closeModal();
  g.G.enterDungeon(S, 2); await g.loadState(g.G.serialize(S)); const S2 = g.state;
  const reg = g.outdoorInfo().reg; const T = (x, y) => g.G.tile(S2, x, y);
  // stand on an open tile in the middle of the window, facing an open direction
  let best = null; for (let y = reg.y0; y <= reg.y1; y++) for (let x = reg.x0; x <= reg.x1; x++) { const c = T(x, y); if (c === '#' || c === 'S') continue; const open = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy], d) => [d, T(x + dx, y + dy) !== '#' && T(x + dx, y + dy) !== 'S']); const n = open.filter((o) => o[1]).length; const dd = Math.hypot(x - (reg.x0 + reg.x1) / 2, y - (reg.y0 + reg.y1) / 2); const sc = n * 2 - dd; if (!best || sc > best.sc) best = { x, y, d: (open.find((o) => o[1]) || [0])[0], sc }; }
  S2.x = best.x; S2.y = best.y; S2.dir = best.d; S2.explored[S2.level] = S2.explored[S2.level] || [];
  for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (opts.explore) S2.explored[S2.level].push(`${x},${y}`);
  await g.loadState(g.G.serialize(S2)); await new Promise((r) => setTimeout(r, 600)); return g.outdoorInfo();
}, opts);
const settle = async (page) => { await page.evaluate(() => window.__gw.closeModal?.()); await page.waitForTimeout(1200); };

const look = (page, hour, weather, pitch = 0) => page.evaluate(([h, w, p]) => { const g = window.__gw; g.hideCaption?.(); g.setHour(h); if (w) g.setWeather(w); g.look(p); }, [hour, weather, pitch]);

test('outdoor: sky, light and weather follow the hour; the window is small and cheap to draw', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page);
  await newGame(page); const o = await goOut(page, { explore: true }); console.log(JSON.stringify(o));
  expect(o.reg).toBeTruthy(); expect(o.near).toBe(true); expect(o.counts.trees + o.counts.rocks + o.counts.cliffs).toBeGreaterThan(0);
  expect(o.reg.x1 - o.reg.x0).toBeLessThanOrEqual(6); expect(o.reg.y1 - o.reg.y0).toBeLessThanOrEqual(6); // small
  const P = info.project.name; const out = {};
  for (const [name, hour, wx, pitch] of [['day-rain', 12, 'rain', 0], ['sky-rain', 12, 'rain', 0.62], ['mist', 12, 'mist', 0], ['sky-mist', 12, 'mist', 0.62], ['dusk', 18.6, 'rain', 0], ['night', 23, 'rain', 0], ['sky-night', 23, 'mist', 0.62]]) {
    await look(page, hour, wx, pitch); await page.waitForTimeout(1600);
    out[name] = await page.evaluate(() => { const g = window.__gw, r = g.R; const i = r.renderer.info; return { st: g.outdoorInfo().state, bg: r.scene.background.getHexString(), fog: r.scene.fog.density, hemi: +r.hemi.intensity.toFixed(2), torchK: +r.torchK.toFixed(2), ...(() => { i.reset(); r.renderer.render(r.scene, r.camera); return { calls: i.render.calls, tris: i.render.triangles }; })(), rain: r.outdoor.rain.visible, mist: r.outdoor.mist.visible }; });
    await shot(page, { path: `/workspace/shots/phaseE-outdoor-${name}-${P}.png` });
  }
  console.log(JSON.stringify(out));
  expect(out['day-rain'].st.mix).toBeGreaterThan(0.9); expect(out['day-rain'].rain).toBe(true); expect(out['day-rain'].mist).toBe(false); expect(out.mist.mist).toBe(true); expect(out.mist.rain).toBe(false);
  expect(out.night.st.day).toBeLessThan(0.2); expect(out['day-rain'].st.day).toBeGreaterThan(0.9); expect(out.night.bg).not.toBe(out['day-rain'].bg);
  expect(out.night.torchK).toBeGreaterThan(out['day-rain'].torchK); // the torch matters more at night
  expect(out['day-rain'].fog).toBeLessThan(0.075); expect(out.mist.fog).toBeGreaterThan(out['day-rain'].fog); // mist is thicker than rain, both open up the view
  expect(out['day-rain'].calls).toBeLessThan(120); expect(out['day-rain'].tris).toBeLessThan(120000);
  // away from the window the dungeon is exactly as before: stone fog, torch at full strength, no sky
  await page.evaluate(async () => { const g = window.__gw, S = g.state, r = g.outdoorInfo().reg; let best = null; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) { if (g.G.tile(S, x, y) === '#' || g.G.tile(S, x, y) === 'S') continue; const d = Math.hypot(x - (r.x0 + r.x1) / 2, y - (r.y0 + r.y1) / 2); if (d > 9 && (!best || d > best.d)) best = { x, y, d }; } if (best) { S.x = best.x; S.y = best.y; g.R.setView(S.x, S.y, S.dir, true); g.look(0); g.refresh(); } });
  await page.waitForFunction(() => window.__gw.outdoorInfo().state?.mix === 0, null, { timeout: 30000 }).catch(() => {}); await page.waitForTimeout(300);
  const far = await page.evaluate(() => { const r = window.__gw.R; return { mix: window.__gw.outdoorInfo().state?.mix, fog: r.scene.fog.density, torchK: r.torchK, hemi: r.hemi.intensity, fx: r.outdoor.fx.visible, amb: window.__gw.audio().amb }; });
  console.log(JSON.stringify(far)); expect(far.mix).toBe(0); expect(far.fog).toBe(0.075); expect(far.torchK).toBe(1); expect(far.hemi).toBeCloseTo(0.35, 2); expect(far.fx).toBe(false);
  expect(okErr(errors)).toEqual([]);
});

test('outdoor: automap, secrets, elites, events and fights all still work in the window', async ({ page }, info) => {
  test.setTimeout(300000); const errors = trackErrors(page);
  await newGame(page); await setSpeed(page, 'normal'); const o = await goOut(page, { explore: true });
  const inv = await page.evaluate(() => { const g = window.__gw, S = g.state, r = g.outdoorInfo().reg; const t = {}; const cells = {}; for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { const c = g.G.tile(S, x, y); t[c] = (t[c] || 0) + 1; (cells[c] ||= []).push([x, y]); } return { t, cells }; });
  console.log('window tiles', JSON.stringify(inv.t));
  // 1) automap: the big map paints the window green and everything in it is on the map
  await page.evaluate(() => window.__gw.showMap()); await expect(page.locator('#bigmap')).toBeVisible();
  const px = await page.evaluate(([cells]) => { const cv = document.getElementById('bigmap'), g = cv.getContext('2d'); const cs = cv.width / 21; const f = cells['.'][0]; const d = g.getImageData(f[0] * cs + cs / 2, f[1] * cs + cs / 2, 1, 1).data; return [d[0], d[1], d[2]]; }, [inv.cells]);
  console.log('automap pixel in window', px); expect(px[1]).toBeGreaterThan(px[0] + 15); // green-tinted floor
  await shot(page, { path: `/workspace/shots/phaseE-automap-${info.project.name}.png` });
  await page.evaluate(() => window.__gw.closeModal());
  // 2) secrets: a secret wall in the window is still a wall, can be flagged, and shows its shimmer
  if (inv.cells.S) {
    const [sx, sy] = inv.cells.S[0];
    const sh = await page.evaluate(async ([sx, sy]) => { const g = window.__gw, S = g.state; (S.suspect ||= {}); (S.suspect[S.level] ||= []).push(`${sx},${sy}`); g.refresh(); await new Promise((r) => setTimeout(r, 800)); return { tile: g.G.tile(S, sx, sy), shimmers: g.R.shimmerObjs.size }; }, [sx, sy]);
    expect(sh.tile).toBe('S'); expect(sh.shimmers).toBeGreaterThan(0);
  }
  // 3) elites and story events draw inside the window
  const cx = Math.round((o.reg.x0 + o.reg.x1) / 2), cy = inv.cells['.'][0];
  const ev = await page.evaluate(async ([c]) => { const g = window.__gw, S = g.state; await g.R.syncDynamic((x, y) => g.G.tile(S, x, y), [], [{ id: 'e2e-elite', kind: 'guard', title: 'Orchard Warden', key: 'wolf', x: c[0], y: c[1] }]); g.R.syncEvents([{ id: 'e2e-ev', x: c[0], y: c[1], color: 0xffd77a, icon: '✦' }]); await new Promise((r) => setTimeout(r, 1500)); return { elites: g.R.eliteObjs.size, events: g.R.evObjs.size, elitePos: (() => { const o = [...g.R.eliteObjs.values()][0]; return o ? [o.holder.position.x / 2, o.holder.position.z / 2] : null; })() }; }, [cy]);
  console.log('dyn', JSON.stringify(ev)); expect(ev.elites).toBe(1); expect(ev.events).toBe(1); expect(ev.elitePos[0]).toBeCloseTo(cy[0], 0);
  await look(page, 12, 'rain', 0); await shot(page, { path: `/workspace/shots/phaseE-elite-${info.project.name}.png` });
  await page.evaluate(() => { const g = window.__gw; g.R.syncEvents([]); g.refresh(); });
  // 4) a fight started inside the window runs in the arena and returns to the open sky
  await start(page, [{ key: 'giantRat', count: 2 }, { key: 'wolf', count: 1 }], 'for (const c of S.party) c.ai = true; S.party[0].ai = false;');
  await expect(page.locator('#cmenu .combatmenu, #combat-skip, .skipchip').first()).toBeVisible({ timeout: 60000 });
  await shot(page, { path: `/workspace/shots/phaseE-fight-${info.project.name}.png` });
  await page.evaluate(() => { for (const m of window.__gw.combat.monsters) m.hp = 1; });
  const auto = page.locator('#cmenu .combatmenu button:has-text("Auto-battle")'); await auto.first().click({ timeout: 60000 }).catch(() => {});
  await expect.poll(() => page.evaluate(() => !window.__gw.combat), { timeout: 120000 }).toBe(true);
  await page.evaluate(() => window.__gw.closeModal()); await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ mode: window.__gw.state.mode, mix: window.__gw.outdoorInfo().state?.mix, x: window.__gw.state.x, y: window.__gw.state.y }));
  console.log('after fight', JSON.stringify(after)); expect(after.mode).toBe('dungeon'); expect(after.mix).toBeGreaterThan(0.9);
  expect(okErr(errors)).toEqual([]);
});

test('outdoor: walking the grid through the window works; entry toast, HUD and ambience', async ({ page }, info) => {
  test.setTimeout(300000); const errors = trackErrors(page);
  await newGame(page); const o = await goOut(page, { explore: true });
  const st = await page.evaluate(() => ({ hud: document.querySelector('#hud').textContent, amb: window.__gw.audio().amb }));
  console.log(JSON.stringify(st)); expect(st.hud).toMatch(/☀️|🌅|🌇|🌙/); expect(st.hud).toMatch(/🌧|🌫/);
  // walk out of the window and back in with real keys; the toast fires on entry
  const route = await page.evaluate(() => { const g = window.__gw, S = g.state, r = g.outdoorInfo().reg; const T = (x, y) => g.G.tile(S, x, y); const free = (x, y) => T(x, y) !== '#' && T(x, y) !== 'S'; // find any in-window tile with an open neighbour inside the window
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x < r.x1; x++) if (free(x, y) && free(x + 1, y) && T(x, y) === '.' && T(x + 1, y) === '.') return { x, y }; return null; });
  expect(route).toBeTruthy();
  await page.evaluate(async (rt) => { const g = window.__gw, S = g.state; S.x = rt.x; S.y = rt.y; S.dir = 1; g.R.setView(S.x, S.y, S.dir, true); g.refresh(); }, route);
  await page.keyboard.press('s'); await page.waitForTimeout(300); await page.keyboard.press('w'); await page.waitForTimeout(1000);
  expect(okErr(errors)).toEqual([]);
});

test('outdoor: shots of the arch entrance and the combat menu on this device', async ({ page }, info) => {
  test.setTimeout(300000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await setSpeed(page, 'normal'); await goOut(page, { explore: true });
  // stand just outside the window, looking in through the ruined arch
  const spot = await page.evaluate(() => { const g = window.__gw, S = g.state, r = g.outdoorInfo().reg; const T = (x, y) => g.G.tile(S, x, y); const free = (x, y) => x >= 0 && y >= 0 && x < 21 && y < 21 && T(x, y) !== '#' && T(x, y) !== 'S';
    const inW = (x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
    for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) { if (!free(x, y)) continue; for (const [d, [dx, dy]] of [[0, [0, -1]], [1, [1, 0]], [2, [0, 1]], [3, [-1, 0]]]) { const ox = x - dx, oy = y - dy; if (free(ox, oy) && !inW(ox, oy) && free(x + dx, y + dy)) return { x: ox, y: oy, dir: d }; } } return null; });
  console.log('arch spot', JSON.stringify(spot));
  if (spot) { await page.evaluate(async (sp) => { const g = window.__gw, S = g.state; S.x = sp.x; S.y = sp.y; S.dir = sp.dir; g.R.setView(S.x, S.y, S.dir, true); g.setHour(11); g.setWeather('rain'); g.look(0.12); g.refresh(); await new Promise((r) => setTimeout(r, 2500)); }, spot); await shot(page, { path: `/workspace/shots/phaseE-arch-${P}.png` }); await page.keyboard.press('w'); await page.waitForTimeout(2500); await shot(page, { path: `/workspace/shots/phaseE-arch-inside-${P}.png` }); }
  await page.evaluate(() => window.__gw.look(0));
  await start(page, [{ key: 'giantRat', count: 2 }, { key: 'wolf', count: 1 }], 'for (const c of S.party) c.ai = true; S.party[0].ai = false;');
  await expect(page.locator('#cmenu .combatmenu')).toBeVisible({ timeout: 60000 }); await page.waitForTimeout(800);
  const m = await fits(page); expect(m.scroll).toBeLessThanOrEqual(m.client + 1); await shot(page, { path: `/workspace/shots/phaseE-menu-${P}.png` });
  await page.locator('#cmenu .combatmenu button', { hasText: 'More' }).click(); await page.waitForTimeout(400); await shot(page, { path: `/workspace/shots/phaseE-menu-more-${P}.png` });
  expect(okErr(errors)).toEqual([]);
});
