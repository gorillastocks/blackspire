// Stage D: Gorvax waking (frame 2). Real flow: B5 after Malthrax falls (flags.boss4p1), step onto the boss tile ->
// the DM's "Gorvax is awake" beat, "The vault floor splits open. GORVAX THE TYRANT rises!" and the boss combat.
import { open, sleep } from './lib.mjs';
import fs from 'node:fs';
const dev = process.argv[2] || 'iphone';
const { browser, page } = await open(dev);
const raw = `/workspace/appstore-raw/${dev}`;
await page.evaluate((s) => window.__gw.loadState(s), fs.readFileSync(`${raw}/town-state.json`, 'utf8')); await sleep(1200);
const pos = await page.evaluate(async () => {
  const { state: S, G, getLevel } = window.__gw; getLevel(4);
  const D = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const t = (x, y) => G.tile(S, x, y); S.level = 4; // tile() reads the current level
  let B = null; for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (t(x, y) === 'B') B = [x, y];
  // stand 2 tiles back on a straight run of open floor, so the boss tile is one step ahead
  const ok = (x, y) => !['#', 'S', 'L', 'D'].includes(t(x, y));
  let best = null; for (let d = 0; d < 4 && !best; d++) { const bx = B[0] - D[d][0], by = B[1] - D[d][1]; if (ok(bx, by) && ok(bx - D[d][0], by - D[d][1])) best = { x: bx, y: by, d }; }
  best = best || (() => { for (let d = 0; d < 4; d++) { const bx = B[0] - D[d][0], by = B[1] - D[d][1]; if (ok(bx, by)) return { x: bx, y: by, d }; } })();
  S.mode = 'dungeon'; S.x = best.x; S.y = best.y; S.dir = best.d; S.flags.boss4p1 = true; S.bossDead = S.bossDead || {}; for (let i = 0; i < 4; i++) S.bossDead[i] = true;
  S.explored[4] = []; G.markExplored(S);
  await window.__gw.loadState(G.serialize(S));
  return { B, best };
});
console.log(JSON.stringify(pos)); await sleep(3500);
for (const sel of ['#tip-skip', '#ev-later']) { const l = page.locator(sel); if (await l.isVisible().catch(() => false)) await l.click({ force: true }); }
await page.screenshot({ path: `${raw}/gorvax-pre.png` });
await page.addStyleTag({ content: '#toast{display:none !important}' });
await page.keyboard.press('w');
if (process.argv[3] === 'menu') { // wait for a hero's turn menu while Gorvax is on the arena and the party is still standing
  const menu = page.locator('.combatmenu');
  for (let i = 0; i < 400; i++) { if (await menu.isVisible().catch(() => false) && /Attack|Shoot/.test(await menu.innerText().catch(() => ''))) break; await sleep(250); }
  await sleep(4000); await page.screenshot({ path: `${raw}/gorvax-0.png` }); await browser.close(); process.exit(0);
}
for (let i = 0; i < 3; i++) { await sleep(50); await page.screenshot({ path: `${raw}/gorvax-${i}.png` }); console.log(i, (await page.evaluate(() => (document.querySelector('#modal')?.innerText || document.querySelector('#caption')?.innerText || '')).catch(() => '')).slice(0, 120).replace(/\n/g, ' | ')); }
await browser.close();
