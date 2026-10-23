import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';

test.describe.configure({ timeout: 300000 });

/** Every text node container in dialogs/banter: no blur/filter/scale/fade on it or any ancestor, opaque panel, contrast, size. */
async function auditText(page, selector, minPx) {
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

test('chest + trap search, companion talk and banter text is crisp and readable', async ({ page }, info) => {
  const errors = trackErrors(page);
  const phone = info.project.name.startsWith('iphone'); const minPx = phone ? 16 : 13;
  await newGame(page);
  // tavern chatter
  await page.locator('#modal button', { hasText: 'Tavern' }).click();
  await page.locator('#modal button', { hasText: 'Listen in' }).click();
  await expect(page.locator('#modal .dlgout')).toBeVisible();
  await auditText(page, '#modal .panel', minPx);
  await page.screenshot({ path: `screenshots/text-${info.project.name}-tavern-talk.png` });
  await page.locator('#modal .backbtn').first().click();
  // dungeon: stand on a chest and search it for traps
  await page.locator('#modal button', { hasText: 'Edge of Town' }).click(); await page.click('#btn-enter');
  await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const { state: S, G } = window.__gw; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (G.tile(S, x, y) === 'C') { S.x = x; S.y = y; } window.__gw.prompt('chest'); });
  await page.locator('#modal button', { hasText: 'Inspect' }).click();
  await page.locator('#modal button', { hasText: 'Disarm' }).click();
  await expect(page.locator('#modal .dlgout div')).not.toHaveCount(0);
  await page.evaluate(() => window.__gw.banter('trap'));
  await auditText(page, '#modal .panel', minPx);
  await page.screenshot({ path: `screenshots/text-${info.project.name}-chest-trap-search.png` });
  await page.locator('#modal button', { hasText: 'Leave it' }).click();
  // camp: companion conversation
  await page.evaluate(() => window.__gw.showCamp());
  await page.click('#btn-talk'); await page.click('#btn-talk');
  await auditText(page, '#modal .panel', minPx);
  await page.screenshot({ path: `screenshots/text-${info.project.name}-camp-talk.png` });
  await page.keyboard.press('Escape'); await page.evaluate(() => { const m = document.querySelector('#modal'); if (!m.classList.contains('hidden')) m.querySelector('.closebtn')?.click(); });
  // banter bubbles over the 3D view
  await page.evaluate(() => { window.__gw.banter('loot'); window.__gw.banter('spoon'); });
  await page.waitForTimeout(300);
  await auditText(page, '#banter', minPx);
  await page.screenshot({ path: `screenshots/text-${info.project.name}-banter.png` });
  // the combat log itself
  await auditText(page, '#log', phone ? 16 : 13);
  expect(errors, errors.join('\n')).toEqual([]);
});
