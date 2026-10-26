import { test, expect } from '@playwright/test';
import { newGame, openLocation, dismissCards } from './helpers.js';
// Regression (real iPhone, 390pt): the 2-column party grid overflowed the right screen edge, cutting off the AI/YOU buttons.
// The old portraits check only compared elements to their own card, and the card itself was the thing overflowing,
// so here every card, and everything in it, is measured against the viewport.
const NAMES = ['Ser Aldric the Unbending', 'Vexrath', 'Grumsh Skullsplitter', 'Brambur Oakenshield', 'Thessaly Moonwhisper', 'Pip'];
for (const n of [4, 5, 6]) {
  for (const width of [null, 375, 390, 430]) {
    test(`party of ${n} fits the screen${width ? ` at ${width}px` : ''}`, async ({ page }, info) => {
      if (width && info.project.name !== 'iphone') test.skip(true, 'width sweep on iPhone portrait');
      if (width) await page.setViewportSize({ width, height: 844 });
      await newGame(page); await openLocation(page, 'Edge of Town'); await page.click('#btn-enter');
      await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon'); await dismissCards(page);
      await page.evaluate(async ({ n, NAMES }) => {
        const s = JSON.parse(window.__gw.G.serialize(window.__gw.state));
        while (s.party.length < n) s.party.push({ ...JSON.parse(JSON.stringify(s.party[s.party.length - 1])), id: 'x' + s.party.length });
        s.party.forEach((c, i) => { c.name = NAMES[i]; if (i === 2) { c.hp = 0; c.dead = true; } if (i === 3) c.hp = 0; });
        await window.__gw.loadState(JSON.stringify(s));
      }, { n, NAMES });
      await dismissCards(page);
      await expect(page.locator('#party .card')).toHaveCount(n);
      const vw = await page.evaluate(() => document.documentElement.clientWidth);
      const bad = await page.evaluate((vw) => [...document.querySelectorAll('#party .card')].flatMap((c) => {
        const r = c.getBoundingClientRect(); const out = [];
        if (r.left < -0.5 || r.right > vw + 0.5) out.push(`card ${c.textContent.slice(0, 20)} ${r.left.toFixed(0)}..${r.right.toFixed(0)} > ${vw}`);
        for (const e of c.querySelectorAll('button, .tag, .cport, .lvchip')) { const q = e.getBoundingClientRect(); if (q.width && (q.left < r.left - 0.5 || q.right > r.right + 0.5 || q.right > vw + 0.5)) out.push(`${e.className} "${e.textContent}" ${q.left.toFixed(0)}..${q.right.toFixed(0)} card ${r.left.toFixed(0)}..${r.right.toFixed(0)}`); }
        return out;
      }), vw);
      expect(bad, bad.join('\n')).toEqual([]);
      // each AI/YOU button is fully visible (not covered / cut) and tappable
      for (const b of await page.locator('#party .aitog').all()) { await expect(b).toBeInViewport({ ratio: 1 }); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: `/workspace/shots/partyfit-${n}-${info.project.name}${width ? '-' + width : ''}.png` });
    });
  }
}
