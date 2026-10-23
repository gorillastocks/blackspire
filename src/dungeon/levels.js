// Seeded, hand-tuned dungeon levels. Tiles:
// '#' wall, '.' floor, '<' up stairs, '>' down stairs, 'D' door, 'L' locked door, 'S' secret door, 'T' trap,
// 'C' chest, 'K' key, 'E' fixed encounter, 'B' boss, 'M' message, 'F' healing fountain, 'A' altar (final goal)
import { seeded } from '../rules/dice.js';

export const W = 21, H = 21;
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const DIR_NAMES = ['North', 'East', 'South', 'West'];

export const LEVEL_DEFS = [
  {
    name: 'B1: The Rat-Warrens', seed: 1981, color: 0x22e6ff, fog: 0x050a14, trapDC: 12, secretDC: 12, lockDC: 13, trapDmg: '1d6', trapKind: 'pit', key: 'key1', rooms: 2, loops: 6, secrets: 2,
    table: [[{ key: 'giantRat', count: [2, 4] }], [{ key: 'giantPoisonousSnake', count: [1, 2] }], [{ key: 'giantFrog', count: [1, 2] }], [{ key: 'wolf', count: [2, 2] }], [{ key: 'giantRat', count: [1, 2] }, { key: 'giantWolfSpider', count: [1, 1] }], [{ key: 'giantWolfSpider', count: [1, 2] }]],
    fixed: [[{ key: 'wolf', count: [3, 3] }], [{ key: 'giantFrog', count: [2, 2] }, { key: 'giantRat', count: [2, 2] }]],
    boss: [{ key: 'giantSpider', count: [1, 1] }, { key: 'giantWolfSpider', count: [2, 2] }], bossName: 'The Broodmother',
    messages: ['Scratched into the wall: "THE SPIDER QUEEN HOARDS THE KEY TO THE DEEP. FIND THE RUSTY KEY."', 'A faded mural shows a lizard as big as a cathedral. Someone has drawn a mustache on it.', 'A note: "Pip was here. Took spoon. Not sorry."'],
    loot: { gold: [10, 60], items: ['potionHealing', 'potionHealing', 'antitoxin', 'spoon', 'shortsword1', 'studded1'] },
  },
  {
    name: 'B2: The Drowned Grotto', seed: 4242, color: 0xff3df0, fog: 0x0c0414, trapDC: 14, secretDC: 14, lockDC: 15, trapDmg: '2d10', trapKind: 'darts', key: 'key2', rooms: 3, loops: 8, secrets: 2, fountain: true,
    table: [[{ key: 'giantWasp', count: [2, 3] }], [{ key: 'giantCrab', count: [2, 4] }], [{ key: 'giantToad', count: [1, 2] }], [{ key: 'direWolf', count: [1, 2] }], [{ key: 'flyingSword', count: [2, 3] }], [{ key: 'giantCrab', count: [2, 2] }, { key: 'giantWasp', count: [1, 2] }]],
    fixed: [[{ key: 'direWolf', count: [2, 2] }, { key: 'wolf', count: [2, 2] }], [{ key: 'giantToad', count: [2, 2] }], [{ key: 'flyingSword', count: [4, 4] }]],
    boss: [{ key: 'ankylosaurus', count: [1, 1] }, { key: 'giantWasp', count: [2, 2] }], bossName: 'Old Clubtail',
    messages: ['Dripping water spells nothing in particular. Brambur apologizes to it anyway.', 'An inscription: "BEYOND THE CORAL DOOR SLEEPS OLD CLUBTAIL. BRING SNACKS."', 'A cracked mirror. Professor Fizzwick spends some time admiring it.'],
    loot: { gold: [40, 160], items: ['potionHealing', 'potionGreater', 'goldSpoon', 'longsword1', 'mace1', 'quarterstaff1', 'chainMail1', 'rapier1'] },
  },
  {
    name: 'B3: The Thunder-Lizard Vault', seed: 777, color: 0xffb020, fog: 0x140804, trapDC: 15, secretDC: 15, lockDC: 16, trapDmg: '3d10', trapKind: 'darts', key: 'key3', rooms: 3, loops: 10, secrets: 3, fountain: true, final: true,
    table: [[{ key: 'animatedArmor', count: [1, 2] }], [{ key: 'flyingSword', count: [3, 5] }], [{ key: 'allosaurus', count: [1, 1] }], [{ key: 'direWolf', count: [2, 3] }], [{ key: 'giantWasp', count: [3, 4] }], [{ key: 'animatedArmor', count: [1, 1] }, { key: 'flyingSword', count: [2, 2] }]],
    fixed: [[{ key: 'triceratops', count: [1, 1] }], [{ key: 'allosaurus', count: [2, 2] }], [{ key: 'animatedArmor', count: [3, 3] }]],
    boss: [{ key: 'tyrannosaurus', count: [1, 1] }], bossName: 'GROKZILLA, the Tyrant Lizard',
    messages: ['Carved in gold: "HE WHO TAKES THE AMULET OF GROK SHALL KNOW EVERYTHING. ALSO SOME THINGS."', 'Enormous footprints. Fizzwick measures one. "Fizzwick estimates: large."', 'A shrine to a forgotten god of cutlery. Pip weeps openly.'],
    loot: { gold: [100, 300], items: ['potionGreater', 'potionGreater', 'runcibleSpoon', 'greatsword1', 'plate1', 'ringProtection', 'cloakProtection', 'longbow1'] },
  },
];

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

export function generateLevel(idx) {
  const def = LEVEL_DEFS[idx];
  const rng = seeded(def.seed);
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
  // Assign indices for messages/fixed encounters (in scan order)
  const tiles = g.map((r) => r.join(''));
  return { idx, def, tiles, start: [1, 1, 1] };
}

let cache = [];
export function getLevel(i) { return cache[i] || (cache[i] = generateLevel(i)); }
/** Index of a special tile among tiles of the same kind (row-major), used for messages / fixed encounters. */
export function tileOrdinal(level, x, y) {
  const ch = level.tiles[y][x]; let n = 0;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) { if (yy === y && xx === x) return n; if (level.tiles[yy][xx] === ch) n++; }
  return n;
}
