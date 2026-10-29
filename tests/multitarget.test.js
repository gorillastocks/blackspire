import { describe, it, expect, afterEach } from 'vitest';
import { createCharacter, assignByPriority, levelUp } from '../src/rules/character.js';
import { Combat, projectileCount } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';
import { SPELLS } from '../src/rules/data.js';

afterEach(() => setRng(null));
const mk = (cls, lvl = 1) => { const c = createCharacter({ name: 'T', race: 'human', cls, base: assignByPriority(cls) }); c.xp = 999999; while (c.level < lvl) levelUp(c); return c; };
/** Wizard with known spell + plenty of slots against N tough dummies (so nothing dies unless we want it to). */
function setup(cls, lvl, spells, foes = [{ key: 'giantRat', count: 3 }]) {
  const w = mk(cls, lvl); w.prepared = [...new Set([...(w.prepared || []), ...spells])]; w.spells = [...new Set([...(w.spells || []), ...spells])];
  w.slots = w.slots.map(() => 9); const cb = new Combat([w], foes); cb.turn = { action: 1, bonus: 1 }; cb.order = [w, ...cb.order.filter((x) => x !== w)]; cb.turnIdx = 0;
  for (const m of cb.monsters) { m.hp = m.maxHp = 500; }
  return { w, cb };
}
const dartHits = (cb) => cb.drain().events.filter((e) => e.type === 'hit' && e.spell === 'magicMissile');

describe('projectileCount (5e SRD)', () => {
  const w = mk('wizard');
  it('Magic Missile: 3 darts, +1 per slot level above 1st', () => { expect(projectileCount(w, 'magicMissile', 1)).toBe(3); expect(projectileCount(w, 'magicMissile', 2)).toBe(4); expect(projectileCount(w, 'magicMissile', 4)).toBe(6); });
  it('Scorching Ray: 3 rays, +1 per slot level above 2nd', () => { expect(projectileCount(w, 'scorchingRay', 2)).toBe(3); expect(projectileCount(w, 'scorchingRay', 3)).toBe(4); expect(projectileCount(w, 'scorchingRay', 5)).toBe(6); });
  it('Eldritch Blast: 1 beam, 2 at level 5, 3 at 11, 4 at 17', () => {
    for (const [lv, n] of [[1, 1], [4, 1], [5, 2], [10, 2], [11, 3], [17, 4]]) expect(projectileCount({ level: lv }, 'eldritchBlast', 0), `L${lv}`).toBe(n);
  });
  it('single-target and area spells are not multi-projectile', () => { for (const k of ['fireBolt', 'fireball', 'burningHands', 'sleep']) expect(projectileCount(w, k, SPELLS[k].level || 1), k).toBe(0); });
});

describe('Magic Missile: each dart goes where the player aims it', () => {
  it('3 darts split 2+1 hit the right foes; every dart auto-hits for 1d4+1 (2-5)', () => {
    setRng(seeded(7)); const { w, cb } = setup('wizard', 3, ['magicMissile']); const [a, b] = cb.monsters;
    cb.castSpell(w, 'magicMissile', { slot: 1, aims: [a, b, a], target: a });
    const hits = dartHits(cb); expect(hits.length).toBe(3);
    expect(hits.filter((h) => h.tgt === a).length).toBe(2); expect(hits.filter((h) => h.tgt === b).length).toBe(1);
    for (const h of hits) { expect(h.dmg).toBeGreaterThanOrEqual(2); expect(h.dmg).toBeLessThanOrEqual(5); }
    expect(500 - a.hp).toBe(hits.filter((h) => h.tgt === a).reduce((s, h) => s + h.dmg, 0));
    expect(500 - b.hp).toBe(hits.find((h) => h.tgt === b).dmg);
  });
  it('a higher slot adds a dart per level and spends that slot', () => {
    const { w, cb } = setup('wizard', 5, ['magicMissile']); const [a, b, c] = cb.monsters; const before = w.slots[2];
    cb.castSpell(w, 'magicMissile', { slot: 3, aims: [a, b, c, a, a] });
    expect(dartHits(cb).length).toBe(5); expect(w.slots[2]).toBe(before - 1);
  });
  it('all on one foe works (same monster any number of times)', () => {
    const { w, cb } = setup('wizard', 3, ['magicMissile']); const [a] = cb.monsters;
    cb.castSpell(w, 'magicMissile', { slot: 2, aims: [a, a, a, a] }); const hits = dartHits(cb);
    expect(hits.length).toBe(4); expect(hits.every((h) => h.tgt === a)).toBe(true);
  });
  it('accepts monster ids as aims', () => {
    const { w, cb } = setup('wizard', 3, ['magicMissile']); const [a, b] = cb.monsters;
    cb.castSpell(w, 'magicMissile', { slot: 1, aims: [b.id, b.id, a.id] }); const hits = dartHits(cb);
    expect(hits.map((h) => h.tgt)).toEqual([b, b, a]);
  });
  it('legacy: only a target (no aims) sends every dart at it', () => {
    const { w, cb } = setup('wizard', 3, ['magicMissile']); const [, b] = cb.monsters;
    cb.castSpell(w, 'magicMissile', { slot: 1, target: b }); expect(dartHits(cb).every((h) => h.tgt === b)).toBe(true);
  });
  it('a foe killed by earlier darts: the rest of its darts go to a living foe, none are wasted or crash', () => {
    const { w, cb } = setup('wizard', 3, ['magicMissile']); const [a, b] = cb.monsters; a.hp = 1;
    cb.castSpell(w, 'magicMissile', { slot: 1, aims: [a, a, a] }); const hits = dartHits(cb);
    expect(hits.length).toBe(3); expect(a.hp).toBeLessThanOrEqual(0); expect(hits[0].tgt).toBe(a); expect(hits.slice(1).every((h) => h.tgt !== a)).toBe(true);
  });
  it('too few aims are padded sensibly; too many are truncated', () => {
    const { w, cb } = setup('wizard', 3, ['magicMissile']); const [a] = cb.monsters;
    cb.castSpell(w, 'magicMissile', { slot: 1, aims: [a] }); expect(dartHits(cb).length).toBe(3);
    const { w: w2, cb: cb2 } = setup('wizard', 3, ['magicMissile']); const m = cb2.monsters;
    cb2.castSpell(w2, 'magicMissile', { slot: 1, aims: [m[0], m[0], m[0], m[1], m[1]] }); expect(dartHits(cb2).length).toBe(3);
  });
});

describe('Scorching Ray: each ray rolls its own attack against its own target', () => {
  it('rays 2+1 → three separate attack rolls, aimed per ray, 2d6 fire each on a hit', () => {
    for (let seed = 1; seed <= 15; seed++) {
      setRng(seeded(seed)); const { w, cb } = setup('wizard', 5, ['scorchingRay']); const [a, b] = cb.monsters; const wasA = a.hp;
      cb.castSpell(w, 'scorchingRay', { slot: 2, aims: [a, b, a] });
      const ev = cb.drain().events.filter((e) => (e.type === 'hit' || e.type === 'miss') && e.att === w);
      expect(ev.length).toBe(3); expect(ev.map((e) => e.tgt)).toEqual([a, b, a]);
      for (const e of ev) if (e.type === 'hit' && !e.crit) { expect(e.dmg).toBeGreaterThanOrEqual(2); expect(e.dmg).toBeLessThanOrEqual(12); expect(e.dtype).toBe('fire'); }
      expect(wasA - a.hp).toBe(ev.filter((e) => e.type === 'hit' && e.tgt === a).reduce((s, e) => s + e.dmg, 0));
    }
  });
  it('a 3rd-level slot throws 4 rays', () => {
    const { w, cb } = setup('wizard', 5, ['scorchingRay']); const [a, b] = cb.monsters;
    cb.castSpell(w, 'scorchingRay', { slot: 3, aims: [a, b, a, b] });
    expect(cb.drain().events.filter((e) => (e.type === 'hit' || e.type === 'miss') && e.att === w).length).toBe(4);
  });
  it('rays are independent rolls (not all hit or all miss) across many casts', () => {
    const outcomes = new Set();
    for (let seed = 1; seed <= 40; seed++) { setRng(seeded(seed)); const { w, cb } = setup('wizard', 3, ['scorchingRay']); const [a] = cb.monsters; cb.castSpell(w, 'scorchingRay', { slot: 2, aims: [a, a, a] }); outcomes.add(cb.drain().events.filter((e) => e.type === 'hit' && e.att === w).length); }
    expect(outcomes.size).toBeGreaterThan(1);
  });
});

describe('Eldritch Blast: beams are aimed individually', () => {
  it('level 5 warlock fires two beams at two different foes', () => {
    for (let seed = 1; seed <= 10; seed++) {
      setRng(seeded(seed)); const { w, cb } = setup('warlock', 5, ['eldritchBlast']); const [a, b] = cb.monsters;
      cb.castSpell(w, 'eldritchBlast', { aims: [a, b] });
      const ev = cb.drain().events.filter((e) => (e.type === 'hit' || e.type === 'miss') && e.att === w); expect(ev.map((e) => e.tgt)).toEqual([a, b]);
    }
  });
  it('level 1 warlock still fires one beam at the chosen target', () => {
    const { w, cb } = setup('warlock', 1, ['eldritchBlast']); const [, b] = cb.monsters; cb.castSpell(w, 'eldritchBlast', { target: b });
    expect(cb.drain().events.filter((e) => (e.type === 'hit' || e.type === 'miss') && e.att === w).map((e) => e.tgt)).toEqual([b]);
  });
});

describe('AI / auto-battle keeps adaptive focus fire', () => {
  it('autoAim:true ignores a lone target: darts go to the weakest foe and flow onward as it dies', () => {
    const { w, cb } = setup('wizard', 5, ['magicMissile']); const [a, b, c] = cb.monsters; a.hp = 3; b.hp = 6; c.hp = 50;
    cb.castSpell(w, 'magicMissile', { slot: 3, autoAim: true, target: c }); const hits = dartHits(cb);
    expect(hits.length).toBe(5); expect(hits[0].tgt).toBe(a); expect(hits.some((h) => h.tgt === b)).toBe(true); expect(a.hp).toBeLessThanOrEqual(0);
  });
  it('no target and no aims at all (AI Scorching Ray) still fires every ray, at the weakest awake foe', () => {
    for (let seed = 1; seed <= 25; seed++) {
      setRng(seeded(seed)); const { w, cb } = setup('wizard', 5, ['scorchingRay']); for (const m of cb.monsters) m.hp = m.maxHp = 12; const weakest = cb.monsters[1]; weakest.hp = 5;
      cb.castSpell(w, 'scorchingRay', { slot: 2, autoAim: true });
      const ev = cb.drain().events.filter((e) => (e.type === 'hit' || e.type === 'miss') && e.att === w); expect(ev.length).toBe(3); expect(ev[0].tgt).toBe(weakest);
    }
  });
  it('without autoAim a lone target takes everything (legacy player path)', () => {
    const { w, cb } = setup('wizard', 3, ['magicMissile']); const [a, b, c] = cb.monsters; a.hp = 3; b.hp = 4;
    cb.castSpell(w, 'magicMissile', { slot: 1, target: c }); expect(dartHits(cb).every((h) => h.tgt === c)).toBe(true);
  });
  it('a full AI wizard fight with Magic Missile / Scorching Ray runs to the end without error', () => {
    for (let seed = 1; seed <= 15; seed++) { setRng(seeded(seed)); const { w, cb } = setup('wizard', 5, ['magicMissile', 'scorchingRay'], [{ key: 'giantRat', count: 4 }]); for (const m of cb.monsters) m.hp = m.maxHp = 9; w.ai = true; expect(() => cb.runAuto()).not.toThrow(); }
  });
});
