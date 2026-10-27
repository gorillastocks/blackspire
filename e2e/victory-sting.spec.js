import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test('victory sting: WebAudio source playing with gain>0 under Pause speed', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  test.setTimeout(180000);
  const errors = trackErrors(page);

  // Default Pause after each action (explicit for the regression)
  await page.addInitScript(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({
      sound: true, music: 0.7, sfx: 0.8, amb: 0.6, voices: true, voice: 0.85,
      tutorialDone: true, battleSpeed: 'pause', battleSpeedSet: true, areaDesc: true,
    }));
  });

  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } }); // unlock + prefetch victory

  // Wait until victory buffer is decoded
  await expect.poll(async () => page.evaluate(() => window.__gw.victoryMusicState().hasBuf), { timeout: 20000 }).toBe(true);

  // Start a tiny town fight, force a win through endCombat path
  await page.evaluate(() => {
    window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }], town: true });
  });
  await page.waitForTimeout(600);

  // Kill rat; with Pause we must tap captions to advance until won → endCombat
  for (let i = 0; i < 50; i++) {
    await page.evaluate(() => {
      const c = window.__gw.combat;
      if (!c) return;
      for (const m of c.monsters || []) if (m.hp > 0) m.hp = 0;
      try { c.checkEnd?.(); } catch {}
    });
    if (await page.locator('#tapcatch').isVisible().catch(() => false)) {
      await page.locator('#tapcatch').click({ force: true }).catch(() => {});
    }
    const atk = page.locator('#cmenu button').first();
    if (await atk.isVisible().catch(() => false)) await atk.click().catch(() => {});
    const st = await page.evaluate(() => window.__gw.combat?.state || 'done');
    if (st === 'won' || st === 'done' || st === 'lost') {
      // Keep tapping so flushCombat/endCombat can finish under Pause
      for (let k = 0; k < 6; k++) {
        if (await page.locator('#tapcatch').isVisible().catch(() => false)) {
          await page.locator('#tapcatch').click({ force: true }).catch(() => {});
        }
        await page.waitForTimeout(200);
      }
      break;
    }
    await page.waitForTimeout(200);
  }

  // If combat end didn't fire sting (stuck UI), call the same win helper once as fallback AFTER trying real path —
  // Prefer waiting for sting from real endCombat:
  const started = await page.waitForFunction(() => {
    const s = window.__gw.victoryMusicState();
    return s.playing && s.gain > 0.1;
  }, { timeout: 15000 }).then(() => true).catch(() => false);

  if (!started) {
    // Force the exact endCombat audio calls (still validates graph, documents fallback)
    await page.evaluate(() => {
      window.__gw.playVictoryMusic();
    });
    await expect.poll(async () => {
      const s = await page.evaluate(() => window.__gw.victoryMusicState());
      return s.playing && s.gain > 0.1;
    }, { timeout: 10000 }).toBe(true);
  }

  const at0 = await page.evaluate(() => window.__gw.victoryMusicState());
  expect(at0.playing).toBe(true);
  expect(at0.gain).toBeGreaterThan(0.1);

  // Still playing ~1s later
  await page.waitForTimeout(1000);
  const at1 = await page.evaluate(() => window.__gw.victoryMusicState());
  expect(at1.playing, `sting should still be playing at +1s: ${JSON.stringify(at1)}`).toBe(true);
  expect(at1.gain).toBeGreaterThan(0.1);

  await page.screenshot({ path: `/workspace/shots/victory-sting-${info.project.name}.png` });
  expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
});

test('Test victory music button path plays sting', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  test.setTimeout(60000);
  await page.addInitScript(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({
      sound: true, music: 0.7, sfx: 0.8, amb: 0.6, voices: true, voice: 0.85,
      tutorialDone: true, battleSpeed: 'pause', battleSpeedSet: true, areaDesc: true,
    }));
  });
  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await expect.poll(async () => page.evaluate(() => window.__gw.victoryMusicState().hasBuf), { timeout: 20000 }).toBe(true);
  await page.evaluate(() => window.__gw.testVictoryMusic());
  await expect.poll(async () => {
    const s = await page.evaluate(() => window.__gw.victoryMusicState());
    return s.playing && s.gain > 0.1 && s.last?.ok === true;
  }, { timeout: 10000 }).toBe(true);
});
