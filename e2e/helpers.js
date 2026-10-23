import { expect } from '@playwright/test';

export function trackErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

/** Fully on-screen, not covered by other UI, and clickable. */
export async function expectReachable(page, loc, what) {
  await expect(loc, `${what} visible`).toBeVisible();
  await loc.scrollIntoViewIfNeeded();
  const vp = page.viewportSize(); const b = await loc.boundingBox();
  expect(b, `${what} has a box`).toBeTruthy();
  expect(b.x >= -1 && b.y >= -1 && b.x + b.width <= vp.width + 1 && b.y + b.height <= vp.height + 1, `${what} inside viewport ${JSON.stringify(b)} vs ${JSON.stringify(vp)}`).toBe(true);
  const onTop = await loc.evaluate((el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!t && (t === el || el.contains(t)); });
  expect(onTop, `${what} not covered by other UI`).toBe(true);
  expect(b.height, `${what} tall enough to tap`).toBeGreaterThanOrEqual(24);
}

export const townSquare = (page) => page.locator('#btn-tavern');

export async function newGame(page) {
  await page.goto('./');
  await page.waitForSelector('#btn-new', { timeout: 90000 });
  await page.click('#btn-new'); await page.click('#btn-begin');
  await expect(townSquare(page)).toBeVisible();
  await page.evaluate(() => { window.__gw.state.gold = 5000; });
}

export const LOCATIONS = [
  { key: 'tavern', button: 'Tavern' },
  { key: 'temple', button: 'Temple' },
  { key: 'shop', button: 'Trading Post' },
  { key: 'train', button: 'Training Grounds' },
  { key: 'edge', button: 'Edge of Town' },
];
export const openLocation = (page, name) => page.locator('#modal button', { hasText: name }).first().click();

/** From any screen, get back to the town square using only visible UI. */
export async function recoverToTown(page, ctx) {
  for (let i = 0; i < 4; i++) {
    if (await townSquare(page).isVisible()) return;
    const close = page.locator('#modal .closebtn:visible').first();
    const back = page.locator('#modal .backbtn:visible').first();
    if (await close.count()) { await expectReachable(page, close, `Close (${ctx})`); await close.click(); }
    else if (await back.count()) { await expectReachable(page, back, `Back (${ctx})`); await back.click(); }
    else break;
    await page.waitForTimeout(100);
  }
  await expect(townSquare(page), `stranded after ${ctx}: no way back to town`).toBeVisible();
}
