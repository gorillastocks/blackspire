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
  await page.click('#btn-new'); await page.click('#btn-begin'); await skipPrologue(page);
  await expect(townSquare(page)).toBeVisible();
  const skip = page.locator('#tip-skip'); if (await skip.isVisible()) await skip.click();
  await page.evaluate(() => { window.__gw.state.gold = 5000; });
}

export const LOCATIONS = [
  { key: 'tavern', button: 'Tavern' },
  { key: 'temple', button: 'Temple' },
  { key: 'shop', button: 'Trading Post' },
  { key: 'train', button: 'Training Grounds' },
  { key: 'edge', button: 'Edge of Town' },
];
/** Read through any lore cards / tutorial tips a location raises, the way a player would tap past them. */
export const dismissCards = async (page) => {
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(300);
    const tip = page.locator('#tip-skip'); if (await tip.isVisible().catch(() => false)) { await tip.click(); continue; }
    const later = page.locator('#ev-later'); if (await later.isVisible().catch(() => false)) { await later.click(); continue; } // a story event card on the path: "Not now"
    if (await page.locator('#tapcatch').isVisible().catch(() => false)) { await page.locator('#tapcatch').click({ force: true }); continue; }
    break;
  }
};
export const openLocation = async (page, name) => { await page.locator('#modal button', { hasText: name }).first().click(); await dismissCards(page); };

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

/** Every text node container in dialogs/banter: no blur/filter/scale/fade on it or any ancestor, opaque panel, contrast, size. */
export async function auditText(page, selector, minPx) {
  const problems = await page.evaluate(({ selector, minPx }) => {
    const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return [0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]), m[3] ?? 1]; };
    const out = []; const roots = [...document.querySelectorAll(selector)];
    if (!roots.length) return [`nothing matched ${selector}`];
    for (const root of roots) {
      const els = [root, ...root.querySelectorAll('*')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
      for (const el of els) {
        const label = `${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 30)}"`;
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.filter !== 'none') out.push(`${label}: filter ${cs.filter} on ${a.id || a.className}`);
          const bf = cs.backdropFilter || cs.webkitBackdropFilter; if (bf && bf !== 'none') out.push(`${label}: backdrop-filter on ${a.id || a.className}`);
          if (cs.transform !== 'none') { const m = new DOMMatrixReadOnly(cs.transform); if (Math.abs(m.a - 1) > 0.01 || Math.abs(m.d - 1) > 0.01) out.push(`${label}: scaled transform on ${a.id || a.className}`); }
          if (parseFloat(cs.opacity) < 0.95 && !a.disabled) out.push(`${label}: opacity ${cs.opacity} on ${a.id || a.className}`);
        }
        const cs = getComputedStyle(el);
        if (parseFloat(cs.fontSize) < minPx) out.push(`${label}: font ${cs.fontSize} < ${minPx}px`);
        // nearest opaque background
        let bg = null; for (let a = el; a; a = a.parentElement) { const b = getComputedStyle(a).backgroundColor; if (b && !b.startsWith('rgba(0, 0, 0, 0)') && b !== 'transparent') { bg = b; break; } }
        if (bg) { const [lb, ab] = lum(bg); if (ab < 0.97) out.push(`${label}: translucent panel ${bg}`); const [lt] = lum(cs.color); const ratio = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05); if (ratio < 7 && !el.closest('button:disabled')) out.push(`${label}: contrast ${ratio.toFixed(1)}`); }
      }
    }
    return out;
  }, { selector, minPx });
  expect(problems, problems.join('\n')).toEqual([]);
}

/** Fast-forward the Harvest Feast prologue (skips the tutorial fight). */
export async function skipPrologue(page) {
  await page.click('#dlg-skip'); await page.click('[data-choice="skip"]');
  await page.click('#dlg-skip'); await page.click('[data-choice="vow"]');
}
