import { test, expect } from '@playwright/test';

test('smoke: title → create → town → dungeon → combat → sheet, no console errors', async ({ page }, info) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (n) => page.screenshot({ path: `screenshots/${info.project.name}-${n}.png` });
  await page.goto('./');
  await page.waitForSelector('#btn-new', { timeout: 60000 });
  await page.waitForTimeout(2500); await shot('01-title');
  await page.click('#btn-new'); await page.click('#btn-roll'); await page.fill('#cname', 'Grokalot');
  await page.selectOption('#crace', 'halfOrc'); await page.waitForTimeout(300); await shot('02-create');
  await page.click('#btn-begin');
  await page.click('#btn-tavern'); await page.waitForTimeout(800); await shot('03-tavern-party');
  await page.click('text=Back to Town Square');
  await page.click('#btn-edge'); await page.click('#btn-enter');
  await page.waitForTimeout(2500);
  // walk around a bit
  for (const k of ['d', 'w', 'w', 'a', 'w']) { await page.keyboard.press(k); await page.waitForTimeout(250); }
  await page.evaluate(() => { const m = document.querySelector('#modal'); if (m && !m.classList.contains('hidden') && !window.__gw.combat) { m.className = 'hidden'; m.innerHTML = ''; } });
  await page.waitForTimeout(1500); await shot('04-dungeon');
  // force an encounter with colorful monsters
  await page.evaluate(() => { if (!window.__gw.combat) window.__gw.startCombat({ groups: [{ key: 'giantWasp', count: 2 }, { key: 'giantWolfSpider', count: 1 }] }); });
  await page.waitForSelector('.combatmenu', { timeout: 60000 });
  await page.waitForTimeout(1500); await shot('05-combat');
  // the wasp model must actually be in the arena with a sane size
  const wasp = await page.evaluate(() => { const vs = [...window.__gw.R.monsterObjs.values()]; return { n: vs.length, scale: Math.min(...vs.map((v) => v.o.scale.x)), y: vs.map((v) => v.o.position.y) }; });
  expect(wasp.n === 3 && Number.isFinite(wasp.scale) && wasp.scale > 0.01 && wasp.y.every(Number.isFinite), JSON.stringify(wasp)).toBeTruthy();
  // the combat menu must not cover the combat log
  const lb = await page.locator('#log').boundingBox(); const mb = await page.locator('#cmenu').boundingBox();
  expect(lb && mb).toBeTruthy();
  const overlap = !(mb.x >= lb.x + lb.width - 1 || mb.x + mb.width <= lb.x + 1 || mb.y >= lb.y + lb.height - 1 || mb.y + mb.height <= lb.y + 1);
  expect(overlap, `menu ${JSON.stringify(mb)} log ${JSON.stringify(lb)}`).toBe(false);
  expect(lb.height).toBeGreaterThan(40);
  // pick first action (attack/shoot) for the hero, then auto-battle
  await page.click('#cmenu .combatmenu button:has-text("Fast")');
  await page.waitForSelector('#cmenu .combatmenu', { timeout: 60000 }).catch(() => {});
  const auto = page.locator('#cmenu .combatmenu button:has-text("Auto-battle")'); if (await auto.count()) await auto.first().click();
  await page.waitForFunction(() => !window.__gw.combat, null, { timeout: 120000 });
  await page.waitForTimeout(1000); await shot('06-after-combat');
  await page.evaluate(() => { const m = document.querySelector('#modal'); m.className = 'hidden'; });
  await page.keyboard.press('i'); await page.waitForTimeout(300);
  await page.click('.tabs button >> nth=3'); await page.waitForTimeout(400); await shot('07-sheet');
  await page.keyboard.press('Escape');
  await page.keyboard.press('m'); await page.waitForTimeout(300); await shot('08-map');
  expect(errors, errors.join('\n')).toEqual([]);
});
