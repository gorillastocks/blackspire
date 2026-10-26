import { test } from '@playwright/test';
import { newGame } from './helpers.js';
// Visual check: steady wall-edge outlines and subtle door frames, on B1 and B3, facing a door.
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
for (const lvl of [0, 2]) {
  test(`edges and doors on B${lvl + 1}`, async ({ page }, info) => {
    test.skip(!['iphone', 'desktop'].includes(info.project.name), 'visual check on iPhone + desktop');
    await newGame(page);
    await page.evaluate(async ([lvl, DIRS]) => {
      const t = window.__gw.G; const s = JSON.parse(t.serialize(window.__gw.state)); s.mode = 'dungeon'; s.level = lvl;
      const open = (x, y) => { try { const c = t.tile(s, x, y); return c === '.' ; } catch { return false; } };
      outer: for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) { let c; try { c = t.tile(s, x, y); } catch { continue; } if (c !== 'D') continue;
        for (let d = 0; d < 4; d++) { const [dx, dy] = DIRS[d]; if (open(x - dx, y - dy) && open(x - 2 * dx, y - 2 * dy)) { s.x = x - 2 * dx; s.y = y - 2 * dy; s.dir = d; break outer; } } }
      await window.__gw.loadState(JSON.stringify(s));
    }, [lvl, DIRS]);
    await page.waitForTimeout(2500);
    const tag = process.env.SHOT_TAG || 'after';
    await page.screenshot({ path: `/workspace/shots/edges-${tag}-B${lvl + 1}-${info.project.name}.png` });
    // a frame mid-turn: flicker shows up while the camera moves
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(180);
    await page.screenshot({ path: `/workspace/shots/edges-${tag}-B${lvl + 1}-turning-${info.project.name}.png` });
  });
}
