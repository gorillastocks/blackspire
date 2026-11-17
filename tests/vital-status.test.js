import { describe, it, expect, beforeEach } from 'vitest';
import { setRng, seeded } from '../src/rules/dice.js';
import { createCharacter, assignByPriority, heal, isDown, vitalStatus } from '../src/rules/character.js';
import { Combat } from '../src/rules/combat.js';

const mk = (cls, race = 'human', extra = {}) => createCharacter({ name: extra.name || cls, race, cls, base: assignByPriority(cls), ...extra });

beforeEach(() => setRng(seeded(42)));

describe('vitalStatus', () => {
  it('is null for a living character', () => {
    const c = mk('fighter', 'human', { name: 'Ser Aldric' });
    expect(c.hp).toBeGreaterThan(0);
    expect(c.dead).toBe(false);
    expect(vitalStatus(c)).toBeNull();
    expect(isDown(c)).toBe(false);
  });

  it('returns Down with 0 HP and death-save counts when unconscious', () => {
    const c = mk('cleric', 'hillDwarf', { name: 'Liora' });
    c.hp = 0;
    c.conditions.unconscious = true;
    c.deathSaves = { s: 1, f: 2 };
    c.dead = false;
    const st = vitalStatus(c);
    expect(st.key).toBe('down');
    expect(st.label).toBe('Down');
    expect(st.icon).toBe('💤');
    expect(st.saves).toBe('1✓ 2✗');
    expect(st.text).toBe('💤 Down · 0 HP · 1✓ 2✗');
    expect(isDown(c)).toBe(true);
  });

  it('labels a stable unconscious character as Down · stable', () => {
    const c = mk('rogue', 'lightfootHalfling', { name: 'Mira' });
    c.hp = 0;
    c.stable = true;
    c.dead = false;
    const st = vitalStatus(c);
    expect(st.key).toBe('down');
    expect(st.saves).toBe('stable');
    expect(st.text).toContain('stable');
  });

  it('returns Dead (not Down) when c.dead is set, even at 0 HP', () => {
    const c = mk('wizard', 'rockGnome', { name: 'Fen' });
    c.hp = 0;
    c.dead = true;
    c.conditions.unconscious = false;
    const st = vitalStatus(c);
    expect(st.key).toBe('dead');
    expect(st.label).toBe('Dead');
    expect(st.icon).toBe('💀');
    expect(st.text).toBe('💀 Dead');
    expect(isDown(c)).toBe(true);
  });

  it('tracks the same flags the combat log uses for unconscious vs slain', () => {
    const hero = mk('fighter', 'human', { name: 'Ser Aldric' });
    const liora = mk('cleric', 'hillDwarf', { name: 'Liora' }); liora.companion = 'liora';
    const fen = mk('wizard', 'rockGnome', { name: 'Fen' }); fen.companion = 'fen';
    const cb = new Combat([hero, liora, fen], [{ key: 'giantRat', count: 1 }]);

    cb.damage(liora, liora.hp, 'slashing', cb.monsters[0] || null);
    expect(liora.hp).toBe(0);
    expect(liora.dead).toBe(false);
    expect(liora.conditions.unconscious).toBe(true);
    expect(vitalStatus(liora).key).toBe('down');
    expect(cb.log.some((l) => /Liora falls unconscious/i.test(l.t))).toBe(true);

    cb.kill(fen);
    expect(fen.dead).toBe(true);
    expect(fen.hp).toBe(0);
    expect(vitalStatus(fen).key).toBe('dead');
    expect(cb.log.some((l) => /Fen has DIED/i.test(l.t))).toBe(true);

    expect(vitalStatus(hero)).toBeNull();
    heal(liora, 5);
    expect(vitalStatus(liora)).toBeNull();
  });
});
