import { describe, it, expect, beforeEach } from 'vitest';
import { setRng, seeded, roll, d20, parse, avg } from '../src/rules/dice.js';
import { createCharacter, assignByPriority, mod, armorClass, weaponStats, levelUp, longRest, shortRest, skillMod, saveMod, spellDC, prof, knownSpells } from '../src/rules/character.js';
import { Combat, makeMonster } from '../src/rules/combat.js';
import { MONSTERS, SPELLS, FULL_CASTER_SLOTS } from '../src/rules/data.js';

const mk = (cls, race = 'human', extra = {}) => createCharacter({ name: cls, race, cls, base: assignByPriority(cls), ...extra });
beforeEach(() => setRng(seeded(42)));

describe('dice', () => {
  it('parses expressions', () => { expect(parse('2d6+3')).toEqual({ n: 2, s: 6, b: 3 }); expect(avg('1d8+2')).toBe(6.5); });
  it('crit doubles dice not modifier', () => { for (let i = 0; i < 200; i++) { const r = roll('1d4+10', { crit: true }); expect(r).toBeGreaterThanOrEqual(12); expect(r).toBeLessThanOrEqual(18); } });
  it('advantage raises the average, disadvantage lowers it', () => {
    let a = 0, n = 0, d = 0; for (let i = 0; i < 4000; i++) { a += d20({ adv: true }); n += d20(); d += d20({ dis: true }); }
    expect(a / 4000).toBeGreaterThan(13); expect(n / 4000).toBeGreaterThan(9.5); expect(n / 4000).toBeLessThan(11.5); expect(d / 4000).toBeLessThan(8);
  });
  it('advantage and disadvantage cancel', () => { let t = 0; for (let i = 0; i < 4000; i++) t += d20({ adv: true, dis: true }); expect(t / 4000).toBeGreaterThan(9.5); expect(t / 4000).toBeLessThan(11.5); });
});

describe('characters', () => {
  it('ability modifiers', () => { expect(mod(10)).toBe(0); expect(mod(8)).toBe(-1); expect(mod(15)).toBe(2); expect(mod(20)).toBe(5); });
  it('applies racial bonuses', () => { const c = mk('fighter', 'halfOrc'); expect(c.scores.str).toBe(17); expect(c.scores.con).toBe(15); });
  it('computes AC for armor, shields and fighting style', () => {
    const f = mk('fighter'); expect(armorClass(f)).toBe(16 + 2 + 1);
    const w = mk('wizard'); expect(armorClass(w)).toBe(10 + mod(w.scores.dex));
    w.conditions.mageArmor = true; expect(armorClass(w)).toBe(13 + mod(w.scores.dex));
    const r = mk('rogue'); expect(armorClass(r)).toBe(11 + mod(r.scores.dex));
  });
  it('hit points at level 1 = hit die max + Con', () => { const c = mk('cleric', 'hillDwarf'); expect(c.maxHp).toBe(8 + mod(c.scores.con) + 1); });
  it('proficiency bonus scales', () => { const c = mk('fighter'); expect(prof(c)).toBe(2); c.xp = 99999; for (let i = 0; i < 4; i++) levelUp(c); expect(c.level).toBe(5); expect(prof(c)).toBe(3); });
  it('finesse uses best of Str/Dex', () => { const r = mk('rogue'); const w = weaponStats(r); expect(w.bonus).toBe(mod(r.scores.dex) + 2); });
  it('expertise doubles proficiency', () => { const r = mk('rogue'); expect(skillMod(r, 'stealth')).toBe(mod(r.scores.dex) + 4); });
  it('saving throw proficiencies', () => { const w = mk('wizard'); expect(saveMod(w, 'int')).toBe(mod(w.scores.int) + 2); expect(saveMod(w, 'str')).toBe(mod(w.scores.str)); });
  it('spell DC = 8 + prof + mod', () => { const c = mk('cleric'); expect(spellDC(c)).toBe(8 + 2 + mod(c.scores.wis)); });
  it('spell slots follow the full-caster table', () => {
    const w = mk('wizard'); expect(w.slots).toEqual([2]); w.xp = 99999;
    for (let l = 2; l <= 6; l++) { levelUp(w); expect(w.maxSlots).toEqual(FULL_CASTER_SLOTS[l]); }
    expect(knownSpells(w)).toContain('fireball');
  });
  it('short rest spends hit dice; long rest restores everything', () => {
    const c = mk('fighter'); c.xp = 1000; levelUp(c); levelUp(c); c.hp = 1; c.res.secondWind = 0;
    shortRest(c); expect(c.hp).toBeGreaterThan(1); expect(c.res.secondWind).toBe(1);
    c.hp = 1; longRest(c); expect(c.hp).toBe(c.maxHp);
  });
  it('arcane recovery restores slots on a short rest once', () => { const w = mk('wizard'); w.slots = [0]; shortRest(w); expect(w.slots[0]).toBe(1); w.slots = [0]; shortRest(w); expect(w.slots[0]).toBe(0); });
});

describe('combat', () => {
  const party = () => [mk('fighter'), mk('cleric', 'hillDwarf'), mk('rogue', 'lightfootHalfling'), mk('wizard', 'rockGnome')].map((c) => { c.ai = true; return c; });
  it('initiative orders all combatants', () => { const cb = new Combat(party(), [{ key: 'giantRat', count: 3 }]); expect(cb.order.length).toBe(7); });
  it('runs to completion', () => { const cb = new Combat(party(), [{ key: 'giantRat', count: 3 }]); expect(['won', 'lost', 'fled']).toContain(cb.runAuto()); });
  it('death saves: three failures kill, damage at 0 HP adds a failure', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const c = p[0]; c.hp = 0; c.deathSaves = { s: 0, f: 0 };
    cb.damage(c, 3, 'piercing', null); expect(c.deathSaves.f).toBe(1);
    cb.damage(c, 3, 'piercing', null, { crit: true }); expect(c.dead).toBe(true);
  });
  it('massive damage kills instantly', () => { const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]); const w = p[3]; cb.damage(w, w.hp + w.maxHp, 'fire', null); expect(w.dead).toBe(true); });
  it('dropping to 0 makes a character unconscious', () => { const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]); const w = p[3]; cb.damage(w, w.hp, 'fire', null); expect(w.conditions.unconscious).toBe(true); expect(w.dead).toBe(false); });
  it('concentration can break on damage', () => {
    let broke = 0; for (let i = 0; i < 200; i++) { const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]); const c = p[1]; c.maxHp = c.hp = 500; c.concentration = { spell: 'bless' }; p[0].conditions.blessed = { src: c.id }; cb.damage(c, 40, 'piercing', null); if (!c.concentration) { broke++; expect(p[0].conditions.blessed).toBeUndefined(); } }
    expect(broke).toBeGreaterThan(100);
  });
  it('dwarves resist poison', () => { const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]); const d = p[1]; const hp = d.hp; cb.damage(d, 6, 'poison', null); expect(d.hp).toBe(hp - 3); });
  it('constructs are immune to poison', () => { const cb = new Combat(party(), [{ key: 'animatedArmor', count: 1 }]); const m = cb.monsters[0]; const hp = m.hp; cb.damage(m, 10, 'poison', null); expect(m.hp).toBe(hp); });
  it('prone grants advantage to melee and disadvantage to ranged', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]); const m = cb.monsters[0]; m.conditions.prone = true;
    expect(cb.advantageFor(p[0], m, { ranged: false }).adv).toBe(true); expect(cb.advantageFor(p[0], m, { ranged: true }).dis).toBe(true);
  });
  it('poisoned attackers have disadvantage', () => { const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]); p[0].conditions.poisoned = true; expect(cb.advantageFor(p[0], cb.monsters[0], {}).dis).toBe(true); });
  it('sleep puts weak creatures to sleep', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 2 }]); const w = p[3]; cb.turn = { action: 1, bonus: 1 };
    cb.castSpell(w, 'sleep', {}); expect(cb.monsters.some((m) => m.conditions.unconscious)).toBe(true); expect(w.slots[0]).toBe(1);
  });
  it('every SRD monster has a valid stat block', () => { for (const [k, m] of Object.entries(MONSTERS)) { const x = makeMonster(k); expect(x.hp).toBeGreaterThan(0); expect(m.attacks.length > 0 || m.shriek).toBeTruthy(); expect(m.model).toBeTruthy(); } });
  it('every spell has a name, level and class', () => { for (const s of Object.values(SPELLS)) { expect(s.name).toBeTruthy(); expect(s.level).toBeGreaterThanOrEqual(0); expect(s.cls.length).toBeGreaterThan(0); } });
});
