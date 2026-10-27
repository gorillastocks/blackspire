import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test('Test voice button: Elowen clip starts (WebAudio)', async ({ page }, info) => {
  test.setTimeout(120000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } });

  await page.locator('#btn-menu, button:has-text("Menu")').first().click();
  await page.locator('#gmenu button', { hasText: 'Settings' }).first().click();
  await expect(page.locator('#set-test-voice')).toBeVisible();
  await page.locator('#set-test-voice').click();

  await expect.poll(async () => page.evaluate(() => window.__gw.voice().current?.file || ''), { timeout: 15000 }).toMatch(/elowen/);

  const snap = await page.evaluate(() => {
    const v = window.__gw.voice();
    const c = v.current;
    return {
      file: c.file, dur: c.duration, enabled: v.enabled,
      href: new URL(c.file, location.href).href, path: location.pathname,
    };
  });
  expect(snap.enabled).toBe(true);
  expect(snap.dur).toBeGreaterThan(1);
  expect(snap.href).toContain('/voice/');
  if (snap.path.includes('blackspire')) expect(snap.href).toContain('/blackspire/voice/');
  expect(await page.evaluate(async (href) => (await fetch(href)).ok, snap.href)).toBe(true);

  await page.waitForTimeout(500);
  expect(await page.evaluate(() => !!window.__gw.voice().current)).toBe(true);

  await page.screenshot({ path: `/workspace/shots/ios-test-voice-${info.project.name}.png` });
  expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
});

test('prologue harvest line matches a voice clip (no miss)', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('./');
  await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await page.click('#btn-new');
  await page.click('#btn-begin');
  await expect(page.locator('#modal .dialogue')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);
  const info = await page.evaluate(() => {
    const v = window.__gw.voice();
    const txt = document.querySelector('#modal .dlgtext p')?.textContent?.trim() || '';
    return { txt, file: v.current?.file || null, misses: v.misses || [], has: v.has?.(txt, 'narrator') };
  });
  expect(info.txt).toMatch(/Emberhollow, harvest night/i);
  expect(info.has).toBe(true);
  expect(info.misses.filter((m) => /harvest night/i.test(m.text || ''))).toHaveLength(0);
  await expect.poll(async () => page.evaluate(() => window.__gw.voice().current?.file || ''), { timeout: 12000 }).toMatch(/narrator/);
});

test('victory sting plays over bed music', async ({ page }) => {
  test.setTimeout(120000);
  await newGame(page);
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  // Ensure town bed is requested, then fire the same sting endCombat uses
  await page.evaluate(() => { window.__gw.state.mode = 'town'; });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__gw.playVictoryMusic());
  await expect.poll(async () => {
    const s = await page.evaluate(() => window.__gw.victoryMusicState());
    return s.playing && s.gain > 0.5 && s.last?.ok === true;
  }, { timeout: 10000 }).toBe(true);
  await page.waitForTimeout(800);
  const mid = await page.evaluate(() => window.__gw.victoryMusicState());
  expect(mid.playing).toBe(true);
  expect(mid.gain).toBeGreaterThan(0.5);
  expect(mid.variant).toBe('A');
});
