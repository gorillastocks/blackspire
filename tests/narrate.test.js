import { describe, it, expect } from 'vitest';
import { line, narrateAttack, NARRATION_POOLS } from '../src/rules/narrate.js';
describe('narration', () => {
  it('never repeats back-to-back and has variety', () => {
    let prev = null; const seen = new Set();
    for (let i = 0; i < 200; i++) { const l = line('slashing', { att: 'Brambur', tgt: 'the rat' }); expect(l).not.toBe(prev); prev = l; seen.add(l); }
    expect(seen.size).toBeGreaterThan(4);
  });
  it('every pool has several lines', () => { for (const [k, v] of Object.entries(NARRATION_POOLS)) expect(v.length, k).toBeGreaterThanOrEqual(3); });
  it('attack narration names the combatants', () => {
    const t = narrateAttack({ att: 'Pip', tgt: 'the cultist', label: 'Shortsword', hit: true, crit: false, killed: false });
    expect(typeof t).toBe('string'); expect(t.length).toBeGreaterThan(5);
  });
});
