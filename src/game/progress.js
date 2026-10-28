// Anti-grind progression: XP for discoveries as well as fights, catch-up / rested bonuses, shrinking encounter rates,
// trivial-fight detection and the automap helpers (pathing, pins, goals). DOM-free so it can be unit tested.
import { getLevel, W, H, DIRS, LEVEL_DEFS } from '../dungeon/levels.js';
import { CR_XP, MONSTERS, ITEMS } from '../rules/data.js';

export const SAVE_VERSION = 4;
/** Base XP for non-combat finds, multiplied by the dungeon tier (B1 = 1 ... B5 = 5). */
export const DISCOVERY_XP = { secret: 60, trap: 15, lore: 25, room: 12, key: 40, chest: 25, fountain: 20, stairs: 30, quest: 150, elite: 120, poi: 40 };
export const CATCHUP_PER_LEVEL = 0.3, CATCHUP_MAX_LEVELS = 3, RESTED_BONUS = 0.5, BENCH_RATIO = 0.5;
export const PINS = ['📍', '❗', '❓', '💰', '🚪', '☠', '📜', '✨'];

/** Make sure a (possibly old) state has every Phase-A field. Safe to call repeatedly. */
export function initProgress(s) {
  const N = LEVEL_DEFS.length;
  s.disc ||= {}; s.rested = s.rested | 0; s.fightsWon ||= []; s.cleared ||= []; s.pins ||= []; s.session ||= null; s.stats ||= { secrets: 0, discoveries: 0, trivial: 0 };
  while (s.fightsWon.length < N) s.fightsWon.push(0); while (s.cleared.length < N) s.cleared.push([]); while (s.pins.length < N) s.pins.push([]);
  s.suspect ||= []; while (s.suspect.length < N) s.suspect.push([]); s.eliteSeen ||= {}; s.rareFound ||= []; s.searchMiss = s.searchMiss | 0; // v4: secrets, elites, rare loot
  s.version = Math.max(s.version | 0, SAVE_VERSION);
  return s;
}

const alive = (s) => (s.party || []).filter((c) => !c.dead);
const maxLevel = (s) => Math.max(1, ...[...(s.party || []), ...(s.roster || [])].filter((c) => !c.dead).map((c) => c.level));
const avgLevel = (s) => { const a = alive(s); return a.length ? a.reduce((t, c) => t + c.level, 0) / a.length : 1; };

/** XP multiplier for one character: catch-up for being behind the best level (+30% per level, up to 3), plus the party's rested bonus. */
export function catchUp(s, c) { return 1 + CATCHUP_PER_LEVEL * Math.max(0, Math.min(CATCHUP_MAX_LEVELS, maxLevel(s) - c.level)); }

/** Core XP award: every living party member gets `base` (x catch-up, x rested while the pool lasts); benched roster members get half. Returns a short breakdown. */
export function giveXp(s, base, { bench = true } = {}) {
  initProgress(s); base = Math.max(0, Math.round(base)); if (!base) return { base: 0, gains: new Map(), notes: [] };
  const notes = [], gains = new Map(); let rested = 0;
  if (s.rested > 0) { rested = Math.min(s.rested, Math.round(base * RESTED_BONUS)); s.rested -= rested; if (rested) notes.push(`rested +${rested}`); }
  for (const c of alive(s)) {
    const cu = catchUp(s, c), g = Math.round(base * cu) + rested; c.xp += g; gains.set(c, g);
    if (cu > 1) notes.push(`catch-up +${Math.round((cu - 1) * 100)}% ${c.name}`);
  }
  if (bench) for (const c of s.roster || []) if (!c.dead) { const g = Math.round(base * BENCH_RATIO * catchUp(s, c)); if (g) { c.xp += g; gains.set(c, g); } }
  return { base, gains, notes };
}

/** Award XP for a one-off find. `key` makes it once-only per save. Returns events for handle(). */
export function discover(s, kind, key, label) {
  initProgress(s); const id = `${kind}:${s.level}:${key}`; if (s.disc[id]) return [];
  s.disc[id] = 1; s.stats.discoveries++; if (kind === 'secret') s.stats.secrets++;
  const tier = (s.mode === 'dungeon' ? s.level : Math.max(s.level, s.maxDepth | 0)) + 1; const base = (DISCOVERY_XP[kind] || 10) * tier; const r = giveXp(s, base);
  return [{ log: `✦ +${r.base} XP each — ${label || kind}${r.notes.length ? ` (${r.notes.join(', ')})` : ''}`, cls: 'good', xp: r.base }];
}
export function questXp(s, key, label) { return discover(s, 'quest', key, label || 'quest complete'); }

/** Combat victory XP (called from Combat.checkEnd): shares, catch-up, rested, bench. `elite` doubles it. */
export function awardCombatXp(s, share, info = {}) {
  const elite = !!(info.elite || info.lieutenant || info.guard); // named lieutenants and POI guards are the elites
  const base = share * (elite ? 2 : 1); const r = giveXp(s, base);
  const mx = Math.max(0, ...r.gains.values()), mn = Math.min(...r.gains.values());
  return { text: `${elite ? 'Elite slain! ' : ''}Each survivor earns ${mn === mx ? mx : `${mn}–${mx}`} XP${r.notes.length ? ` (${[...new Set(r.notes)].join(', ')})` : ''}.`, base: r.base };
}

/* ---------- Encounter rate: exploring / clearing makes an area quieter ---------- */
const floorCount = new Map();
function floorTiles(lvl) { const key = `${lvl}`; const L = getLevel(lvl); const c = floorCount.get(L); if (c) return c; let n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ch = L.tiles[y][x]; if (ch !== '#' && ch !== 'S') n++; } floorCount.set(L, n); return n; }
export function exploredFraction(s, lvl = s.level) {
  const L = getLevel(lvl); let n = 0; for (const k of s.explored[lvl] || []) { const [x, y] = k.split(',').map(Number); const ch = L.tiles[y]?.[x]; if (ch && ch !== '#' && ch !== 'S') n++; }
  return Math.min(1, n / Math.max(1, floorTiles(lvl)));
}
export const CLEAR_RADIUS = 4;
export function inClearedZone(s, x = s.x, y = s.y, lvl = s.level) { return (s.cleared?.[lvl] || []).some((k) => { const [cx, cy] = k.split(',').map(Number); return Math.abs(cx - x) + Math.abs(cy - y) <= CLEAR_RADIUS; }); }
/** 1.0 = fresh area; falls toward ~0.1 as it is explored, cleared and fought through. */
export function encounterScale(s, x = s.x, y = s.y, lvl = s.level) {
  initProgress(s); const frac = exploredFraction(s, lvl);
  let f = Math.max(0.15, 1 - 0.85 * frac) * Math.pow(0.8, Math.min(8, s.fightsWon[lvl] || 0));
  if (inClearedZone(s, x, y, lvl)) f *= 0.12;
  return f;
}
export function noteFightWon(s, info = {}) {
  initProgress(s); if (!info.random) return; s.fightsWon[s.level]++;
  const z = s.cleared[s.level]; const k = `${s.x},${s.y}`; if (!z.includes(k)) { z.push(k); if (z.length > 12) z.shift(); }
}

/* ---------- Trivial fights ---------- */
const EASY = [25, 50, 75, 125, 250, 300, 350, 450, 550, 600]; // 5e "easy" XP threshold per character level
export function threat(groups) { return groups.reduce((t, g) => t + (CR_XP[MONSTERS[g.key]?.cr] || 10) * g.count, 0); }
export function isTrivial(s, groups, info = {}) {
  if (info.boss || info.fixed || info.poi || info.town || info.elite || info.guard || info.story) return false;
  const live = alive(s); if (!live.length || live.some((c) => c.hp <= c.maxHp * 0.5)) return false;
  const maxCr = Math.max(0, ...groups.map((g) => MONSTERS[g.key]?.cr || 0));
  const budget = live.reduce((t, c) => t + (EASY[Math.min(9, c.level - 1)] || 25), 0);
  return threat(groups) <= budget * 0.5 && avgLevel(s) >= 2 + Math.ceil(maxCr);
}

/* ---------- Rested bonus ---------- */
export function addRested(s, kind) { initProgress(s); const pl = Math.round(avgLevel(s)); const add = kind === 'inn' ? 120 * pl : 40 * pl; s.rested = Math.min(360 * pl, s.rested + add); return s.rested; }

/* ---------- Automap: pathing, pins, goals ---------- */
const WALK_STOP = new Set(['E', 'B', 'T', 'C', 'Q', 'K', 'M', 'F', '>', '<', 'A']); // events happen here: path may end on them, not cross them
/** Shortest walkable route over explored tiles from the party to (tx,ty), as [x,y] steps (excluding the start). null if none. */
export function findPath(s, tx, ty, tileFn) {
  const ex = new Set(s.explored[s.level]); const key = (x, y) => `${x},${y}`;
  if (!ex.has(key(tx, ty)) || (tx === s.x && ty === s.y)) return null;
  const ok = (x, y) => { const ch = tileFn(x, y); return ch !== '#' && ch !== 'S' && ch !== 'L' && x >= 0 && y >= 0 && x < W && y < H; };
  if (!ok(tx, ty)) return null;
  const prev = new Map([[key(s.x, s.y), null]]); const q = [[s.x, s.y]];
  while (q.length) {
    const [x, y] = q.shift(); if (x === tx && y === ty) break;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k) || !ex.has(k) || !ok(nx, ny)) continue;
      if (WALK_STOP.has(tileFn(nx, ny)) && !(nx === tx && ny === ty)) continue;
      prev.set(k, [x, y]); q.push([nx, ny]);
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  const path = []; for (let c = [tx, ty]; c && !(c[0] === s.x && c[1] === s.y); c = prev.get(key(c[0], c[1]))) path.unshift(c);
  return path;
}
export function addPin(s, x, y, icon = PINS[0], note = '') { initProgress(s); const list = s.pins[s.level]; const i = list.findIndex((p) => p.x === x && p.y === y); const pin = { x, y, icon: PINS.includes(icon) ? icon : PINS[0], note: String(note || '').slice(0, 80) }; if (i >= 0) list[i] = pin; else list.push(pin); if (list.length > 40) list.shift(); return pin; }
export function removePin(s, x, y) { initProgress(s); const list = s.pins[s.level]; const i = list.findIndex((p) => p.x === x && p.y === y); if (i >= 0) list.splice(i, 1); return i >= 0; }
export const pinAt = (s, x, y) => (s.pins?.[s.level] || []).find((p) => p.x === x && p.y === y) || null;

/** A short, doable goal for a quick session. */
export function nextGoal(s) {
  const def = getLevel(s.level).def, frac = exploredFraction(s);
  if (!s.keys.includes(def.key)) return { text: `Find the ${ITEMS[def.key]?.name || 'level key'} (explored ${Math.round(frac * 100)}%)`, kind: 'key' };
  if (!s.bossDead[s.level]) return { text: `Face the guardian — ${def.bossName}`, kind: 'boss' };
  if (frac < 0.8) return { text: `Explore a little more (${Math.round(frac * 100)}% → 80%) for secrets and loot`, kind: 'explore' };
  return { text: 'Take the stairs down, or return to town to level up', kind: 'stairs' };
}
export function sessionStart(s) { initProgress(s); const h = (s.party || [])[0]; s.session = { xp0: (s.party || []).reduce((t, c) => t + c.xp, 0), gold0: s.gold, steps0: s.steps, disc0: s.stats.discoveries, secrets0: s.stats.secrets, fights0: (s.fightsWon || []).reduce((a, b) => a + b, 0), t0: Date.now() }; return s.session; }
export function sessionRecap(s) {
  const q = s.session; if (!q) return null; const n = (s.party || []).length || 1;
  const xp = Math.round(((s.party || []).reduce((t, c) => t + c.xp, 0) - q.xp0) / n), gold = s.gold - q.gold0, steps = s.steps - q.steps0;
  const lines = [`✦ +${Math.max(0, xp)} XP each`, `💰 ${gold >= 0 ? '+' : ''}${gold} gold`, `👣 ${steps} steps · ${Math.max(0, s.stats.discoveries - q.disc0)} finds · ${Math.max(0, s.stats.secrets - q.secrets0)} secrets`];
  if (s.mode === 'dungeon' || s.level >= 0) lines.push(`🗺 ${LEVEL_DEFS[s.level]?.name || ''}: ${Math.round(exploredFraction(s) * 100)}% explored`);
  s.session = null; return { text: '⛺ Delve recap', cls: 'loot', lines };
}

/** Quests that finished since last checked pay XP once (old saves are marked silently on load). */
export function sweepQuests(s, silent = false) {
  initProgress(s); const out = [];
  for (const [q, st] of Object.entries(s.quests || {})) if (q !== 'main' && st === 'done' && !s.disc[`quest:${q}`]) {
    if (silent) s.disc[`quest:${q}`] = 1; else out.push(...discover(s, 'quest', q, 'quest complete'));
  }
  return out;
}

/** Per-floor secret tally: { found, total }. Every 'S' cell the floor was built with counts once; it is found when its discovery is recorded. */
export function secretCount(s, lvl = s.level) {
  const L = getLevel(lvl); const cells = L.secretCells || [];
  return { found: cells.filter((c) => s.disc?.[`secret:${lvl}:${c}`]).length, total: cells.length };
}
