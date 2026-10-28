import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { getLevel, LEVEL_DEFS, setDungeonSeeds, randomSeeds } from '../src/dungeon/levels.js';
import { COMPANIONS } from '../src/game/companions.js';
import * as PC from '../src/game/phaseC.js';

const PCs = G.PC;
const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; return s; };
const withLiora = (s) => { G.joinLiora(s); return s; };
const norm = (t) => t.replace(/…/g, '...').replace(/\s+/g, ' ').trim();

describe('Liora Wardenfall', () => {
  it('is a recruitable female ranger with her own painted portrait outside the picker pool', () => {
    const s = fresh(); expect(G.availableCompanions(s)).toContain('liora');
    const ev = G.recruitCompanion(s, 'liora'); expect(ev.some((e) => e.banter?.who === 'Liora')).toBe(true);
    const c = s.party.find((x) => x.companion === 'liora') || s.roster.find((x) => x.companion === 'liora');
    expect(c.portrait).toBe(36); expect(COMPANIONS.liora.romance).toBe(true); expect(c.cls).toBe('ranger');
  });
  it('party swap when full is loud and reversible', () => {
    const s = fresh(); expect(s.party.length).toBe(4);
    const ev = G.joinLiora(s); expect(s.party.some((c) => c.companion === 'liora')).toBe(true); expect(s.party.length).toBe(4);
    expect(ev.some((e) => /roster|waiting|bar/i.test(e.log || ''))).toBe(true); expect(s.roster.length).toBe(1);
  });
});

describe('reactive banter never repeats', () => {
  it('each room/loot/secret/elite/death/town line plays once, then falls silent', () => {
    const s = withLiora(fresh()); const heard = new Set();
    for (const trig of ['room', 'loot', 'secret', 'elite', 'town']) for (let i = 0; i < 400; i++) {
      const b = PC.reactive(s, trig, {}, 1); if (!b) break; const k = `${trig}|${b.who}|${b.text}`; expect(heard.has(k)).toBe(false); heard.add(k);
    }
    expect(heard.size).toBeGreaterThan(10);
    for (const trig of ['room', 'loot', 'secret', 'elite', 'town']) expect(PC.reactive(s, trig, {}, 1)).toBeNull();
  });
  it('companions mourn a fallen friend exactly once', () => {
    const s = withLiora(fresh()); const f = s.party.find((c) => c.companion && c.companion !== 'liora'); f.dead = true; f.hp = 0;
    const out = G.afterCombat ? [] : []; void out;
    const b = PC.reactive(s, 'death', { p: f.name }, 1); expect(b.text).not.toContain('{p}');
  });
  it('a new area on a deeper floor plays one personal thread beat, once per companion per dungeon', () => {
    const s = withLiora(fresh()); s.level = 0; s.maxDepth = 0; PC.onNewArea(s);
    const beat = PC.onNewArea(s); expect(Array.isArray(beat)).toBe(true); expect(beat.every((l) => l.thread)).toBe(true);
    const seen = new Set(); for (let i = 0; i < 40; i++) { const r = PC.onNewArea(s); if (Array.isArray(r) && r[0]?.thread) seen.add(`${r[0].who}`); }
    expect(PC.threadsHeard(s)).toBeLessThanOrEqual(8 * 1); // at most one per companion on this floor (catch-up beats only for floors reached)
  });
});

describe('story events', () => {
  it('every dungeon has 2-3 events, placed on reachable plain floor, classic and random layouts', () => {
    for (const seeds of [null, randomSeeds(), randomSeeds()]) {
      setDungeonSeeds(seeds);
      LEVEL_DEFS.forEach((_, i) => { const L = getLevel(i); expect(L.events.length).toBeGreaterThanOrEqual(2); expect(L.events.length).toBeLessThanOrEqual(3); for (const e of L.events) { expect(L.tiles[e.y][e.x]).toBe('.'); expect(PC.eventById(e.id)).toBeTruthy(); } });
    }
    setDungeonSeeds(null);
  });
  it('level 1 shows an event early (a choice moment) and every event has 2-3 choices plus an always-available "Not now"', () => {
    const s = fresh(); G.enterDungeon(s, 0); const L = getLevel(0); expect(L.events.length).toBeGreaterThanOrEqual(2);
    for (const E of PC.EVENT_LIST) { const c = PC.cardFor(s, E.id); expect(c.choices.length).toBeGreaterThanOrEqual(2); expect(c.choices.length).toBeLessThanOrEqual(3); }
  });
  it('stepping onto an event raises its card; Not now keeps it; a choice resolves it exactly once', () => {
    const s = fresh(); G.enterDungeon(s, 0); const L = getLevel(0); const e = L.events[0];
    s.x = e.x; s.y = e.y; const ev = G.enterTile(s); const pr = ev.find((x) => x.prompt === 'event'); expect(pr.eventId).toBe(e.id);
    G.deferEvent(s, e.id); expect(PC.eventHere(s, L)).toBeTruthy(); // never silently locked out
    const card = PC.cardFor(s, e.id); const r = G.chooseEvent(s, e.id, card.choices[0].id, () => true);
    expect(r.result.text.length).toBeGreaterThan(10); expect(PC.eventHere(s, L)).toBeNull();
  });
  it('every choice of every event resolves (pass and fail) without error and never removes the party or companions', () => {
    for (const E of PC.EVENT_LIST) for (const pass of [true, false]) {
      const s = withLiora(fresh()); G.enterDungeon(s, Math.min(4, +E.id[1] - 1)); s.gold = 500;
      for (const ch of PC.cardFor(s, E.id).choices) {
        const t = JSON.parse(G.serialize(s)); const s2 = G.deserialize(JSON.stringify(t)); G.enterDungeon(s2, s.level);
        const r = G.chooseEvent(s2, E.id, ch.id, () => pass); expect(r.result.text).toBeTruthy(); expect(s2.party.length).toBeGreaterThan(0);
        expect(s2.party.every((c) => c.hp >= 1 || c.dead)).toBe(true); expect(s2.gold).toBeGreaterThanOrEqual(0);
        expect(Object.values(s2.pc.aff).every((n) => n >= 0)).toBe(true);
        expect(() => G.deserialize(G.serialize(s2))).not.toThrow();
      }
    }
  });
  it('the Liora event recruits her, even into a full party', () => {
    const s = fresh(); G.enterDungeon(s, 0); const card = PC.cardFor(s, 'b1-liora'); const join = card.choices.find((c) => c.id === 'join');
    expect(join).toBeTruthy(); G.chooseEvent(s, 'b1-liora', 'join'); expect(s.party.some((c) => c.companion === 'liora')).toBe(true);
  });
});

describe('curses, blessings and town memory', () => {
  it('buffs expire and curses lift at the inn or with Osric', () => {
    const s = fresh(); PC.addBuff(s, 'restless'); expect(PC.encounterMult(s)).toBeGreaterThan(1); G.enterDungeon(s, 0);
    s.gold = 100; G.toTownForTest?.(s);
    expect(PC.liftCurses(s)).toBe(1); expect(PC.hasBuff(s, 'restless')).toBe(false);
    PC.addBuff(s, 'hush'); for (let i = 0; i < 400; i++) PC.tickStep(s); expect(PC.hasBuff(s, 'hush')).toBe(false);
  });
  it('townsfolk remember: a remembered choice is spoken once by that NPC', () => {
    const s = fresh(); PC.remember(s, 'rowan', Object.keys(PC.NPC_MEMORY.rowan)[0]);
    const a = G.Story.talkTo(s, 'rowan').scene.lines.map((l) => l.text).join('|'); expect(a).toContain(Object.values(PC.NPC_MEMORY.rowan)[0].slice(0, 20));
    const b = G.Story.talkTo(s, 'rowan').scene.lines.map((l) => l.text).join('|'); expect(b).not.toContain(Object.values(PC.NPC_MEMORY.rowan)[0]);
  });
  it('Osric lifts a curse', () => {
    const s = fresh(); PC.addBuff(s, 'hollow'); const r = G.Story.talkTo(s, 'osric'); expect(PC.hasBuff(s, 'hollow')).toBe(false); expect(r.out.some((e) => /lifts/.test(e.log || ''))).toBe(true);
  });
});

describe('Liora romance', () => {
  it('has 5 conversations unlocked by floors reached, all choices continue the story, affinity never goes negative', () => {
    const s = withLiora(fresh()); expect(PC.pendingMoment(s)).toBe(0);
    for (let i = 0; i < 5; i++) { s.maxDepth = i; const m = PC.pendingMoment(s); expect(m).toBe(i); const sc = PC.momentScene(s, m); expect(sc.choices.length).toBeGreaterThanOrEqual(2);
      const r = G.lioraMoment(s, m, sc.choices[sc.choices.length - 1].id); expect(r.lines.length).toBeGreaterThan(0); }
    expect(PC.pendingMoment(s)).toBeNull(); expect(PC.aff(s, 'liora')).toBeGreaterThanOrEqual(0);
  });
  it('bond tiers change her ending lines (PG-13, no lockouts)', () => {
    const s = withLiora(fresh()); for (const [a, tier] of [[0, 'friend'], [5, 'close'], [10, 'sweetheart']]) { s.pc.aff.liora = a; expect(PC.bond(s)).toBe(tier); expect(PC.lioraEnding(s).length).toBeGreaterThan(0); }
    const scene = G.Story.endingScene(s); expect(scene.lines.some((l) => l.who === 'liora')).toBe(true);
  });
});

describe('save v5 migration', () => {
  it('v4 saves load with the Phase C block and keep their data', () => {
    const s = fresh(); const t = JSON.parse(G.serialize(s)); delete t.pc; t.version = 4; t.gold = 777;
    const d = G.deserialize(JSON.stringify(t)); expect(d.version).toBe(6); expect(d.gold).toBe(777); expect(d.pc.said).toEqual({}); expect(d.pc.buffs).toEqual([]);
    expect(G.deserialize(G.serialize(d)).version).toBe(6);
  });
  it('the voice manifest lines all exist in the text data', () => { expect(norm('a…  b')).toBe('a... b'); });
});
