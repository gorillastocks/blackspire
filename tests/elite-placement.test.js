import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { getLevel, LEVEL_DEFS, DIRS, W, H, generateLevel } from '../src/dungeon/levels.js';
import { elitePos } from '../src/dungeon/extras.js';

const fresh = (lvl) => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; s.mode = 'dungeon'; s.level = lvl; const L = getLevel(lvl); [s.x, s.y, s.dir] = L.start; s.steps = 0; return s; };
const open = (c) => c !== undefined && c !== '#' && c !== 'S' && c !== 'L' && c !== 'D';
const reach = (t, [sx, sy], pass = open) => { const seen = new Set([`${sx},${sy}`]), q = [[sx, sy]]; while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(`${nx},${ny}`) || !pass(t[ny][nx])) continue; seen.add(`${nx},${ny}`); q.push([nx, ny]); } } return seen; };

describe('elite placement: every elite is on walkable ground on its own floor, reachable, and in the 3D sync list', () => {
  it('all 5 floors (and 30 other seeds each): every tile of every elite route is walkable, in bounds, and reachable from the stairs', () => {
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const levels = [getLevel(i), ...Array.from({ length: 30 }, (_, k) => generateLevel(i, (k * 7919 + i) * 31 + 5))];
      for (const L of levels) {
        expect(L.elites.length, `floor ${i} has elites`).toBeGreaterThanOrEqual(2);
        const ids = L.elites.map((e) => e.id); expect(new Set(ids).size).toBe(ids.length); for (const id of ids) expect(id.startsWith(`e${i}`), `${id} belongs to floor ${i}`).toBe(true);
        const r = reach(L.tiles, L.start, (c) => c !== '#' && c !== 'S' && c !== 'L'); // the way the party can walk without a key or a secret
        for (const e of L.elites) {
          expect(e.path.length).toBeGreaterThan(0);
          for (const [x, y] of e.path) {
            expect(x >= 0 && y >= 0 && x < W && y < H, `${e.id} in bounds`).toBe(true);
            expect('.dt'.includes(L.tiles[y][x]), `${e.id} ${x},${y} is '${L.tiles[y][x]}'`).toBe(true);
            expect(r.has(`${x},${y}`), `${e.id} ${x},${y} reachable`).toBe(true);
          }
          for (let s = 0; s < 40; s++) { const [x, y] = elitePos(e, s); expect(e.path.some(([a, b]) => a === x && b === y), `${e.id} patrol stays on its route`).toBe(true); }
        }
      }
    }
  });
  it('liveElites hands the renderer exactly the living elites of the current floor, on walkable tiles', () => {
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const s = fresh(i); const L = getLevel(i); const live = G.liveElites(s);
      expect(live.map((e) => e.id).sort()).toEqual(L.elites.map((e) => e.id).sort());
      for (const e of live) { const [x, y] = G.elitePosNow(s, e); expect(['#', 'S', 'L']).not.toContain(G.tile(s, x, y)); expect(e.id.startsWith(`e${i}`)).toBe(true); }
      const e0 = L.elites[0]; s.disc[`elite:${i}:${e0.id}`] = 1; expect(G.liveElites(s).some((e) => e.id === e0.id)).toBe(false); // slain: gone from view and from warnings
      const s2 = fresh(i); const [x, y] = e0.path[0]; s2.mods[i][`${x},${y}`] = '#'; expect(G.liveElites(s2).some((e) => e.id === e0.id), 'an elite on a wall is never live').toBe(false);
    }
  });
});

describe('elite warning only fires for a living elite that is really in view or within two steps', () => {
  const place = (s, x, y, dir) => { s.x = x; s.y = y; s.dir = dir; s.eliteSeen = {}; };
  const guardOf = (L) => L.elites.find((e) => e.kind === 'guard');
  it('fires straight ahead down open ground and pins the elite where it actually stands', () => {
    let tested = 0;
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const s = fresh(i); const L = getLevel(i);
      for (const e of L.elites.filter((q) => q.kind === 'guard')) {
        const [ex, ey] = e.path[0];
        for (const [d, [dx, dy]] of DIRS.entries()) for (let k = 3; k <= 5; k++) {
          const px = ex - dx * k, py = ey - dy * k; if (px < 0 || py < 0 || px >= W || py >= H) continue;
          let clear = true; for (let j = 0; j < k; j++) if (!open(L.tiles[ey - dy * (k - j)]?.[ex - dx * (k - j)])) clear = false;
          if (!clear) continue; place(s, px, py, d); s.pins = s.pins || []; const out = G.eliteSpotted(s);
          expect(out.length, `${e.id} seen from ${px},${py} facing ${d}`).toBe(1); expect(out[0].log).toContain(e.title); expect(out[0].elite).toBe(e.id);
          expect(s.pins[i].some((p) => p.x === ex && p.y === ey && p.icon === '☠'), 'pin sits on the elite').toBe(true);
          expect(G.eliteSpotted(s)).toEqual([]); // only once
          // the same view with the back turned: no warning
          place(s, px, py, (d + 2) % 4); expect(G.eliteSpotted(s), 'facing away').toEqual([]); tested++;
          // a closed door in between hides it
          const mx = px + dx, my = py + dy; if (k >= 3 && open(L.tiles[my][mx])) { place(s, px, py, d); s.mods[i][`${mx},${my}`] = 'D'; expect(G.eliteSpotted(s), 'closed door').toEqual([]); delete s.mods[i][`${mx},${my}`]; }
          break;
        }
      }
    }
    expect(tested).toBeGreaterThan(0);
  });
  it('never fires through a wall, even when the elite is only one or two tiles away as the crow flies', () => {
    let tested = 0;
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const s = fresh(i); const L = getLevel(i);
      for (const e of L.elites) {
        const [ex, ey] = e.path[0];
        const near = reach(L.tiles, [ex, ey], (c) => open(c)); // tiles within walking reach of the elite's tile
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > 2 || (!dx && !dy)) continue; const px = ex + dx, py = ey + dy; if (px < 0 || py < 0 || px >= W || py >= H || !open(L.tiles[py][px])) continue;
          // walking distance from that tile to the elite
          const seen = new Map([[`${px},${py}`, 0]]); const q = [[px, py]]; while (q.length) { const [x, y] = q.shift(); const d0 = seen.get(`${x},${y}`); for (const [ax, ay] of DIRS) { const nx = x + ax, ny = y + ay; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(`${nx},${ny}`) || !open(L.tiles[ny][nx]) || d0 >= 3) continue; seen.set(`${nx},${ny}`, d0 + 1); q.push([nx, ny]); } }
          const wd = seen.get(`${ex},${ey}`) ?? Infinity; if (wd <= 2 || e.kind !== 'guard') continue; // only the walled-off cases
          for (let d = 0; d < 4; d++) { place(s, px, py, d); expect(G.eliteSpotted(s), `${e.id} must not warn from ${px},${py} (walled off, walk ${wd})`).toEqual([]); }
          tested++;
        }
      }
    }
    expect(tested, 'found walled-off near cases to check').toBeGreaterThan(0);
  });
  it('fires within two steps by walking, but not for a slain elite or one standing on a wall', () => {
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const s = fresh(i); const L = getLevel(i); const e = guardOf(L) || L.elites[0]; const [ex, ey] = e.path[0]; const [dx, dy] = DIRS.find(([a, b]) => open(L.tiles[ey + b]?.[ex + a]));
      place(s, ex + dx, ey + dy, 0); s.steps = e.kind === 'guard' ? 0 : 0;
      if (e.kind === 'guard') { const out = G.eliteSpotted(s); expect(out.length, `${e.id} next door`).toBe(1); }
      place(s, ex + dx, ey + dy, 0); s.disc[`elite:${i}:${e.id}`] = 1; expect(G.eliteSpotted(s), 'slain').toEqual([]); delete s.disc[`elite:${i}:${e.id}`];
      place(s, ex + dx, ey + dy, 0); s.mods[i][`${ex},${ey}`] = '#'; expect(G.eliteSpotted(s), 'on a wall').toEqual([]);
    }
  });
});
