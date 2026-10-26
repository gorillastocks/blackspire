import { test, expect } from '@playwright/test';
import { openLocation, skipPrologue, trackErrors, townSquare } from './helpers.js';

const fits = (page, sel) => page.evaluate((sel) => { const m = document.querySelector('.panel') || document.body; const mr = m.getBoundingClientRect(); const vw = Math.min(innerWidth, mr.right), bad = [];
  for (const e of document.querySelectorAll(sel)) { const r = e.getBoundingClientRect(); if (r.width && (r.left < -0.5 || r.right > vw + 0.5)) bad.push(`${e.className} ${Math.round(r.left)}-${Math.round(r.right)} of ${vw}`); }
  return bad; }, sel);

test('portraits: picker in creation, party panel, sheet change, companions + old-save migration', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await page.goto('./'); await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.click('#btn-new');
  await expect(page.locator('#pgrid .pick')).toHaveCount(37); // Random + 36
  expect(await fits(page, '#pgrid, #pgrid .pick')).toEqual([]);
  await page.screenshot({ path: `/workspace/shots/portraits-create-${P}.png` });
  await page.locator('#pgrid [data-pid="5"]').click();
  await expect(page.locator('#pgrid [data-pid="5"]')).toHaveClass(/on/);
  await page.screenshot({ path: `/workspace/shots/portraits-create-picked-${P}.png` });
  await page.click('#btn-begin'); await skipPrologue(page); await expect(townSquare(page)).toBeVisible();
  const skip = page.locator('#tip-skip'); if (await skip.isVisible()) await skip.click();
  await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon'); await page.waitForTimeout(500);
  const ps = await page.evaluate(() => window.__gw.state.party.map((c) => c.portrait));
  expect(ps[0]).toBe(5); for (const p of ps) expect(Number.isInteger(p)).toBe(true);
  await expect(page.locator('#party img.cport')).toHaveCount(ps.length);
  // party cards: portrait + name + AI toggle all inside the card
  const bad = await page.evaluate(() => [...document.querySelectorAll('#party .card')].flatMap((c) => { const r = c.getBoundingClientRect(); return [...c.querySelectorAll('.cport, .aitog, .tag')].filter((e) => { const q = e.getBoundingClientRect(); return q.left < r.left - 0.5 || q.right > r.right + 0.5; }).map((e) => c.id + ' ' + e.className); }));
  expect(bad).toEqual([]);
  await page.screenshot({ path: `/workspace/shots/portraits-party-${P}.png` });
  // change from the sheet
  await page.locator('#controls button', { hasText: 'Sheet' }).click();
  await page.click('#btn-portrait');
  await page.locator('#pgrid [data-pid="20"]').click();
  await expect(page.locator('#btn-portrait')).toBeVisible();
  expect(await page.evaluate(() => window.__gw.state.party[0].portrait)).toBe(20);
  expect(await fits(page, '.sheethead, #btn-portrait')).toEqual([]);
  await page.screenshot({ path: `/workspace/shots/portraits-sheet-${P}.png` });
  // migration: an old save without portraits gets random ones
  await page.keyboard.press('Escape');
  await page.evaluate(async () => { const G = window.__gw; const s = JSON.parse(JSON.stringify(G.state)); for (const c of [...s.party, ...s.roster]) delete c.portrait; await G.loadState(JSON.stringify(s)); });
  const mig = await page.evaluate(() => window.__gw.state.party.map((c) => c.portrait));
  for (const p of mig) expect(Number.isInteger(p)).toBe(true);
  await expect(page.locator('#party img.cport')).toHaveCount(mig.length);
  expect(errors).toEqual([]);
});
