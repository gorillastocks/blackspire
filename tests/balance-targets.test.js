import { describe, it, expect } from 'vitest';
import { simulateCampaign, EXPECTED_BOSS } from '../src/sim/balance.js';

// Guards for the balance pass (scripts/balance-sim.mjs has the full report). Small seeded samples of the REAL game played start to
// finish by an all-AI party that walks the maze, camps, shops, trains and grinds when it is under the boss's expected level.
const SEEDS = Array.from({ length: 16 }, (_, i) => 1 + i);
const run = (comp, opts = {}) => SEEDS.map((seed) => simulateCampaign(seed, { comp, ...opts }));
const fights = (runs) => runs.flatMap((r) => r.fights);
const rate = (n, d) => (d ? n / d : 0);

describe('balance targets (seeded campaign sim)', () => {
  const standard = run('standard'); // full clear, grinds to the expected boss level if behind
  const rush = run('rush', { grind: false }); // skips all optional content, never grinds: the under-levelled case

  it('every party finishes the game', () => {
    for (const rs of [standard, rush]) expect(rs.filter((r) => r.result === 'victory').length).toBeGreaterThanOrEqual(Math.floor(rs.length * 0.9));
  });

  it('a standard party at the expected level beats each floor boss on the first try at least ~70% of the time', () => {
    for (let L = 0; L < 5; L++) {
      const bosses = standard.map((r) => r.floors[L]).filter((f) => f && f.boss.firstTry !== null);
      expect(bosses.length).toBeGreaterThan(0);
      expect(rate(bosses.filter((f) => f.boss.firstTry).length, bosses.length), `B${L + 1} boss first-try win rate`).toBeGreaterThanOrEqual(0.7);
      // they really are at (or past) the level the boss is designed for
      const lvl = bosses.reduce((t, f) => t + f.boss.lvlAtFirst, 0) / bosses.length;
      expect(lvl, `B${L + 1} party level at the boss`).toBeGreaterThanOrEqual(EXPECTED_BOSS[L] - 1);
    }
  });

  it('even a rushing party that skips all optional content does not hit a wall at any boss', () => {
    for (let L = 0; L < 5; L++) {
      const bosses = rush.map((r) => r.floors[L]).filter((f) => f && f.boss.firstTry !== null);
      expect(rate(bosses.filter((f) => f.boss.firstTry).length, bosses.length), `B${L + 1} rush boss win`).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('no wandering or fixed fight wipes a healthy party within two rounds (no ambush one-shot wipes)', () => {
    for (const f of fights([...standard, ...rush])) {
      if (f.res === 'lost' && ['random', 'ambush', 'fixed', 'poi', 'guard'].includes(f.kind)) expect(f.hp0 >= 0.9 && f.rounds <= 2, `B${f.f} ${f.kind} ${f.sig} wiped a full-HP party in ${f.rounds} rounds`).toBe(false);
    }
  });

  it('wipes are rare overall and almost never come from the elites or bosses of floors 2-5', () => {
    const all = [...standard, ...rush];
    expect(all.reduce((t, r) => t + r.wipes, 0) / all.length).toBeLessThanOrEqual(0.6);
    const deep = fights(all).filter((f) => f.f >= 2 && ['elite', 'boss', 'phase2', 'lieutenant'].includes(f.kind));
    expect(rate(deep.filter((f) => f.res === 'lost').length, deep.length)).toBeLessThanOrEqual(0.03);
  });

  it('level 1 is survivable: the B1 elites and boss lose a party less than 12% of the time', () => {
    const b1 = fights([...standard, ...rush]).filter((f) => f.f === 1 && ['elite', 'boss'].includes(f.kind));
    expect(b1.length).toBeGreaterThan(10);
    expect(rate(b1.filter((f) => f.res === 'lost').length, b1.length)).toBeLessThan(0.12);
  });

  it('boss fights are real fights: floors 2-5 last 2+ rounds on average and never one-shot a healthy hero more than rarely', () => {
    for (let fl = 2; fl <= 5; fl++) {
      const b = fights([...standard, ...rush]).filter((f) => f.f === fl && (f.kind === 'boss' || f.kind === 'phase2'));
      expect(b.reduce((t, f) => t + f.rounds, 0) / b.length, `B${fl} boss rounds`).toBeGreaterThanOrEqual(2);
      expect(rate(b.filter((f) => f.oneShots > 0).length, b.length), `B${fl} boss one-shots`).toBeLessThanOrEqual(0.1);
    }
  });

  it('the sim is deterministic per seed', () => {
    const a = simulateCampaign(5, { comp: 'liora' }), b = simulateCampaign(5, { comp: 'liora' });
    expect(a.steps).toBe(b.steps); expect(a.fights.length).toBe(b.fights.length); expect(a.finalLevels).toBe(b.finalLevels);
  });
}, 300000);
