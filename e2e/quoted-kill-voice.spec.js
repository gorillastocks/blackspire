import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

const GRUMSH = 'Farewell, Blackspire Cultist. You will have a stanza. A short one.';

test('a quoted Grumsh kill line is logged and survives into the victory sequence', async ({ page }, info) => {
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

  const hasClip = await page.evaluate((text) => window.__gw.voice().has(text, 'grumsh'), GRUMSH);
  expect(hasClip, 'Grumsh farewell for Blackspire Cultist must have a clip').toBe(true);

  await page.evaluate(() => {
    window.__gw.startCombat({ groups: [{ key: 'cultist', count: 2 }], town: true });
  });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 30000 }).toBe(true);

  // Occupy the voice channel, then speak the kill line the way combat does (quoted say()).
  // It must be logged even if another clip is already playing, and queued rather than dropped.
  const queued = await page.evaluate((text) => {
    window.__gw.playVoiceLine?.('The moon rises over Emberhollow. A seal on the Blackspire cracks and breaks.', 'narrator', { kind: 'other' });
    window.__gw.say({ who: 'Grumsh', color: '#a9c1ff', text }, {});
    const log = [...document.querySelectorAll('#log div')].map((el) => el.textContent).join('\n');
    const voice = window.__gw.voice();
    return {
      inLog: log.includes(`Grumsh: "${text}"`),
      queued: (voice.queued || []).some((w) => w.opts?.keepForVictory && w.opts?.text === text),
      current: voice.current?.speaker || null,
      has: voice.has(text, 'grumsh'),
    };
  }, GRUMSH);
  expect(queued.has).toBe(true);
  expect(queued.inLog, 'kill line must appear in the combat log').toBe(true);

  // Force a win. The pending kill bark must be folded into the victory sequence after the narrator,
  // not cleared with leftover attack barks.
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

  const heard = await page.evaluate((text) => {
    const snap = window.__gw.victorySequenceState?.() || { state: 'idle', remaining: 0, lines: [] };
    const voice = window.__gw.voice();
    const log = [...document.querySelectorAll('#log div')].map((el) => el.textContent).join('\n');
    const inSeq = (snap.lines || []).some((l) => l.text === text || l.who === 'grumsh' && (l.text || '').includes('Blackspire Cultist'));
    return {
      seq: snap.state,
      remaining: snap.remaining,
      lines: snap.lines || [],
      speaker: voice.current?.speaker || null,
      queued: (voice.queued || []).some((w) => w.opts?.text === text),
      inLog: log.includes(`Grumsh: "${text}"`),
      inSeq,
    };
  }, GRUMSH);
  expect(heard.inLog).toBe(true);
  expect(heard.inSeq || heard.speaker === 'grumsh' || heard.queued,
    `Grumsh kill line was logged but not kept in the victory queue: ${JSON.stringify(heard)}`).toBe(true);

  const serious = errors.filter((e) => !/Failed to load|vite|favicon|AudioContext/i.test(e));
  expect(serious, serious.join('\n')).toEqual([]);
});
