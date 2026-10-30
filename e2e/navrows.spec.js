import { test, expect } from '@playwright/test';
import { newGame, openLocation, trackErrors } from './helpers.js';

// Exploring: the arrow row and the Search/Camp/Map/Journal/Items/Save row are always fully visible and tappable
// (elementFromPoint at each button's centre and near its top/bottom edges is the button), with and without level-up chips,
// at the device size and on a shorter screen (Safari with its toolbars showing).
const check = (page) => page.evaluate(() => {
  const vh = window.innerHeight, bad = [];
  for (const b of document.querySelectorAll('#controls button')) {
    const r = b.getBoundingClientRect();
    if (r.height < 36) bad.push(`${b.textContent} too short ${r.height}`);
    if (r.top < 0 || r.bottom > vh + 0.5) bad.push(`${b.textContent} off screen ${r.top}-${r.bottom} of ${vh}`);
    for (const y of [r.top + 3, r.top + r.height / 2, r.bottom - 3]) { const e = document.elementFromPoint(r.left + r.width / 2, y); if (!e || !b.contains(e)) bad.push(`${b.textContent} covered at y=${Math.round(y)} by ${e && (e.id || e.className || e.tagName)}`); }
  }
  const c = document.querySelector('#controls').getBoundingClientRect();
  return { bad, n: document.querySelectorAll('#controls button').length, gapBelow: Math.round(vh - c.bottom) };
});

test('exploration: arrow row and action row fully visible, never overlapped', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name; const vp = page.viewportSize();
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  // emulate an iPhone's safe areas (notch / home indicator; Chromium reports 0) and a long log
  if (/iphone/.test(P)) await page.addStyleTag({ content: vp.height > vp.width ? '#app { padding: 59px 0 34px !important; }' : '#app { padding: 0 59px 21px !important; }' });
  await page.evaluate(() => { const l = document.querySelector('#log'); for (let i = 0; i < 40; i++) { const d = document.createElement('div'); d.textContent = 'Ouch! A wall. ' + i; l.append(d); } });
  for (const lv of [false, true]) {
    if (lv) { await page.evaluate(() => { for (const c of window.__gw.state.party) { c.xp = 300; c.hp = 1; } }); await page.keyboard.press('q'); await page.keyboard.press('e'); await page.waitForTimeout(300); await expect(page.locator('#party .lvchip')).toHaveCount(4); }
    for (const [tag, size] of [['full', vp], ['short', { width: vp.width, height: Math.round(vp.height * 0.8) }]]) {
      await page.setViewportSize(size); await page.waitForTimeout(400);
      const m = await check(page);
      expect(m.n, 'twelve control buttons').toBe(12);
      expect(m.bad, `${P} ${tag} lv=${lv}`).toEqual([]);
      expect(m.gapBelow, `${P} ${tag}: no big empty band below the buttons`).toBeLessThanOrEqual(48);
      await page.screenshot({ path: `/workspace/shots/navrows-${P}-${tag}${lv ? '-lvl' : ''}.png` });
    }
    await page.setViewportSize(vp);
  }
  expect(errors).toEqual([]);
});
