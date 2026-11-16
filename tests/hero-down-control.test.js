import { describe, it, expect, beforeEach } from 'vitest';
import { setRng, seeded } from '../src/rules/dice.js';
import { createCharacter, assignByPriority, heal } from '../src/rules/character.js';
import { Combat } from '../src/rules/combat.js';

const mk = (cls, race = 'human', extra = {}) => createCharacter({ name: extra.name || cls, race, cls, base: assignByPriority(cls), ...extra });

function party() {
  const hero = mk('fighter', 'human', { name: 'Ser Aldric' });
  const cleric = mk('cleric', 'hillDwarf', { name: 'Brak' }); cleric.companion = 'brak'; cleric.ai = true;
  const rogue = mk('rogue', 'lightfootHalfling', { name: 'Mira' }); rogue.companion = 'mira'; rogue.ai = true;
  const wizard = mk('wizard', 'rockGnome', { name: 'Fen' }); wizard.companion = 'fen'; wizard.ai = true;
  return [hero, cleric, rogue, wizard];
}

beforeEach(() => setRng(seeded(42)));

describe('hero down hands companions to the player', () => {
  it('switches AI companions to manual when the hero falls unconscious', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const hero = cb.playerHero();
    expect(hero.name).toBe('Ser Aldric');
    expect(p.slice(1).every((c) => c.ai)).toBe(true);
    cb.damage(hero, hero.hp, 'slashing', null);
    expect(hero.conditions.unconscious).toBe(true);
    expect(hero.dead).toBe(false);
    expect(p.slice(1).every((c) => c.ai === false)).toBe(true);
    const ev = cb.events.find((e) => e.type === 'heroDownControl');
    expect(ev).toBeTruthy();
    expect(ev.switched.map((c) => c.name).sort()).toEqual(['Brak', 'Fen', 'Mira']);
    expect(cb.log.some((l) => /With Ser Aldric down/.test(l.t) && /now under your control/.test(l.t))).toBe(true);
  });

  it('also switches on an instant massive-damage kill', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const hero = cb.playerHero();
    cb.damage(hero, hero.hp + hero.maxHp, 'fire', null);
    expect(hero.dead).toBe(true);
    expect(p.slice(1).every((c) => c.ai === false)).toBe(true);
    expect(cb.events.some((e) => e.type === 'heroDownControl')).toBe(true);
  });

  it('does not switch when a companion goes down', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const mira = p[2];
    cb.damage(mira, mira.hp, 'slashing', null);
    expect(mira.conditions.unconscious).toBe(true);
    expect(p[1].ai).toBe(true);
    expect(p[3].ai).toBe(true);
    expect(cb.events.some((e) => e.type === 'heroDownControl')).toBe(false);
  });

  it('does not re-toggle a companion the player put back on AI while the hero is still down', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const hero = cb.playerHero();
    cb.damage(hero, hero.hp, 'slashing', null);
    expect(p[1].ai).toBe(false);
    p[1].ai = true; // player tapped AI on Brak's card
    cb.events = []; cb.log = [];
    cb.damage(hero, 3, 'piercing', null); // damage while down
    expect(p[1].ai).toBe(true);
    expect(p[2].ai).toBe(false);
    expect(cb.events.some((e) => e.type === 'heroDownControl')).toBe(false);
  });

  it('does not auto-revert companions when the hero is revived', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const hero = cb.playerHero();
    cb.damage(hero, hero.hp, 'slashing', null);
    expect(p.slice(1).every((c) => c.ai === false)).toBe(true);
    heal(hero, 10);
    expect(hero.hp).toBeGreaterThan(0);
    cb.maybeHandoffOnHeroDown(); // same sync heal/revive paths use
    expect(cb.heroHandedOff).toBe(false);
    expect(p.slice(1).every((c) => c.ai === false)).toBe(true);
  });

  it('re-triggers on a later downing if the player had returned a companion to AI', () => {
    const p = party(); const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    const hero = cb.playerHero();
    cb.damage(hero, hero.hp, 'slashing', null);
    heal(hero, hero.maxHp);
    cb.maybeHandoffOnHeroDown();
    expect(cb.heroHandedOff).toBe(false);
    p[1].ai = true;
    p[2].ai = false;
    p[3].ai = true;
    cb.events = [];
    cb.damage(hero, hero.hp, 'slashing', null);
    expect(p[1].ai).toBe(false);
    expect(p[2].ai).toBe(false);
    expect(p[3].ai).toBe(false);
    const ev = cb.events.find((e) => e.type === 'heroDownControl');
    expect(ev.switched.map((c) => c.name).sort()).toEqual(['Brak', 'Fen']);
  });

  it('still finds the hero after a formation swap off party[0]', () => {
    const p = party();
    const swapped = [p[1], p[2], p[0], p[3]];
    const cb = new Combat(swapped, [{ key: 'giantRat', count: 1 }]);
    expect(cb.playerHero().name).toBe('Ser Aldric');
    expect(cb.party[0].name).toBe('Brak');
    cb.damage(cb.playerHero(), cb.playerHero().hp, 'slashing', null);
    expect(swapped.filter((c) => c.companion).every((c) => c.ai === false)).toBe(true);
  });

  it('leaves already-manual companions alone and stays quiet if nobody was on AI', () => {
    const p = party(); p.forEach((c, i) => { if (i) c.ai = false; });
    const cb = new Combat(p, [{ key: 'giantRat', count: 1 }]);
    cb.log = []; cb.events = [];
    cb.damage(cb.playerHero(), cb.playerHero().hp, 'slashing', null);
    expect(p.slice(1).every((c) => c.ai === false)).toBe(true);
    expect(cb.events.some((e) => e.type === 'heroDownControl')).toBe(false);
    expect(cb.log.some((l) => /under your control/.test(l.t))).toBe(false);
  });
});
