import { describe, it, expect } from 'vitest';
import { generateLevel, validateLevel, LEVEL_DEFS, getLevel, setDungeonSeeds } from '../src/dungeon/levels.js';
import * as G from '../src/game/game.js';

describe('random dungeons', () => {
  it('400 random seeds per floor all produce valid, fully reachable layouts', { timeout: 30000 }, () => {
    let rerolls = 0;
    for (let i = 0; i < LEVEL_DEFS.length; i++) for (let k = 0; k < 400; k++) {
      const seed = (k * 2654435761 + i * 97) >>> 2; const L = generateLevel(i, seed);
      expect(validateLevel(L), `floor ${i} seed ${seed}`).toEqual([]);
      if (L.seed !== seed) rerolls++;
    }
    console.log(`validator re-rolled ${rerolls} of 2000 layouts`);
  });
  it('the validator catches a broken layout', () => {
    const L = generateLevel(0); const bad = { ...L, tiles: L.tiles.map((r) => r.replace('K', '.')) }; expect(validateLevel(bad).length).toBeGreaterThan(0);
  });
  it('default is the classic fixed layouts; toggle ON stores seeds in the save and loading reproduces them', () => {
    const a = G.newGame({ name: 'A' }); expect(a.randomDungeons).toBe(false); expect(a.seeds).toBe(null);
    const classic = getLevel(2).tiles.join('');
    const s = G.newGame({ name: 'R', randomDungeons: true }); expect(s.seeds.length).toBe(5); expect(s.randomDungeons).toBe(true);
    const layout = LEVEL_DEFS.map((_, i) => getLevel(i).tiles.join(''));
    expect(layout[2]).not.toBe(classic);
    const raw = G.serialize(s); setDungeonSeeds(null); G.newGame({ name: 'other', randomDungeons: true });
    const back = G.deserialize(raw); expect(back.seeds).toEqual(s.seeds);
    expect(LEVEL_DEFS.map((_, i) => getLevel(i).tiles.join(''))).toEqual(layout);
    // an old save without seeds loads the classic layouts
    const old = JSON.parse(raw); delete old.seeds; delete old.randomDungeons; G.deserialize(JSON.stringify(old)); expect(getLevel(2).tiles.join('')).toBe(classic);
  });
});
