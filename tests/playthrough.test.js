import { describe, it, expect } from 'vitest';
import { playthrough } from '../src/sim/playthrough.js';

// Full campaign, real rules: walks every tile path, every POI, every lieutenant and boss, the town quest turn-ins and the finale.
const CLASSES = ['fighter', 'cleric', 'paladin', 'wizard', 'rogue', 'barbarian', 'ranger', 'bard'];
for (const difficulty of ['story', 'normal', 'hard']) {
  describe(`full playthrough — ${difficulty}`, () => {
    it('beats all five floors, completes every quest, rescues Elowen and reaches the ending', () => {
      const runs = CLASSES.map((heroCls, i) => playthrough({ seed: 500 + i, difficulty, heroCls }));
      const wins = runs.filter((r) => r.victory);
      console.log(`${difficulty}: ${wins.length}/${runs.length} campaigns won; wipes ${runs.map((r) => r.losses).join(',')}; final levels ${runs.map((r) => r.finalLevels.split('/')[0]).join(',')}`);
      for (const r of runs) expect(r.problems, `${r.heroCls}: ${r.problems}`).toEqual([]);
      expect(wins.length).toBeGreaterThanOrEqual(difficulty === 'hard' ? 6 : 8);
      for (const r of wins) {
        for (const [q, st] of Object.entries(r.quests)) expect(st, `${difficulty}/${r.heroCls}: quest ${q}`).toBe('done');
        expect(r.elowen).toBe(true); expect(r.notes).toBe(10); expect(r.ending).toBeGreaterThan(5);
        for (const f of r.floors) { expect(f.boss).toBe(true); expect(f.poisLeft).toBe(0); }
        for (const k of ['B1:boss', 'B2:vey', 'B2:boss', 'B3:sporegrave', 'B3:boss', 'B4:boss', 'B5:boss', 'B5:phase2']) expect(r.bosses[k]?.won, k).toBe(true);
      }
    });
  });
}
