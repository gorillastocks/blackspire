import { describe, it, expect } from 'vitest';
import { LEVEL_POIS } from '../src/game/story.js';
import { generateLevel, bfs, LEVEL_DEFS, W, H } from '../src/dungeon/levels.js';

const find = (L, ch) => { const o = []; L.tiles.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) o.push([x, y]); })); return o; };
describe('dungeon levels are solvable', () => {
  for (let i = 0; i < LEVEL_DEFS.length; i++) {
    it(`level ${i + 1}: key reachable without the locked door, boss and exit reachable with it`, () => {
      const L = generateLevel(i);
      expect(L.tiles.length).toBe(H); L.tiles.forEach((r) => expect(r.length).toBe(W));
      const [sx, sy] = L.start; expect(L.tiles[sy][sx]).toBe('<');
      // Phase 1: everything except locked doors (secret doors count as passable — they can always be found by Search)
      const d1 = bfs(L.tiles, sx, sy, (c) => c !== '#' && c !== 'L' && c !== 'B');
      const [key] = find(L, 'K'); expect(key).toBeTruthy(); expect(d1[key[1]][key[0]]).toBeGreaterThan(0);
      // Phase 2: with the key
      const d2 = bfs(L.tiles, sx, sy, (c) => c !== '#');
      const [boss] = find(L, 'B'); expect(d2[boss[1]][boss[0]]).toBeGreaterThan(0);
      const exit = find(L, LEVEL_DEFS[i].final ? 'A' : '>')[0]; expect(d2[exit[1]][exit[0]]).toBeGreaterThan(d2[boss[1]][boss[0]]);
      // The exit can only be reached through the boss
      const d3 = bfs(L.tiles, sx, sy, (c) => c !== '#' && c !== 'B'); expect(d3[exit[1]][exit[0]]).toBe(-1);
      // Has features
      expect(find(L, 'C').length).toBeGreaterThanOrEqual(2); expect(find(L, 'S').length).toBeGreaterThanOrEqual(1); expect(find(L, 'T').length).toBeGreaterThanOrEqual(1);
      // Every chest/fixed encounter reachable
      expect(find(L, 'Q').length).toBe(LEVEL_POIS[i].length);
      for (const ch of ['C', 'E', 'M', 'F', 'Q']) for (const [x, y] of find(L, ch)) expect(d2[y][x]).toBeGreaterThan(0);
      // Border is solid
      for (let x = 0; x < W; x++) { expect(L.tiles[0][x]).toBe('#'); expect(L.tiles[H - 1][x]).toBe('#'); }
    });
  }
  it('has five floors, each with its own music', () => { expect(LEVEL_DEFS.length).toBe(5); expect(new Set(LEVEL_DEFS.map((d) => d.music)).size).toBe(5); expect(LEVEL_DEFS[4].phase2).toBeTruthy(); });
  it('is deterministic', () => { expect(generateLevel(0).tiles).toEqual(generateLevel(0).tiles); });
});
