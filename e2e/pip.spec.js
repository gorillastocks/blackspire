// Pip Tealeaf is a woman: her portrait is the painted female halfling rogue (p37), in the party list, her sheet and the hire card; no male pronouns for her in the tabletop quest text.
// Screenshots: /workspace/shots/pip-female-<project>-{sheet,party,hire}.png
import { test, expect } from '@playwright/test';
import { newGame, openLocation } from './helpers.js';
const shot = async (page, name) => { for (let i = 0; i < 6; i++) { try { await page.screenshot({ path: `/workspace/shots/${name}.png`, timeout: 15000 }); return; } catch (e) { await page.mouse.move(1, 1); await page.waitForTimeout(800); } } };

test('Pip: female portrait everywhere, old saves migrate', async ({ page }, info) => {
  const P = info.project.name; await newGame(page);
  expect(await page.evaluate(() => window.__gw.state.party.find((c) => c.companion === 'pip').portrait)).toBe(37);
  await openLocation(page, 'Tavern');
  const pip = page.locator('#modal .partyrow', { hasText: 'Pip' }).locator('img.pimg'); await expect(pip).toHaveAttribute('src', /p37\.webp/);
  await page.locator('#modal .partyrow', { hasText: 'Pip' }).scrollIntoViewIfNeeded(); await shot(page, `pip-female-${P}-party`);
  // an old save with Pip on the male portrait gets the new one
  const migrated = await page.evaluate(() => { const g = window.__gw; const s = JSON.parse(JSON.stringify(g.state)); s.party.find((c) => c.companion === 'pip').portrait = 14; return g.G.deserialize(JSON.stringify(s)).party.find((c) => c.companion === "pip").portrait; });
  expect(migrated).toBe(37);
  // the hire card shows her too once she waits at the bar
  await page.evaluate(() => { const g = window.__gw; const i = g.state.party.findIndex((c) => c.companion === 'pip'); g.state.party.splice(i, 1); g.showTown('tavern'); });
  await page.locator('#modal [data-tab="hire"]').click(); await expect(page.locator('#modal .hirecard img.hirepic[src*="p37"]')).toBeVisible();
  await page.locator('#modal .hirecard', { hasText: 'Pip' }).scrollIntoViewIfNeeded(); await shot(page, `pip-female-${P}-hire`);
  await page.locator('#modal button[data-recruit="pip"]').click();
  await page.locator('#modal [data-tab="party"]').click();
  await page.locator('#modal .partyrow', { hasText: 'Pip' }).locator('.pimg').click({ trial: true }).catch(() => {});
  await page.evaluate(() => window.__gw.closeModal?.()); await page.waitForTimeout(300);
  await page.locator('#party .card', { hasText: 'Pip' }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(500);
  await shot(page, `pip-female-${P}-sheet`);
});
