import { describe, it, expect, afterEach } from 'vitest';
import { createCharacter, assignByPriority, levelUp } from '../src/rules/character.js';
import { Combat, MAX_GROUPS, FRONT_GROUPS } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';
import { SPELLS, MONSTERS } from '../src/rules/data.js';
import { rankLayout, spriteRankLayout, SPR_RANK_SCALE, SPR_Z0, SPR_RANK_DZ, RANK_Z0, RANK_DZ } from '../src/render/ranks.js';

afterEach(() => setRng(null));
const mk = (cls, lvl = 1) => { const c = createCharacter({ name: cls, race: 'human', cls, base: assignByPriority(cls) }); c.xp = 999999; while (c.level < lvl) levelUp(c); return c; };
const FOES = [{ key: 'gargoyle', count: 2 }, { key: 'wolf', count: 2 }, { key: 'giantRat', count: 2 }, { key: 'cultFanatic', count: 1 }];
/** fighter + cleric in front, wizard in the back row; every foe is a beefy dummy so nothing dies by accident. */
function setup(foes = FOES, party = [mk('fighter', 3), mk('cleric', 3), mk('wizard', 5)], hp = 500) {
  setRng(seeded(11));
  const cb = new Combat(party, foes);
  for (const m of cb.monsters) m.hp = m.maxHp = hp;
  const turn = (c) => { cb.order = [c, ...cb.order.filter((x) => x !== c)]; cb.turnIdx = 0; cb.turn = { action: 1, bonus: 1 }; cb.drain(); };
  return { cb, party, turn, g: () => cb.liveRanks() };
}
const kill = (cb, m) => { m.hp = 0; cb.checkEnd(); };

describe('ranks: group construction', () => {
  it('splits an encounter into one group per monster type, up to four, melee brutes in front and ranged/casters at the back', () => {
    const { g } = setup();
    expect(g().map((x) => x.key)).toEqual(['gargoyle', 'wolf', 'giantRat', 'cultFanatic']);
    expect(g().map((x) => x.monsters.length)).toEqual([2, 2, 2, 1]);
    expect(g().at(-1).ranged).toBe(true);
    expect(MAX_GROUPS).toBe(4);
  });
  it('a back-rank caster stays behind even when it is the strongest kind', () => {
    const { g } = setup([{ key: 'sisterVey', count: 1 }, { key: 'cultist', count: 3 }]);
    expect(g().map((x) => x.key)).toEqual(['cultist', 'sisterVey']);
  });
  it('more than four kinds fold the extras into the last group', () => {
    const { g, cb } = setup([{ key: 'gargoyle', count: 1 }, { key: 'wolf', count: 1 }, { key: 'giantRat', count: 1 }, { key: 'cultist', count: 1 }, { key: 'giantCrab', count: 1 }]);
    expect(g().length).toBe(4); expect(g().at(-1).monsters.length).toBe(2); expect(cb.monsters.length).toBe(5);
  });
  it('keeps the elite leader / boss at monsters[0]', () => {
    const { cb } = setup(); expect(cb.monsters[0].key).toBe('gargoyle');
  });
});

describe('ranks: reach', () => {
  it('melee reaches only the first two groups; the picker rule says far groups are out of reach', () => {
    const { cb, party, g } = setup(); const [fighter] = party; const [g1, g2, g3, g4] = g();
    for (const m of [...g1.monsters, ...g2.monsters]) expect(cb.canTarget(fighter, m, 'melee'), m.name).toBe(true);
    for (const m of [...g3.monsters, ...g4.monsters]) expect(cb.canTarget(fighter, m, 'melee'), m.name).toBe(false);
    expect(FRONT_GROUPS).toBe(2);
  });
  it('a melee swing at a far group is refused and spends nothing', () => {
    const { cb, party, turn, g } = setup(); const [fighter] = party; turn(fighter);
    const far = g()[2].monsters[0], hp = far.hp;
    cb.act(fighter, 'attack', { target: far });
    expect(far.hp).toBe(hp); expect(cb.turn.action).toBe(1);
    expect(cb.drain().log.some((l) => /out of reach/i.test(l.t))).toBe(true);
  });
  it('a melee swing at a reachable group works', () => {
    const { cb, party, turn, g } = setup(); const [fighter] = party; turn(fighter);
    const t = g()[1].monsters[0]; cb.act(fighter, 'attack', { target: t });
    expect(cb.turn.action).toBe(0);
  });
  it('a reach weapon adds one more group (but not the fourth)', () => {
    const { cb, party, g } = setup(); const [fighter] = party; fighter.equip.weapon = { ...(fighter.equip.weapon || {}), base: 'glaive' };
    expect(cb.hasReach(fighter)).toBe(true);
    expect(cb.canTarget(fighter, g()[2].monsters[0], 'melee')).toBe(true);
    expect(cb.canTarget(fighter, g()[3].monsters[0], 'melee')).toBe(false);
    // touch attacks (unarmed, melee spells) never get the reach bonus
    expect(cb.canTarget(fighter, g()[2].monsters[0], 'touch')).toBe(false);
  });
  it('ranged attacks and spells reach every group', () => {
    const { cb, party, g } = setup(); const [fighter] = party;
    for (const m of cb.livingMonsters()) expect(cb.canTarget(fighter, m, 'ranged')).toBe(true);
    expect(g().length).toBe(4);
  });
  it('the action list tags each attack with its range', () => {
    const { cb, party, turn } = setup(); turn(party[0]); const a = Object.fromEntries(cb.actionsFor(party[0]).map((x) => [x.id, x]));
    expect(a.attack.range).toBe('melee');
  });
  it('a melee-range spell (touch) only reaches the front groups; a ranged spell reaches the back', () => {
    const touchy = Object.entries(SPELLS).filter(([, s]) => s.melee).map(([k]) => k);
    expect(touchy.length).toBeGreaterThan(0);
    const { cb } = setup(); expect(cb.rangeKind('cast', touchy[0])).toBe('touch'); expect(cb.rangeKind('cast', 'fireBolt')).toBe('ranged');
  });
  it('fireBolt cast at the last group connects', () => {
    const { cb, party, turn, g } = setup(); const wiz = party[2]; wiz.prepared = [...new Set([...(wiz.prepared || []), 'fireBolt'])]; wiz.spells = [...new Set([...(wiz.spells || []), 'fireBolt'])]; turn(wiz);
    const far = g()[3].monsters[0]; cb.castSpell(wiz, 'fireBolt', { slot: 0, target: far });
    expect(cb.turn.action).toBe(0);
    expect(cb.drain().events.some((e) => (e.type === 'hit' || e.type === 'miss') && e.tgt === far)).toBe(true);
  });
});

describe('ranks: advancing', () => {
  it('wiping the front group moves the groups behind it up, and the next group is then in melee reach', () => {
    const { cb, party, g } = setup(); const [fighter] = party; const g3 = g()[2].monsters[0];
    expect(cb.canTarget(fighter, g3, 'melee')).toBe(false);
    for (const m of [...g()[0].monsters]) kill(cb, m);
    expect(g().map((x) => x.key)).toEqual(['wolf', 'giantRat', 'cultFanatic']);
    expect(cb.rankOf(g3)).toBe(1); expect(cb.canTarget(fighter, g3, 'melee')).toBe(true);
    const ev = cb.drain(); expect(ev.events.some((e) => e.type === 'advance')).toBe(true); expect(ev.log.some((l) => /ranks close up/i.test(l.t))).toBe(true);
  });
  it('killing one of two foes in a group does not advance anybody', () => {
    const { cb, g } = setup(); kill(cb, g()[0].monsters[0]);
    expect(g().length).toBe(4); expect(cb.drain().events.some((e) => e.type === 'advance')).toBe(false);
  });
  it('killing a middle group advances only those behind it', () => {
    const { cb, g } = setup(); const [a, , c] = g(); for (const m of g()[1].monsters) kill(cb, m);
    expect(g().map((x) => x.key)).toEqual(['gargoyle', 'giantRat', 'cultFanatic']); expect(cb.rankOf(c.monsters[0])).toBe(1); expect(cb.rankOf(a.monsters[0])).toBe(0);
  });
});

describe('ranks: area spells hit one whole group', () => {
  const learn = (w, k) => { w.prepared = [...new Set([...(w.prepared || []), k])]; w.spells = [...new Set([...(w.spells || []), k])]; w.slots = w.slots.map(() => 9); };
  it('Fireball hits every monster in the chosen group and nobody else', () => {
    const { cb, party, turn, g } = setup(FOES, undefined, 500); const wiz = party[2]; learn(wiz, 'fireball'); wiz.level = 7; turn(wiz);
    const grp = g()[2]; cb.castSpell(wiz, 'fireball', { slot: 3, target: grp.monsters[0] });
    const hit = cb.drain().events.filter((e) => e.type === 'hit' || e.type === 'miss').map((e) => e.tgt);
    for (const m of grp.monsters) expect(hit, m.name).toContain(m);
    for (const m of cb.monsters.filter((m) => m.gid !== grp.gid)) { expect(hit.includes(m), m.name).toBe(false); expect(m.hp).toBe(500); }
  });
  it('every area spell in the data carries the flag, and multi-target ones do not', () => {
    for (const k of ['fireball', 'burningHands', 'thunderwave', 'sleep', 'coneOfCold', 'shatter', 'lightningBolt']) expect(SPELLS[k].area, k).toBe(true);
    for (const k of ['magicMissile', 'scorchingRay', 'fireBolt', 'sacredFlame']) expect(SPELLS[k].area, k).toBeFalsy();
  });
  it('Sleep only puts the chosen group to sleep', () => {
    const { cb, party, turn, g } = setup([{ key: 'cultist', count: 2 }, { key: 'giantRat', count: 2 }], undefined, 6); const wiz = party[2]; learn(wiz, 'sleep'); turn(wiz);
    const [front, back] = g(); cb.castSpell(wiz, 'sleep', { slot: 1, target: back.monsters[0] });
    for (const m of front.monsters) expect(m.conditions.unconscious, m.name).toBeFalsy();
    expect(back.monsters.some((m) => m.conditions.unconscious)).toBe(true);
  });
  it('Magic Missile darts keep per-dart aims (any group) but only legal ones', () => {
    const { cb, party, turn, g } = setup(); const wiz = party[2]; learn(wiz, 'magicMissile'); turn(wiz);
    const a = g()[3].monsters[0], b = g()[0].monsters[0];
    cb.castSpell(wiz, 'magicMissile', { slot: 1, aims: [a, b, a], target: a });
    const hits = cb.drain().events.filter((e) => e.type === 'hit' && e.spell === 'magicMissile');
    expect(hits.filter((h) => h.tgt === a).length).toBe(2); expect(hits.filter((h) => h.tgt === b).length).toBe(1);
  });
  it('the party AI only counts the biggest group for area spells', () => {
    // 4 foes but split over four groups of one: AoE is pointless, the AI must not "Fireball" a lone group
    const { cb, party } = setup([{ key: 'gargoyle', count: 1 }, { key: 'wolf', count: 1 }, { key: 'giantRat', count: 1 }, { key: 'cultist', count: 1 }], [mk('wizard', 5), mk('fighter', 3)]);
    const wiz = party[0]; wiz.slots = wiz.slots.map(() => 9); wiz.prepared = [...new Set([...(wiz.prepared || []), 'fireball'])]; wiz.spells = [...new Set([...(wiz.spells || []), 'fireball'])];
    cb.order = [wiz, ...cb.order.filter((x) => x !== wiz)]; cb.turnIdx = 0; cb.turn = { action: 1, bonus: 1 }; cb.drain();
    cb.aiTurn(wiz); const ev = cb.drain().events.filter((e) => e.type === 'spell'); expect(ev.some((e) => e.spell === 'fireball')).toBe(false);
  });
});

describe('ranks: monster AI', () => {
  it('melee monsters in the third and fourth group wait; ranged ones and the front two act', () => {
    const { cb, g } = setup(); const [g1, g2, g3, g4] = g();
    for (const m of [...g1.monsters, ...g2.monsters]) expect(cb.monsterActs(m), m.name).toBe(true);
    for (const m of g3.monsters) expect(cb.monsterActs(m), m.name).toBe(false);
    expect(cb.monsterActs(g4.monsters[0])).toBe(true); // ranged / caster acts from anywhere
  });
  it('a waiting monster does not attack and logs it; a monster that has advanced attacks again', () => {
    const { cb, party, g } = setup(); const rat = g()[2].monsters[0]; cb.drain();
    cb.monsterTurn(rat); let out = cb.drain();
    expect(out.events.some((e) => e.type === 'monsterAttack' && e.who === rat)).toBe(false); expect(out.log.some((l) => /waits behind the line/i.test(l.t))).toBe(true);
    for (const m of g()[0].monsters) kill(cb, m); cb.drain();
    let tries = 0, attacked = false; while (!attacked && tries++ < 20) { cb.monsterTurn(rat); attacked = cb.drain().events.some((e) => e.type === 'monsterAttack' && e.who === rat); }
    expect(attacked).toBe(true);
  });
  it('a ranged monster in the back attacks even from the fourth group', () => {
    const { cb, g } = setup(); const caster = g()[3].monsters[0]; cb.drain(); let n = 0, acted = false;
    while (!acted && n++ < 12) { cb.monsterTurn(caster); acted = cb.drain().events.some((e) => (e.type === 'monsterAttack' || e.type === 'spell' || e.type === 'hit' || e.type === 'miss') && (e.who === caster || e.att === caster)); }
    expect(acted).toBe(true);
  });
  it('a fight against only back-rank melee monsters can still end (nobody is left waiting forever)', () => {
    // a lone front group of one that dies leaves the others to advance, so a full auto fight always terminates
    setRng(seeded(5)); const cb = new Combat([mk('fighter', 3), mk('cleric', 3), mk('wizard', 3)], FOES);
    const r = cb.runAuto ? cb.runAuto() : null; expect(['victory', 'defeat', 'won', 'lost', 'fled', undefined, null].includes(r?.result ?? r)).toBe(true);
    expect(cb.state).not.toBe('running');
  });
});

describe('ranks: render layout', () => {
  it('each rank sits further back than the one in front, with the same depth step', () => {
    const ms = FOES.flatMap((f, i) => Array.from({ length: f.count }, (_, k) => ({ id: `m${i}_${k}`, T: MONSTERS[f.key] })));
    const ranks = FOES.map((f, i) => Array.from({ length: f.count }, (_, k) => `m${i}_${k}`));
    const { pos } = rankLayout(ms, ranks);
    const zs = ranks.map((r) => pos.get(r[0]).z);
    for (let i = 1; i < zs.length; i++) expect(zs[i]).toBeLessThan(zs[i - 1]);
    expect(zs[0]).toBeLessThanOrEqual(RANK_Z0); expect(zs[0] - zs[1]).toBeGreaterThan(RANK_DZ - 0.01);
    for (const { x } of pos.values()) expect(Math.abs(x)).toBeLessThanOrEqual(6);
  });
  it('a single group lays out exactly like before: one row, spread across the width', () => {
    const ms = [{ id: 'a', T: {} }, { id: 'b', T: {} }, { id: 'c', T: {} }]; const { pos } = rankLayout(ms, null);
    expect(pos.get('a').x).toBeLessThan(pos.get('c').x); expect(pos.get('a').z).toBeLessThanOrEqual(RANK_Z0);
  });
});

describe('ranks: painted-sprite layout', () => {
  const fig = (id, w = 3, h = 2.4, o = {}) => ({ id, w, h, ...o });
  const mkRows = (counts) => { let n = 0; return counts.map((c) => Array.from({ length: c }, () => `f${n++}`)); };
  const itemsOf = (rows, o = {}) => rows.flat().map((id) => fig(id, 3, 2.4, o[id]));
  const ext = (p, it) => [p.x - it.w * p.s / 2, p.x + it.w * p.s / 2];
  it('every figure gets a finite place; ranks shrink and stand further back front to back', () => {
    const rows = mkRows([2, 2, 2, 1]); const { pos } = spriteRankLayout(itemsOf(rows), rows);
    expect(pos.size).toBe(7);
    for (const p of pos.values()) for (const k of ['x', 'z', 'y', 's']) expect(Number.isFinite(p[k]), k).toBe(true);
    const s = rows.map((r) => pos.get(r[0]).s), z = rows.map((r) => pos.get(r[0]).z);
    for (let i = 1; i < rows.length; i++) { expect(s[i]).toBeLessThan(s[i - 1]); expect(z[i]).toBeLessThan(z[i - 1]); }
    expect(SPR_RANK_SCALE[0]).toBe(1); expect(s[0]).toBe(1);
  });
  it('back ranks are lifted so their heads clear the rank in front; the front rank stands on the floor', () => {
    const rows = mkRows([2, 2, 2]); const { pos } = spriteRankLayout(itemsOf(rows), rows);
    for (const id of rows[0]) expect(pos.get(id).y).toBe(0);
    for (const id of rows[2]) expect(pos.get(id).y).toBeGreaterThan(0);
    expect(Math.max(...rows[1].map((id) => pos.get(id).y + 2.4 * pos.get(id).s))).toBeGreaterThan(Math.max(...rows[0].map((id) => 2.4 * pos.get(id).s)) * 0.95);
  });
  it('a boss stands alone in the middle at full size; the biggest figure of a row stands between its neighbours, which overlap it but not completely', () => {
    const rows = [['boss'], ['a', 'big', 'b']]; const its = [fig('boss', 4.4, 4.2, { boss: true }), fig('a'), fig('big', 3.6, 3, { elite: true }), fig('b')];
    const { pos } = spriteRankLayout(its, rows);
    expect(pos.get('boss').s).toBe(1); expect(pos.get('boss').x).toBeCloseTo(0);
    const xb = pos.get('big').x; expect(Math.min(pos.get('a').x, pos.get('b').x)).toBeLessThan(xb); expect(Math.max(pos.get('a').x, pos.get('b').x)).toBeGreaterThan(xb);
    const sc = pos.get('big').s; for (const id of ['a', 'b']) { const gap = Math.abs(pos.get(id).x - xb), full = (3.6 * sc + 3 * sc) / 2; expect(gap).toBeLessThan(full); expect(gap).toBeGreaterThan(full * 0.5); }
  });
  it('three or more in the front rank split into two lines so the group stays big (one row would be too wide)', () => {
    const rows = mkRows([3]); const { pos } = spriteRankLayout(itemsOf(rows), rows);
    const zs = new Set(rows[0].map((id) => pos.get(id).z.toFixed(2))); expect(zs.size).toBeGreaterThan(1);
    const xs = rows[0].map((id) => pos.get(id).x); const span = Math.max(...xs) - Math.min(...xs); expect(span).toBeLessThan(3 * 3 * 0.8 + 1e-6); // narrower than three side by side
  });
  it('nothing leaves the stage sideways, and a lone figure stands centred', () => {
    for (const counts of [[6], [4, 4, 3, 3], [1], [1, 1, 1, 1, 1, 1]]) { const rows = mkRows(counts); const { pos } = spriteRankLayout(itemsOf(rows), rows);
      for (const p of pos.values()) expect(Math.abs(p.x)).toBeLessThanOrEqual(9); }
    const { pos } = spriteRankLayout([fig('only')], [['only']]); expect(pos.get('only').x).toBeCloseTo(0); expect(pos.get('only').y).toBe(0);
  });
  it('without rank info it lays everyone out as one rank', () => {
    const { pos } = spriteRankLayout([fig('a'), fig('b')], null); expect(pos.get('a').rank).toBe(0); expect(pos.get('b').rank).toBe(0);
  });
});

describe('ranks: wide stage (iPad / desktop) fills the stage; phones keep the compact pack', () => {
  const fig = (id, w, h, o = {}) => ({ id, w, h, ...o });
  // spider + 2 cultists + 2 rats in three ranks, as in the iPad screenshot
  const rows = [['spider'], ['c1', 'c2'], ['r1', 'r2']];
  const its = [fig('spider', 4.4, 3.6), fig('c1', 2.2, 3.2), fig('c2', 2.2, 3.2), fig('r1', 1.8, 1.4), fig('r2', 1.8, 1.4)];
  const wide = spriteRankLayout(its, rows, { spread: 1, aspect: 1.3 }).pos, phone = spriteRankLayout(its, rows, { spread: 0, aspect: 0.5 }).pos, none = spriteRankLayout(its, rows).pos;
  it('the front rank stands at the front of the ring and ranks keep a clear depth step', () => {
    expect(wide.get('spider').z).toBeCloseTo(SPR_Z0 - 0.0, 0); expect(wide.get('spider').z).toBeGreaterThanOrEqual(SPR_Z0 - 0.4);
    const z = (id) => wide.get(id).z; expect(z('spider') - z('c1')).toBeGreaterThanOrEqual(SPR_RANK_DZ - 0.5); expect(z('c1') - z('r1')).toBeGreaterThanOrEqual(SPR_RANK_DZ - 0.5);
  });
  it('the back ranks spread sideways instead of hiding behind the front figure', () => {
    const spread = (m, ids) => Math.max(...ids.map((i) => m.get(i).x)) - Math.min(...ids.map((i) => m.get(i).x));
    expect(spread(wide, ['c1', 'c2'])).toBeGreaterThan(spread(phone, ['c1', 'c2']));
    expect(spread(wide, ['r1', 'r2'])).toBeGreaterThan(spread(phone, ['r1', 'r2']));
    const hideSp = (id) => Math.abs(wide.get(id).x - wide.get('spider').x); // cultists stand clear of the spider's centre
    expect(hideSp('c1')).toBeGreaterThan(2); expect(hideSp('c2')).toBeGreaterThan(2);
    const all = [...wide.values()].map((p) => p.x); expect(Math.max(...all) - Math.min(...all)).toBeGreaterThan(8);
  });
  it('without wide-stage options the layout is the compact phone one', () => {
    for (const id of its.map((i) => i.id)) { expect(none.get(id).x).toBeCloseTo(phone.get(id).x, 5); expect(none.get(id).z).toBeCloseTo(phone.get(id).z, 5); }
    const all = [...phone.values()].map((p) => p.x); expect(Math.max(...all) - Math.min(...all)).toBeLessThan(9);
  });
});
