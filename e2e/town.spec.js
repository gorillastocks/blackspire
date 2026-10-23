import { test, expect } from '@playwright/test';
import { trackErrors, expectReachable, townSquare, newGame, LOCATIONS, openLocation, recoverToTown } from './helpers.js';

test.describe.configure({ timeout: 300000 });

test('every town location + sub-screen has a working, reachable Back; then enter the dungeon', async ({ page }, info) => {
  const errors = trackErrors(page);
  await newGame(page);

  // Inn is an action on the square (no sub-screen): must leave us on the square.
  await page.locator('#modal button', { hasText: 'Inn' }).click();
  await expect(townSquare(page)).toBeVisible();

  for (const loc of LOCATIONS) {
    await openLocation(page, loc.button);
    for (const where of ['top', 'bottom']) {
      const back = page.locator(`#modal .backbtn[data-back="${where}"]`);
      await expectReachable(page, back, `${loc.key} Back (${where})`);
    }
    await page.screenshot({ path: `screenshots/town-${info.project.name}-${loc.key}.png` });
    await page.locator('#modal .backbtn[data-back="bottom"]').click();
    await expect(townSquare(page), `back from ${loc.key}`).toBeVisible();
  }

  // Training Grounds: each "Sheet" sub-dialog must close back INTO the Training Grounds (the reported trap)
  await openLocation(page, 'Training Grounds');
  const sheets = page.locator('#modal button', { hasText: /^Sheet$/ });
  const n = await sheets.count(); expect(n).toBe(4);
  for (let i = 0; i < n; i++) {
    await sheets.nth(i).click();
    const close = page.locator('#modal .closebtn');
    await expectReachable(page, close, `Sheet ${i} close`);
    if (i === 0) await page.screenshot({ path: `screenshots/town-${info.project.name}-train-sheet.png` });
    // the sheet's own party tabs must also keep a working close
    await page.locator('#modal .tabs button').last().click();
    await page.locator('#modal .closebtn').click();
    await expect(page.locator('#modal .backbtn').first(), 'returned to Training Grounds').toBeVisible();
    await expect(page.locator('#modal h2').first()).toContainText('Training Grounds');
  }
  // Level-up flow
  await page.evaluate(() => { for (const c of window.__gw.state.party) c.xp = 300; });
  await page.locator('#modal .backbtn').first().click(); await openLocation(page, 'Training Grounds');
  const train = page.locator('#modal button', { hasText: /Train .* to level 2/ });
  expect(await train.count()).toBe(4);
  for (let i = 0; i < 4; i++) { await train.first().click(); await expect(page.locator('#modal h2').first()).toContainText('Training Grounds'); }
  expect(await page.evaluate(() => window.__gw.state.party.map((c) => c.level))).toEqual([2, 2, 2, 2]);
  await expectReachable(page, page.locator('#modal .backbtn').first(), 'Back after level-ups');

  // Party cards (sidebar) open a sheet from any town screen; closing must restore that screen
  // (on phones the town panel is full-screen, so the sidebar is intentionally under it)
  if (!info.project.name.startsWith('iphone')) {
    await page.locator('#party .card').first().click({ position: { x: 20, y: 30 } });
    await page.locator('#modal .closebtn').click();
    await expect(page.locator('#modal h2').first()).toContainText('Training Grounds');
  }

  // Esc: from a sheet → back to the sub-screen; from a sub-screen → town square
  if (!info.project.name.startsWith('iphone')) {
    await page.locator('#modal button', { hasText: /^Sheet$/ }).first().click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal h2').first()).toContainText('Training Grounds');
    await page.keyboard.press('Escape');
    await expect(townSquare(page)).toBeVisible();
  } else {
    await page.locator('#modal .backbtn').first().click();
  }

  // Shop sub-actions keep the shop open with Back
  await openLocation(page, 'Trading Post');
  await page.locator('#modal button', { hasText: 'Potion of Healing' }).first().click();
  await expectReachable(page, page.locator('#modal .backbtn').first(), 'shop Back after buying');
  await recoverToTown(page, 'shop');

  // Enter the dungeon
  await openLocation(page, 'Edge of Town');
  await page.click('#btn-enter');
  await expect(page.locator('#controls button').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('existing saves load into the town square (never stuck in Training Grounds)', async ({ page }) => {
  const errors = trackErrors(page);
  await newGame(page);
  await openLocation(page, 'Training Grounds');
  // a save made while on the training screen, plus an older/odd save shape
  await page.evaluate(() => { const s = window.__gw.state; const old = JSON.parse(JSON.stringify(s)); old.mode = 'train'; delete old.explored; delete old.mods; localStorage.setItem('grokwizard.save.v1', JSON.stringify(old)); });
  await page.reload(); await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.locator('#modal button', { hasText: 'Continue' }).click();
  await expect(townSquare(page)).toBeVisible();
  await openLocation(page, 'Training Grounds');
  await page.locator('#modal .backbtn').first().click();
  await expect(townSquare(page)).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('click-through: every visible button on every town screen leaves a way back to town', async ({ page }) => {
  test.setTimeout(900000);
  const errors = trackErrors(page);
  await newGame(page);
  const SKIP = /Title Screen|Load Game|Descend the stairs|Mine lift|^Begin|✕/;
  const screens = [null, ...LOCATIONS.map((l) => l.button)];
  let clicked = 0;
  for (const scr of screens) {
    await recoverToTown(page, 'start');
    if (scr) await openLocation(page, scr);
    const labels = await page.locator('#modal button:visible').evaluateAll((bs) => bs.map((b) => (b.disabled ? null : b.textContent.trim())));
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i]; if (!label || SKIP.test(label)) continue;
      await recoverToTown(page, 'reset'); if (scr) await openLocation(page, scr);
      const btn = page.locator('#modal button:visible').nth(i);
      if (!(await btn.count()) || (await btn.isDisabled()) || (await btn.textContent()).trim() !== label) continue;
      await btn.click(); clicked++;
      // one level deeper: also click everything on any dialog it opened (sheets, tabs…)
      const inner = await page.locator('#modal button:visible').evaluateAll((bs) => bs.map((b) => (b.disabled ? null : b.textContent.trim())));
      for (let j = 0; j < Math.min(inner.length, 12); j++) {
        const l2 = inner[j]; if (!l2 || SKIP.test(l2) || /Back to Town/.test(l2)) continue;
        const b2 = page.locator('#modal button:visible').nth(j);
        if (!(await b2.count()) || (await b2.isDisabled())) continue;
        if ((await b2.textContent()).trim() !== l2) continue;
        await b2.click(); clicked++;
      }
      await recoverToTown(page, `${scr || 'square'} → "${label}"`);
    }
  }
  expect(clicked).toBeGreaterThan(30);
  expect(errors, errors.join('\n')).toEqual([]);
});
