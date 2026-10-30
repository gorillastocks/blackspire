import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as Story from '../src/game/story.js';
import * as CT from '../src/game/camptalk.js';
import * as TV from '../src/game/tavern.js';
import * as RX from '../src/game/reactions.js';
import * as J from '../src/game/journal.js';
import * as DM from '../src/game/dm.js';
import { getLevel } from '../src/dungeon/levels.js';
import { Combat } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';

/** A save taken in the middle of a run: Liora in the party, a chest opened and steps walked on B1, a later chapter on B2, approval, camp talk and Listen In progress. */
function midRun() {
  setRng(seeded(11));
  const s = G.newGame({ name: 'Midrun', cls: 'fighter', race: 'human' }); Story.finishPrologue(s, 'vow'); G.joinLiora(s);
  Story.addJournal(s, 'Harvest night: the town was saved.');
  G.enterDungeon(s, 0);
  for (let i = 0; i < 12; i++) G.move(s, i % 3 === 2 ? 1 : 0);
  let chest = null; for (let y = 0; y < 21 && !chest; y++) for (let x = 0; x < 21; x++) if (G.tile(s, x, y) === 'C') { chest = [x, y]; break; }
  s.x = chest[0]; s.y = chest[1]; G.openChest(s, true);
  Story.addJournal(s, 'B1: the Rat-Warrens gave up a chest.');
  RX.addApproval(s, 'brambur', 2); RX.addApproval(s, 'pip', -1);
  CT.talkWith(s, 'brambur'); CT.newRest(s); CT.talkWith(s, 'fizzwick');
  TV.overhear(s, () => 0.9); TV.overhear(s, () => 0.9);
  s.bossDead[0] = true; s.keys.push('key1'); s.gold = 321; s.inventory.push('antitoxin', 'potionGreater');
  s.pc.buffs.push({ id: 'hush', steps: 40, fights: 0, chests: 0 });
  s.level = 1; s.mode = 'dungeon'; s.x = 3; s.y = 3; s.dir = 2; s.maxDepth = 1; Story.addJournal(s, 'B2: the Grotto is cold.');
  s.mods[1] = { '5,5': 'o' }; s.explored[1] = ['3,3', '3,4'];
  return s;
}
const roundTrip = (s) => G.deserialize(G.serialize(s));
// (loading adds an explicit empty helm slot to old characters; that is the only normalisation a fresh state gets)
const plain = (s) => { const o = JSON.parse(JSON.stringify(s)); for (const c of [...(o.party || []), ...(o.roster || [])]) if (c.equip && c.equip.helm === null) delete c.equip.helm; return o; };

describe('saving partway through a run', () => {
  it('a mid-floor save loads back identical: party, inventory, quests, journal, approval, camp talk, heard rumours, position and floor state', () => {
    const s = midRun(), d = roundTrip(s);
    expect(plain(d)).toEqual(plain(s)); // everything, byte for byte
    expect(d.party.map((c) => [c.name, c.hp, c.maxHp, c.level, c.xp])).toEqual(s.party.map((c) => [c.name, c.hp, c.maxHp, c.level, c.xp]));
    expect(d.party.some((c) => c.companion === 'liora')).toBe(true);
    expect([d.level, d.x, d.y, d.dir, d.mode]).toEqual([1, 3, 3, 2, 'dungeon']);
    expect(d.inventory).toEqual(s.inventory); expect(d.gold).toBe(321); expect(d.keys).toEqual(['key1']);
    expect(d.quests).toEqual(s.quests);
    expect(d.mods).toEqual(s.mods); expect(d.explored).toEqual(s.explored); expect(d.bossDead).toEqual(s.bossDead);
    expect(d.pc.buffs).toEqual(s.pc.buffs);
  });
  it('the Journal keeps every entry in its chapter', () => {
    const d = roundTrip(midRun()); const g = J.groupJournal(d); const ids = g.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['town', 'b1', 'b2']));
    const text = (id) => g.find((c) => c.id === id).entries.map((e) => e.text).join('|');
    expect(text('town')).toMatch(/Harvest night/); expect(text('b1')).toMatch(/Rat-Warrens gave up a chest/); expect(text('b2')).toMatch(/Grotto is cold/);
    expect(d.journal.every((e) => typeof e === 'object' && e.ch)).toBe(true);
  });
  it('companion approval, Camp Talk progress and Listen In heard-state survive, and keep working', () => {
    const s = midRun(), d = roundTrip(s);
    expect(RX.approval(d, 'brambur')).toBe(RX.approval(s, 'brambur')); expect(RX.approval(d, 'pip')).toBe(-1);
    expect(CT.chaptersDone(d, 'brambur')).toBe(1); expect(CT.chaptersDone(d, 'fizzwick')).toBe(1);
    expect(CT.talkedThisRest(d, 'fizzwick')).toBe(true); expect(CT.talkedThisRest(d, 'brambur')).toBe(false); // talked before the rest
    expect(TV.heardCount(d)).toBe(TV.heardCount(s)); expect(d.rumors).toEqual(s.rumors);
    const before = CT.chaptersDone(d, 'brambur'); CT.talkWith(d, 'brambur'); expect(CT.chaptersDone(d, 'brambur')).toBe(before + 1); // the next chapter is next, not a repeat
    const heard = TV.heardCount(d); TV.overhear(d, () => 0.9); expect(TV.heardCount(d)).toBeGreaterThanOrEqual(heard); // a heard rumour is not repeated while fresh ones remain
  });
  it('two saves in a row do not drift (save, load, save is stable)', () => {
    const a = G.serialize(midRun()), b = G.serialize(G.deserialize(a)), c = G.serialize(G.deserialize(b));
    expect(plain(JSON.parse(b))).toEqual(plain(JSON.parse(a))); expect(c).toBe(b);
  });
});

describe('saving in the middle of a battle', () => {
  const info = { groups: [{ key: 'giantRat', count: 3 }] };
  it('the fight itself is never saved: the suspend snapshot is the pre-fight party flagged to resume that fight', () => {
    const s = midRun(); s.mode = 'dungeon';
    const snap = plain(s); snap.resumeCombat = info; // what main.js takeSuspendSnap writes when the app is hidden mid-fight
    const hp0 = s.party.map((c) => c.hp);
    const cb = new Combat(s.party, info.groups, { inventory: s.inventory, canFlee: true, difficulty: 'normal', story: { floor: 1 } });
    for (const m of cb.monsters) m.hp = 1; for (const c of s.party) c.hp = Math.max(1, c.hp - 3); // the live fight moves on, the snapshot must not
    const d = G.deserialize(JSON.stringify(snap));
    expect(d.party.map((c) => c.hp)).toEqual(hp0); expect(d.resumeCombat).toEqual(info);
    expect(d.mode).toBe('dungeon'); expect([d.level, d.x, d.y]).toEqual([1, 3, 3]);
    expect(plain(G.deserialize(G.serialize(d)))).toEqual(plain(d)); // and the flag does not corrupt a later save
  });
  it('a normal (non-suspend) save never carries a resume flag or a combat object', () => {
    const raw = G.serialize(midRun()); expect(raw).not.toMatch(/resumeCombat/); expect(JSON.parse(raw).combat).toBeUndefined();
  });
});

describe('save migration v7 to v8', () => {
  const asV7 = (s) => { const r = plain(s); r.version = 7; delete r.approval; delete r.seen; r.journal = r.journal.map((e) => e.text); return r; };
  it('lifts a v7 save: version 8, approval, told-once DM beats for cleared lairs and held keys, journal entries filed in chapters', () => {
    const s = midRun(); const d = G.deserialize(JSON.stringify(asV7(s)));
    expect(d.version).toBe(8); expect(d.approval).toEqual({}); expect(d.seen).toBeTruthy();
    expect(DM.beatSeen(d, 'lair:0')).toBe(true); expect(DM.beatSeen(d, 'lair:1')).toBe(false); expect(DM.beatSeen(d, 'key:0')).toBe(true);
    expect(d.journal.length).toBe(s.journal.length); expect(d.journal.every((e) => typeof e === 'object' && typeof e.ch === 'string')).toBe(true);
    expect(d.journal.map((e) => e.ch)).toEqual(expect.arrayContaining(['town', 'b1', 'b2']));
  });
  it('keeps everything else a v7 save had: party, gold, inventory, quests, position, camp talk and heard rumours', () => {
    const s = midRun(), d = G.deserialize(JSON.stringify(asV7(s)));
    for (const k of ['gold', 'inventory', 'quests', 'level', 'x', 'y', 'dir', 'mode', 'mods', 'explored', 'bossDead', 'keys', 'talk', 'rumors']) expect(d[k], k).toEqual(s[k]);
    expect(d.party.map((c) => [c.name, c.hp, c.level])).toEqual(s.party.map((c) => [c.name, c.hp, c.level]));
  });
  it('migrating twice changes nothing, and v7 spoon leftovers are removed', () => {
    const r = asV7(midRun()); r.spoons = 5; r.inventory.push('goldSpoon'); r.quests.spoons = 'active';
    const d = G.deserialize(JSON.stringify(r)); expect(d.spoons).toBeUndefined(); expect(d.inventory).toContain('gildedGoblet'); expect(d.inventory).not.toContain('goldSpoon'); expect(d.quests.spoons).toBeUndefined();
    expect(plain(G.deserialize(G.serialize(d)))).toEqual(plain(d));
  });
});

describe('a save keeps its own dungeon layout even after another game was played in the same session', () => {
  const grid = (lvl) => JSON.stringify(getLevel(lvl).grid || getLevel(lvl).map || getLevel(lvl));
  it('random-dungeon save, then a classic game, then load the random one: same floor, same chest tiles', () => {
    setRng(seeded(3));
    const a = G.newGame({ name: 'A', randomDungeons: true }); Story.finishPrologue(a, 'vow'); G.enterDungeon(a, 1); const g1 = grid(1), raw = G.serialize(a);
    const b = G.newGame({ name: 'B' }); Story.finishPrologue(b, 'vow'); G.enterDungeon(b, 1); const g2 = grid(1);
    expect(g2).not.toBe(g1);
    const d = G.deserialize(raw); G.enterDungeon(d, 1); expect(grid(1)).toBe(g1); // loading brings the saved layout back
    G.deserialize(G.serialize(b)); expect(grid(1)).toBe(g2); // and a classic save brings the classic one back
  });
});
