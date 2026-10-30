import { describe, it, expect } from 'vitest';
import { Combat } from '../src/rules/combat.js';
import { TUNING } from '../src/rules/data.js';
import { setRng, seeded } from '../src/rules/dice.js';
import { makeParty, simulateCampaign } from '../src/sim/balance.js';

// The B2 boss (Clubtail + wasps) is trimmed for a party with nobody who can heal (no cleric, druid, bard or paladin standing).
const groups = [{ key: 'ankylosaurus', count: 1 }, { key: 'giantWasp', count: 3 }];
const fight = (party, floor, boss = true) => (setRng(seeded(7)), new Combat(party, groups, { boss, story: { floor }, difficulty: 'normal' }));
const hp = (cb) => cb.monsters.map((m) => m.maxHp);

describe('B2 boss for a party with no healer', () => {
  const healer = makeParty('standard', 'fighter', 1), none = makeParty('nohealer', 'fighter', 1);
  it('the test parties are what they say they are', () => {
    expect(healer.party.some((c) => ['cleric', 'druid', 'bard', 'paladin'].includes(c.cls))).toBe(true);
    expect(none.party.some((c) => ['cleric', 'druid', 'bard', 'paladin'].includes(c.cls))).toBe(false);
  });
  it('a no-healer party faces a boss with less HP; a party with a healer is unchanged', () => {
    const a = hp(fight(healer.party, 1)), b = hp(fight(none.party, 1));
    expect(b[0]).toBeLessThan(a[0]); expect(b[0]).toBeCloseTo(a[0] * TUNING.noHealerBoss.hp, -1);
    expect(fight(none.party, 1).noHealerEase).toBeTruthy(); expect(fight(healer.party, 1).noHealerEase).toBeNull();
  });
  it('only the B2 boss: not other floors, and not an ordinary B2 fight', () => {
    expect(hp(fight(none.party, 2))).toEqual(hp(fight(healer.party, 2)));
    expect(hp(fight(none.party, 1, false))).toEqual(hp(fight(healer.party, 1, false)));
  });
  it('a healer who is down does not count', () => {
    const p = makeParty('standard', 'fighter', 1).party; for (const c of p) if (['cleric', 'druid', 'bard', 'paladin'].includes(c.cls)) c.dead = true;
    expect(fight(p, 1).noHealerEase).toBeTruthy();
  });
  it('a no-healer party now wins the B2 boss on the first try about as often as a party with a healer (seeded sim)', () => {
    const seeds = Array.from({ length: 60 }, (_, i) => 1 + i);
    const rate = (comp) => { const b = seeds.map((s) => simulateCampaign(s, { comp, grind: false }).floors[1]).filter((f) => f && f.boss.firstTry !== null); return b.filter((f) => f.boss.firstTry).length / b.length; };
    const nh = rate('nohealer'), st = rate('standard');
    expect(nh).toBeGreaterThanOrEqual(0.72); expect(nh).toBeGreaterThanOrEqual(st - 0.12);
  }, 120000);
});
