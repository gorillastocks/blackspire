import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';
import fs from 'node:fs';

test('Camp Party screen tags Down and Dead members on cards and roster rows', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  const names = await page.evaluate(() => {
    const g = window.__gw;
    for (const k of ['brambur', 'pip', 'fizzwick']) g.G.recruitCompanion(g.state, k);
    const p = g.state.party;
    // Front-row companion unconscious; a back-row companion dead.
    const down = p.find((c) => c.companion === 'brambur') || p[1];
    const dead = p.find((c) => c.companion === 'pip') || p[2];
    down.hp = 0;
    down.dead = false;
    down.stable = false;
    down.conditions.unconscious = true;
    down.deathSaves = { s: 1, f: 0 };
    dead.hp = 0;
    dead.dead = true;
    delete dead.conditions.unconscious;
    g.state.mode = 'dungeon';
    g.refresh();
    g.showCamp('party');
    return { down: down.name, dead: dead.name };
  });

  const formation = page.locator('#formation');
  await expect(formation).toBeVisible();

  const downCard = formation.locator(`.fhero[data-vital="down"]`);
  const deadCard = formation.locator(`.fhero[data-vital="dead"]`);
  await expect(downCard, 'formation shows the downed companion').toBeVisible();
  await expect(deadCard, 'formation shows the dead companion').toBeVisible();
  await expect(downCard).toContainText(names.down);
  await expect(downCard.locator('.vstatus')).toHaveText(/💤\s*Down/);
  await expect(downCard).toContainText(/0 HP/);
  await expect(downCard).toContainText(/1✓/);
  await expect(deadCard).toContainText(names.dead);
  await expect(deadCard.locator('.vstatus')).toHaveText(/💀\s*Dead/);

  const downRow = page.locator(`.partyrow[data-vital="down"]`);
  const deadRow = page.locator(`.partyrow[data-vital="dead"]`);
  await expect(downRow.locator('.vstatus')).toHaveText(/💤\s*Down/);
  await expect(downRow).toContainText(names.down);
  await expect(downRow).toContainText(/0 HP/);
  await expect(deadRow.locator('.vstatus')).toHaveText(/💀\s*Dead/);
  await expect(deadRow).toContainText(names.dead);

  // HUD party cards use the same tags
  await expect(page.locator(`#party .card[data-vital="down"] .vstatus`).first()).toHaveText(/💤\s*Down/);
  await expect(page.locator(`#party .card[data-vital="dead"] .vstatus`).first()).toHaveText(/💀\s*Dead/);

  fs.mkdirSync('/workspace/shots', { recursive: true });
  const shot = `/workspace/shots/party-status-down-dead-${info.project.name}.png`;
  await page.locator('#modal .panel').screenshot({ path: shot });
  test.info().annotations.push({ type: 'screenshot', description: shot });

  // Character sheet header carries the same tag (close Camp so the HUD card is tappable)
  await page.locator('#modal .closebtn').click();
  await expect(page.locator('#modal .panel')).toHaveCount(0);
  await page.locator('#party .card[data-vital="down"]').first().click();
  await expect(page.locator('.sheethead h2 .vstatus')).toHaveText(/💤\s*Down/);

  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
