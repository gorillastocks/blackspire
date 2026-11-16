import { test, expect } from '@playwright/test';
import { newGame, trackErrors, openLocation } from './helpers.js';

function snap() {
  const seq = window.__gw.victorySequenceState?.() || { state: 'idle', remaining: 0 };
  const music = window.__gw.victoryMusicState?.() || {};
  const voice = window.__gw.voice?.() || {};
  const cur = voice.current || null;
  return {
    seq: seq.state,
    remaining: seq.remaining,
    music: !!music.playing,
    speaker: cur?.speaker || null,
    kind: cur?.kind || null,
  };
}

test('battle victory audio plays music, then narrator, then character, never overlapping', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  test.setTimeout(180000);
  const errors = trackErrors(page);

  await page.addInitScript(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({
      sound: true, music: 0.7, sfx: 0.8, amb: 0.6, voices: true, voice: 0.85,
      tutorialDone: true, battleSpeed: 'fast', battleSpeedSet: true, areaDesc: false,
    }));
  });

  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } });

  await page.evaluate(() => {
    window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }], town: true });
  });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 30000 }).toBe(true);

  // Force a win. Do not dismiss the victory card — we want the sting to finish naturally.
  await expect.poll(async () => {
    await page.evaluate(() => {
      const c = window.__gw.combat;
      if (!c) return;
      for (const m of c.monsters || []) if (m.hp > 0) m.hp = 0;
      try { c.checkEnd?.(); } catch {}
    });
    const atk = page.locator('#cmenu button').first();
    if (await atk.isVisible().catch(() => false)) await atk.click().catch(() => {});
    return page.evaluate(() => {
      const seq = window.__gw.victorySequenceState?.();
      return (seq && seq.state !== 'idle') || !window.__gw.combat;
    });
  }, { timeout: 60000 }).toBe(true);

  await expect.poll(() => page.evaluate(() => window.__gw.victorySequenceState?.().state || 'idle'), { timeout: 15000 }).not.toBe('idle');

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await page.evaluate(snap);
    samples.push(s);
    if (s.seq === 'idle' && samples.some((x) => x.seq === 'music' || x.seq === 'narrator' || x.seq === 'character')) break;
    await page.waitForTimeout(120);
  }

  const overlapping = samples.filter((s) => s.music && s.speaker);
  expect(overlapping, `music and voice overlapped: ${JSON.stringify(overlapping)}`).toEqual([]);

  const active = samples.filter((s) => s.seq !== 'idle');
  expect(active.length, `never left idle: ${JSON.stringify(samples.slice(0, 8))}`).toBeGreaterThan(0);
  expect(active[0].seq, `first active state should be music: ${JSON.stringify(active.slice(0, 6))}`).toBe('music');

  const firstNarr = samples.findIndex((s) => s.seq === 'narrator' || s.speaker === 'narrator' || s.speaker === 'dm');
  const firstChar = samples.findIndex((s) => s.seq === 'character' || (s.speaker && s.speaker !== 'narrator' && s.speaker !== 'dm'));
  if (firstNarr >= 0 && firstChar >= 0) {
    expect(firstNarr, `character began before narrator: ${JSON.stringify(samples)}`).toBeLessThan(firstChar);
  }

  // Dismiss the victory card, then start a new fight: leftover victory audio must be cleared (no overlap).
  if (await page.locator('#tapcatch').isVisible().catch(() => false)) {
    await page.waitForTimeout(1100);
    await page.locator('#tapcatch').click({ force: true }).catch(() => {});
  }
  await page.evaluate(() => window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }], town: true }));
  await expect.poll(() => page.evaluate(() => window.__gw.victorySequenceState?.().state || 'idle'), { timeout: 15000 }).toBe('idle');
  const after = await page.evaluate(snap);
  expect(after.music).toBe(false);

  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});

test('tapping the victory card during the sting continues voices in order without overlap', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  test.setTimeout(180000);

  await page.addInitScript(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({
      sound: true, music: 0.7, sfx: 0.8, amb: 0.6, voices: true, voice: 0.85,
      tutorialDone: true, battleSpeed: 'fast', battleSpeedSet: true, areaDesc: false,
    }));
  });

  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.evaluate(() => {
    window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }], town: true });
  });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 30000 }).toBe(true);

  await expect.poll(async () => {
    await page.evaluate(() => {
      const c = window.__gw.combat;
      if (!c) return;
      for (const m of c.monsters || []) if (m.hp > 0) m.hp = 0;
      try { c.checkEnd?.(); } catch {}
    });
    const atk = page.locator('#cmenu button').first();
    if (await atk.isVisible().catch(() => false)) await atk.click().catch(() => {});
    return page.evaluate(() => window.__gw.victorySequenceState?.().state === 'music');
  }, { timeout: 60000 }).toBe(true);

  // loot cards ignore stray taps for 1s; wait for the card, then dismiss the rest of the sting.
  await page.locator('#tapcatch').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1100);
  if (await page.locator('#tapcatch').isVisible().catch(() => false)) {
    await page.locator('#tapcatch').click({ force: true });
  }

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    const s = await page.evaluate(snap);
    samples.push(s);
    if (s.seq === 'idle' && samples.length > 3) break;
    await page.waitForTimeout(120);
  }
  const overlapping = samples.filter((s) => s.music && s.speaker);
  expect(overlapping, `overlap after dismiss: ${JSON.stringify(samples)}`).toEqual([]);
  const afterMusic = samples.filter((s) => s.seq === 'narrator' || s.seq === 'character' || s.speaker);
  // Once dismissed, remaining voice lines (if any) may play, but the sting must not keep going under them.
  if (afterMusic.length) expect(afterMusic.every((s) => !s.music)).toBe(true);
});

test('chest loot audio plays sting, then narrator, then character, never overlapping', async ({ page }, info) => {
  test.skip(!['iphone', 'desktop'].includes(info.project.name), 'iphone+desktop');
  test.setTimeout(180000);
  const errors = trackErrors(page);

  await page.addInitScript(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({
      sound: true, music: 0.7, sfx: 0.8, amb: 0.6, voices: true, voice: 0.85,
      tutorialDone: true, battleSpeed: 'fast', battleSpeedSet: true, areaDesc: false,
    }));
  });

  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await openLocation(page, 'Edge of Town');
  await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let k = 0; k < 6 && await page.locator('#caption.show').isVisible(); k++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
  }

  await page.evaluate(() => {
    const { state: S, G } = window.__gw;
    let done = false;
    for (let y = 0; y < 30 && !done; y++) for (let x = 0; x < 30 && !done; x++) if (G.tile(S, x, y) === 'C') { S.x = x; S.y = y; done = true; }
    S.chests = S.chests || {};
    S.chests[`chest:${S.level}:${S.x},${S.y}`] = { trapped: false, found: false, disarmed: false };
    for (const c of S.party) { c.maxHp = 60; c.hp = 60; }
    window.__gw.prompt('chest');
  });
  await expect(page.locator('#modal button', { hasText: 'Open it' })).toBeVisible();
  await page.locator('#modal button', { hasText: 'Open it' }).click();

  await expect.poll(() => page.evaluate(() => window.__gw.victorySequenceState?.().state || 'idle'), { timeout: 15000 }).not.toBe('idle');

  // A late character line must wait its turn, not overlap the sting or narrator.
  await page.evaluate(() => {
    window.__gw.say({ who: "Pip", text: "Told you. I'm a delight in a crisis.", thread: true }, { queue: true });
  });

  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 8000) {
    const s = await page.evaluate(snap);
    samples.push(s);
    if (s.seq === 'idle' && samples.some((x) => x.seq === 'music' || x.seq === 'narrator' || x.seq === 'character')) break;
    await page.waitForTimeout(120);
  }

  const overlapping = samples.filter((s) => s.music && s.speaker);
  expect(overlapping, `chest music and voice overlapped: ${JSON.stringify(overlapping)}`).toEqual([]);
  const active = samples.filter((s) => s.seq !== 'idle');
  expect(active.length, `chest never left idle: ${JSON.stringify(samples.slice(0, 8))}`).toBeGreaterThan(0);
  expect(active[0].seq, `chest first active state should be music: ${JSON.stringify(active.slice(0, 6))}`).toBe('music');

  const firstNarr = samples.findIndex((s) => s.seq === 'narrator' || s.speaker === 'narrator' || s.speaker === 'dm');
  const firstChar = samples.findIndex((s) => s.seq === 'character' || (s.speaker && s.speaker !== 'narrator' && s.speaker !== 'dm'));
  if (firstNarr >= 0 && firstChar >= 0) {
    expect(firstNarr, `chest character began before narrator: ${JSON.stringify(samples)}`).toBeLessThan(firstChar);
  }

  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
