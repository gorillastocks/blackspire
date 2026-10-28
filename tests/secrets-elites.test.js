import { describe, it, expect } from 'vitest';
import { generateLevel, getLevel, LEVEL_DEFS, validateLevel, bfs } from '../src/dungeon/levels.js';
import { elitePos, ELITES } from '../src/dungeon/extras.js';
import { MONSTERS } from '../src/rules/data.js';

describe('Phase B level dressing', () => {
  it('every classic floor has a hidden lore nook, an illusory wall and 2-3 telegraphed elites', () => {
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const L = getLevel(i);
      expect(L.nooks.length, `nooks ${i}`).toBeGreaterThanOrEqual(1);
      expect(L.illusions.length, `illusions ${i}`).toBeGreaterThanOrEqual(1);
      expect(L.secretCells.length, `secrets ${i}`).toBeGreaterThanOrEqual(2);
      expect(L.elites.length, `elites ${i}`).toBeGreaterThanOrEqual(2); expect(L.elites.length).toBeLessThanOrEqual(3);
      expect(validateLevel(L)).toEqual([]);
    }
  });
  it('floor 1 (the showcase) has at least one secret and one elite', () => { const L = getLevel(0); expect(L.secretCells.length).toBeGreaterThan(0); expect(L.elites.length).toBeGreaterThan(0); });
  it('secret cells are S tiles; nooks are N; elites stand on plain floor and never block the key, boss or exit', () => {
    for (let k = 0; k < 40; k++) for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const L = generateLevel(i, (k * 7919 + i) * 31 + 5); const t = L.tiles;
      for (const c of L.secretCells) { const [x, y] = c.split(',').map(Number); expect(t[y][x], c).toBe('S'); }
      for (const n of L.nooks) { expect(t[n.y][n.x]).toBe('N'); expect(L.secretCells).toContain(`${n.door[0]},${n.door[1]}`); }
      expect(L.secretCells.length).toBeGreaterThanOrEqual(1);
      expect(L.elites.length).toBeGreaterThanOrEqual(2); expect(L.elites.length).toBeLessThanOrEqual(3);
      const st = [...t.join('')].length; expect(st).toBe(21 * 21);
      for (const e of L.elites) {
        for (const [x, y] of e.path) expect('.dt'.includes(t[y][x]), `${e.id} ${x},${y} is ${t[y][x]}`).toBe(true);
        for (const g of e.groups) expect(MONSTERS[g.key], g.key).toBeTruthy();
      }
      const u = t.map((r) => r.split('')); for (const e of L.elites) for (const [x, y] of e.path) u[y][x] = '#';
      let sx = 0, sy = 0, kx = 0, ky = 0; t.forEach((r, y) => [...r].forEach((c, x) => { if (c === '<') [sx, sy] = [x, y]; if (c === 'K') [kx, ky] = [x, y]; }));
      const d = bfs(u.map((r) => r.join('')), sx, sy, (c) => c !== '#' && c !== 'B'); expect(d[ky][kx]).toBeGreaterThan(0);
    }
  });
  it('elite roster is defined for every floor', () => { expect(ELITES.length).toBe(LEVEL_DEFS.length); for (const f of ELITES) for (const [, groups] of f) for (const [k] of groups) expect(MONSTERS[k], k).toBeTruthy(); });
  it('patrols pace their route back and forth; guards never move', () => {
    const p = { kind: 'patrol', path: [[1, 1], [2, 1], [3, 1], [4, 1]] }; const seq = [];
    for (let s = 0; s < 16; s += 2) seq.push(elitePos(p, s)[0]);
    expect(seq).toEqual([1, 2, 3, 4, 3, 2, 1, 2]);
    expect(elitePos({ kind: 'guard', path: [[5, 5]] }, 99)).toEqual([5, 5]);
  });
});
