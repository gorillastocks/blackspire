import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { Combat } from '../src/rules/combat.js';
import { createCharacter } from '../src/rules/character.js';
import { MONSTERS, WEAPONS, SHOP_STOCK } from '../src/rules/data.js';
import * as D from '../src/rules/phaseD.js';

const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; return s; };
const mk = (s, key, n = 1) => new Combat(s.party, [{ key, count: n }], { inventory: s.inventory, lore: s.lore });
const toTurn = (cb, c) => { let g = 0; while (cb.current() !== c && g++ < 50) { if (cb.state !== 'running') break; cb.endTurn(); } };
const dmg = (cb, m, amt, type) => { cb.events = []; return cb.damage(m, amt, type, cb.party[0]); };

describe('rows', () => {
  it('only the front two can melee; back row needs ranged, spells or a reach weapon', () => {
    const s = fresh(); const cb = mk(s, 'giantRat', 2); const back = s.party[3];
    expect(cb.inFront(s.party[0])).toBe(true); expect(cb.inFront(back)).toBe(false);
    back.equip.weapon = { base: 'longsword' }; back.equip.ranged = null;
    expect(cb.canMelee(back)).toBe(false);
    back.equip.weapon = { base: 'glaive' }; expect(cb.hasReach(back)).toBe(true); expect(cb.canMelee(back)).toBe(true);
  });
  it('a back-row melee attack is refused by the engine, a reach attack is allowed', () => {
    const s = fresh(); const cb = mk(s, 'giantRat', 1); const back = s.party[3]; toTurn(cb, back);
    back.equip.weapon = { base: 'longsword' }; back.equip.ranged = null;
    const hp = cb.monsters[0].hp; cb.act(back, 'attack', { target: cb.monsters[0] });
    expect(cb.monsters[0].hp).toBe(hp); expect(cb.turn.action).toBe(1); expect(cb.actionsFor(back).some((a) => a.id === 'attack')).toBe(false);
    back.equip.weapon = { base: 'pike' }; expect(cb.actionsFor(back).some((a) => a.id === 'attack')).toBe(true);
  });
  it('reach weapons are real SRD entries and sold in a shop', () => {
    for (const k of ['glaive', 'halberd', 'pike', 'whip']) expect(WEAPONS[k].props).toContain('reach');
    expect(JSON.stringify(SHOP_STOCK)).toMatch(/glaive/);
  });
  it('monsters hit the front row about nine times in ten, fliers ignore rows', () => {
    const s = fresh(); const cb = mk(s, 'giantRat', 1); const front = cb.frontRow(); const live = cb.conscious();
    const w = D.targetWeights(front, live, { }); const tot = w.reduce((a, x) => a + x.w, 0);
    const pf = w.filter((x) => front.includes(x.c)).reduce((a, x) => a + x.w, 0) / tot; expect(pf).toBeGreaterThan(0.88); expect(pf).toBeLessThan(0.96);
    expect(D.targetWeights(front, live, { flying: true }).every((x) => x.w === 1)).toBe(true);
    let n = 0; for (let i = 0; i < 2000; i++) if (front.includes(D.pickWeighted(w, Math.random()))) n++; expect(n / 2000).toBeGreaterThan(0.86);
  });
  it('swap rows is a bonus action that really changes the formation (and is saved by party order)', () => {
    const s = fresh(); const cb = mk(s, 'giantRat', 1); const c = s.party[0], b = s.party[3]; toTurn(cb, c);
    expect(cb.actionsFor(c).some((a) => a.id === 'swap')).toBe(true);
    cb.act(c, 'swap', { target: b }); expect(cb.inFront(c)).toBe(false); expect(cb.inFront(b)).toBe(true); expect(cb.turn.bonus).toBe(0);
    expect(s.party[0]).toBe(b); expect(G.deserialize(G.serialize(s)).party[0].name).toBe(b.name);
    expect(cb.swapRows(c, c)).toBe(false);
  });
});

describe('elemental weaknesses and resistances', () => {
  it('traits double, halve or negate damage and the floater/log numbers agree', () => {
    expect(D.applyTrait(9, 'vuln')).toBe(18); expect(D.applyTrait(9, 'resist')).toBe(4); expect(D.applyTrait(9, 'immune')).toBe(0);
    const s = fresh(); const cb = mk(s, 'giantWolfSpider', 1); const m = cb.monsters[0]; m.hp = m.maxHp = 999;
    expect(MONSTERS.giantWolfSpider.vuln).toContain('fire');
    cb.events = []; cb.emit({ type: 'hit', att: s.party[0], tgt: m, dmg: 5, dtype: 'fire' }); cb.damage(m, 5, 'fire', s.party[0], { attack: true });
    const hit = cb.events.find((e) => e.type === 'hit'); expect(hit.dmg).toBe(10); expect(hit.mod).toBe('vuln'); expect(m.hp).toBe(989);
  });
  it('a type is discovered by the first hit, saved in lore, and carried into the next fight', () => {
    const s = fresh(); const cb = mk(s, 'giantWolfSpider', 1); const m = cb.monsters[0]; m.hp = m.maxHp = 999;
    expect(D.knownTraits(m)).toEqual([]); expect(D.hiddenTraitCount(m)).toBeGreaterThan(0);
    dmg(cb, m, 3, 'slashing'); expect(D.knownTraits(m)).toEqual([]);
    dmg(cb, m, 3, 'fire'); expect(D.knownTraits(m).map((t) => t.type)).toContain('fire'); expect(cb.events.some((e) => e.type === 'trait' && e.first)).toBe(true);
    expect(s.lore.giantWolfSpider.types.fire).toBe(true);
    const cb2 = mk(G.deserialize(G.serialize(s)), 'giantWolfSpider', 1); expect(D.knownTraits(cb2.monsters[0]).map((t) => t.type)).toContain('fire');
  });
  it('a Study check reveals everything on success and each hero tries once per monster', () => {
    const s = fresh(); const cb = mk(s, 'giantWolfSpider', 1); const m = cb.monsters[0]; const c = cb.current().side === 'party' ? cb.current() : (toTurn(cb, s.party[0]), s.party[0]);
    expect(cb.actionsFor(c).some((a) => a.id === 'study')).toBe(true);
    for (const a of ['int', 'wis', 'cha', 'str']) c.scores[a] = 30; // +10: a natural 1 still beats DC 10
    cb.act(c, 'study', { target: m });
    expect(D.isStudied(m)).toBe(true); expect(s.lore.giantWolfSpider.studied).toBe(true); expect(cb.turn.bonus).toBe(0);
    expect(cb.actionsFor(c).some((a) => a.id === 'study')).toBe(false);
  });
  it('study skill and DC follow the creature', () => {
    expect(D.studySkill({ type: 'undead' })).toBe('religion'); expect(D.studySkill({ type: 'beast' })).toBe('nature'); expect(D.studySkill({ type: 'ooze' })).toBe('arcana');
    expect(D.studyDC({ cr: 1 })).toBe(11); expect(D.studyDC({ cr: 8, boss: true })).toBe(17);
  });
  it('every trait uses a known damage type with an icon', () => {
    for (const [k, T] of Object.entries(MONSTERS)) for (const t of D.traitsOf(T)) { expect(D.DTYPES[t.type], `${k} ${t.type}`).toBeTruthy(); expect(D.TRAIT_KINDS[t.kind]).toBeTruthy(); }
  });
  it('AC stays the only defense layer: no new armor or DR fields on monsters', () => {
    for (const T of Object.values(MONSTERS)) { expect(typeof T.ac).toBe('number'); expect(T.dr).toBeUndefined(); expect(T.shield).toBeUndefined(); }
  });
});

describe('conditions have icons and tooltips', () => {
  it('every condition the engine can apply has an icon, a name and a sentence', () => {
    for (const k of ['poisoned', 'prone', 'frightened', 'restrained', 'grappled', 'paralyzed', 'unconscious', 'blessed', 'dodging', 'raging', 'hidden', 'marked'])
      { const i = D.condInfo(k); expect(i.icon.length).toBeGreaterThan(0); expect(i.name).toBeTruthy(); expect(i.desc.length).toBeGreaterThan(10); }
    expect(D.visibleConds({ poisoned: true, mageArmor: true })).toEqual(['poisoned']);
  });
});

describe('cut-ins', () => {
  it('four kinds, mapped from the action', () => {
    expect(D.CUTIN_KINDS).toEqual(['melee', 'ranged', 'spell', 'heal']);
    expect(D.cutinKindFor('attack')).toBe('melee'); expect(D.cutinKindFor('shoot')).toBe('ranged'); expect(D.cutinKindFor('cast', { kind: 'save' })).toBe('spell');
    expect(D.cutinKindFor('cast', { kind: 'heal' })).toBe('heal'); expect(D.cutinKindFor('layOnHands')).toBe('heal'); expect(D.cutinKindFor('dodge')).toBeNull();
  });
  it('timings scale with battle speed (2x halves) and vanish when skipped', () => {
    const a = D.cutinTimes(1), b = D.cutinTimes(0.5); expect(b.total).toBeLessThan(a.total); expect(Math.abs(b.total * 2 - a.total)).toBeLessThan(4);
    expect(D.cutinTimes(1, { skipping: true }).total).toBe(0); expect(D.cutinTimes(1, { reduce: true }).slide).toBe(0);
    expect(a.total).toBeLessThan(800);
  });
  it('the engine emits exactly one cut-in per party action, before the attack', () => {
    const s = fresh(); const cb = mk(s, 'giantRat', 1); const c = s.party[0]; toTurn(cb, c); cb.events = [];
    cb.act(c, 'attack', { target: cb.monsters[0] });
    const ev = cb.events.filter((e) => e.type === 'cutin'); expect(ev.length).toBe(1); expect(ev[0].kind).toBe('melee');
    expect(cb.events.findIndex((e) => e.type === 'cutin')).toBeLessThan(cb.events.findIndex((e) => e.type === 'partyAttack'));
  });
});

describe('save v6', () => {
  it('new games are v6 with empty lore; v5 saves migrate and keep everything', () => {
    const s = fresh(); expect(s.version).toBe(6); expect(s.lore).toEqual({});
    const t = JSON.parse(G.serialize(s)); delete t.lore; t.version = 5; t.gold = 321;
    const d = G.deserialize(JSON.stringify(t)); expect(d.version).toBe(6); expect(d.lore).toEqual({}); expect(d.gold).toBe(321); expect(d.party.length).toBe(4);
  });
});
