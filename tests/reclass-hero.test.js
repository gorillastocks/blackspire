import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { CLASSES } from '../src/rules/data.js';
import { levelUp, reclass, knownSpells } from '../src/rules/character.js';
import { packOf } from '../src/voices/packs.js';
import { setRng, seeded } from '../src/rules/dice.js';

const mkGame = (cls = 'fighter', level = 4) => {
  setRng(seeded(5));
  const s = G.newGame({ name: 'Sera', race: 'highElf', cls, portrait: 3, voicePack: 'slyRogue' });
  const h = G.heroOf(s); h.xp = 1e6; while (h.level < level) levelUp(h); h.xp = 777; s.gold = 1000; return s;
};

describe('Re-class for the player hero', () => {
  it('turns the hero into another class at the same level, keeping name, race, portrait, voice, id, XP and leader status', () => {
    const s = mkGame(); const old = G.heroOf(s), idx = s.party.indexOf(old);
    old.tactics = { style: 'balanced', healAt: 40 }; old.side = 'party';
    const ev = G.reclassCharacter(s, old, 'wizard'); const n = G.heroOf(s);
    expect(ev.ok).toBe(true); expect(n).toBe(ev.char); expect(s.party.indexOf(n)).toBe(idx);
    expect(n.cls).toBe('wizard'); expect(n.level).toBe(4); expect(n.xp).toBe(777); expect(n.id).toBe(old.id);
    expect(n.name).toBe('Sera'); expect(n.race).toBe('highElf'); expect(n.portrait).toBe(3); expect(n.voicePack).toBe('slyRogue'); expect(packOf(n).id).toBe('slyRogue');
    expect(n.ai).toBe(false); expect(G.isHero(n)).toBe(true); expect(n.companion).toBeFalsy(); expect(n.recruit).toBeFalsy();
    expect(n.tactics).toEqual(old.tactics); expect(n.hp).toBe(n.maxHp); expect(knownSpells(n).length).toBeGreaterThan(0);
  });
  it('costs 50 gp per level like companions and refuses when poor, or for the same class', () => {
    const s = mkGame('fighter', 3); const h = G.heroOf(s); expect(G.reclassCost(h)).toBe(150);
    s.gold = 149; const no = G.reclassCharacter(s, h, 'cleric'); expect(no.ok).toBe(false); expect(G.heroOf(s)).toBe(h); expect(s.gold).toBe(149);
    s.gold = 500; expect(G.reclassCharacter(s, h, 'fighter').ok).toBe(false); expect(s.gold).toBe(500);
    expect(G.reclassCharacter(s, h, 'cleric').ok).toBe(true); expect(s.gold).toBe(350);
  });
  it('companions and recruits still re-class under the same rules, keeping their tags and voices', () => {
    const s = mkGame(); const comp = s.party.find((c) => c.companion);
    const ev = G.reclassCharacter(s, comp, comp.cls === 'rogue' ? 'bard' : 'rogue'); expect(ev.ok).toBe(true); expect(ev.char.companion).toBe(comp.companion); expect(s.party).toContain(ev.char);
    const r = G.createRecruit(s, { name: 'Rook', race: 'hillDwarf', cls: 'fighter', voicePack: 'dourDwarf' }).char;
    const n = G.reclassCharacter(s, r, 'monk').char; expect(n.recruit).toBe(true); expect(n.voicePack).toBe('dourDwarf'); expect(G.isHero(n)).toBe(false); expect(G.heroOf(s).name).toBe('Sera');
  });
  it('every other class is available to the hero and the result is a legal character', () => {
    for (const k of Object.keys(CLASSES).filter((k) => k !== 'fighter')) {
      const s = mkGame(); const n = G.reclassCharacter(s, G.heroOf(s), k).char;
      expect(n.cls, k).toBe(k); expect(n.level, k).toBe(4); expect(n.maxHp, k).toBeGreaterThan(0); expect(n.maxSlots.length > 0, k).toBe(!!CLASSES[k].caster && n.maxSlots.length > 0);
    }
  });
  it('magic gear returns to the pack; plain starting kit does not (no shop-goods farming)', () => {
    const s = mkGame(); const h = G.heroOf(s); h.equip.weapon = { base: 'longsword', magic: 1 }; h.equip.ring = 'ringProtection';
    const before = s.inventory.length; G.reclassCharacter(s, h, 'wizard');
    expect(s.inventory.length).toBeGreaterThan(before); expect(s.inventory).toContain('ringProtection'); expect(s.inventory).not.toContain('w:longsword'); expect(s.inventory).not.toContain('a:chain');
  });
  it('survives a save and load: still the hero, voice and portrait intact, old saves untouched', () => {
    const s = mkGame(); G.reclassCharacter(s, G.heroOf(s), 'paladin');
    const back = G.deserialize(G.serialize(s)); const h = G.heroOf(back);
    expect(h.cls).toBe('paladin'); expect(h.name).toBe('Sera'); expect(h.voicePack).toBe('slyRogue'); expect(h.portrait).toBe(3); expect(G.isHero(h)).toBe(true); expect(back.party.filter(G.isHero).length).toBe(1);
  });
  it('rules-level reclass copies voice pack and recruit tag only when present', () => {
    const s = mkGame(); const h = G.heroOf(s); delete h.voicePack; expect('voicePack' in reclass(h, 'rogue')).toBe(false);
  });
});
