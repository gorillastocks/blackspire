import { test, expect } from '@playwright/test';
// screenshots are evidence, not assertions: retry a stalled frame, never fail the test on it
const shot = async (page, o) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ ...o, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
import { newGame, openLocation, trackErrors } from './helpers.js';

async function toChest(page, trapped) {
  await newGame(page);
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  for (let k = 0; k < 6 && await page.locator('#caption.show').isVisible(); k++) { await page.keyboard.press('Enter'); await page.waitForTimeout(350); }
  await page.evaluate((tr) => { const { state: S, G } = window.__gw; let done = false;
    for (let y = 0; y < 30 && !done; y++) for (let x = 0; x < 30 && !done; x++) if (G.tile(S, x, y) === 'C') { S.x = x; S.y = y; done = true; }
    S.chests = S.chests || {}; S.chests[`chest:${S.level}:${S.x},${S.y}`] = { trapped: tr, found: tr, disarmed: false };
    for (const c of S.party) { c.maxHp = 60; c.hp = 60; }
    window.__gw.prompt('chest'); }, trapped);
  await expect(page.locator('#modal button', { hasText: 'Open it' })).toBeVisible();
}
async function cardChecks(page, info, name) {
  const card = page.locator('#caption.show.loot');
  await expect(card).toBeVisible();
  await expect(page.locator('#modal:not(.hidden)')).toHaveCount(0); // choice step folded away
  const m = await page.evaluate(() => { const b = (s) => { const e = document.querySelector(s); const r = e && e.offsetParent && e.getBoundingClientRect(); return r && r.width ? r : null; }; const c = document.querySelector('#caption'); return { c: b('#caption'), v: b('#view'), ctl: b('#controls'), fits: c.scrollHeight <= c.clientHeight + 1, font: parseFloat(getComputedStyle(c.querySelector('.caploot')).fontSize) }; });
  expect(m.c.top >= m.v.top - 1 && m.c.bottom <= m.v.bottom + 1, 'card inside the 3D view').toBe(true);
  expect(!m.ctl || m.c.bottom <= m.ctl.top + 1 || m.c.top >= m.ctl.bottom - 1 || m.c.right <= m.ctl.left + 1 || m.c.left >= m.ctl.right - 1, 'card not covering the controls').toBe(true);
  expect(m.fits, 'fits').toBe(true); expect(m.font).toBeGreaterThanOrEqual(12);
  await page.waitForTimeout(700); await shot(page, { path: `/workspace/shots/chest-${name}-${info.project.name}.png` });
  await page.waitForTimeout(2600); await expect(card, 'watchdog leaves it alone').toBeVisible();
  const pos = await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  expect(await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`), 'no movement under the card').toBe(pos);
  const vp = page.viewportSize(); if (!info.project.name.startsWith('desktop')) await page.touchscreen.tap(vp.width * 0.8, vp.height * 0.15); else await page.mouse.click(vp.width * 0.8, vp.height * 0.15);
  await expect(page.locator('#caption.show')).toHaveCount(0);
  await expect(page.locator('#modal:not(.hidden)')).toHaveCount(0);
}

for (const speed of ['normal', 'fast', 'pause']) {
  test(`chest loot card (${speed} speed): gold + items, tap to dismiss, logged`, async ({ page }, info) => {
    test.skip(speed !== 'normal' && info.project.name !== 'iphone', 'speed variants on iPhone portrait');
    const errors = trackErrors(page);
    await page.addInitScript((sp) => localStorage.setItem('blackspire.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('blackspire.settings') || '{}'), battleSpeed: sp })), speed);
    await toChest(page, false);
    await page.locator('#modal button', { hasText: 'Open it' }).click();
    const txt = await page.locator('#caption').textContent();
    expect(txt).toMatch(/📦/); expect(txt).toMatch(/\+\d+ gold/); expect(txt).toMatch(/🎒|📜/); expect(txt).toMatch(/Tap to continue/);
    expect(await page.locator('#log').textContent(), 'logged').toMatch(/The chest holds \d+ gold/);
    await cardChecks(page, info, speed === 'normal' ? 'safe' : `safe-${speed}`);
    expect(errors).toEqual([]);
  });
}

test('trapped chest: spotted trap + sprung needle with damage on the card', async ({ page }, info) => {
  const errors = trackErrors(page);
  await toChest(page, true);
  await page.locator('#modal button', { hasText: 'Inspect' }).click(); await page.waitForTimeout(200);
  await expect(page.locator('#modal button', { hasText: 'Open it' }), 'inspect keeps the choice step').toBeVisible();
  await page.locator('#modal button', { hasText: 'Open it' }).click();
  const txt = await page.locator('#caption').textContent();
  expect(txt).toMatch(/poison needle stabs .* for \d+/i); expect(txt).toMatch(/\+\d+ gold/);
  await cardChecks(page, info, 'trap');
  expect(errors).toEqual([]);
});
