// Phase E: an open-air section of the grid ("the Sunken Orchard" on B3). DOM-free rules + helpers; the renderer lives in render/outdoor.js.
// The map itself is untouched (same tiles, same encounters, secrets, elites and events). The region is only a rectangle of
// cells that are drawn under open sky: grass and dirt for floor, trees / boulders / cliffs for walls, ruined arches at the doors.
import { W, H, LEVEL_DEFS } from './levels.js';

export const OUTDOOR_LEVEL = 2; // B3: The Glimmerdeep — its roof has fallen in
export const OUTDOOR_NAME = 'The Sunken Orchard';
export const OUTDOOR_BLURB = 'Part of the cavern roof has fallen in. Open sky, rain-soaked grass, and an old elven gate.';
const BLOCKERS = new Set(['<', '>', 'A', 'B', 'L']); // never put the stairs, altar, boss or locked door under the open sky window
const FEATURES = new Set(['C', 'E', 'M', 'Q', 'F', 'S', 'T', 'D', 'K']);

export const inRegion = (R, x, y) => !!R && x >= R.x0 && x <= R.x1 && y >= R.y0 && y <= R.y1;

/** Pick (deterministically) a small window of the level to be outdoors: roomy, a few features, none of the key tiles. */
export function outdoorRegion(L) {
  if (!L || L.idx !== OUTDOOR_LEVEL || !LEVEL_DEFS[L.idx]?.outdoor) return null;
  const t = L.tiles;
  for (const size of [7, 6, 5]) {
    let best = null;
    for (let y0 = 0; y0 + size <= H; y0++) for (let x0 = 0; x0 + size <= W; x0++) {
      let open = 0, feat = 0, bad = false, room = 0;
      for (let y = y0; y < y0 + size && !bad; y++) for (let x = x0; x < x0 + size; x++) {
        const c = t[y][x]; if (BLOCKERS.has(c)) { bad = true; break; }
        if (c !== '#') open++; if (FEATURES.has(c)) feat++;
        if (c === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => t[y + dy]?.[x + dx] && t[y + dy][x + dx] !== '#')) room++;
      }
      if (bad || open < 12) continue;
      const score = open + feat * 3 + room * 2 - Math.abs(x0 + size / 2 - W / 2) * 0.05; // a little pull toward the middle for a nicer map
      if (!best || score > best.score) best = { score, x0, y0 };
    }
    if (best) return { x0: best.x0, y0: best.y0, x1: best.x0 + size - 1, y1: best.y0 + size - 1, name: OUTDOOR_NAME, weather: weatherFor(L), seed: L.seed || 0 };
  }
  return null;
}

/** Light weather by the floor's seed: rain on even rolls, mist on odd ones. */
export const weatherFor = (L) => ((((L?.seed ?? 0) >>> 2) & 1) ? 'mist' : 'rain');

/** In-game hour (0–24) from the number of steps taken: one full day is 360 steps; a new game starts at mid-morning. */
export const HOUR_START = 9, STEPS_PER_DAY = 360;
export const hourAt = (steps = 0) => (HOUR_START + (steps / STEPS_PER_DAY) * 24) % 24;
export function todName(h) {
  if (h >= 5 && h < 8) return { name: 'dawn', icon: '🌅' };
  if (h >= 8 && h < 17) return { name: 'day', icon: '☀️' };
  if (h >= 17 && h < 20) return { name: 'dusk', icon: '🌇' };
  return { name: 'night', icon: '🌙' };
}
export const WEATHER_INFO = { rain: { icon: '🌧', name: 'Rain' }, mist: { icon: '🌫', name: 'Mist' }, clear: { icon: '', name: 'Clear' } };
