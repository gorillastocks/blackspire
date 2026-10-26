import { test, expect } from '@playwright/test';
import { skipPrologue, openLocation, trackErrors, townSquare } from './helpers.js';
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const st = (page, fn, a) => page.evaluate(fn, a);
const noHScroll = (page) => st(page, () => { const m = document.querySelector('#modal .panel') || document.querySelector('#modal'); return [...document.querySelectorAll('#modal .spellopt, #modal .spellbtns')].every((e) => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= window.innerWidth + 1; }) && m.scrollWidth <= m.clientWidth + 1; });

test('spell picker: sorcerer creation, level-up (new pick + one swap) at Training Grounds, cleric prepares at camp; combat lists only prepared', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 }); await page.click('#btn-new');
  await page.selectOption('#ccls', 'sorcerer'); await page.click('#btn-begin');
  // creation picker with recommended defaults
  await expect(page.locator('[data-count="spells"]')).toHaveText('2/2');
  await expect(page.locator('[data-count="cantrips"]')).toHaveText('3/3');
  await expect(page.locator('#modal .spmeta').first()).toContainText('Cantrip · Evocation');
  await expect(page.locator('#modal .spdesc').first()).not.toBeEmpty();
  expect(await noHScroll(page), 'picker fits the screen width').toBe(true);
  await shot(page, { path: `/workspace/shots/spells-create-${P}.png` });
  await page.locator('[data-spell^="spells:"][aria-pressed="true"]').first().click();
  await expect(page.locator('[data-count="spells"]')).toHaveText('1/2'); await expect(page.locator('#btn-spell-ok')).toBeDisabled();
  await page.click('#btn-spell-auto'); await expect(page.locator('#btn-spell-ok')).toBeEnabled();
  await expect(page.locator('[data-spell^="spells:"][aria-pressed="false"]').first(), "can't add a 3rd").toBeDisabled();
  await page.click('#btn-spell-rec');
  // choose Sleep + Thunderwave by hand
  for (const b of await page.locator('[data-spell^="spells:"][aria-pressed="true"]').all()) void b;
  while (await page.locator('[data-spell^="spells:"][aria-pressed="true"]').count()) await page.locator('[data-spell^="spells:"][aria-pressed="true"]').first().click();
  await page.click('[data-spell="spells:sleep"]'); await page.click('[data-spell="spells:thunderwave"]');
  await page.click('#btn-spell-ok');
  await skipPrologue(page); await expect(townSquare(page)).toBeVisible();
  const skip = page.locator('#tip-skip'); if (await skip.isVisible()) await skip.click();
  expect(await st(page, () => window.__gw.state.party[0].spells.slice().sort())).toEqual(['sleep', 'thunderwave']);

  // level-up at the Training Grounds -> 3 known, may swap one
  await st(page, () => { window.__gw.state.party[0].xp = 300; window.__gw.state.gold = 5000; });
  await openLocation(page, 'Training Grounds');
  await page.locator('#modal button', { hasText: /Train .* to level 2/ }).first().click();
  await expect(page.locator('[data-count="spells"]')).toHaveText('3/3');
  await expect(page.locator('[data-spell^="spells:"]', { hasText: '·known' })).toHaveCount(2);
  await page.click('[data-spell="spells:thunderwave"]'); // swap out one
  await expect(page.locator('[data-spell="spells:sleep"]'), 'only one swap allowed').toBeDisabled();
  await page.click('[data-spell="spells:magicMissile"]').catch(() => {});
  if ((await page.locator('[data-count="spells"]').textContent()) !== '3/3') await page.click('#btn-spell-auto');
  await shot(page, { path: `/workspace/shots/spells-levelup-${P}.png` });
  expect(await noHScroll(page)).toBe(true);
  await page.click('#btn-spell-ok');
  const known = await st(page, () => window.__gw.state.party[0].spells);
  expect(known.length).toBe(3); expect(known).toContain('sleep'); expect(known).not.toContain('thunderwave');

  // camp: the cleric companion (AI) prepares spells
  await page.locator('#modal .backbtn:visible').first().click().catch(() => {});
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon');
  for (let k = 0; k < 8 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  await page.locator('#controls button', { hasText: 'Camp' }).first().click();
  await expect(page.locator('#camp-prepare')).toBeVisible();
  const clId = await st(page, () => window.__gw.state.party.find((c) => c.cls === 'cleric').id);
  await page.locator(`#modal [data-prepare="${clId}"]`).click();
  await expect(page.locator('[data-section="prepared"]')).toBeVisible();
  await expect(page.locator('[data-section="cantrips"]')).toHaveCount(0);
  const prepN = await st(page, () => window.__gw.state.party.find((c) => c.cls === 'cleric').prepared.length);
  while (await page.locator('[data-spell^="prepared:"][aria-pressed="true"]').count()) await page.locator('[data-spell^="prepared:"][aria-pressed="true"]').first().click();
  await expect(page.locator('[data-count="prepared"]')).toHaveText(`0/${prepN}`);
  await page.click('[data-spell="prepared:inflictWounds"]');
  await page.click('#btn-spell-auto'); await shot(page, { path: `/workspace/shots/spells-prepare-${P}.png` });
  expect(await noHScroll(page)).toBe(true);
  await page.click('#btn-spell-ok');
  const cl = await st(page, () => { const c = window.__gw.state.party.find((x) => x.cls === 'cleric'); return { prepared: c.prepared, active: window.__gw.knownSpells(c) }; });
  expect(cl.prepared).toContain('inflictWounds'); expect(cl.prepared.length).toBe(prepN);
  for (const k of ['bless', 'cureWounds', 'healingWord', 'guidingBolt', 'shieldOfFaith', 'inflictWounds']) expect(cl.active.includes(k)).toBe(cl.prepared.includes(k));
  await expect(page.locator('#camp-prepare')).toBeVisible();
  expect(errors).toEqual([]);
});

test('old save migration: casters keep trimmed spells, no crash', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 }); await page.click('#btn-new'); await page.click('#btn-begin'); await skipPrologue(page);
  await expect(townSquare(page)).toBeVisible();
  const raw = await st(page, () => { const s = JSON.parse(window.__gw.G.serialize(window.__gw.state)); for (const c of s.party) { delete c.cantrips; delete c.spells; delete c.prepared; delete c.spellsInit; c.level = 5; c.maxSlots = c.slots = []; } return JSON.stringify(s); });
  await st(page, (r) => window.__gw.loadState(r), raw);
  const res = await st(page, () => window.__gw.state.party.map((c) => ({ cls: c.cls, n: window.__gw.knownSpells(c).length })));
  for (const r of res) if (['cleric', 'wizard', 'bard', 'druid', 'sorcerer', 'warlock'].includes(r.cls)) expect(r.n, r.cls).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
