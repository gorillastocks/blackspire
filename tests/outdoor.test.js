import { describe, it, expect } from 'vitest';
import { generateLevel, LEVEL_DEFS, W, H, bfs, validateLevel } from '../src/dungeon/levels.js';
import { skyAt } from '../src/render/outdoor.js';
import { outdoorRegion, inRegion, weatherFor, hourAt, todName, OUTDOOR_LEVEL } from '../src/dungeon/outdoor.js';

describe('Phase E outdoor area', () => {
  it('only the chosen floor has an outdoor region; the others are untouched', () => {
    for (let i = 0; i < LEVEL_DEFS.length; i++) {
      const r = outdoorRegion(generateLevel(i));
      if (i === OUTDOOR_LEVEL) expect(r).toBeTruthy(); else expect(r).toBeNull();
    }
  });
  it('picks a small, roomy window with no stairs, altar, boss or locked door, for many seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const L = generateLevel(OUTDOOR_LEVEL, seed * 977); const R = outdoorRegion(L);
      expect(R, `seed ${seed}`).toBeTruthy();
      expect(R.x0).toBeGreaterThanOrEqual(0); expect(R.y0).toBeGreaterThanOrEqual(0); expect(R.x1).toBeLessThan(W); expect(R.y1).toBeLessThan(H);
      expect(R.x1 - R.x0).toBeLessThanOrEqual(6); expect(R.y1 - R.y0).toBeLessThanOrEqual(6);
      let open = 0;
      for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) { const c = L.tiles[y][x]; expect('<>ABL'.includes(c)).toBe(false); if (c !== '#') open++; }
      expect(open).toBeGreaterThanOrEqual(12);
      expect(inRegion(R, R.x0, R.y0)).toBe(true); expect(inRegion(R, R.x1 + 1, R.y0)).toBe(false);
    }
  });
  it('is deterministic and does not change the layout: the level still validates and every feature is still reachable', () => {
    const a = generateLevel(OUTDOOR_LEVEL, 3131), b = generateLevel(OUTDOOR_LEVEL, 3131);
    expect(outdoorRegion(a)).toEqual(outdoorRegion(b));
    expect(validateLevel(a)).toEqual([]);
    const st = [...a.tiles.join('')].indexOf('<'); const d = bfs(a.tiles, st % W, Math.floor(st / W));
    for (const ch of ['C', 'E', 'M', 'Q']) a.tiles.forEach((row, y) => [...row].forEach((c, x) => { if (c === ch) expect(d[y][x]).toBeGreaterThan(0); }));
  });
  it('weather is rain or mist by seed, and the day cycle covers dawn, day, dusk and night', () => {
    expect(['rain', 'mist']).toContain(weatherFor({ seed: 3131 }));
    expect(new Set([0, 4, 8, 12, 16].map((n) => weatherFor({ seed: n }))).size).toBe(2);
    const seen = new Set(); for (let s = 0; s < 360; s += 5) seen.add(todName(hourAt(s)).name);
    expect([...seen].sort()).toEqual(['dawn', 'day', 'dusk', 'night']);
    expect(hourAt(0)).toBeGreaterThanOrEqual(0); expect(hourAt(100000)).toBeLessThan(24);
  });
  it('sky colours: night is darker than day; rain and mist dim and thicken the day; fog opens up from the indoor 0.075', () => {
    const lum = (c) => c.r * 0.3 + c.g * 0.6 + c.b * 0.1;
    const day = skyAt(12, 'clear'), night = skyAt(23, 'clear'), rain = skyAt(12, 'rain'), mist = skyAt(12, 'mist');
    expect(lum(night.horizon)).toBeLessThan(lum(day.horizon) * 0.3); expect(night.stars).toBeGreaterThan(0.8); expect(day.stars).toBe(0);
    expect(night.hemiInt).toBeLessThan(day.hemiInt); expect(rain.sunInt).toBeLessThan(day.sunInt); expect(lum(rain.horizon)).toBeLessThan(lum(day.horizon));
    expect(rain.fogDensity).toBeLessThan(0.075); expect(mist.fogDensity).toBeGreaterThan(rain.fogDensity);
    expect(skyAt(24, 'rain').top.getHex()).toBe(skyAt(0, 'rain').top.getHex()); // seamless midnight wrap
    for (let h = 0; h < 24; h += 0.5) { const k = skyAt(h, 'mist'); expect(Number.isFinite(k.sunInt + k.hemiInt + k.stars + k.day)).toBe(true); }
  });
});
