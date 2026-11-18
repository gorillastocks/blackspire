import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors } from './helpers.js';

const dismissCards = async (page) => { for (let k = 0; k < 8 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); } };
const openCampHeal = async (page) => { await page.locator('#controls button', { hasText: 'Camp' }).first().click(); await page.locator('#modal [data-tab="heal"]').click(); await expect(page.locator('#camp-heal')).toBeVisible(); };

test('inventory stacks identical potions and the count updates after a drink', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => {
    const s = window.__gw.state;
    s.inventory = Array(9).fill('potionGreater').concat(['antitoxin', 'tinCup']);
    s.party[0].hp = Math.max(1, s.party[0].maxHp - 8);
    window.__gw.showInventory();
  });
  const modal = page.locator('#modal');
  await expect(modal).toContainText('Party Inventory');
  await expect(modal.locator('[data-inv="all"]')).toHaveText(/All \(11\)/);
  await expect(modal.locator('[data-inv="potions"]')).toHaveText(/Potions \(10\)/);
  const row = modal.locator('[data-inv-item="potionGreater"]');
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('data-inv-count', '9');
  await expect(row).toContainText('Potion of Greater Healing ×9');
  await row.locator('[data-use-potion="potionGreater"]').selectOption({ index: 1 });
  await expect(row).toHaveAttribute('data-inv-count', '8');
  await expect(row).toContainText('×8');
  await expect(modal.locator('[data-inv="all"]')).toHaveText(/All \(10\)/);
  await expect(modal.locator('[data-inv="potions"]')).toHaveText(/Potions \(9\)/);
  const inv = await page.evaluate(() => window.__gw.state.inventory.filter((k) => k === 'potionGreater').length);
  expect(inv).toBe(8);
  const serious = errors.filter((e) => !/Failed to load|vite|favicon|AudioContext/i.test(e));
  expect(serious, serious.join('\n')).toEqual([]);
});

test('camp heal drinks Greater Healing when plain potions are gone, and says none left only then', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  const errors = trackErrors(page);
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  await dismissCards(page);
  const ids = await page.evaluate(() => {
    const s = window.__gw.state;
    s.inventory = ['potionGreater', 'potionGreater', 'antitoxin', 'potionStoneFlesh'];
    for (const c of s.party) if (!c.dead) c.hp = Math.max(1, Math.floor(c.maxHp / 2));
    return { target: s.party[0].id };
  });
  await openCampHeal(page);
  const pot = page.locator('[data-heal-potion]');
  await expect(pot).toBeEnabled();
  await expect(pot).toHaveText(/healing potion \(2 left\)/);
  await expect(pot).not.toHaveText(/none left/);
  await pot.click();
  await page.locator(`[data-heal-target="${ids.target}"]`).click();
  const card = page.locator('#caption.show.loot');
  await expect(card).toBeVisible();
  await expect(card).toContainText(/1 healing potion left/);
  expect(await page.locator('#log').textContent()).toMatch(/drinks Potion of Greater Healing/);
  const left = await page.evaluate(() => window.__gw.G.healPotionCount(window.__gw.state.inventory));
  expect(left).toBe(1);
  await dismissCards(page);
  await expect(pot).toHaveText(/healing potion \(1 left\)/);
  await page.evaluate(() => {
    const s = window.__gw.state;
    s.inventory = s.inventory.filter((k) => k !== 'potionGreater');
    window.__gw.showCamp();
  });
  await expect(page.locator('[data-heal-potion]')).toBeDisabled();
  await expect(page.locator('[data-heal-potion]')).toHaveText(/none left/);
  const serious = errors.filter((e) => !/Failed to load|vite|favicon|AudioContext/i.test(e));
  expect(serious, serious.join('\n')).toEqual([]);
});
