import { describe, it, expect, afterEach } from 'vitest';
import { newGame } from '../src/game/game.js';
import { Combat, tacticsOf } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';

afterEach(() => setRng(null));
const party = (seed) => { setRng(seeded(seed)); const s = newGame({ cls: 'fighter' }); s.party.forEach((c) => { c.ai = true; }); return s; };
const byCls = (s, k) => s.party.find((c) => c.cls === k);
/** Give the current turn to `who` and let the AI act once. */
function aiOnce(cb, who) { cb.order = [who, ...cb.order.filter((x) => x !== who)]; cb.turnIdx = -1; cb.nextTurn(); while (cb.current() !== who) cb.nextTurn(); const before = { slots: [...who.slots], inv: cb.inventory.length, log: cb.log.length }; cb.aiTurn(who); return { before, newLog: cb.log.slice(before.log).map((l) => l.t || l).join('\n') }; }

describe('companion tactics are respected by the AI', () => {
  it('spells:false — wizard never spends a spell slot, even in a hard fight', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = party(seed); const w = byCls(s, 'wizard'); w.tactics = { spells: false };
      const cb = new Combat(s.party, [{ key: 'giantRat', count: 4 }, { key: 'wolf', count: 3 }], { inventory: s.inventory, boss: true });
      const slots = [...w.slots]; aiOnce(cb, w); expect(w.slots).toEqual(slots);
    }
  });
  it('aoe:false — no Burning Hands / Sleep / Thunderwave; aoe:true does use area spells', () => {
    let usedWith = 0;
    for (let seed = 1; seed <= 30; seed++) {
      for (const aoe of [false, true]) {
        const s = party(seed); const w = byCls(s, 'wizard'); w.tactics = { aoe, style: 'aggressive' };
        const cb = new Combat(s.party, [{ key: 'giantRat', count: 5 }], { inventory: s.inventory });
        const { newLog } = aiOnce(cb, w);
        const area = /Burning Hands|Sleep|Thunderwave|Fireball/i.test(newLog);
        if (!aoe) expect(area, newLog).toBe(false); else if (area) usedWith++;
      }
    }
    expect(usedWith).toBeGreaterThan(0);
  });
  it('potions:false — never drinks; potions:true at low HP does', () => {
    for (const potions of [false, true]) {
      const s = party(3); const r = byCls(s, 'rogue'); r.tactics = { potions, style: 'defensive', healAt: 50 };
      s.party.filter((c) => c.cls === 'cleric').forEach((c) => { c.dead = true; c.hp = 0; });
      r.hp = 1; const cb = new Combat(s.party, [{ key: 'giantRat', count: 1 }], { inventory: s.inventory });
      const n = cb.inventory.length; aiOnce(cb, r);
      expect(cb.inventory.length).toBe(potions ? n - 1 : n);
    }
  });
  it('heal threshold — cleric heals an ally at 70% HP only when the slider is above 70', () => {
    for (const healAt of [40, 90]) {
      let heals = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const s = party(seed); const cl = byCls(s, 'cleric'); cl.tactics = { healAt, style: 'support' };
        const f = s.party.find((c) => c.cls === 'fighter'); f.hp = Math.ceil(f.maxHp * 0.7) - 0; if (f.hp >= f.maxHp) f.hp = f.maxHp - 1;
        const cb = new Combat(s.party, [{ key: 'giantRat', count: 2 }], { inventory: s.inventory });
        const { newLog } = aiOnce(cb, cl); if (/Healing Word|Cure Wounds|heal/i.test(newLog) && new RegExp(f.name).test(newLog)) heals++;
      }
      if (healAt === 40) expect(heals).toBe(0); else expect(heals).toBeGreaterThanOrEqual(8);
    }
  });
  it('defensive dodges when hurt; aggressive keeps attacking', () => {
    const run = (style) => { const s = party(7); const f = byCls(s, 'fighter'); f.tactics = { style, potions: false }; f.res.secondWind = 0; f.hp = 2; const cb = new Combat(s.party, [{ key: 'giantRat', count: 2 }], { inventory: s.inventory }); return aiOnce(cb, f).newLog; };
    expect(run('defensive')).toMatch(/dodg/i);
    expect(run('aggressive')).not.toMatch(/dodg/i);
  });
  it('defaults are Balanced with everything allowed and 40% threshold', () => {
    expect(tacticsOf({})).toEqual({ style: 'balanced', spells: true, potions: true, aoe: true, healAt: 40 });
  });
});

describe('difficulty', () => {
  it('scales monster HP and damage', () => {
    const hp = {}; const dmg = {};
    for (const d of ['story', 'normal', 'hard']) {
      setRng(seeded(42)); const s = newGame({}); const cb = new Combat(s.party, [{ key: 'wolf', count: 3 }], { difficulty: d });
      hp[d] = cb.monsters.reduce((a, m) => a + m.maxHp, 0);
      const t = s.party[0]; t.hp = t.maxHp = 500; cb.damage(t, 10, 'piercing', cb.monsters[0]); dmg[d] = 500 - t.hp;
    }
    expect(hp.story).toBeLessThan(hp.normal); expect(hp.hard).toBeGreaterThan(hp.normal);
    expect(dmg).toEqual({ story: 6, normal: 10, hard: 13 });
  });
});
