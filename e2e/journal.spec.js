// The Journal log: the full log (no cap), grouped by chapter with collapsible headers. Screenshots: /workspace/shots/journal-<name>-<project>.png
import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const shot = async (page, name, P) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/journal-${name}-${P}.png`, timeout: 15000 }); return; } catch (e) { await page.waitForTimeout(1500); } } };

test('Journal log: grouped by chapter, collapsible, newest chapter first, nothing trimmed', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await page.evaluate(() => {
    const g = window.__gw, s = g.state; s.journal = [{ t: 0, moon: 0, text: 'A loose old note from before chapters.' }]; g.G.deserialize; // an old save's entry, filed under Earlier below
    g.G.Story.addJournal(s, 'Harvest night: Malthrax abducted Princess Elowen.');
    for (let i = 0; i < 150; i++) g.G.Story.addJournal(s, `Town note ${i}: the square is quiet.`);
    for (let lv = 0; lv < 3; lv++) { s.mode = 'dungeon'; s.level = lv; for (let i = 0; i < 4; i++) g.G.Story.addJournal(s, `Floor ${lv + 1} note ${i}: something stirs.`); }
    s.mode = 'town'; s.level = 0; g.G.migrateV8(s);
  });
  expect(await page.evaluate(() => window.__gw.state.journal.length), 'no 120 cap').toBeGreaterThan(150);
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'entries'));
  const chaps = page.locator('#modal details.jchap'); await expect(chaps.first()).toBeVisible();
  const ids = await chaps.evaluateAll((els) => els.map((e) => e.dataset.chapter)); expect(ids).toEqual(['b3', 'b2', 'b1', 'town', 'earlier']);
  expect(await chaps.first().evaluate((e) => e.open), 'newest chapter open').toBe(true); expect(await chaps.nth(1).evaluate((e) => e.open)).toBe(false);
  await expect(chaps.first().locator('.jentry').first()).toContainText('Floor 3 note 3'); // newest first within a chapter
  await page.waitForTimeout(300); await shot(page, 'chapters', P);
  // expand the town chapter: all 151 entries are there, and a header is a big enough tap target
  const town = page.locator('#modal details[data-chapter="town"]'); const sb = await town.locator('summary').boundingBox(); expect(sb.height).toBeGreaterThanOrEqual(30);
  await town.locator('summary').click(); expect(await town.evaluate((e) => e.open)).toBe(true);
  expect(await town.locator('.jentry').count()).toBeGreaterThanOrEqual(151);
  await town.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await shot(page, 'town-open', P);
  // collapse again; the choice is remembered when the tab is re-opened
  await town.locator('summary').click(); expect(await town.evaluate((e) => e.open)).toBe(false);
  await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'quests')); await page.evaluate(() => window.__gw.showJournal(() => window.__gw.closeModal?.(), 'entries'));
  expect(await page.locator('#modal details[data-chapter="town"]').evaluate((e) => e.open)).toBe(false);
  // layout: the panel and the headers fit the screen width
  const fit = await page.evaluate(() => [...document.querySelectorAll('#modal details.jchap > summary')].every((e) => { const b = e.getBoundingClientRect(); return b.left >= -1 && b.right <= innerWidth + 1; }));
  expect(fit, 'chapter headers fit').toBe(true);
  expect(okErr(errors)).toEqual([]);
});
