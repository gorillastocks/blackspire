import { describe, it, expect, afterEach } from 'vitest';
import { newGame, campPotion, usePotion, healPotionCount, isHealPotion, pickHealPotion } from '../src/game/game.js';
import { Combat } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';
import { ITEMS } from '../src/rules/data.js';

afterEach(() => setRng(null));

const fresh = () => { setRng(seeded(1)); return newGame({ name: 'Aldric', cls: 'fighter' }); };
const hurt = (c, hp) => { c.hp = hp; c.dead = false; };

describe('heal potion catalog', () => {
  it('counts Healing, Greater, and Silverfruit, but not Antitoxin or Stone-to-Flesh', () => {
    expect(isHealPotion('potionHealing')).toBe(true);
    expect(isHealPotion('potionGreater')).toBe(true);
    expect(isHealPotion('silverfruit')).toBe(true);
    expect(isHealPotion('antitoxin')).toBe(false);
    expect(isHealPotion('potionStoneFlesh')).toBe(false);
    expect(isHealPotion('tinCup')).toBe(false);
    expect(healPotionCount(['potionHealing', 'potionGreater', 'potionGreater', 'antitoxin', 'potionStoneFlesh', 'silverfruit'])).toBe(4);
  });

  it('picks the weakest remaining healing potion, and Greater only once plains are gone', () => {
    const inv = ['potionGreater', 'potionHealing', 'potionGreater'];
    expect(pickHealPotion(inv, 3)).toBe('potionHealing');
    expect(pickHealPotion(inv, 20)).toBe('potionHealing'); // save Greater even on a big wound
    expect(pickHealPotion(['potionGreater', 'antitoxin', 'potionStoneFlesh'], 3)).toBe('potionGreater');
    expect(pickHealPotion(['antitoxin', 'potionStoneFlesh'], 10)).toBeNull();
    expect(pickHealPotion([], 10)).toBeNull();
  });
});

describe('campPotion uses any healing potion', () => {
  it('uses a Potion of Greater Healing when plain ones are gone, and removes exactly one', () => {
    const s = fresh();
    s.inventory = ['potionGreater', 'potionGreater', 'antitoxin', 'potionStoneFlesh'];
    const t = s.party[0]; hurt(t, 2);
    const r = campPotion(s, t);
    expect(r.ev[0].log).toMatch(/drinks Potion of Greater Healing/);
    expect(r.ev[0].log).not.toMatch(/No potion/);
    expect(s.inventory.filter((k) => k === 'potionGreater')).toHaveLength(1);
    expect(s.inventory).toContain('antitoxin');
    expect(s.inventory).toContain('potionStoneFlesh');
    expect(t.hp).toBeGreaterThan(2);
    expect(r.card.lines.join('\n')).toMatch(/1 healing potion left/);
  });

  it('prefers a plain Potion of Healing for a small wound when both kinds remain', () => {
    const s = fresh();
    s.inventory = ['potionGreater', 'potionHealing'];
    const t = s.party[0]; hurt(t, t.maxHp - 3);
    const r = campPotion(s, t);
    expect(r.ev[0].log).toMatch(/drinks Potion of Healing/);
    expect(s.inventory).toEqual(['potionGreater']);
  });

  it('says no potion only when no usable healing potion remains', () => {
    const s = fresh();
    const t = s.party[0]; hurt(t, 1);
    s.inventory = ['antitoxin', 'potionStoneFlesh', 'tinCup'];
    const r = campPotion(s, t);
    expect(r.ev[0].log).toBe('No potion to use.');
    expect(t.hp).toBe(1);
    expect(s.inventory).toEqual(['antitoxin', 'potionStoneFlesh', 'tinCup']);

    s.inventory = ['potionGreater'];
    const ok = campPotion(s, t);
    expect(ok.ev[0].log).toMatch(/Greater Healing/);
    expect(s.inventory).toEqual([]);
  });
});

describe('inventory and combat share one potion pile', () => {
  it('usePotion removes exactly one stack item', () => {
    const s = fresh();
    s.inventory = ['potionGreater', 'potionGreater', 'potionHealing'];
    const t = s.party[1]; hurt(t, 4);
    const ev = usePotion(s, 0, t);
    expect(ev[0].log).toMatch(/drinks Potion of Greater Healing/);
    expect(s.inventory).toEqual(['potionGreater', 'potionHealing']);
    expect(healPotionCount(s.inventory)).toBe(2);
  });

  it('combat drinks mutate the same inventory array the camp sees', () => {
    const s = fresh();
    s.inventory = ['potionGreater', 'potionGreater', 'antitoxin'];
    const hero = s.party[0]; hero.ai = true; hero.tactics = { style: 'defensive', potions: true, healAt: 90, spells: false };
    s.party.filter((c) => c !== hero).forEach((c) => { c.dead = true; c.hp = 0; });
    hurt(hero, 1);
    const cb = new Combat(s.party, [{ key: 'giantRat', count: 1 }], { inventory: s.inventory });
    expect(cb.inventory).toBe(s.inventory);
    cb.order = [hero, ...cb.order.filter((x) => x !== hero)];
    cb.turnIdx = -1; cb.nextTurn();
    while (cb.current() !== hero) cb.nextTurn();
    cb.aiTurn(hero);
    expect(s.inventory.filter((k) => k === 'potionGreater')).toHaveLength(1);
    expect(s.inventory).toContain('antitoxin');
    expect(healPotionCount(s.inventory)).toBe(1);
    expect(cb.log.some((l) => /Potion of Greater Healing/.test(l.t || l))).toBe(true);
  });

  it('combat AI will not drink an Antitoxin or Stone-to-Flesh as a heal', () => {
    const s = fresh();
    s.inventory = ['antitoxin', 'potionStoneFlesh'];
    const n = s.inventory.length;
    const hero = s.party[0]; hero.ai = true; hero.tactics = { style: 'defensive', potions: true, healAt: 90, spells: false };
    s.party.filter((c) => c !== hero).forEach((c) => { c.dead = true; c.hp = 0; });
    hurt(hero, 1);
    const cb = new Combat(s.party, [{ key: 'giantRat', count: 1 }], { inventory: s.inventory });
    cb.order = [hero, ...cb.order.filter((x) => x !== hero)];
    cb.turnIdx = -1; cb.nextTurn();
    while (cb.current() !== hero) cb.nextTurn();
    cb.aiTurn(hero);
    expect(s.inventory).toHaveLength(n);
    expect(s.inventory).toEqual(['antitoxin', 'potionStoneFlesh']);
  });
});

describe('ITEMS still define the expected heals', () => {
  it('plain and greater potions have heal dice', () => {
    expect(ITEMS.potionHealing.heal).toBe('2d4+2');
    expect(ITEMS.potionGreater.heal).toBe('4d4+4');
  });
});
