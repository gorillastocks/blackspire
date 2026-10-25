import { describe, it, expect } from 'vitest';
import { CLASSES, MAX_LEVEL, slotsFor, SPELLS } from '../src/rules/data.js';
import { createCharacter, assignByPriority, levelUp, armorClass, knownSpells, reclass, longRest, shortRest } from '../src/rules/character.js';
import { Combat } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';

const NEW = ['barbarian', 'bard', 'druid', 'monk', 'paladin', 'ranger', 'sorcerer', 'warlock'];
const mk = (cls, level = 1, race = 'human') => { const c = createCharacter({ name: cls, race, cls, base: assignByPriority(cls) }); c.xp = 1e6; while (c.level < level) levelUp(c); longRest(c); return c; };

describe('12 SRD classes', () => {
  it('has all 12 classes with a subclass and features through level 9', () => {
    expect(Object.keys(CLASSES).length).toBe(12); expect(MAX_LEVEL).toBe(9);
    for (const [k, C] of Object.entries(CLASSES)) { expect(C.sub, k).toBeTruthy(); expect(C.features[1].length, k).toBeGreaterThan(0); }
  });
  it('spell slot tables: full casters reach 5th, half casters 3rd, warlock pact slots at 5th', () => {
    expect(slotsFor('wizard', 9)).toEqual([4, 3, 3, 3, 1]); expect(slotsFor('paladin', 1)).toEqual([]); expect(slotsFor('ranger', 9)).toEqual([4, 3, 2]);
    expect(slotsFor('warlock', 9)).toEqual([0, 0, 0, 0, 2]); expect(slotsFor('fighter', 9)).toEqual([]);
  });
  it('every caster knows spells of its top slot level at level 9', () => {
    for (const k of Object.keys(CLASSES).filter((k) => CLASSES[k].caster)) {
      const c = mk(k, 9); const top = c.maxSlots.length; expect(knownSpells(c).some((s) => SPELLS[s].level === top), k).toBe(true);
    }
  });
  it('unarmored defense and draconic resilience', () => {
    const b = mk('barbarian'); expect(armorClass(b)).toBeGreaterThanOrEqual(13);
    const m = mk('monk'); expect(armorClass(m)).toBeGreaterThanOrEqual(14);
    const s = mk('sorcerer'); expect(armorClass(s)).toBeGreaterThanOrEqual(14);
  });
  it('every new class levels 1→9 and fights a full auto battle at each tier without errors', () => {
    setRng(seeded(7));
    for (const cls of NEW) for (const lvl of [1, 5, 9]) {
      const party = [mk(cls, lvl), mk('fighter', lvl), mk(cls, lvl, 'halfElf'), mk('cleric', lvl)]; party.forEach((c) => { c.ai = true; });
      const groups = lvl === 1 ? [{ key: 'giantRat', count: 3 }] : lvl === 5 ? [{ key: 'direWolf', count: 2 }, { key: 'giantWasp', count: 2 }] : [{ key: 'tyrannosaurus', count: 1 }];
      const cb = new Combat(party, groups, { inventory: ['potionHealing'], boss: lvl === 9 });
      expect(() => cb.runAuto(), `${cls} L${lvl}`).not.toThrow();
      expect(['won', 'lost', 'fled']).toContain(cb.state);
      for (const c of party) { expect(() => shortRest(c)).not.toThrow(); longRest(c); }
    }
    setRng(null);
  });
  it('class features fire in combat: rage, smite, flurry, inspiration, marks, eldritch blast', () => {
    setRng(seeded(3));
    const seen = new Set();
    for (let i = 0; i < 6; i++) {
      const party = (i % 2 ? ['monk', 'paladin', 'barbarian', 'bard', 'ranger', 'warlock'] : ['barbarian', 'monk', 'paladin', 'bard', 'ranger', 'warlock']).map((k) => mk(k, 5)); party.forEach((c) => { c.ai = true; });
      const cb = new Combat(party, [{ key: 'triceratops', count: 1 }, { key: 'direWolf', count: 2 }], { boss: true });
      cb.runAuto(); for (const l of cb.log) seen.add(l.t);
    }
    const all = [...seen].join('\n');
    for (const re of [/RAGE/, /Divine Smite/, /unarmed|Unarmed/, /inspires/, /Hunter's Mark|Hex/, /Eldritch Blast/]) expect(all, String(re)).toMatch(re);
    setRng(null);
  });
  it('rage halves weapon damage', () => {
    const b = mk('barbarian', 3); const cb = new Combat([b], [{ key: 'giantRat', count: 1 }]);
    b.conditions.raging = true; const hp = b.hp; cb.damage(b, 10, 'slashing', cb.monsters[0]); expect(hp - b.hp).toBe(5);
  });
  it('re-class keeps name, level and XP but changes class', () => {
    const c = mk('fighter', 6); c.name = 'Brambur'; c.companion = 'brambur';
    const n = reclass(c, 'paladin');
    expect(n.cls).toBe('paladin'); expect(n.level).toBe(6); expect(n.name).toBe('Brambur'); expect(n.companion).toBe('brambur'); expect(n.maxSlots).toEqual([4, 2]);
  });
});
