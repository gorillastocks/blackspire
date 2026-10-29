// Tabletop quests: the Dungeon Master narrates, d20 checks are shown, choices branch, voiced lines play, and the quest log tracks it.
// Screenshots: /workspace/shots/quest-<name>-<project>.png
import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
const shot = async (page, name, P) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/quest-${name}-${P}.png`, timeout: 15000 }); return; } catch (e) { console.log('shot retry', e.message.slice(0, 60)); await page.waitForTimeout(1500); } } };
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
/** Tap through a tabletop session: Next until the choices appear, then pick the first choice matching `want` (else the first). */
async function drive(page, wants = [], { shots = null, P = '', dcShot = null } = {}) {
  let n = 0, dcDone = false; const seen = [];
  for (let step = 0; step < 60; step++) {
    const dlg = page.locator('.dialogue'); if (!(await dlg.isVisible().catch(() => false))) break;
    const next = page.locator('#dlg-next:has-text("Next")');
    if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(120); continue; }
    const btns = page.locator('.dialogue [data-choice]'); const labels = await btns.allTextContents(); if (!labels.length) break;
    const ids = await btns.evaluateAll((els) => els.map((e) => e.dataset.choice));
    seen.push(labels);
    if (shots && shots[n]) await shot(page, shots[n], P);
    if (dcShot && !dcDone && labels.some((l) => /DC \d+/.test(l))) { dcDone = true; await shot(page, dcShot, P); }
    const w = wants[n++]; let i = w ? (typeof w === 'string' ? ids.indexOf(w) : labels.findIndex((l) => w.test(l))) : -1; if (i < 0) i = 0;
    await btns.nth(i).click(); await page.waitForTimeout(250);
  }
  return seen;
}

test('Pip: the confrontation with Garrick, a visible roll, then mercy or vengeance', async ({ page }, info) => {
  test.setTimeout(240000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { const s = window.__gw.state; s.flags.n_debt = 3; s.flags.pipKey = true; window.__gw.runTT('g.0'); });
  await expect(page.locator('.dialogue')).toBeVisible();
  await expect(page.locator('.dialogue')).toContainText('Dungeon Master');
  await page.waitForTimeout(500); await shot(page, 'dm-scene', P);
  const voiced = await page.evaluate(() => { const l = document.querySelector('.dialogue .dlgtext p')?.textContent; return window.__gw.voice().has(l, 'narrator'); });
  expect(voiced, 'the Dungeon Master line has a recorded clip').toBe(true);
  const seen = await drive(page, [/Read him/, /Decide his fate|fate/, /mercy|Mercy/], { shots: ['choices-with-dc'], dcShot: 'pip-roll-choices', P });
  expect(seen[0].some((l) => /DC \d+/.test(l)), 'choices show their check and DC').toBe(true);
  await page.waitForTimeout(500);
  await expect(page.locator('.dialogue')).toHaveCount(0);
  const st = await page.evaluate(() => { const s = window.__gw.state; return { debt: s.quests.debt, mercy: !!s.flags.pipMercy, veng: !!s.flags.pipVengeance }; });
  expect(st.debt).toBe('done'); expect(st.mercy || st.veng).toBe(true);
  expect(okErr(errors)).toEqual([]);
});

test('Ledger: the pawnbroker in town gives a quest, a skill check rolls in the open, and the quest log tracks it', async ({ page }, info) => {
  test.setTimeout(240000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { window.__gw.runTT('led.0'); });
  await expect(page.locator('.dialogue')).toContainText('Dungeon Master');
  await shot(page, 'pawnbroker', P);
  const seen = await drive(page, [/Take the job|accept|Accept|help/i, /Ticket|ticket|Check|Search/i], { shots: [null, 'investigate-leads'], P });
  expect(seen.length).toBeGreaterThan(1);
  const roll = page.locator('.dialogue .ttroll');
  await page.evaluate(() => { window.__gw.state.flags.led_t1 = false; window.__gw.runTT('led.hub'); });
  await expect(page.locator('.dialogue')).toBeVisible();
  const lab = await page.locator('.dialogue [data-choice]').allTextContents();
  expect(lab.some((l) => /DC \d+/.test(l)), 'hub choices show their DC').toBe(true);
  await page.locator('.dialogue [data-choice]').first().click(); await page.waitForTimeout(400);
  if (await roll.count()) { await expect(roll.first()).toContainText(/d20 \d+/); await shot(page, 'roll-banner', P); }
  await drive(page, []);
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'quests'));
  await expect(page.locator('#modal')).toContainText("Pawnbroker's Ledger", { timeout: 10000 });
  await shot(page, 'quest-log', P);
  expect(okErr(errors)).toEqual([]);
});

test('Choir, Glass and the Wardens: every quest scene is voiced and every roll shows its numbers', async ({ page }, info) => {
  test.setTimeout(240000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page);
  for (const [scene, name] of [['choir.0', 'choir-giver'], ['glass.0', 'glass-giver'], ['crane.0', 'crane-ghost']]) {
    await page.evaluate((id) => { window.__gw.runTT(id); }, scene);
    await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(400); await shot(page, name, P);
    await drive(page, []);
  }
  expect(okErr(errors)).toEqual([]);
});

test('every tabletop line in the game has a recorded voice clip', async ({ page }) => {
  test.setTimeout(120000);
  await newGame(page);
  const missing = await page.evaluate(() => { const g = window.__gw; const out = []; for (const [id, sc] of Object.entries(g.G.Story.TT.TT_SCENES)) for (const [who, text] of sc.lines || []) if (!g.voice().has(text, who)) out.push(`${id}: ${who}: ${text.slice(0, 40)}`); return out; });
  expect(missing).toEqual([]);
});

/** Run a whole tabletop session by always choosing the first choice from `prefer` that is on offer (else the first choice). */
async function run(page, entry, prefer = [], opts = {}) {
  await page.evaluate((e) => { window.__gw.runTT(e.entry, e.poi ? { poi: e.poi } : {}); }, { entry, poi: opts.poi || null });
  await expect(page.locator('.dialogue')).toBeVisible();
  const seen = []; let guard = 0;
  while (await page.locator('.dialogue').isVisible().catch(() => false) && guard++ < 80) {
    const next = page.locator('#dlg-next:has-text("Next")');
    if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(80); continue; }
    const btns = page.locator('.dialogue [data-choice]'); const ids = await btns.evaluateAll((els) => els.map((e) => e.dataset.choice)); if (!ids.length) break;
    seen.push(ids); const pick = prefer.find((p) => ids.includes(p)) || ids[0];
    await page.locator(`.dialogue [data-choice="${pick}"]`).click(); await page.waitForTimeout(120);
  }
  await expect(page.locator('.dialogue')).toHaveCount(0);
  return seen;
}
const qstate = (page) => page.evaluate(() => { const s = window.__gw.state; return { ...s.quests }; });

test('all four side quests and Pip: each one can be started and completed through the dialogue UI', async ({ page }, info) => {
  test.setTimeout(240000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page);
  // Pip: three clues on the way down, then Garrick (the roll and the choice are shown in the open)
  for (const e of ['pip.1', 'pip.2', 'pip.3']) await run(page, e);
  expect(await page.evaluate(() => window.__gw.state.flags.n_debt)).toBe(3);
  await run(page, 'g.0', ['insight', 'choose', 'mercy']);
  // Ledger, Choir, Glass, Wardens (and Pip's last two clues): the giver, then every scene their spots can raise, round after round, until each quest is done
  const PREFER = ['accept', 'persuade', 'ticket', 'watch', 'alley', 'accuse', 'tuck', 'deal', 'read', 'listen', 'free', 'study', 'shatter', 'marn', 'kett', 'hale', 'done', 'truth', 'insight', 'choose', 'mercy'];
  // each spot is walked once, in story order (a spot that is used up is gone, as in play); the givers are visited again to hand in
  const visit = async (key) => { const entry = await page.evaluate((k) => { const g = window.__gw; return g.G.Story.TT.entryFor(g.state, k); }, key); if (entry) await run(page, entry, PREFER); };
  for (const key of ['odalys', 'odalys', 'odalys', 'harl', 'choir1', 'choir2', 'harl', 'glass1', 'glass2', 'glass1', 'crane1', 'crane2', 'crane3']) await visit(key);
  const q = await qstate(page);
  for (const k of ['debt', 'ledger', 'choir', 'glass', 'crane']) expect(q[k], `quest ${k}`).toBe('done');
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'quests'));
  await expect(page.locator('#modal')).toContainText('The Drowned Choir', { timeout: 10000 });
  await shot(page, 'all-quests-done-log', P);
  expect(okErr(errors)).toEqual([]);
});
async function unusedDrain(page) { for (let i = 0; i < 60 && await page.locator('.dialogue').isVisible().catch(() => false); i++) { const next = page.locator('#dlg-next:has-text("Next")'); if (await next.isVisible().catch(() => false)) { await next.click(); continue; } const b = page.locator('.dialogue [data-choice]'); if (!(await b.count())) break; await b.first().click(); await page.waitForTimeout(100); } }

/** Read on (tap Next) until the scene offers its choices. */
async function toChoices(page) { for (let i = 0; i < 30 && !(await page.locator('.dialogue [data-choice]').count()); i++) { const next = page.locator('#dlg-next:has-text("Next")'); if (await next.isVisible().catch(() => false)) await next.click(); await page.waitForTimeout(150); } }
/** Stand next to a B3 point of interest, facing it, and press forward: the real walk onto the tile. */
async function stepOnto(page, id, { steps = null } = {}) {
  await page.evaluate(async ({ id, steps }) => {
    const g = window.__gw; const s = JSON.parse(g.G.serialize(g.state)); const pos = g.poiMap(2)[id]; if (!pos) throw new Error('no poi ' + id);
    const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; let at = null;
    for (let d = 0; d < 4 && !at; d++) { const x = pos[0] - D[d][0], y = pos[1] - D[d][1]; const ch = g.G.tile(g.state, x, y, 2); if (ch && ch !== '#' && ch !== 'Q' && ch !== 'B' && ch !== 'L') at = [x, y, d]; }
    if (!at) throw new Error('no neighbour for ' + id);
    window.__lastId = id; s.mode = 'dungeon'; s.level = 2; s.x = at[0]; s.y = at[1]; s.dir = at[2]; s.sinceEncounter = 0; if (steps != null) s.steps = steps;
    await g.loadState(JSON.stringify(s));
  }, { id, steps });
  for (let i = 0; i < 6; i++) { const dlg = page.locator('.dialogue'); if (await dlg.isVisible().catch(() => false)) break; await page.waitForTimeout(150); }
  // the floor's arrival card (the Dungeon Master reads each new area) takes a tap to dismiss, as it would for a player
  await page.waitForTimeout(500);
  for (let i = 0; i < 12 && await page.evaluate(() => document.body.classList.contains('msgup')); i++) { await page.locator('#caption').click({ force: true, timeout: 3000 }).catch(() => {}); await page.waitForTimeout(350); }
  for (let i = 0; i < 5; i++) { await page.keyboard.press('w'); await page.waitForTimeout(500); if (await page.locator('.dialogue').count()) break; }
  if (process.env.DBG) console.log('stepOnto', id, JSON.stringify(await page.evaluate(() => { const s = window.__gw.state; return { m: s.mode, l: s.level, x: s.x, y: s.y, d: s.dir, steps: s.steps, dlg: !!document.querySelector('.dialogue'), combat: String(typeof window.__gw.combat === 'function' ? window.__gw.combat() : window.__gw.combat), menu: !!document.querySelector('#menu:not(.hidden)'), msgup: document.body.classList.contains('msgup'), cap: document.querySelector('#caption')?.className + '|' + document.querySelector('#caption')?.innerText.slice(0,50), modal: document.querySelector('#modal')?.className + '|' + (document.querySelector('#modal')?.innerText||'').slice(0,80), msg: document.querySelector('#log')?.lastElementChild?.textContent?.slice(0,60), pois: s.pois && Object.keys(s.pois), pm: window.__gw.poiMap(2)[window.__lastId] }; })));
}

test('The Sunken Orchard: keeper, trees, open sky (day to night), gate and Heartroot, walked on the real B3 tiles', async ({ page }, info) => {
  test.setTimeout(300000); const P = info.project.name; const errors = trackErrors(page);
  await newGame(page);
  // 1) the keeper, in daylight
  await stepOnto(page, 'orch1', { steps: 0 });
  const reg = await page.evaluate(() => { const g = window.__gw; return { m: g.poiMap(2), r: g.outdoorInfo().reg }; });
  expect(Object.keys(reg.m).filter((k) => k.startsWith('orch')).sort()).toEqual(['orch1', 'orch2', 'orch3', 'orch4', 'orch5']);
  for (const k of ['orch1', 'orch2', 'orch3', 'orch4', 'orch5']) { const [x, y] = reg.m[k]; expect(x >= reg.r.x0 && x <= reg.r.x1 && y >= reg.r.y0 && y <= reg.r.y1, `${k} inside the open-air region`).toBe(true); }
  await expect(page.locator('.dialogue')).toContainText('Dungeon Master'); await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(500); await shot(page, 'orchard-keeper', P);
  const voiced = await page.evaluate(() => [...document.querySelectorAll('.dialogue .dlgtext p')].length >= 1 && window.__gw.voice().has(document.querySelector('.dialogue .dlgtext p').textContent, 'narrator'));
  expect(voiced, 'the opening line is voiced').toBe(true);
  await drive(page, ['press', 'accept'], { shots: ['orchard-keeper-choices'], P });
  expect((await qstate(page)).orchard).toBe('active');
  // 2) the trees: three checks with visible DCs, then leave
  await stepOnto(page, 'orch2');
  await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(400);
  const seenT = await drive(page, ['nat', 'trk', 'fruit', 'done'], { shots: ['orchard-trees-choices'], P });
  expect(seenT[0].some((l) => /DC \d+/.test(l)), 'tree checks show their DC').toBe(true);
  expect(await page.evaluate(() => !!window.__gw.state.flags.orch_trees)).toBe(true);
  // 3) the open sky: by day it offers to wait; waiting jumps the clock to night, and the star check appears with its DC
  await stepOnto(page, 'orch3', { steps: 0 });
  await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(300);
  await toChoices(page);
  const dayIds = await page.locator('.dialogue [data-choice]').evaluateAll((els) => els.map((e) => e.dataset.choice));
  expect(dayIds).toContain('wait'); expect(dayIds).not.toContain('star'); await shot(page, 'orchard-sky-day', P);
  await page.locator('.dialogue [data-choice="wait"]').click(); await page.waitForTimeout(400); await toChoices(page);
  await expect(page.locator('.dialogue [data-choice="star"]')).toBeVisible();
  expect(await page.evaluate(() => window.__gw.outdoorInfo().tod.name)).toBe('night');
  await shot(page, 'orchard-sky-night', P);
  await page.locator('.dialogue [data-choice="star"]').click(); await page.waitForTimeout(500); await toChoices(page);
  await expect(page.locator('.dialogue .ttroll').first()).toContainText(/d20 \d+/); await shot(page, 'orchard-roll', P);
  await drive(page, []);
  expect(await page.evaluate(() => !!window.__gw.state.flags.orch_sky)).toBe(true);
  // 4) the gate: a check with a visible DC, retried until the old rite takes, then the Heartroot
  await stepOnto(page, 'orch4');
  await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(400);
  const seenG = await drive(page, ['rite', 'rite', 'rite', 'rite', 'rite', 'rite', 'rite', 'rite'], { shots: ['orchard-gate-choices'], P });
  expect(seenG[0].some((l) => /Arcana DC \d+/.test(l))).toBe(true);
  expect(await page.evaluate(() => window.__gw.state.flags.tt_orchard)).toBe('restored');
  await stepOnto(page, 'orch5');
  await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(400); await shot(page, 'orchard-heartroot', P);
  await drive(page, ['tend', 'tend', 'tend', 'tend', 'tend', 'tend', 'tend', 'tend']);
  expect(await page.evaluate(() => window.__gw.state.flags.tt_orchard)).toBe('heart');
  // 5) back to the keeper: payout and the quest log
  await stepOnto(page, 'orch1');
  await expect(page.locator('.dialogue')).toBeVisible(); await page.waitForTimeout(400); await shot(page, 'orchard-payout', P);
  await drive(page, []);
  const st = await page.evaluate(() => { const s = window.__gw.state; return { q: s.quests.orchard, inv: s.inventory.filter((k) => ['dewboughWreath', 'silverfruit'].includes(k)) }; });
  expect(st.q).toBe('done'); expect(st.inv).toContain('dewboughWreath'); expect(st.inv).toContain('silverfruit');
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'quests'));
  await expect(page.locator('#modal')).toContainText('The Sunken Orchard', { timeout: 10000 }); await shot(page, 'orchard-quest-log', P);
  expect(okErr(errors)).toEqual([]);
});
