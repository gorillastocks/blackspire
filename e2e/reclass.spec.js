import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';
// Training Grounds Re-class for the player's own hero (and companions): same level, 50 gp per level, name / portrait / voice kept.
// GW_URL points the spec at another preview server (default: the config's). Screenshots go to /workspace/shots.
test.use({ storageState: { cookies: [], origins: [] }, ...(process.env.GW_URL ? { baseURL: process.env.GW_URL } : {}) });
const shot = async (page, path) => { for (let i = 0; i < 8; i++) { try { await page.screenshot({ path, timeout: 20000 }); return; } catch (e) { await page.waitForTimeout(1500); } } };
const hero = (page) => page.evaluate(() => { const g = window.__gw, h = g.G.heroOf(g.state); return { id: h.id, cls: h.cls, name: h.name, voice: h.voicePack, portrait: h.portrait, level: h.level, gold: g.state.gold, leader: g.state.party.indexOf(h) }; });

test('Re-class the player hero at the Training Grounds', async ({ page }, info) => {
  test.setTimeout(240000); const errors = trackErrors(page); const P = info.project.name;
  await newGame(page); await page.waitForTimeout(800);
  const tip = page.locator('#tip-skip'); if (await tip.isVisible()) await tip.click();
  const card = page.locator('#caption.show.msg'); if (await card.isVisible()) await page.locator('#tapcatch').click({ force: true });
  await page.evaluate(() => window.__gw.showTown('train'));
  const before = await hero(page);
  await expect(page.locator(`button[data-reclass="${before.id}"]`)).toBeVisible();
  for (let i = 0; i < 3; i++) if (await card.isVisible()) { await page.locator('#tapcatch').click({ force: true }); await page.waitForTimeout(400); }
  await page.locator(`button[data-reclass="${before.id}"]`).click();
  await expect(page.locator('button[data-class]').first()).toBeVisible(); await expect(page.locator('button[data-class="fighter"]')).toHaveCount(0);
  await shot(page, `/workspace/shots/player-reclass${P === 'iphone' ? '' : '-' + P}.png`);
  await page.locator('button[data-class="wizard"]').click();
  await expect(page.locator(`button[data-reclass="${before.id}"]`)).toBeVisible();
  const after = await hero(page);
  expect(after.cls).toBe('wizard'); expect(after.id).toBe(before.id); expect(after.name).toBe(before.name); expect(after.voice).toBe(before.voice);
  expect(after.portrait).toBe(before.portrait); expect(after.leader).toBe(before.leader); expect(after.gold).toBe(before.gold - 50 * before.level);
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
