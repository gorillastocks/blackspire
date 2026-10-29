// The Dungeon Master's read-aloud box and the companions' reactions to a choice (approval).
// Screenshots: /workspace/shots/narrator-<name>-<project>.png and react-<name>-<project>.png
import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';
test.use({ storageState: { cookies: [], origins: [] } }); // the Dungeon Master's cards are ON
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const shot = async (page, kind, name, P) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/${kind}-${name}-${P}.png`, timeout: 15000 }); return; } catch (e) { await page.waitForTimeout(1500); } } };
const card = (page) => page.locator('#caption.show.msg');
/** Tap anywhere to skip the read-aloud box (the tap catcher is what a player's finger lands on). */
const skip = async (page) => { await page.waitForTimeout(300); await page.locator('#tapcatch').click({ force: true }); await expect(card(page)).toHaveCount(0); };
const clearTown = async (page) => { await page.waitForTimeout(600); if (await card(page).isVisible()) await skip(page); };
/** The read-aloud box sits inside the 3D view: clear of the party cards, the controls, the Menu button and any monsters. */
async function clearOfEverything(page, what) {
  const m = await page.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, w: b.width, h: b.height }; };
    const c = document.querySelector('#caption.show.msg'); const v = document.querySelector('#view');
    const others = [...document.querySelectorAll('#party .pcard, #party > *, #controls button, #btn-menu, #targets > *')].filter((e) => e.offsetParent && e.getBoundingClientRect().width > 4 && !c.contains(e)).map((e) => ({ id: e.id || e.className, ...r(e) }));
    const cb = r(c), vb = r(v), cap = c.querySelector('.captxt');
    return { c: cb, v: vb, others, fits: cap ? cap.scrollHeight <= cap.clientHeight + 2 || getComputedStyle(c).overflowY !== 'visible' : true, font: parseFloat(getComputedStyle(c.querySelector('.captxt') || c).fontSize) };
  });
  expect(m.c.top >= m.v.top - 1 && m.c.bottom <= m.v.bottom + 1 && m.c.left >= m.v.left - 1 && m.c.right <= m.v.right + 1, `${what}: inside the 3D view`).toBe(true);
  for (const o of m.others) expect(o.right <= m.c.left + 1 || o.left >= m.c.right - 1 || o.bottom <= m.c.top + 1 || o.top >= m.c.bottom - 1, `${what}: clear of ${o.id}`).toBe(true);
  expect(m.font, `${what}: readable`).toBeGreaterThanOrEqual(15);
}

test('Dungeon Master: floor entry, boss lair read before the fight, skip by tap, once per save, kept in the save', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await clearTown(page); // the town square card, skipped by a tap
  expect(await page.evaluate(() => window.__gw.state.seen['town:square'])).toBe(1);
  // B1 entry: Raymond reads, the caption has the header, a tap skips it
  await page.evaluate(() => { const g = window.__gw; g.handle(g.G.enterDungeon(g.state, 0)); });
  await expect(card(page)).toBeVisible(); await expect(page.locator('#caption .dmhead')).toContainText('Dungeon Master');
  await expect(page.locator('#caption .captxt')).toContainText('Rat Warrens');
  await page.waitForTimeout(600); await clearOfEverything(page, 'B1 intro'); await shot(page, 'narrator', 'floor', P);
  await skip(page);
  // the lair of B1: read in full BEFORE the fight begins
  await page.evaluate(() => { const g = window.__gw, s = g.state; for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (g.G.tile(s, x, y) === 'B') { s.x = x; s.y = y; } g.handle(g.G.enterTile(s)); });
  await expect(card(page)).toBeVisible(); await expect(page.locator('#caption .captxt')).toContainText('nest');
  expect(await page.evaluate(() => !!window.__gw.combat), 'the fight waits for the reading').toBe(false);
  await page.waitForTimeout(600); await clearOfEverything(page, 'lair'); await shot(page, 'narrator', 'lair', P);
  await skip(page);
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 15000 }).toBe(true); // ...then Skarn's fight starts
  await shot(page, 'narrator', 'combat-after', P);
  expect(await page.evaluate(() => window.__gw.state.seen['dm:lair:0'])).toBe(1);
  // once per save and kept in the save: reload it and walk the same beats again, nothing is read twice
  const again = await page.evaluate(async () => { const g = window.__gw; g.state.x = 1; const s = JSON.parse(g.G.serialize(g.state)); return { seen: s.seen, v: s.version }; });
  expect(again.v).toBe(8); expect(again.seen['dm:lair:0']).toBe(1); expect(again.seen['floor:0']).toBe(1);
  expect(await page.evaluate(() => { const G = window.__gw.G, d = G.deserialize(G.serialize(window.__gw.state)); return [G.DM.beat(d, 'lair:0', { pre: true }).length, G.DM.beat(d, 'key:0').length, G.Narr.floorIntro(d, 0).some((e) => e.card)]; })).toEqual([0, 1, false]);
  expect(okErr(errors)).toEqual([]);
});

test('Dungeon Master: the Orchard and quest scenes are read in the dialogue, with Skip', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await clearTown(page);
  await page.evaluate(() => { window.__gw.runTT('glass.0'); });
  const dlg = page.locator('.dialogue'); await expect(dlg).toBeVisible();
  await expect(dlg.locator('.dmbox b')).toContainText('Dungeon Master reads aloud');
  await page.waitForTimeout(500); await shot(page, 'narrator', 'quest-scene', P);
  const voiced = await page.evaluate(() => { const l = document.querySelector('.dialogue .dlgtext p')?.textContent; return window.__gw.voice().has(l, 'dm'); });
  expect(voiced, 'the read-aloud has a recorded clip').toBe(true);
  await page.locator('#dlg-skip').click(); await expect(page.locator('.dialogue [data-choice]').first()).toBeVisible();
  expect(okErr(errors)).toEqual([]);
});

test('Companions react to a choice: voiced one-liners, approval in the Bonds panel and on the party sheet', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await clearTown(page);
  const who = await page.evaluate(() => { const g = window.__gw, s = g.state; g.G.recruitCompanion(s, 'pip'); g.G.joinLiora(s); g.refresh(); s.flags.pipKey = true; return s.party.map((c) => c.companion).filter(Boolean); });
  expect(who).toEqual(expect.arrayContaining(['liora']));
  await page.evaluate(() => { window.__gw.runTT('g.venge'); });
  const dlg = page.locator('.dialogue'); await expect(dlg).toBeVisible();
  // read on until a companion's reaction line shows
  let rx = 0; for (let i = 0; i < 20 && !rx; i++) { rx = await dlg.locator('.rx').count(); if (rx) break; const next = page.locator('#dlg-next:has-text("Next")'); if (!(await next.isVisible().catch(() => false))) break; await next.click(); await page.waitForTimeout(150); }
  expect(rx, 'a reaction tag is shown').toBeGreaterThan(0);
  expect(await dlg.locator('.rx').first().getAttribute('data-react')).toMatch(/approve|object|joke/);
  await page.waitForTimeout(400); await shot(page, 'react', 'line', P);
  const vo = await page.evaluate(() => { const l = document.querySelector('.dialogue .dlgtext p')?.textContent; const who = [...document.querySelectorAll('.dialogue .dlgtext b')][0]?.textContent; return { l, who }; });
  expect(vo.l.length).toBeGreaterThan(10);
  // finish the scene; approval moved by at most one point each
  for (let i = 0; i < 20 && (await dlg.count()); i++) { const next = page.locator('#dlg-next:has-text("Next")'); if (await next.isVisible().catch(() => false)) { await next.click(); await page.waitForTimeout(120); } else { await page.locator('.dialogue [data-choice]').first().click().catch(() => {}); await page.waitForTimeout(200); } }
  const ap = await page.evaluate(() => window.__gw.state.approval); expect(Object.keys(ap).length).toBeGreaterThan(0); for (const v of Object.values(ap)) expect(Math.abs(v)).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => window.__gw.state.seen['rx:g.venge'])).toBe(1);
  // approval is on show in the Bonds panel and the party sheet
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'bonds'));
  await expect(page.locator('#modal .approval').first()).toBeVisible(); await expect(page.locator('#modal')).toContainText(/Neutral|Friendly|Fond|Wary|Cold|Devoted/);
  await page.waitForTimeout(300); await shot(page, 'react', 'bonds', P);
  const fit = await page.evaluate(() => { const m = document.querySelector('#modal .panel, #modal > div') || document.querySelector('#modal'); const b = m.getBoundingClientRect(); return b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 && b.left >= -1; });
  expect(fit, 'Bonds panel fits the screen').toBe(true);
  expect(okErr(errors)).toEqual([]);
});
