import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, townSquare, expectReachable, auditText } from './helpers.js';

test.describe.configure({ timeout: 400000 });
const st = (page, f) => page.evaluate(f);

test('tavern recruiting: dismiss dead to roster, hire, create recruit, max 4, temple raise, AI toggle', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name; const minPx = P.startsWith('iphone') ? 16 : 13;
  await newGame(page);
  // two companions die
  await st(page, () => { const s = window.__gw.state; s.party.filter((c) => c.companion).slice(0, 2).forEach((c) => { c.dead = true; c.hp = 0; }); });
  await openLocation(page, 'Tavern');
  for (let i = 0; i < 2; i++) {
    const n = await st(page, () => window.__gw.state.party.findIndex((c) => c.dead));
    const d = page.locator('#modal .row button.dismiss').nth(n - (await st(page, () => window.__gw.state.party.findIndex((c) => !c.companion && !c.recruit)) < n ? 1 : 0));
    await expectReachable(page, d, 'Dismiss'); await d.click();
  }
  expect(await st(page, () => [window.__gw.state.party.length, window.__gw.state.roster.filter((c) => c.dead).length])).toEqual([2, 2]);
  await expect(page.locator('#roster')).toContainText('DEAD');
  await page.screenshot({ path: `screenshots/recruit-${P}-tavern-roster.png` });
  await auditText(page, '#modal .panel', minPx);

  // hire a pre-made companion
  const z = page.locator('#modal button[data-recruit="zizzy"]'); await expectReachable(page, z, 'Recruit Zizzy'); await z.click();
  await expect(page.locator('#modal h2').first()).toContainText('Tavern');
  // create a brand-new recruit with the full creator
  await expectReachable(page, page.locator('#btn-new-recruit'), 'Create recruit'); await page.click('#btn-new-recruit');
  await page.fill('#cname', 'Testy McRecruit'); await page.selectOption('#crace', 'tiefling'); await page.selectOption('#ccls', 'cleric');
  await page.click('#btn-roll');
  await page.screenshot({ path: `screenshots/recruit-${P}-creator.png` });
  await auditText(page, '#modal .panel', minPx);
  await expectReachable(page, page.locator('#btn-recruit-create'), 'Recruit ▶'); await page.click('#btn-recruit-create');
  await expect(page.locator('#modal h2').first()).toContainText('Tavern');
  const party = await st(page, () => window.__gw.state.party.map((c) => ({ n: c.name, r: !!c.recruit, ai: c.ai, cls: c.cls, race: c.race })));
  expect(party.length).toBe(4); expect(party.find((c) => c.r)).toMatchObject({ n: 'Testy McRecruit', cls: 'cleric', race: 'tiefling', ai: true });
  // full party: hiring goes to the roster, rejoin is disabled
  await page.locator('#modal button[data-recruit="grumsh"]').click();
  expect(await st(page, () => [window.__gw.state.party.length, window.__gw.state.roster.length])).toEqual([4, 3]);
  expect(await page.locator('#roster button', { hasText: 'Join party' }).first().isDisabled()).toBe(true);
  // AI/YOU toggle on the recruit's row
  const tog = page.locator('#modal .row', { hasText: 'Testy McRecruit' }).locator('button.aitog'); await tog.click();
  expect(await st(page, () => window.__gw.state.party.find((c) => c.recruit).ai)).toBe(false);
  await page.screenshot({ path: `screenshots/recruit-${P}-tavern-full.png` });
  await auditText(page, '#modal .panel', minPx);
  // swap: dismiss Zizzy, a dead member rejoins, then the Temple raises them (roster members too)
  await page.locator('#modal .row', { hasText: /^.*Zizzy/ }).locator('button.dismiss').first().click();
  await page.locator('#roster button', { hasText: 'Join party' }).first().click();
  expect(await st(page, () => window.__gw.state.party.filter((c) => c.dead).length)).toBe(1);
  await page.locator('#modal .backbtn').first().click(); await openLocation(page, 'Temple');
  const raise = page.locator('#modal button', { hasText: 'Raise Dead' }); expect(await raise.count()).toBe(2);
  await raise.first().click(); expect(await raise.count()).toBe(1);
  await page.locator('#modal .backbtn').first().click(); await expect(townSquare(page)).toBeVisible();
  // creator also reachable from the Training Grounds; Close returns there
  await openLocation(page, 'Training Grounds'); await page.click('#btn-train-recruit');
  await page.locator('#modal .closebtn').click(); await expect(page.locator('#modal h2').first()).toContainText('Training Grounds');
  // survives save + reload
  await page.locator('#modal .backbtn').first().click();
  await page.locator('#modal button', { hasText: 'Save Game' }).click();
  await page.reload(); await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.locator('#modal button', { hasText: 'Continue' }).click(); await expect(townSquare(page)).toBeVisible();
  expect(await st(page, () => [window.__gw.state.party.length, window.__gw.state.roster.length])).toEqual([4, 3]);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('level-up ready badge on card + sheet, one-time notice, also after combat', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  await st(page, () => { const s = window.__gw.state; s.party[0].xp = 300; s.party[1].xp = 299; });
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon');
  const badge = page.locator('#party .lvlready');
  await expect(badge).toHaveCount(1); await expect(badge.first()).toContainText('Ready to level up! Make camp or visit the Training Grounds');
  await expectReachable(page, badge.first(), 'level-up badge');
  await auditText(page, '#party .lvlready', P.startsWith('iphone') ? 14 : 12);
  await page.screenshot({ path: `screenshots/levelup-${P}-badge.png` });
  const notices = () => page.locator('#log div', { hasText: 'is ready to level up' }).count();
  expect(await notices()).toBe(1);
  // a fight pushes the second member over the line: exactly one new notice
  await st(page, () => { for (const c of window.__gw.state.party) c.ai = true; window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }] }); });
  await expect.poll(() => st(page, () => !!window.__gw.combat || window.__gw.state.party[1].xp > 299), { timeout: 30000 }).toBe(true);
  await page.waitForFunction(() => !window.__gw.combat, null, { timeout: 180000 });
  await expect(badge).toHaveCount(2); expect(await notices()).toBe(2);
  // sheet shows it too
  await badge.first().locator('xpath=..').click({ position: { x: 10, y: 10 } });
  const sb = page.locator('#modal .sheetready'); await expect(sb).toBeVisible(); await expectReachable(page, sb, 'sheet badge');
  await auditText(page, '#modal .sheetready', P.startsWith('iphone') ? 16 : 13);
  await page.screenshot({ path: `screenshots/levelup-${P}-sheet.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('level up at camp in the dungeon (same logic as Training Grounds), camp buttons click-through', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name; const minPx = P.startsWith('iphone') ? 16 : 13;
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => st(page, () => window.__gw.state.mode)).toBe('dungeon');
  const wiz = await st(page, () => { const s = window.__gw.state; const w = s.party.find((c) => c.cls === 'wizard'); w.xp = 900; s.party[0].xp = 300; return { id: w.id, hp: w.maxHp, slots: w.maxSlots.length }; });
  const openCamp = async () => { await page.locator('#controls button', { hasText: 'Camp' }).click(); await expect(page.locator('#modal h2').first()).toContainText('Camp'); };
  await openCamp();
  const lv = page.locator('#modal button.levelup'); await expect(lv).toHaveCount(2);
  await expectReachable(page, lv.first(), 'camp Level Up');
  await page.locator('#camp-levelup').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `screenshots/camp-levelup-${P}.png` });
  await auditText(page, '#modal .panel', minPx);
  // wizard: one level per click (900 XP = enough for 2 → 3)
  const wb = page.locator(`#modal button[data-levelup="${wiz.id}"]`);
  await expect(wb).toContainText('to level 2'); await wb.click();
  let w = await st(page, () => window.__gw.state.party.find((c) => c.cls === 'wizard'));
  expect(w.level).toBe(2); expect(w.maxHp).toBeGreaterThan(wiz.hp);
  await expect(page.locator('#modal .dlgout')).toContainText('reaches level 2');
  await expect(wb).toContainText('to level 3'); await wb.click();
  w = await st(page, () => window.__gw.state.party.find((c) => c.cls === 'wizard'));
  expect(w.level).toBe(3); expect(w.maxSlots.length).toBeGreaterThan(wiz.slots);
  await page.locator('#modal button.levelup').first().click();
  await expect(page.locator('#modal button.levelup')).toHaveCount(0);
  await expect(page.locator('#modal .panel')).toContainText('Nobody has enough XP');
  expect(await st(page, () => window.__gw.state.party[0].level)).toBe(2);
  await expect(page.locator('#party .lvlready')).toHaveCount(0);
  await page.screenshot({ path: `screenshots/camp-levelup-${P}-done.png` });
  // click-through: every camp button leaves a working Close
  const SKIP = /Load|Rest|✕/; // rests can roll a wandering-monster fight
  const labels = await page.locator('#modal button:visible').evaluateAll((bs) => bs.map((b) => (b.disabled ? null : b.textContent.trim())));
  let clicked = 0;
  for (const label of labels) {
    if (!label || SKIP.test(label)) continue;
    if (!(await page.locator('#modal h2', { hasText: 'Camp' }).count())) { if (await st(page, () => !!window.__gw.combat)) break; const cl = page.locator('#modal .closebtn:visible'); if (await cl.count()) await cl.first().click(); await openCamp(); }
    const b = page.locator('#modal button:visible', { hasText: label }).first();
    if (!(await b.count()) || (await b.isDisabled())) continue;
    await b.click(); clicked++;
    if (await st(page, () => !!window.__gw.combat)) break;
    const close = page.locator('#modal .closebtn:visible');
    if (await close.count()) { await expectReachable(page, close.first(), `Close after camp "${label}"`); }
  }
  expect(clicked).toBeGreaterThan(5);
  expect(errors, errors.join('\n')).toEqual([]);
});
