import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { getLevel, DIRS } from '../src/dungeon/levels.js';
import { ITEMS, tierOf } from '../src/rules/data.js';
import { Combat } from '../src/rules/combat.js';
import { fxSum } from '../src/rules/character.js';

const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; G.enterDungeon(s, 0); return s; };
/** stand next to a cell, facing it, on a floor tile beside it */
function standBeside(s, cell) {
  const [x, y] = cell.split(',').map(Number);
  for (let d = 0; d < 4; d++) { const [dx, dy] = DIRS[d]; const px = x - dx, py = y - dy; const ch = G.tile(s, px, py); if (ch !== '#' && ch !== 'S' && ch !== 'L') { s.x = px; s.y = py; s.dir = d; return [x, y]; } }
  throw new Error('no approach to ' + cell);
}

describe('illusory walls and hidden doors', () => {
  it('walking into an illusory wall passes through, pays XP once and pins it', () => {
    const s = fresh(); const L = getLevel(0); const cell = L.illusions[0]; const [x, y] = standBeside(s, cell);
    expect(G.tile(s, x, y)).toBe('S');
    const ev = G.move(s, 0); expect(ev.some((e) => e.reveal)).toBe(true);
    expect([s.x, s.y]).toEqual([x, y]); expect(G.tile(s, x, y)).toBe('.');
    expect(s.disc[`secret:0:${cell}`]).toBe(1); expect(G.Prog.pinAt(s, x, y).icon).toBe('🚪');
  });
  it('a real hidden door still bumps until found', () => {
    const s = fresh(); const L = getLevel(0); const cell = L.secretCells.find((c) => !L.illusions.includes(c));
    standBeside(s, cell); const ev = G.move(s, 0); expect(ev[0].bump).toBe(true);
  });
  it('safety net: searching beside a flagged wall always finds it; two misses also guarantee it', () => {
    const s = fresh(); const L = getLevel(0); const cell = L.secretCells.find((c) => !L.illusions.includes(c)); const [x, y] = standBeside(s, cell);
    s.suspect[0].push(cell); for (const c of s.party) { c.skills = []; }
    for (let i = 0; i < 5; i++) { G.search(s); if (G.tile(s, x, y) !== 'S') break; }
    expect(G.tile(s, x, y)).toBe('D');
    const s2 = fresh(); standBeside(s2, cell); s2.searchMiss = 2; G.search(s2); expect(G.tile(s2, x, y)).toBe('D');
  });
  it('passive perception flags nearby suspicious walls and counts x/y per floor', () => {
    const s = fresh(); const L = getLevel(0); const cell = L.secretCells.find((c) => !L.illusions.includes(c)); standBeside(s, cell);
    for (const c of s.party) { c.scores.wis = 20; c.skills = ['perception']; }
    const ev = G.enterTile(s); expect(ev.some((e) => e.suspect) || s.suspect[0].includes(cell) || G.tile(s, ...cell.split(',').map(Number)) !== 'S').toBe(true);
    const n = G.Prog.secretCount(s, 0); expect(n.total).toBe(L.secretCells.length); expect(n.found).toBeLessThanOrEqual(n.total);
  });
  it('lore nook: tablet, cache and rare chance once only', () => {
    const s = fresh(); const L = getLevel(0); const n = L.nooks[0]; s.x = n.x; s.y = n.y; const g0 = s.gold;
    const ev = G.enterTile(s); expect(ev.some((e) => e.cls === 'lore')).toBe(true); expect(s.gold).toBeGreaterThan(g0);
    const g1 = s.gold; G.enterTile(s); expect(s.gold).toBe(g1);
  });
});

describe('elites', () => {
  it('step onto a guard starts a tougher fight; it never repeats once slain', () => {
    const s = fresh(); const e = getLevel(0).elites.find((x) => x.kind === 'guard') || getLevel(0).elites[0];
    const p = G.elitePosNow(s, e);
    // approach from a floor neighbour
    const nb = DIRS.map(([dx, dy], d) => [p[0] - dx, p[1] - dy, d]).find(([x, y]) => !'#SL'.includes(G.tile(s, x, y)));
    s.x = nb[0]; s.y = nb[1]; s.dir = nb[2];
    const ev = G.move(s, 0); const c = ev.find((x) => x.combat); expect(c.combat.elite.id).toBe(e.id);
    const cb = new Combat(s.party, c.combat.groups, { elite: c.combat.elite });
    expect(cb.monsters[0].name).toBe(e.title); expect(cb.monsters.every((m) => m.elite)).toBe(true);
    const avg = (el) => { let n = 0; for (let i = 0; i < 40; i++) n += new Combat(s.party, c.combat.groups, el ? { elite: c.combat.elite } : {}).monsters[0].maxHp; return n / 40; };
    expect(avg(true)).toBeGreaterThan(avg(false) * 1.3); // dice vary, so compare averages
    cb.state = 'won'; const after = G.afterCombat(s, cb, c.combat);
    expect(after.some((x) => x.rare)).toBe(true); expect(s.disc[`elite:0:${e.id}`]).toBe(1);
    expect(G.liveElites(s).some((x) => x.id === e.id)).toBe(false);
  });
  it('first sight telegraphs the elite once and pins it', () => {
    const s = fresh(); const e = getLevel(0).elites.find((x) => x.kind === 'guard') || getLevel(0).elites[0]; const p = G.elitePosNow(s, e);
    const d = DIRS.findIndex(([dx, dy]) => ![G.tile(s, p[0] - dx, p[1] - dy), G.tile(s, p[0] - 2 * dx, p[1] - 2 * dy)].some((c) => '#SL'.includes(c)));
    expect(d).toBeGreaterThanOrEqual(0); const [dx, dy] = DIRS[d]; s.x = p[0] - 3 * dx; s.y = p[1] - 3 * dy; s.dir = d;
    if ('#SL'.includes(G.tile(s, s.x, s.y))) { s.x = p[0] - 2 * dx; s.y = p[1] - 2 * dy; }
    const ev = G.move(s, 0); expect(ev.some((x) => x.elite === e.id)).toBe(true);
    expect(G.Prog.pinAt(s, p[0], p[1]).icon).toBe('☠');
    const again = G.move(s, 0); expect(again.some((x) => x.elite === e.id)).toBe(false);
  });
});

describe('rare loot', () => {
  it('elite drops are rare or better, named, and in the inventory', () => {
    const s = fresh(); for (let i = 0; i < 30; i++) { const ev = G.grantRare(s, G.rollTier(i % 5, 'elite'), 'elite'); expect(['rare', 'epic', 'legendary']).toContain(ev[0].rare.tier); expect(s.inventory).toContain(ev[0].rare.key); }
  });
  it('heal-on-kill and bonus elemental damage work in a fight', () => {
    const s = fresh(); const hero = s.party[0]; hero.equip.weapon = { base: 'longsword', magic: 1, key: 'emberbrand' }; hero.equip.ring = 'bloodRing';
    expect(fxSum(hero, 'healOnKill')).toBe(3);
    const cb = new Combat([hero], [{ key: 'giantRat', count: 1 }], {}); const rat = cb.monsters[0]; hero.hp = 3;
    cb.damage(rat, 99, 'fire', hero, { attack: true }); expect(hero.hp).toBe(6);
  });
  it('tier colours exist for every item the game can hand out', () => { for (const k of Object.keys(ITEMS)) expect(['common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(tierOf(k)); });
});

describe('v3 saves', () => {
  it('load as v4: suspect/eliteSeen fields appear, old opened secrets count as found', () => {
    const s = fresh(); const L = getLevel(0); const cell = L.secretCells.find((c) => !L.illusions.includes(c));
    s.mods[0][cell] = 'D'; delete s.suspect; delete s.eliteSeen; delete s.rareFound; s.version = 3;
    const d = G.deserialize(G.serialize(s));
    expect(d.version).toBe(8); expect(d.suspect.length).toBe(5); expect(d.eliteSeen).toEqual({}); expect(d.disc[`secret:0:${cell}`]).toBe(1);
  });
});
