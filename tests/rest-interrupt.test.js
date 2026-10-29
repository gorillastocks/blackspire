import { describe, it, expect, afterEach } from 'vitest';
import { newGame, enterDungeon, rest, quiet } from '../src/game/game.js';
import { setRng } from '../src/rules/dice.js';

afterEach(() => setRng(null));
const fresh = () => { const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; enterDungeon(s, 0); return s; };
const interrupted = (s, kind, r) => { setRng(() => r); return rest(s, kind).some((o) => o.combat && o.combat.ambush); };

describe('dungeon rest interrupts', () => {
  it('a long rest in a fully quiet (cleared) area still has a 12% floor', () => {
    const s = fresh(); s.fightsWon[s.level] = 8; expect(0.3 * quiet(s)).toBeLessThan(0.12); // 0.3 * quiet would have been under 12%
    expect(interrupted(s, 'long', 0.11)).toBe(true);   // inside the 12% floor
    expect(interrupted(s, 'long', 0.13)).toBe(false);  // outside it
  });
  it('short rests keep 0.12 * quiet(s): no floor', () => {
    const s = fresh(); s.fightsWon[s.level] = 8; expect(0.12 * quiet(s)).toBeLessThan(0.02);
    expect(interrupted(s, 'short', 0.11)).toBe(false);
    const f = fresh(), c = 0.12 * quiet(f); expect(interrupted(f, 'short', c * 0.9)).toBe(true); expect(interrupted(f, 'short', c * 1.1)).toBe(false);
  });
  it('a long rest in a fresh area keeps the full 30% chance', () => {
    const f = fresh(), c = 0.3 * quiet(f); expect(c).toBeGreaterThan(0.12); expect(interrupted(f, 'long', c * 0.95)).toBe(true); expect(interrupted(f, 'long', c * 1.05)).toBe(false);
  });
  it('the town is never interrupted', () => {
    const s = fresh(); s.mode = 'town'; expect(interrupted(s, 'long', 0.01)).toBe(false);
  });
});
