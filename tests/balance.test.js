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
    // Near the finale the party is at (or one step from) the level-9 cap: everyone is at least level 8 after the last floor,
    // the average party is close to 9, and some runs hit the cap. (Not "most runs at exactly 9" — the curve tops out in the finale.)
    const fin = runs.map((r) => r.levels.at(-1).split('/').map(Number)); const avg = fin.flat().reduce((a, b) => a + b, 0) / fin.flat().length;
    const at9 = fin.filter((f) => f.every((l) => l >= 9)).length; console.log(`final party level avg ${avg.toFixed(2)}, runs at the level-9 cap: ${at9}/30`);
    for (const f of fin) expect(Math.min(...f)).toBeGreaterThanOrEqual(8);
    expect(avg).toBeGreaterThanOrEqual(8.4); expect(at9).toBeGreaterThanOrEqual(3);
    expect(fightWin).toBeGreaterThan(0.8);
    // (Normal can now be a clean sweep for the sim; 'not trivial' is checked on Hard below.)
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
    expect(r.hard.fightWin).toBeLessThan(0.995); // Hard is not a walkover
  });
});
