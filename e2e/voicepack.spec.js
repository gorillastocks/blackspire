import { test, expect } from '@playwright/test';
import { skipPrologue } from './helpers.js';

// Character creation has a Voice list; tapping a row selects it and previews it; the choice is saved on the hero.
test('voice picker: choose a pack, preview it, it is saved on the hero', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('./');
  await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.click('#btn-new');
  const list = page.locator('#voice-list');
  await expect(list).toBeVisible();
  await expect(list.locator('.voiceopt')).toHaveCount(11);
  await expect(list.locator('.voiceopt.sel')).toHaveAttribute('data-voice', 'aldric');
  const opt = list.locator('[data-voice="mysticSorceress"]'); await opt.scrollIntoViewIfNeeded();
  const box = await opt.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(40);
  await opt.click();
  await expect(list.locator('.voiceopt.sel')).toHaveAttribute('data-voice', 'mysticSorceress');
  await page.waitForTimeout(600);
  const played = await page.evaluate(() => { const v = window.__gw.voice(); return { misses: v.misses || [], file: v.current?.file || null }; });
  expect(played.misses.filter((m) => m.speaker === 'vp_mysticsorceress')).toEqual([]); // the preview line resolves to a clip
  await page.locator('#voice-list').scrollIntoViewIfNeeded(); await page.locator('#voice-list .voiceopt.sel').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
  if (info.project.name === 'iphone') await page.screenshot({ path: '/workspace/shots/voice-picker.png' });
  await page.click('#btn-begin');
  await skipPrologue(page);
  const saved = await page.evaluate(() => window.__gw.state.party.find((c) => !c.companion).voicePack);
  expect(saved).toBe('mysticSorceress');
  expect(errors).toEqual([]);
});
