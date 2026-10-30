// Saving partway through a run, through the real UI: Menu > Save in the middle of a floor, reload the page, Continue, and everything is back.
// Then the mid-battle case: saving is disabled in a fight, but suspending (the app is hidden) keeps the pre-fight snapshot and Continue resumes that fight.
import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, dismissCards, townSquare } from './helpers.js';

test.describe.configure({ timeout: 400000 });
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const st = (page, f, a) => page.evaluate(f, a);
const menuBtn = (page) => page.locator('#btn-menu');
const toEnd = async (page) => { for (let i = 0; i < 10; i++) { const hint = await page.locator('.dialogue .hint').first().innerText().catch(() => ''); const m = hint.match(/(\d+) \/ (\d+)/); if (!m || m[1] === m[2]) return; await page.locator('#dlg-next').click(); await page.waitForTimeout(120); } };
/** The parts of the state the player cares about, as plain JSON. */
const snap = (page) => st(page, () => { const s = window.__gw.state; const o = JSON.parse(JSON.stringify(s)); delete o.savedAt; delete o.resumeCombat; for (const c of [...o.party, ...o.roster]) if (c.equip && c.equip.helm === null) delete c.equip.helm; return o; });
const reloadAndContinue = async (page) => { await page.reload(); await page.waitForSelector('#btn-continue', { timeout: 90000 }); await page.click('#btn-continue'); await expect.poll(() => st(page, () => window.__gw.state?.mode)).toBe('dungeon'); await dismissCards(page); };

test('mid-floor save through the menu: party, inventory, quests, Journal chapters, approval, Camp Talk, Listen In, position and floor state all survive a reload', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  // Listen In at the tavern (twice), so there is heard-state to keep
  await openLocation(page, 'Tavern'); await page.locator('#modal [data-tab="bar"]').click();
  for (let i = 0; i < 2; i++) {
    await page.locator('#btn-listen').click(); await page.locator('#dlg-next, #modal .dlgout').first().waitFor();
    for (let k = 0; k < 6 && await page.locator('.dialogue').count(); k++) { await page.locator('#dlg-next').click(); await page.waitForTimeout(120); }
    await page.locator('#modal [data-tab="bar"]').click();
  }
  await page.evaluate(() => window.__gw.showTown());
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon'); await dismissCards(page);
  // walk a little, open a chest, move on to a second chapter of the Journal
  for (let i = 0; i < 3; i++) { await page.locator('#controls button', { hasText: '▲' }).first().click().catch(() => {}); await page.waitForTimeout(250); await dismissCards(page); }
  await st(page, () => { const { state: S, G } = window.__gw; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (G.tile(S, x, y) === 'C') { S.x = x; S.y = y; } G.openChest(S, true); G.Story.addJournal(S, 'B1: a chest in the Rat-Warrens gave up its secrets.'); S.bossDead[0] = true; S.gold = 4321; S.inventory.push('potionGreater'); window.__gw.refresh(); });
  // camp: a heart to heart with Brambur (approval +1, chapter 1 of his story, a Journal entry), after which he has "talked this rest"
  await page.locator('#controls button', { hasText: 'Camp' }).click(); await page.locator('#btn-talk').click(); await page.locator('[data-talk="brambur"]').click();
  await expect(page.locator('.dialogue')).toBeVisible(); await toEnd(page); await page.locator('#dlg-next').click();
  await st(page, () => window.__gw.closeModal()); await dismissCards(page);
  await st(page, () => window.__gw.closeModal());
  const before = await snap(page);
  expect(before.talk.done.brambur).toBe(1); expect(before.approval.brambur).toBeGreaterThan(0); expect(Object.keys(before.rumors.heard).length).toBeGreaterThan(0);
  expect(before.journal.map((e) => e.ch)).toEqual(expect.arrayContaining(['town', 'b1']));
  expect(before.mode).toBe('dungeon');
  // Menu > Save > slot 1, then leave for the title and reload the whole page
  await menuBtn(page).click(); await page.click('#menu-save'); await page.locator('#gmenu button[data-slot="1"]').click(); await page.click('#btn-confirm');
  await expect(page.locator('#gmenu h2')).toContainText('Saved'); await page.click('#menu-resume');
  await reloadAndContinue(page);
  const after = await snap(page);
  expect(after).toEqual(before);
  // spot checks the player would see
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'entries'));
  const ids = await page.locator('#modal details.jchap').evaluateAll((els) => els.map((e) => e.dataset.chapter)); expect(ids).toEqual(expect.arrayContaining(['town', 'b1']));
  await expect(page.locator('#modal')).toContainText('chest in the Rat-Warrens');
  await st(page, () => window.__gw.closeModal());
  // the opened chest stays opened and the floor state is the same
  expect(await st(page, () => { const { state: S, G } = window.__gw; return G.tile(S, S.x, S.y); })).toBe('o');
  // Brambur has already talked this rest; after the party rests, his next talk is chapter 2, not a repeat of chapter 1
  expect(await st(page, () => { const t = window.__gw.state.talk; return t.used.brambur === t.rest; })).toBe(true);
  await st(page, () => { window.__gw.state.talk.rest++; });
  await page.locator('#controls button', { hasText: 'Camp' }).click(); await page.locator('#btn-talk').click(); await page.locator('[data-talk="brambur"]').click();
  await expect(page.locator('.dialogue .hint').first()).toContainText(/1 \/ \d/); await toEnd(page); await page.locator('#dlg-next').click();
  expect(await st(page, () => window.__gw.state.talk.done.brambur)).toBe(2);
  expect(okErr(errors)).toEqual([]);
});

test('mid-battle: Save is disabled in a fight, but suspending keeps the pre-fight snapshot and Continue resumes that fight at the same spot', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon'); await dismissCards(page);
  await st(page, () => { window.__gw.state.gold = 777; });
  const pre = await st(page, () => { const s = window.__gw.state; return { x: s.x, y: s.y, dir: s.dir, level: s.level, gold: s.gold, hp: s.party.map((c) => c.hp), inv: s.inventory.slice() }; });
  await st(page, () => window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 2 }], random: true }));
  await expect.poll(() => st(page, () => !!window.__gw.combat), { timeout: 60000 }).toBe(true);
  await menuBtn(page).click(); await expect(page.locator('#gmenu .warn')).toContainText('Saving is disabled'); await expect(page.locator('#menu-save')).toBeDisabled(); await page.click('#menu-resume');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide'))); // the app is hidden mid-fight
  const saved = await st(page, () => JSON.parse(localStorage.getItem('blackspire.save.v1')));
  expect(saved.resumeCombat?.groups?.[0]).toEqual({ key: 'giantRat', count: 2 });
  expect(saved.party.map((c) => c.hp)).toEqual(pre.hp); // pre-fight party, not the half-fought one
  await page.reload(); await page.waitForSelector('#btn-continue', { timeout: 90000 }); await page.click('#btn-continue');
  await expect.poll(() => st(page, () => !!window.__gw.combat), { timeout: 90000 }).toBe(true);
  expect(await st(page, () => { const s = window.__gw.state; return { x: s.x, y: s.y, dir: s.dir, level: s.level, gold: s.gold, hp: s.party.map((c) => c.hp), inv: s.inventory.slice() }; })).toEqual(pre);
  expect(await st(page, () => window.__gw.state.resumeCombat)).toBeUndefined(); // the flag is used up
  // play it out; the game goes on and a fresh save afterwards has no stale flag
  const fight = page.locator('#btn-fightit'); if (await fight.isVisible().catch(() => false)) await fight.click(); // a wandering fight is offered first, as it was before the save
  await st(page, () => { for (const c of window.__gw.state.party) c.ai = true; });
  await page.evaluate(() => document.querySelector('#autobtn')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await page.waitForFunction(() => !window.__gw.combat, null, { timeout: 240000 });
  await dismissCards(page);
  await menuBtn(page).click(); await page.click('#menu-save'); await page.locator('#gmenu button[data-slot="2"]').click(); await page.click('#btn-confirm'); await page.click('#menu-resume');
  expect(await st(page, () => localStorage.getItem('blackspire.save.slot2') || localStorage.getItem('blackspire.save.v1'))).not.toMatch(/resumeCombat/);
  expect(okErr(errors)).toEqual([]);
});
