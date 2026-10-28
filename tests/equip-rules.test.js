import { describe, it, expect, beforeEach } from 'vitest';
import * as G from '../src/game/game.js';
import { Combat } from '../src/rules/combat.js';
import { createCharacter, assignByPriority, weaponStats, isProficientWeapon, canWearArmor, armorClass, speedOf, prof, heavyPenalty } from '../src/rules/character.js';
import { CLASSES, RACES, WEAPONS, ARMOR } from '../src/rules/data.js';
import { COMPANIONS } from '../src/game/companions.js';
import { setRng, seeded } from '../src/rules/dice.js';

beforeEach(() => setRng(seeded(11)));
const mk = (cls, race = 'human', base) => createCharacter({ name: cls, race, cls, base: base || assignByPriority(cls) });
const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; return s; };
const give = (s, c, key) => { s.inventory.push(key); return G.equip(s, c, s.inventory.length - 1); };

describe('SRD class proficiencies', () => {
  const W = (cls, race = 'human') => (k) => isProficientWeapon(mk(cls, race), k);
  it('wizard and sorcerer: daggers, quarterstaffs and light crossbows only, no armor', () => {
    for (const cls of ['wizard', 'sorcerer']) {
      const p = W(cls); expect(CLASSES[cls].armor).toEqual([]);
      for (const k of ['dagger', 'quarterstaff', 'lightCrossbow']) expect(p(k), `${cls} ${k}`).toBe(true);
      for (const k of ['club', 'mace', 'spear', 'handaxe', 'shortbow', 'longsword', 'rapier', 'shortsword', 'greatsword', 'longbow', 'handCrossbow']) expect(p(k), `${cls} ${k}`).toBe(false);
    }
  });
  it('rogue and bard: simple + hand crossbow, longsword, rapier, shortsword; light armor', () => {
    for (const cls of ['rogue', 'bard']) {
      const p = W(cls); for (const k of ['club', 'mace', 'shortbow', 'handCrossbow', 'longsword', 'rapier', 'shortsword']) expect(p(k)).toBe(true);
      for (const k of ['battleaxe', 'greatsword', 'longbow', 'warhammer', 'whip', 'glaive']) expect(p(k)).toBe(false);
      expect(CLASSES[cls].armor).toEqual(['light']);
    }
  });
  it('cleric simple only (light, medium, heavy armor, shields); warlock simple + light; monk simple + shortsword', () => {
    expect(W('cleric')('mace')).toBe(true); expect(W('cleric')('longsword')).toBe(false); expect(CLASSES.cleric.armor).toEqual(['light', 'medium', 'heavy', 'shield']);
    expect(W('warlock')('lightCrossbow')).toBe(true); expect(W('warlock')('rapier')).toBe(false); expect(CLASSES.warlock.armor).toEqual(['light']);
    expect(W('monk')('shortsword')).toBe(true); expect(W('monk')('longsword')).toBe(false); expect(CLASSES.monk.armor).toEqual([]);
  });
  it('druid: club, dagger, mace, quarterstaff, spear only', () => {
    const p = W('druid'); for (const k of ['club', 'dagger', 'mace', 'quarterstaff', 'spear']) expect(p(k)).toBe(true);
    for (const k of ['handaxe', 'shortbow', 'longsword', 'lightCrossbow']) expect(p(k)).toBe(false);
  });
  it('fighter, paladin, barbarian, ranger: simple + martial; armor per SRD', () => {
    for (const cls of ['fighter', 'paladin', 'barbarian', 'ranger']) { const p = W(cls); for (const k of ['mace', 'longbow', 'greatsword', 'whip', 'handCrossbow']) expect(p(k)).toBe(true); }
    expect(CLASSES.fighter.armor).toEqual(['light', 'medium', 'heavy', 'shield']); expect(CLASSES.paladin.armor).toEqual(['light', 'medium', 'heavy', 'shield']);
    expect(CLASSES.barbarian.armor).toEqual(['light', 'medium', 'shield']); expect(CLASSES.ranger.armor).toEqual(['light', 'medium', 'shield']);
  });
  it('Liora (half-elf ranger) and the other companions start in gear they can wear and use', () => {
    const s = fresh(); for (const k of ['brambur', 'fizzwick', 'pip', 'grumsh', 'zizzy', 'vexrath', 'nettle', 'liora']) { const cc = createCharacter({ name: k, race: COMPANIONS[k].race, cls: COMPANIONS[k].cls, base: COMPANIONS[k].base, companion: k, skills: COMPANIONS[k].skills }); s.party.push(cc); }
    expect(s.party.length).toBeGreaterThanOrEqual(9);
    for (const c of s.party) {
      if (c.equip.armor) expect(canWearArmor(c, c.equip.armor.base), `${c.name} armor`).toBe(true);
      expect(isProficientWeapon(c, c.equip.weapon.base), `${c.name} weapon`).toBe(true);
      if (c.equip.ranged) expect(isProficientWeapon(c, c.equip.ranged.base), `${c.name} ranged`).toBe(true);
    }
  });
});

describe('racial weapon training', () => {
  it('hill dwarf: battleaxe, handaxe, warhammer even as a wizard; others unchanged', () => {
    const d = mk('wizard', 'hillDwarf'); for (const k of ['battleaxe', 'handaxe', 'warhammer']) expect(isProficientWeapon(d, k)).toBe(true);
    expect(isProficientWeapon(d, 'longsword')).toBe(false); expect(isProficientWeapon(mk('wizard', 'human'), 'battleaxe')).toBe(false);
  });
  it('high elf: longsword, shortsword, shortbow, longbow even as a wizard; half-elf gets none', () => {
    const e = mk('wizard', 'highElf'); for (const k of ['longsword', 'shortsword', 'shortbow', 'longbow']) expect(isProficientWeapon(e, k)).toBe(true);
    expect(isProficientWeapon(e, 'rapier')).toBe(false);
    const he = mk('wizard', 'halfElf'); for (const k of ['longsword', 'shortbow', 'longbow']) expect(isProficientWeapon(he, k)).toBe(false);
  });
  it('the proficiency bonus is added only when proficient', () => {
    const w = mk('wizard', 'human'); w.equip.weapon = { base: 'longsword', magic: 0 }; const raw = weaponStats(w).bonus;
    const e = mk('wizard', 'highElf'); e.equip.weapon = { base: 'longsword', magic: 0 }; e.scores = { ...w.scores };
    expect(weaponStats(e).bonus).toBe(raw + prof(e)); expect(weaponStats(w).proficient).toBe(false);
  });
});

describe('equip rules', () => {
  it('a non-proficient weapon can be equipped, with no proficiency bonus and a warning', () => {
    const s = fresh(); const wiz = G.newGame({ name: 'W', cls: 'wizard', race: 'human' }).party[0]; s.party[0] = wiz;
    const before = weaponStats(wiz).bonus; const ev = give(s, wiz, 'w:greatsword');
    expect(wiz.equip.weapon.base).toBe('greatsword'); expect(ev[0].log).toMatch(/not proficient/);
    expect(weaponStats(wiz).bonus).toBe(before - prof(wiz)); // dagger/quarterstaff (proficient) -> greatsword (not): prof bonus drops out
    expect(weaponStats(wiz).proficient).toBe(false);
  });
  it('a wizard cannot put on plate (or any armor); a druid refuses metal armor but wears leather and hide', () => {
    const s = fresh(); const wiz = mk('wizard'); s.party[0] = wiz; const ev = give(s, wiz, 'a:plate');
    expect(wiz.equip.armor).toBeNull(); expect(ev[0].cls).toBe('bad'); expect(s.inventory).toContain('a:plate');
    expect(canWearArmor(wiz, 'padded')).toBe(false);
    const dr = mk('druid'); for (const k of ['chainShirt', 'scaleMail', 'breastplate', 'halfPlate', 'chainMail']) expect(canWearArmor(dr, k), k).toBe(false);
    for (const k of ['padded', 'leather', 'studdedLeather', 'hide']) expect(canWearArmor(dr, k), k).toBe(true);
    expect(canWearArmor(mk('cleric'), 'plate')).toBe(true); expect(canWearArmor(mk('rogue'), 'hide')).toBe(false); expect(canWearArmor(mk('barbarian'), 'plate')).toBe(false);
  });
  it('shields: +2 AC for proficient classes, none for wizards and monks; blocked with a two-handed weapon', () => {
    const f = mk('fighter'); f.equip.shield = false; const a0 = armorClass(f); f.equip.shield = true; expect(armorClass(f)).toBe(a0 + 2);
    const w = mk('wizard'); const aw = armorClass(w); w.equip.shield = true; expect(armorClass(w)).toBe(aw);
    const s = fresh(); const fi = s.party[0]; fi.equip.shield = false; fi.equip.weapon = { base: 'greatsword', magic: 0 };
    expect(give(s, fi, 'shield')[0].cls).toBe('bad'); expect(fi.equip.shield).toBeFalsy();
    fi.equip.weapon = { base: 'longsword', magic: 0 }; expect(give(s, fi, 'shield')[0].cls).toBe('good'); expect(fi.equip.shield).toBe(true);
    // equipping a two-handed weapon puts the shield away
    const ev = give(s, fi, 'w:greataxe'); expect(fi.equip.shield).toBe(false); expect(s.inventory).toContain('shield'); expect(ev[0].log).toMatch(/shield put away/);
  });
  it('versatile weapons deal the bigger die only without a shield', () => {
    const f = mk('fighter'); f.equip.weapon = { base: 'longsword', magic: 0 }; f.equip.shield = true; expect(weaponStats(f).dmg).toBe('1d8'); f.equip.shield = false; expect(weaponStats(f).dmg).toBe('1d10');
  });
  it('finesse weapons use the better of Str and Dex; ranged weapons use Dex', () => {
    const r = mk('rogue'); r.scores.str = 8; r.scores.dex = 16; r.equip.weapon = { base: 'rapier', magic: 0 }; expect(weaponStats(r).bonus).toBe(3 + prof(r));
    r.equip.weapon = { base: 'longsword', magic: 0 }; expect(weaponStats(r).bonus).toBe(-1 + prof(r));
    const f = mk('fighter'); f.scores.str = 16; f.scores.dex = 8; f.equip.ranged = { base: 'longbow', magic: 0 }; expect(weaponStats(f, 'ranged').bonus).toBe(-1 + prof(f));
  });
  it('weapon data matches the SRD (categories, damage, properties)', () => {
    const n = (k) => WEAPONS[k];
    expect([n('greatsword').dmg, n('greatsword').props]).toEqual(['2d6', ['heavy', 'two-handed']]);
    for (const k of ['glaive', 'halberd', 'pike']) { expect(n(k).dmg).toBe('1d10'); for (const p of ['heavy', 'reach', 'two-handed']) expect(n(k).props).toContain(p); expect(n(k).cat).toBe('martial'); }
    expect(n('whip').props).toEqual(['finesse', 'reach']); expect(n('handCrossbow').props).toContain('light'); expect(n('lightCrossbow').cat).toBe('simple');
    expect(n('longbow').props).toEqual(expect.arrayContaining(['heavy', 'two-handed', 'ranged']));
  });
});

describe('armor data and penalties', () => {
  it('SRD base AC, Strength requirement and Stealth disadvantage', () => {
    const exp = { padded: [11, 0, true], leather: [11, 0, false], studdedLeather: [12, 0, false], hide: [12, 0, false], chainShirt: [13, 0, false], scaleMail: [14, 0, true], breastplate: [14, 0, false], halfPlate: [15, 0, true], ringMail: [14, 0, true], chainMail: [16, 13, true], splint: [17, 15, true], plate: [18, 15, true] };
    for (const [k, [ac, str, st]] of Object.entries(exp)) { expect(ARMOR[k].base, k).toBe(ac); expect(ARMOR[k].str || 0, k).toBe(str); expect(!!ARMOR[k].stealthDis, k).toBe(st); }
  });
  it('heavy armor with Str below the requirement costs 10 ft of speed (not for dwarves); no penalty otherwise', () => {
    const f = mk('fighter'); f.equip.armor = { base: 'plate', magic: 0 }; f.scores.str = 14; expect(speedOf(f)).toBe(20); f.scores.str = 15; expect(speedOf(f)).toBe(30);
    f.equip.armor = { base: 'chainMail', magic: 0 }; f.scores.str = 12; expect(speedOf(f)).toBe(20); f.scores.str = 13; expect(speedOf(f)).toBe(30);
    f.equip.armor = { base: 'ringMail', magic: 0 }; f.scores.str = 8; expect(speedOf(f)).toBe(30);
    f.equip.armor = { base: 'halfPlate', magic: 0 }; expect(speedOf(f)).toBe(30);
    const d = mk('cleric', 'hillDwarf'); d.equip.armor = { base: 'plate', magic: 0 }; d.scores.str = 8; expect(speedOf(d)).toBe(25);
    const h = mk('cleric', 'lightfootHalfling'); h.equip.armor = { base: 'plate', magic: 0 }; h.scores.str = 8; expect(speedOf(h)).toBe(15);
    expect(RACES.hillDwarf.speed).toBe(25);
  });
  it('medium armor caps the Dex bonus at +2; heavy ignores Dex; light adds all of it', () => {
    const r = mk('ranger'); r.scores.dex = 18; r.equip.shield = false; r.equip.armor = { base: 'breastplate', magic: 0 }; expect(armorClass(r)).toBe(14 + 2);
    const f = mk('fighter'); f.scores.dex = 18; f.equip.shield = false; f.equip.armor = { base: 'plate', magic: 0 }; expect(armorClass(f)).toBe(18 + 1);
    const ro = mk('rogue'); ro.scores.dex = 18; ro.equip.armor = { base: 'studdedLeather', magic: 0 }; expect(armorClass(ro)).toBe(12 + 4);
  });
});

describe('Small races and heavy weapons', () => {
  it('halfling and gnome have disadvantage with heavy weapons, others do not; light weapons are fine', () => {
    for (const race of ['lightfootHalfling', 'rockGnome']) { const c = mk('fighter', race); expect(heavyPenalty(c, 'greatsword')).toBe(true); expect(heavyPenalty(c, 'longbow')).toBe(true); expect(heavyPenalty(c, 'halberd')).toBe(true); expect(heavyPenalty(c, 'longsword')).toBe(false); expect(heavyPenalty(c, 'shortsword')).toBe(false); }
    for (const race of ['human', 'hillDwarf', 'highElf', 'halfOrc', 'dragonborn', 'tiefling', 'halfElf']) expect(heavyPenalty(mk('fighter', race), 'greatsword'), race).toBe(false);
  });
  it('the penalty is real: a Small hero with a greatsword hits less often than a Medium one', () => {
    const hits = (race) => {
      setRng(seeded(5)); const s = fresh(); const c = mk('fighter', race, { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }); c.scores.str = 16; c.equip.weapon = { base: 'greatsword', magic: 0 }; c.equip.shield = false;
      s.party = [c, ...s.party.slice(1)]; const cb = new Combat(s.party, [{ key: 'giantRat', count: 1 }], { inventory: s.inventory, lore: s.lore }); const m = cb.monsters[0] || cb.groups?.[0]?.monsters?.[0];
      let n = 0; const w = weaponStats(c); for (let i = 0; i < 600; i++) { m.hp = m.maxHp = 9999; if (cb.weaponHit(c, m, w, {}).hit) n++; } return n;
    };
    const small = hits('lightfootHalfling'), med = hits('human'); expect(small).toBeLessThan(med - 40);
  });
});
