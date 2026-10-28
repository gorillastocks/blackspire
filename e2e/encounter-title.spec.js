import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';

// Bug: on iPad the "Encounter!" word split across lines. Words must never break or hyphenate, at any phone/iPad size.
const SIZES = [[390, 844], [844, 390], [768, 1024], [820, 1180], [1024, 1366], [1366, 1024], [1180, 820]];
const BOSS = ['Skarn and the Broodmother', 'Old Clubtail', 'Glasshide the Basilisk', 'Forgemaster Brakk and Cindermaw', 'Malthrax, the Dread Sovereign of Blackspire'];

test('encounter banner title: no word is ever broken, panel always fits (phone + iPad sizes)', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'resizes the viewport itself');
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { window.__gw.hideCaption?.(); const m = document.querySelector('#modal'); if (m) { m.className = 'hidden'; m.innerHTML = ''; } }); // the town sheet would sit over the banner in the screenshot
  await page.addStyleTag({ content: '#encounter, #encounter .enc-panel { animation: none !important; }' }); // measure layout, not the pop/shake transform (slow software-GL frames stretch it)
  const measure = () => page.evaluate(() => {
    const t = document.querySelector('#encounter .enc-title'), panel = document.querySelector('#encounter .enc-panel'), view = document.querySelector('#view').getBoundingClientRect();
    const node = t.firstChild, text = node.textContent, words = [], re = /\S+/g; let m;
    while ((m = re.exec(text))) { const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length); words.push({ w: m[0], lines: new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size }); }
    const cs = getComputedStyle(t), pr = panel.getBoundingClientRect(), tr = t.getBoundingClientRect();
    return { text, words, lineH: parseFloat(cs.lineHeight), h: tr.height, hyph: cs.hyphens, wb: cs.wordBreak, ow: cs.overflowWrap, ws: cs.whiteSpace, fits: t.scrollWidth <= t.clientWidth + 1, font: parseFloat(cs.fontSize),
      inside: pr.left >= view.left - 1 && pr.right <= view.right + 1 && pr.top >= view.top - 1 && pr.bottom <= view.bottom + 1, titleInPanel: tr.left >= pr.left && tr.right <= pr.right };
  });
  const show = async (inf) => { await page.evaluate((i) => { window.__bn = window.__gw.showEncounterBanner(i, 30000); }, inf); await expect(page.locator('#encounter .enc-title')).toBeVisible(); await page.waitForTimeout(700); }; // after the pop + shake animations (~0.56s)
  const dismiss = async () => { await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await expect(page.locator('#encounter')).toHaveCount(0); };
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    for (const inf of [{ groups: [] }, { ambush: true }]) {
      await show(inf); const m = await measure(); const tag = `${m.text} @${w}x${h}`;
      expect(m.words.every((x) => x.lines === 1), `${tag}: word split ${JSON.stringify(m.words)}`).toBe(true);
      expect(m.h, `${tag}: single line box`).toBeLessThan(m.lineH * 1.5);
      expect([m.hyph, m.wb, m.ow, m.ws], tag).toEqual(['none', 'normal', 'normal', 'nowrap']);
      expect(m.fits && m.inside && m.titleInPanel, `${tag}: panel fits its text ${JSON.stringify(m)}`).toBe(true);
      if (w === 820 && h === 1180 && inf.groups) { await page.addStyleTag({ content: '#modal { display: none !important; }' }); await page.screenshot({ path: '/workspace/shots/encounter-ipad.png' }); } // the town sheet would sit over the banner in the shot
      await dismiss();
    }
    for (const name of BOSS) {
      // force the boss title text through the real banner (boss flag, custom title via the level def name is covered in encounter.spec)
      await page.evaluate((n) => { window.__bn = window.__gw.showEncounterBanner({ boss: true }, 30000); document.querySelector('#encounter .enc-title').textContent = n; }, name);
      await page.waitForTimeout(700); const m = await measure(); const tag = `${name} @${w}x${h}`;
      expect(m.words.every((x) => x.lines === 1), `${tag}: a boss word was split ${JSON.stringify(m.words)}`).toBe(true);
      expect(m.fits && m.inside && m.titleInPanel, `${tag}: boss panel fits ${JSON.stringify(m)}`).toBe(true);
      expect([m.hyph, m.wb, m.ow], tag).toEqual(['none', 'normal', 'normal']);
      await dismiss();
    }
  }
  expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
});
