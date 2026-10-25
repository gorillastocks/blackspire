import { describe, it, expect } from 'vitest';
import { simulateRun } from '../src/sim/simulate.js';

describe('all-AI balance simulation', () => {
  it('an all-AI party usually beats the game', () => {
    const runs = []; for (let i = 1; i <= 30; i++) runs.push(simulateRun(1000 + i, { heroCls: ['fighter', 'cleric', 'rogue', 'wizard'][i % 4] }));
    const wins = runs.filter((r) => r.result === 'victory').length;
    const fightWin = runs.reduce((a, r) => a + r.wins, 0) / runs.reduce((a, r) => a + r.fights, 0);
    const boss = [0, 1, 2, 3, 4].map((l) => runs.reduce((a, r) => a + (r.bossAttempts[l] || 0), 0));
    console.log(`victories ${wins}/30, random-fight win rate ${(fightWin * 100).toFixed(1)}%, boss attempts ${boss}, final party levels e.g. ${runs[0].levels}`);
    console.log(runs.map((r) => r.result).join(', '));
    expect(wins).toBeGreaterThanOrEqual(18); // game is beatable
    const at9 = runs.filter((r) => r.levels.at(-1)?.split('/').every((l) => +l >= 9)).length; console.log(`runs finishing at level 9: ${at9}/30`); expect(at9).toBeGreaterThanOrEqual(24); // the campaign takes a party to the level-9 cap
    expect(fightWin).toBeGreaterThan(0.8);
    expect(fightWin).toBeLessThan(1.0); // but not trivially so
  });
});

describe('balance by difficulty', () => {
  const stats = (difficulty) => {
    const runs = []; for (let i = 1; i <= 30; i++) runs.push(simulateRun(2000 + i, { heroCls: ['fighter', 'cleric', 'rogue', 'wizard'][i % 4], difficulty }));
    return { wins: runs.filter((r) => r.result === 'victory').length, fightWin: runs.reduce((a, r) => a + r.wins, 0) / runs.reduce((a, r) => a + r.fights, 0) };
  };
  it('Story ≥ Normal ≥ Hard, and every difficulty is beatable', () => {
    const r = Object.fromEntries(['story', 'normal', 'hard'].map((d) => [d, stats(d)]));
    for (const [d, v] of Object.entries(r)) console.log(`${d}: victories ${v.wins}/30, random-fight win rate ${(v.fightWin * 100).toFixed(1)}%`);
    expect(r.story.wins).toBeGreaterThanOrEqual(r.normal.wins);
    expect(r.normal.fightWin).toBeGreaterThanOrEqual(r.hard.fightWin);
    expect(r.story.wins).toBeGreaterThanOrEqual(27);
    expect(r.hard.wins).toBeGreaterThanOrEqual(5);
  });
});
