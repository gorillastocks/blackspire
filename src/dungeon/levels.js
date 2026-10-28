// Seeded, hand-tuned dungeon levels. Tiles:
// '#' wall, '.' floor, '<' up stairs, '>' down stairs, 'D' door, 'L' locked door, 'S' secret door, 'T' trap,
// 'C' chest, 'K' key, 'E' fixed encounter, 'B' boss, 'M' message, 'F' healing fountain, 'A' altar (final goal), 'Q' story point of interest
import { seeded } from '../rules/dice.js';
import { LEVEL_POIS } from '../game/story.js';
import { decorate } from './extras.js';

export const W = 21, H = 21;
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DIR_NAMES = ['North', 'East', 'South', 'West'];

export const LEVEL_DEFS = [
  {
    name: 'B1: The Rat-Warrens', seed: 1981, music: 'dungeon0', color: 0x22e6ff, fog: 0x050a14, trapDC: 12, secretDC: 12, lockDC: 13, trapDmg: '1d6', trapKind: 'pit', key: 'key1', rooms: 2, loops: 6, secrets: 2,
    table: [[{ key: 'giantRat', count: [2, 3] }], [{ key: 'giantPoisonousSnake', count: [1, 1] }], [{ key: 'giantFrog', count: [1, 2] }], [{ key: 'wolf', count: [2, 2] }], [{ key: 'giantRat', count: [1, 1] }, { key: 'giantWolfSpider', count: [1, 1] }], [{ key: 'giantWolfSpider', count: [1, 1] }], [{ key: 'cultist', count: [2, 3] }]],
    fixed: [[{ key: 'wolf', count: [2, 2] }], [{ key: 'giantFrog', count: [2, 2] }, { key: 'giantRat', count: [2, 2] }]],
    boss: [{ key: 'giantSpider', count: [1, 1] }, { key: 'skarn', count: [1, 1] }], bossName: 'Skarn and the Broodmother',
    messages: ['Scratched into the wall: "SKARN RIDES THE SPIDER QUEEN. THE RUSTY KEY OPENS HER DEN."', 'A faded mural shows a lizard as big as a cathedral. Someone has drawn a mustache on it.', 'A note: "Pip was here. Took spoon. Not sorry."'],
    loot: { gold: [10, 60], items: ['potionHealing', 'potionHealing', 'antitoxin', 'spoon', 'shortsword1', 'studded1'] },
  },
  {
    name: 'B2: The Drowned Grotto', seed: 4242, music: 'dungeon1', color: 0xff3df0, fog: 0x0c0414, trapDC: 14, secretDC: 14, lockDC: 15, trapDmg: '2d10', trapKind: 'darts', key: 'key2', rooms: 3, loops: 8, secrets: 2, fountain: true,
    table: [[{ key: 'giantWasp', count: [2, 2] }], [{ key: 'giantCrab', count: [2, 4] }], [{ key: 'giantToad', count: [1, 2] }], [{ key: 'direWolf', count: [1, 1] }], [{ key: 'flyingSword', count: [2, 3] }], [{ key: 'giantCrab', count: [2, 2] }, { key: 'giantWasp', count: [1, 2] }], [{ key: 'cultist', count: [3, 4] }]],
    fixed: [[{ key: 'direWolf', count: [1, 1] }, { key: 'wolf', count: [1, 1] }], [{ key: 'giantToad', count: [2, 2] }], [{ key: 'flyingSword', count: [3, 3] }]],
    boss: [{ key: 'ankylosaurus', count: [1, 1] }, { key: 'giantWasp', count: [1, 1] }], bossName: 'Old Clubtail',
    messages: ['Dripping water spells nothing in particular. Brambur apologizes to it anyway.', 'An inscription: "BEYOND THE CORAL DOOR SLEEPS OLD CLUBTAIL. BRING SNACKS."', 'A cracked mirror. Professor Fizzwick spends some time admiring it.'],
    loot: { gold: [40, 160], items: ['potionHealing', 'potionGreater', 'goldSpoon', 'longsword1', 'mace1', 'quarterstaff1', 'chainMail1', 'rapier1'] },
  },
  {
    name: 'B3: The Glimmerdeep', seed: 3131, color: 0x40ffd0, fog: 0x021410, trapDC: 14, secretDC: 14, lockDC: 15, trapDmg: '3d8', trapKind: 'pit', key: 'key3', rooms: 3, loops: 9, secrets: 2, fountain: true, music: 'dungeon2',
    table: [[{ key: 'violetFungus', count: [2, 2] }, { key: 'shrieker', count: [1, 1] }], [{ key: 'ochreJelly', count: [1, 1] }], [{ key: 'darkmantle', count: [2, 3] }], [{ key: 'giantCentipede', count: [2, 4] }], [{ key: 'gelatinousCube', count: [0, 0] }], [{ key: 'darkmantle', count: [1, 2] }, { key: 'giantCentipede', count: [2, 2] }]],
    fixed: [[{ key: 'gelatinousCube', count: [1, 1] }, { key: 'ochreJelly', count: [1, 1] }], [{ key: 'violetFungus', count: [3, 3] }, { key: 'shrieker', count: [2, 2] }], [{ key: 'darkmantle', count: [4, 4] }]],
    boss: [{ key: 'glasshide', count: [1, 1] }, { key: 'darkmantle', count: [2, 2] }], bossName: 'Glasshide the Basilisk',
    messages: ['The crystals here show your reflection a half-second late. Fizzwick waves at his. It waves back early.', 'Scratched in a crystal: "DO NOT LOOK THE LIZARD IN THE EYE. USE A MIRROR. — a statue, probably"', 'A circle of mushrooms. Grumsh steps in it and refuses to say what he saw.'],
    loot: { gold: [80, 220], items: ['potionGreater', 'potionStoneFlesh', 'goldSpoon', 'greatsword1', 'chainMail1', 'longbow1', 'rapier1', 'cloakProtection'] },
  },
  {
    name: 'B4: The Ashforge', seed: 5150, color: 0xff5020, fog: 0x160400, trapDC: 15, secretDC: 15, lockDC: 16, trapDmg: '3d10', trapKind: 'darts', key: 'key4', rooms: 3, loops: 10, secrets: 2, fountain: true, music: 'dungeon3',
    table: [[{ key: 'magmin', count: [2, 3] }], [{ key: 'hellHound', count: [0, 0] }, { key: 'magmin', count: [1, 1] }], [{ key: 'gargoyle', count: [2, 2] }], [{ key: 'animatedArmor', count: [2, 2] }], [{ key: 'minotaurSkeleton', count: [1, 1] }, { key: 'magmin', count: [2, 2] }], [{ key: 'cultFanatic', count: [2, 2] }, { key: 'cultist', count: [2, 2] }]],
    fixed: [[{ key: 'hellHound', count: [2, 2] }], [{ key: 'minotaurSkeleton', count: [2, 2] }], [{ key: 'cultFanatic', count: [3, 3] }]],
    boss: [{ key: 'brakk', count: [1, 1] }, { key: 'cindermaw', count: [1, 1] }], bossName: 'Forgemaster Brakk and Cindermaw',
    messages: ['An anvil, still warm, with a smith\'s name scratched on it: "VARR".', 'A forge-mural: dwarves, a chimera, and a very small Brakk hiding behind it.', 'A sign: "BRAKK\'S FORGE. NO REFUNDS. NO DWARVES. NO CHIMERA-PETTING."'],
    loot: { gold: [120, 300], items: ['potionGreater', 'potionGreater', 'plate1', 'greatsword1', 'ringProtection', 'longsword1', 'studded1'] },
  },
  {
    name: 'B5: The Thunder-Lizard Vault', seed: 777, color: 0xb040ff, fog: 0x0c0414, trapDC: 16, secretDC: 15, lockDC: 17, trapDmg: '4d10', trapKind: 'darts', key: 'key5', rooms: 3, loops: 10, secrets: 3, fountain: true, final: true, music: 'dungeon4',
    table: [[{ key: 'animatedArmor', count: [2, 3] }], [{ key: 'allosaurus', count: [1, 2] }], [{ key: 'triceratops', count: [1, 1] }], [{ key: 'hellHound', count: [2, 2] }], [{ key: 'cultFanatic', count: [2, 3] }], [{ key: 'minotaurSkeleton', count: [1, 2] }, { key: 'animatedArmor', count: [1, 1] }]],
    fixed: [[{ key: 'triceratops', count: [1, 1] }, { key: 'allosaurus', count: [1, 1] }], [{ key: 'allosaurus', count: [3, 3] }], [{ key: 'animatedArmor', count: [4, 4] }]],
    boss: [{ key: 'malthrax', count: [1, 1] }, { key: 'animatedArmor', count: [2, 2] }], bossName: 'Malthrax, the Dread Sovereign of Blackspire',
    phase2: [{ key: 'tyrannosaurus', count: [1, 1] }],
    messages: ['Carved in gold: "HE WHO TAKES THE DAWNSTONE AMULET SHALL HOLD THE FIVE SEALS."', 'Enormous footprints. Fizzwick measures one. "Fizzwick estimates: large."', 'A shrine to a forgotten god of cutlery. Pip weeps openly.'],
    loot: { gold: [150, 400], items: ['potionGreater', 'potionGreater', 'runcibleSpoon', 'greatsword1', 'plate1', 'ringProtection', 'cloakProtection', 'longbow1'] },
  },
];
// Deeper floors: the party is level 5–9 by now, so every wandering group brings one more monster.
for (const d of LEVEL_DEFS.slice(2)) for (const enc of d.table) enc[0].count = enc[0].count.map((n) => n + 1);

function carve(rng) {
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const stack = [[1, 1]]; g[1][1] = '.';
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = DIRS.map(([dx, dy]) => [x + dx * 2, y + dy * 2, x + dx, y + dy]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && g[ny][nx] === '#');
    if (!opts.length) { stack.pop(); continue; }
    const [nx, ny, mx, my] = opts[Math.floor(rng() * opts.length)];
    g[my][mx] = '.'; g[ny][nx] = '.'; stack.push([nx, ny]);
  }
  return g;
}
const open = (g, x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x] !== '#';
const degree = (g, x, y) => DIRS.filter(([dx, dy]) => open(g, x + dx, y + dy)).length;
const neighbors = (g, x, y) => DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => open(g, a, b));

export function bfs(g, sx, sy, passable = (c) => c !== '#') {
  const dist = Array.from({ length: H }, () => Array(W).fill(-1)); dist[sy][sx] = 0; const q = [[sx, sy]];
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; if (dist[ny][nx] >= 0 || !passable(g[ny][nx])) continue; dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } }
  return dist;
}

function buildLevel(idx, seed) {
  const def = LEVEL_DEFS[idx];
  const rng = seeded(seed);
  const R = (n) => Math.floor(rng() * n);
  const g = carve(rng);
  const start = [1, 1];
  // Pick the boss chain: farthest dead-end with a corridor chain of length >= 3
  let dist = bfs(g, 1, 1);
  const leaves = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && degree(g, x, y) === 1 && !(x === 1 && y === 1)) leaves.push([x, y]);
  leaves.sort((a, b) => dist[b[1]][b[0]] - dist[a[1]][a[0]]);
  let chain = null;
  for (const [lx, ly] of leaves) {
    const c = [[lx, ly]]; let prev = null, cur = [lx, ly];
    while (c.length < 4) { const nb = neighbors(g, cur[0], cur[1]).filter(([a, b]) => !prev || a !== prev[0] || b !== prev[1]); if (nb.length !== 1) break; prev = cur; cur = nb[0]; c.push(cur); }
    if (c.length >= 4) { chain = c; break; }
  }
  const protectedSet = new Set();
  const markProt = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) protectedSet.add(`${x + dx},${y + dy}`); };
  chain.forEach(([x, y]) => markProt(x, y)); markProt(1, 1);
  // Rooms (open 3x3 areas)
  let rooms = 0, tries = 0;
  while (rooms < def.rooms && tries++ < 200) {
    const cx = 3 + 2 * R(8), cy = 3 + 2 * R(8);
    let ok = true; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (protectedSet.has(`${cx + dx},${cy + dy}`)) ok = false;
    if (!ok) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) g[cy + dy][cx + dx] = '.';
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) protectedSet.add(`${cx + dx},${cy + dy}`);
    rooms++;
  }
  // Loops: knock out walls between two corridors (some become doors or secret doors)
  const wallCands = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== '#' || protectedSet.has(`${x},${y}`)) continue;
    if ((open(g, x - 1, y) && open(g, x + 1, y) && !open(g, x, y - 1) && !open(g, x, y + 1)) || (open(g, x, y - 1) && open(g, x, y + 1) && !open(g, x - 1, y) && !open(g, x + 1, y))) wallCands.push([x, y]);
  }
  let loops = 0, secrets = 0;
  for (const [x, y] of wallCands.sort(() => rng() - 0.5)) {
    if (loops >= def.loops + def.secrets) break;
    g[y][x] = secrets < def.secrets ? 'S' : rng() < 0.4 ? 'D' : '.'; if (g[y][x] === 'S') secrets++; loops++;
  }
  // Boss chain
  const [leaf, bossCell, lockCell] = chain;
  g[leaf[1]][leaf[0]] = def.final ? 'A' : '>';
  g[bossCell[1]][bossCell[0]] = 'B';
  g[lockCell[1]][lockCell[0]] = 'L';
  g[1][1] = '<';
  // Recompute leaves for loot placement
  dist = bfs(g, 1, 1, (c) => c !== '#' && c !== 'L' && c !== 'S');
  const chainSet = new Set(chain.map(([x, y]) => `${x},${y}`));
  const freeLeaves = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && degree(g, x, y) === 1 && dist[y][x] > 3 && !chainSet.has(`${x},${y}`)) freeLeaves.push([x, y]);
  freeLeaves.sort((a, b) => dist[b[1]][b[0]] - dist[a[1]][a[0]]);
  // Key at the farthest reachable dead end (guarded)
  const keyCell = freeLeaves.shift(); g[keyCell[1]][keyCell[0]] = 'K';
  const kn = neighbors(g, keyCell[0], keyCell[1])[0]; if (g[kn[1]][kn[0]] === '.') g[kn[1]][kn[0]] = 'E';
  // Secret treasure: a chest hidden behind a secret door
  let fixedUsed = 1;
  const placedChests = [];
  for (const [x, y] of freeLeaves) {
    if (g[y][x] !== '.') continue;
    const nb = neighbors(g, x, y)[0];
    if (placedChests.length === 0 && g[nb[1]][nb[0]] === '.' && degree(g, nb[0], nb[1]) === 2) { g[nb[1]][nb[0]] = 'S'; g[y][x] = 'C'; placedChests.push([x, y]); continue; }
    if (placedChests.length < 6) {
      g[y][x] = 'C'; placedChests.push([x, y]);
      if (fixedUsed < def.fixed.length + 1 && g[nb[1]][nb[0]] === '.' && rng() < 0.7) { g[nb[1]][nb[0]] = 'E'; fixedUsed++; }
    } else if (def.fountain && !g.some((r) => r.includes('F'))) g[y][x] = 'F';
  }
  // Doors, traps & messages on corridor cells
  const corridors = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && degree(g, x, y) === 2 && dist[y][x] > 2 && !chainSet.has(`${x},${y}`)) corridors.push([x, y]);
  const sh = corridors.sort(() => rng() - 0.5);
  let ti = 0;
  for (let i = 0; i < 4 && ti < sh.length; i++, ti++) { const [x, y] = sh[ti]; const ns = neighbors(g, x, y); if ((ns[0][0] === ns[1][0]) || (ns[0][1] === ns[1][1])) g[y][x] = 'D'; }
  for (let i = 0; i < 5 && ti < sh.length; i++, ti++) { const [x, y] = sh[ti]; g[y][x] = 'T'; }
  for (let i = 0; i < def.messages.length && ti < sh.length; i++, ti++) { const [x, y] = sh[ti]; g[y][x] = 'M'; }
  if (def.fountain && !g.some((r) => r.includes('F')) && ti < sh.length) { const [x, y] = sh[ti++]; g[y][x] = 'F'; }
  // Story points of interest ('Q'), placed last so earlier layout stays identical for old saves
  const nPoi = (LEVEL_POIS[idx] || []).length;
  if (nPoi) {
    const near = (x, y) => Math.abs(x - 1) + Math.abs(y - 1) < 3;
    const cands = [...sh.slice(ti).filter(([x, y]) => g[y][x] === '.')];
    const extra = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && !chainSet.has(`${x},${y}`) && !near(x, y) && !cands.some(([a, b]) => a === x && b === y)) extra.push([x, y]);
    const pool = [...cands, ...extra.sort(() => rng() - 0.5)];
    for (let i = 0; i < nPoi && i < pool.length; i++) { const [x, y] = pool[i]; g[y][x] = 'Q'; }
  }
  // Assign indices for messages/fixed encounters (in scan order)
  const tiles = g.map((r) => r.join(''));
  return { idx, def, tiles, start: [1, 1, 1], seed };
}

/** Connectivity validator: every required feature exists and is reachable in the right order. Returns a list of problems. */
export function validateLevel(L) {
  const bad = []; const t = L.tiles; const idx = L.idx; const def = LEVEL_DEFS[idx];
  const find = (ch) => { const o = []; t.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) o.push([x, y]); })); return o; };
  const one = (ch, what) => { const f = find(ch); if (f.length !== 1) bad.push(`${what}: ${f.length}`); return f[0]; };
  const st = one('<', 'up stairs'); const key = one('K', 'key'); const boss = one('B', 'boss'); const exit = one(def.final ? 'A' : '>', def.final ? 'altar' : 'down stairs');
  if (!st || !key || !boss || !exit) return bad;
  const d1 = bfs(t, st[0], st[1], (c) => c !== '#' && c !== 'L' && c !== 'B');
  if (d1[key[1]][key[0]] <= 0) bad.push('key unreachable before the locked door');
  const d2 = bfs(t, st[0], st[1], (c) => c !== '#');
  if (d2[boss[1]][boss[0]] <= 0) bad.push('boss unreachable');
  if (d2[exit[1]][exit[0]] <= d2[boss[1]][boss[0]]) bad.push('exit not beyond the boss');
  const d3 = bfs(t, st[0], st[1], (c) => c !== '#' && c !== 'B'); if (d3[exit[1]][exit[0]] !== -1) bad.push('exit bypasses the boss');
  for (const ch of ['C', 'E', 'M', 'F', 'Q', 'T', 'D', 'S']) for (const [x, y] of find(ch)) if (d2[y][x] <= 0) bad.push(`${ch} at ${x},${y} unreachable`);
  if (find('Q').length !== (LEVEL_POIS[idx] || []).length) bad.push(`story POIs ${find('Q').length}/${(LEVEL_POIS[idx] || []).length}`);
  if (def.fountain && !find('F').length) bad.push('no fountain');
  if (find('C').length < 2) bad.push('fewer than 2 chests');
  if (find('M').length < 1) bad.push('no messages');
  return bad;
}
/** Build a level from a seed; if the layout fails validation, deterministically re-roll (seed + n). */
export function generateLevel(idx, seed = LEVEL_DEFS[idx].seed) {
  for (let n = 0; n < 200; n++) {
    let L = null; try { L = buildLevel(idx, seed + n * 7919); } catch { L = null; }
    if (L && !validateLevel(L).length) return decorate(L).L;
  }
  throw new Error(`could not build a valid level ${idx} from seed ${seed}`);
}
let activeSeeds = null; const cache = new Map();
/** Use per-game random seeds (array, one per floor) or null for the fixed classic layouts. */
export function setDungeonSeeds(seeds) { activeSeeds = Array.isArray(seeds) && seeds.length ? seeds : null; }
export const dungeonSeeds = () => activeSeeds;
export function getLevel(i) {
  const seed = activeSeeds?.[i] ?? LEVEL_DEFS[i].seed; const k = `${i}:${seed}`;
  if (!cache.has(k)) cache.set(k, generateLevel(i, seed));
  return cache.get(k);
}
export function randomSeeds() { return LEVEL_DEFS.map(() => 1 + Math.floor(Math.random() * 2 ** 30)); }
/** Index of a special tile among tiles of the same kind (row-major), used for messages / fixed encounters. */
export function tileOrdinal(level, x, y) {
  const ch = level.tiles[y][x]; let n = 0;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { if (yy === y && xx === x) return n; if (level.tiles[yy][xx] === ch) n++; }
  return n;
}
