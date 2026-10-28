import { describe, it, expect } from 'vitest';
import { ITEMS, DROP_POOL, TIERS, tierOf, TIER_COLOR } from '../src/rules/data.js';
import { fxSum, weaponStats } from '../src/rules/character.js';

describe('rare loot tiers', () => {
  it('every pool entry exists and carries its tier', () => {
    for (const t of TIERS.slice(1)) for (const k of DROP_POOL[t]) { expect(ITEMS[k], k).toBeTruthy(); expect(tierOf(k), k).toBe(t); }
    for (const t of TIERS) expect(TIER_COLOR[t]).toMatch(/^#/);
  });
  it('default tiers: set pieces legendary, magic gear uncommon', () => {
    expect(tierOf('dawnfang')).toBe('legendary'); expect(tierOf('potionHealing')).toBe('common'); expect(tierOf('longsword1')).toBe('uncommon');
  });
  it('named items add elemental damage and heal-on-kill', () => {
    const c = { cls: 'fighter', level: 3, scores: { str: 16, dex: 12, con: 12, int: 8, wis: 10, cha: 8 }, race: 'human', conditions: {}, equip: { weapon: { base: 'longsword', magic: 1, key: 'emberbrand' }, ring: 'bloodRing' } };
    expect(weaponStats(c, 'weapon').elem).toEqual({ dmg: '1d4', type: 'fire' });
    expect(weaponStats(c, 'weapon').name).toBe('Emberbrand');
    expect(fxSum(c, 'healOnKill')).toBe(3);
  });
});
