import { test, expect } from '@playwright/test';
import { trackErrors, skipPrologue } from './helpers.js';

// Drives the real game in the browser: character creation with each difficulty, the Harvest Feast prologue,
// then the full five-floor campaign played by the in-game driver (real movement, POIs, encounters, town turn-ins,
// lieutenants, bosses, two-phase finale), then the resulting save is loaded into the UI and the ending is played.
for (const rnd of [false, true]) for (const [i, difficulty] of ['story', 'normal', 'hard'].entries()) {
  test(`full campaign on ${difficulty}${rnd ? ' with random dungeons' : ''}: every floor, boss and quest, then the ending`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop' && !process.env.PT_ALL, 'campaign runs once, on desktop');
    test.setTimeout(240000);
    const errors = trackErrors(page);
    await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 });
    await page.click('#btn-new'); await page.selectOption('#cdiff', difficulty);
    await expect(page.locator('#crandom')).not.toBeChecked(); if (rnd) await page.locator('label.switch').click();
    await page.click('#btn-begin');
    if (i === 0 && !rnd) { // play the real tutorial fight once
      await page.click('#dlg-skip'); await page.click('[data-choice="fight"]');
      await page.waitForSelector('.combatmenu', { timeout: 60000 });
      await page.locator('.combatmenu button', { hasText: 'Auto-battle' }).click();
      for (let k = 0; k < 400 && !(await page.locator('#dlg-next').isVisible()); k++) { if (await page.locator('#caption.show').isVisible()) await page.keyboard.press('Enter'); await page.waitForTimeout(500); } // tap through the victory loot card
      await page.waitForSelector('#dlg-next', { timeout: 20000 }); await page.click('#dlg-skip'); await page.click('[data-choice="vow"]');
    } else await skipPrologue(page);
    const tip = page.locator('#tip-skip'); if (await tip.isVisible()) await tip.click();
    expect(await page.evaluate(() => window.__gw.state.difficulty)).toBe(difficulty);
    expect(await page.evaluate(() => [window.__gw.state.randomDungeons, (window.__gw.state.seeds || []).length])).toEqual(rnd ? [true, 5] : [false, 0]);
    expect(await page.evaluate(() => window.__gw.state.inventory.includes('signetRing'))).toBe(true);

    const r = await page.evaluate((d) => window.__gw.playthrough({ seed: 4242, difficulty: d[0], heroCls: 'paladin', randomDungeons: d[1] }), [difficulty, rnd]);
    console.log(`${difficulty}${rnd ? ' random' : ''}: victory=${r.victory} wins=${r.wins} wipes=${r.losses} levels=${r.finalLevels} floors=${r.floors.map((f) => `${f.floor}:${f.losses}`).join(' ')}`);
    expect(r.problems).toEqual([]);
    expect(r.victory).toBe(true);
    for (const f of r.floors) { expect(f.boss, f.floor).toBe(true); expect(f.poisLeft, f.floor).toBe(0); }
    for (const [q, st] of Object.entries(r.quests)) expect(st, q).toBe('done');
    expect(r.notes).toBe(10); expect(r.elowen).toBe(true);

    // load the finished campaign into the UI: townsfolk all done, journal complete
    await page.evaluate((st) => window.__gw.loadState(st), r._state);
    await page.click('#btn-folk'); await expect(page.locator('[data-npc]')).toHaveCount(6);
    for (const b of await page.locator('[data-npc]').all()) await expect(b).toContainText('✔');
    await page.locator('#modal .backbtn').click(); await page.click('#btn-journal');
    await expect(page.locator('#modal')).toContainText("Elowen's notes (10/10)"); await page.click('#btn-journal-close');
    expect(await page.evaluate(() => document.body.innerText.match(/\bNaN\b|\bundefined\b|\[object Object\]/g)), 'no NaN/undefined in UI (B5)').toBeNull();
    // stand at the altar on B5 and play the ending
    await page.evaluate(async () => { const s = JSON.parse(window.__gw.G.serialize(window.__gw.state)); const t = window.__gw.G; s.mode = 'dungeon'; s.level = 4;
      for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { try { if (t.tile(s, x, y) === 'A') { s.x = x; s.y = y; } } catch {} }
      await window.__gw.loadState(JSON.stringify(s)); window.__gw.prompt('altar'); });
    await page.waitForSelector('#dlg-skip'); await page.click('#dlg-skip');
    await expect(page.locator('#modal')).toContainText('sixth seal');
    await page.click('[data-choice="end"]');
    await expect(page.locator('#modal h1')).toHaveText('VICTORY!');
    expect(await page.evaluate(() => document.body.innerText.match(/\bNaN\b|\bundefined\b|\[object Object\]/g)), 'no NaN/undefined in UI').toBeNull();
    if (i === 1 && !rnd) await page.screenshot({ path: `screenshots/campaign-victory.png` });
    expect(errors).toEqual([]);
  });
}
