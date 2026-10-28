// Phase B level dressing: lore nooks behind hidden doors, illusory walls and telegraphed elite monsters.
// It is a pure, deterministic post-process over a validated base level (same seed => same extras), so base layouts,
// ordinals and old saves are untouched. New secret cells are 'S' (solid until found); nooks are 'N' (floor with a lore tablet).
import { seeded } from '../rules/dice.js';
import { W, H, DIRS, bfs } from './levels.js';

/** Elite roster per floor: [title, monster groups]. The first monster of the first group carries the title and the tougher stats. */
export const ELITES = [
  [['Fangmother', [['direWolf', 1], ['wolf', 1]]], ['Webspinner Vessa', [['giantWolfSpider', 1], ['giantRat', 2]]]],
  [['Carapace King', [['giantToad', 1], ['giantCrab', 2]]], ['Stormblade', [['flyingSword', 3]]], ['The Pale Hound', [['direWolf', 2]]]],
  [['The Glass Warden', [['ochreJelly', 1]]], ['Sporelord Mul', [['violetFungus', 2], ['shrieker', 1]]], ['Dusk Mantle', [['darkmantle', 3]]]],
  [['Ironbound Captain', [['animatedArmor', 2]]], ['Cinder Brute', [['hellHound', 2]]], ['Ashen Zealot', [['cultFanatic', 1], ['cultist', 2]]]],
  [['Rex-Eater', [['allosaurus', 2]]], ['Vault Champion', [['animatedArmor', 3]]], ['Horned Terror', [['triceratops', 1], ['allosaurus', 1]]]],
];
/** Lore tablets found in hidden nooks (safe, self-contained: no clue is needed from elsewhere). */
export const LORE = [
  ['Scratched into the stone: "The wardens fed the rats first, so the rats would learn to love the dark. They did."', 'A child\'s tally of days, 41 marks, then a drawing of a door.'],
  ['A drowned scribe left a note: "The water was never a flood. It was a door the Tyrant wanted shut."', 'Pressed flowers, long dried: someone kept a garden down here.'],
  ['Crystal-etched verse: "Glass remembers every face that looked into it. Do not look long."', 'A map fragment with a single mark: "The Warden sleeps standing."'],
  ['Forge-script: "Every blade of Ashforge was quenched in a prisoner\'s name. Brakk kept the list."', 'A small hammer, wrapped in cloth. No name on it.'],
  ['Carved over the lintel: "Gorvax was not the first thing to rule here. He is simply the loudest."', 'A saddle-strap, thunder-lizard hide. Someone rode these once.'],
];
const key = (x, y) => `${x},${y}`;
const set = (t, x, y, ch) => { t[y] = t[y].slice(0, x) + ch + t[y].slice(x + 1); };
const open = (t, x, y) => x >= 0 && y >= 0 && x < W && y < H && t[y][x] !== '#';
const degree = (t, x, y) => DIRS.filter(([dx, dy]) => open(t, x + dx, y + dy)).length;
const FLOOR = new Set(['.', 'd', 't']);
const PLAIN = new Set(['.', 'd', 't', 'D', 'M', 'T']);

/** Where each elite stands at a given step count: guards never move, patrols pace their route (one tile per two steps). */
export function elitePos(e, steps = 0) {
  if (e.kind === 'guard' || e.path.length < 2) return e.path[0];
  const n = e.path.length, period = 2 * (n - 1), k = Math.floor(steps / 2) % period;
  return e.path[k < n ? k : period - k];
}

export function decorate(L) {
  const idx = L.idx, rng = seeded(L.seed * 31 + idx * 977 + 5); const R = (n) => Math.floor(rng() * n);
  const t = [...L.tiles];
  const find = (ch) => { const o = []; t.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) o.push([x, y]); })); return o; };
  const start = find('<')[0], keyCell = find('K')[0], boss = find('B')[0], exit = find(L.def.final ? 'A' : '>')[0];
  const dist = bfs(t, start[0], start[1]);
  const near = new Set(); const mark = (x, y, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) near.add(key(x + dx, y + dy)); };
  mark(start[0], start[1], 3); mark(boss[0], boss[1], 2); mark(exit[0], exit[1], 2); mark(keyCell[0], keyCell[1], 1);
  const secrets = new Set(find('S').map(([x, y]) => key(x, y)));

  // 1) Lore nooks: a dead end (empty, or a chest alcove) is sealed behind a hidden door and gets a lore tablet and a small cache.
  const nooks = [];
  const wantNooks = idx < 2 ? 1 : 2;
  const cands = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if ((t[y][x] !== '.' && t[y][x] !== 'C') || degree(t, x, y) !== 1 || dist[y][x] < 4 || near.has(key(x, y))) continue;
    const n1 = DIRS.map(([dx, dy]) => [x + dx, y + dy]).find(([a, b]) => open(t, a, b));
    if (!n1 || !'.DS'.includes(t[n1[1]][n1[0]]) || degree(t, n1[0], n1[1]) !== 2 || near.has(key(n1[0], n1[1]))) continue;
    const n2 = DIRS.map(([dx, dy]) => [n1[0] + dx, n1[1] + dy]).find(([a, b]) => open(t, a, b) && !(a === x && b === y));
    if (!n2 || t[n2[1]][n2[0]] === 'E') continue;
    cands.push({ door: n1, pocket: [x, y], plain: t[y][x] === '.' });
  }
  cands.sort((a, b) => (b.plain - a.plain) || (rng() - 0.5));
  for (const c of cands) {
    if (nooks.length >= wantNooks) break;
    if (!c.plain && t.join('').split('C').length - 1 <= 2) continue; // never take a floor's last two chests
    if (nooks.some((n) => Math.abs(n.x - c.pocket[0]) + Math.abs(n.y - c.pocket[1]) < 5)) continue;
    set(t, c.door[0], c.door[1], 'S'); set(t, c.pocket[0], c.pocket[1], 'N'); secrets.add(key(c.door[0], c.door[1]));
    nooks.push({ x: c.pocket[0], y: c.pocket[1], door: c.door, lore: nooks.length });
  }

  // 2) Illusory walls: a wall between two corridors that is only a picture. Walk into it to pass.
  const illusions = [];
  const wantIll = idx < 3 ? 1 : 2;
  const walls = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (t[y][x] !== '#' || near.has(key(x, y))) continue;
    const h = open(t, x - 1, y) && open(t, x + 1, y) && !open(t, x, y - 1) && !open(t, x, y + 1);
    const v = open(t, x, y - 1) && open(t, x, y + 1) && !open(t, x - 1, y) && !open(t, x + 1, y);
    if (!h && !v) continue;
    if (nooks.some((n) => Math.abs(n.x - x) + Math.abs(n.y - y) < 3)) continue;
    const a = h ? [x - 1, y] : [x, y - 1], b = h ? [x + 1, y] : [x, y + 1];
    if (!FLOOR.has(t[a[1]][a[0]]) || !FLOOR.has(t[b[1]][b[0]])) continue;
    walls.push([x, y, a, b]);
  }
  walls.sort(() => rng() - 0.5);
  for (const [x, y, a, b] of walls) {
    if (illusions.length >= wantIll) break;
    if (illusions.some(([p, q]) => Math.abs(p - x) + Math.abs(q - y) < 4)) continue;
    // worth it only as a real shortcut: the two sides are far apart by walking
    const d = bfs(t, a[0], a[1], (c) => c !== '#' && c !== 'S'); if (d[b[1]][b[0]] < 10 && d[b[1]][b[0]] !== -1) continue;
    set(t, x, y, 'S'); secrets.add(key(x, y)); illusions.push([x, y]);
  }

  // 3) Elites: guards stand at the mouth of a treasure dead end; patrols pace a straight corridor.
  const want = ELITES[idx].slice(0, idx < 2 ? 2 : 3);
  const blockedOk = (cells) => {
    const u = [...t]; for (const [x, y] of cells) set(u, x, y, '#');
    const d = bfs(u, start[0], start[1], (c) => c !== '#' && c !== 'B');
    const d2 = bfs(u, start[0], start[1], (c) => c !== '#');
    return d[keyCell[1]][keyCell[0]] > 0 && d2[boss[1]][boss[0]] > 0 && d2[exit[1]][exit[0]] > 0;
  };
  const guards = [];
  for (const [cx, cy] of find('C')) {
    if (degree(t, cx, cy) !== 1 || dist[cy][cx] < 5) continue;
    const nb = DIRS.map(([dx, dy]) => [cx + dx, cy + dy]).find(([a, b]) => open(t, a, b));
    if (!nb || t[nb[1]][nb[0]] !== '.' || near.has(key(nb[0], nb[1]))) continue;
    guards.push([nb[0], nb[1]]);
  }
  const roomGuards = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (t[y][x] !== '.' || near.has(key(x, y)) || dist[y][x] < 6) continue;
    if (DIRS.concat([[1, 1], [1, -1], [-1, 1], [-1, -1]]).every(([dx, dy]) => PLAIN.has(t[y + dy][x + dx]))) roomGuards.push([x, y]);
  }
  guards.sort(() => rng() - 0.5); roomGuards.sort(() => rng() - 0.5); guards.push(...roomGuards);
  const runs = [];
  const seen = new Set();
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const run = []; let cx = x, cy = y;
      const straight = (a, b) => t[b][a] === '.' && degree(t, a, b) === 2 && (dx ? !open(t, a, b - 1) && !open(t, a, b + 1) : !open(t, a - 1, b) && !open(t, a + 1, b));
      if (seen.has(`${dx}${dy}:${x},${y}`) || !straight(x, y)) continue;
      while (straight(cx, cy)) { seen.add(`${dx}${dy}:${cx},${cy}`); run.push([cx, cy]); cx += dx; cy += dy; }
      if (run.length >= 4 && !run.some(([a, b]) => near.has(key(a, b)))) runs.push(run.slice(0, 5));
    }
  }
  runs.sort(() => rng() - 0.5);
  const elites = [];
  const farFromOthers = (cells) => elites.every((e) => e.path.every(([a, b]) => cells.every(([c, d]) => Math.abs(a - c) + Math.abs(b - d) >= 5)));
  const mk = (i, kind, path) => { const [title, groups] = want[i]; elites.push({ id: `e${idx}${elites.length}`, kind, title, path, groups: groups.map(([k, n]) => ({ key: k, count: n })) }); };
  const wantGuards = want.length >= 3 ? 2 : 1;
  for (const g of guards) { if (elites.filter((e) => e.kind === 'guard').length >= wantGuards) break; if (farFromOthers([g]) && blockedOk([g])) mk(elites.length, 'guard', [g]); }
  for (const r of runs) { if (elites.length >= want.length) break; if (farFromOthers(r) && blockedOk(r)) mk(elites.length, 'patrol', r); }
  for (const g of guards) { if (elites.length >= want.length) break; if (!elites.some((e) => e.path[0][0] === g[0] && e.path[0][1] === g[1]) && farFromOthers([g]) && blockedOk([g])) mk(elites.length, 'guard', [g]); }

  return { L: { ...L, tiles: t, nooks, illusions: illusions.map(([x, y]) => key(x, y)), elites, secretCells: [...secrets] } };
}
