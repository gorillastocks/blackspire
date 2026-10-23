import { describe, it, expect } from 'vitest';
import { simulateRun } from '../src/sim/simulate.js';

describe('all-AI balance simulation', () => {
  it('an all-AI party usually beats the game', () => {
    const runs = []; for (let i = 1; i <= 30; i++) runs.push(simulateRun(1000 + i, { heroCls: ['fighter', 'cleric', 'rogue', 'wizard'][i % 4] }));
    const wins = runs.filter((r) => r.result === 'victory').length;
    const fightWin = runs.reduce((a, r) => a + r.wins, 0) / runs.reduce((a, r) => a + r.fights, 0);
    const boss = [0, 1, 2].map((l) => runs.reduce((a, r) => a + (r.bossAttempts[l] || 0), 0));
    console.log(`victories ${wins}/30, random-fight win rate ${(fightWin * 100).toFixed(1)}%, boss attempts ${boss}, final party levels e.g. ${runs[0].levels}`);
    console.log(runs.map((r) => r.result).join(', '));
    expect(wins).toBeGreaterThanOrEqual(18); // game is beatable
    expect(fightWin).toBeGreaterThan(0.8);
    expect(fightWin).toBeLessThan(1.0); // but not trivially so
  });
});
