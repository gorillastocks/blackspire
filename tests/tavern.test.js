import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as Tavern from '../src/game/tavern.js';
import { speaker } from '../src/game/story.js';
import { readFileSync } from 'node:fs';

const cast = JSON.parse(readFileSync(new URL('../src/voices/cast.json', import.meta.url), 'utf8'));
const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; s.party = [{ name: 'Brambur', companion: 'brambur', cls: 'cleric', hp: 10, maxHp: 10, dead: false }]; return s; };
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const ids = (s) => Tavern.eligible(s).map((r) => r.id);

describe('Listen In: tavern patrons', () => {
  it('has 4 to 6 named patrons, each with a distinct voice that is not shared with any other speaker', () => {
    const keys = Object.keys(Tavern.PATRONS); expect(keys.length).toBeGreaterThanOrEqual(4); expect(keys.length).toBeLessThanOrEqual(6);
    const voices = keys.map((k) => cast[k]?.id); expect(voices.every(Boolean)).toBe(true); expect(new Set(voices).size).toBe(keys.length);
    const others = new Set(Object.entries(cast).filter(([k]) => !keys.includes(k)).map(([, v]) => v.id)); for (const v of voices) expect(others.has(v)).toBe(false);
    for (const k of keys) { expect(speaker(k).name).toBe(Tavern.PATRONS[k].name); }
  });
  it('has 60 to 90 voiced lines, none with dashes between words, none saying the banned word, every speaker a patron', () => {
    const L = Tavern.allLines(); expect(L.length).toBeGreaterThanOrEqual(60); expect(L.length).toBeLessThanOrEqual(90);
    for (const [who, t] of L) { expect(Tavern.PATRONS[who], who).toBeTruthy(); expect(/[-–—]/.test(t), t).toBe(false); expect(/grok/i.test(t)).toBe(false); }
    for (const r of Tavern.RUMORS) { expect(r.lines.length).toBeGreaterThanOrEqual(1); expect(r.lines.length).toBeLessThanOrEqual(3); }
    expect(new Set(Tavern.RUMORS.map((r) => r.id)).size).toBe(Tavern.RUMORS.length);
  });
  it('picks by game state: hints for quests not started, tips for the frontier floor, no Pip rumour without Pip', () => {
    const s = fresh(); const e = ids(s);
    expect(e).toContain('h.ledger0'); expect(e).toContain('h.choir0'); expect(e).toContain('t.b1'); expect(e).not.toContain('h.debt'); expect(e).not.toContain('r.venge');
    expect(e).not.toContain('h.glass'); // the kiln is not news until the party is near B3
    s.quests.ledger = 'active'; expect(ids(s)).toContain('h.ledger1'); expect(ids(s)).not.toContain('h.ledger0');
    s.quests.ledger = 'done'; expect(ids(s)).not.toContain('h.ledger1');
    s.party.push({ name: 'Pip', companion: 'pip', hp: 9, maxHp: 9, dead: false }); s.quests.debt = 'active'; expect(ids(s)).toContain('h.debt');
  });
  it('warns about the next boss: healer-less parties get the B2 healer warning, Glasshide, Brakk and Malthrax weaknesses follow the frontier', () => {
    const s = fresh(); s.bossDead[0] = true;
    expect(ids(s)).toContain('t.b2h'); s.party = [{ name: 'Hero', cls: 'fighter', hp: 10, maxHp: 10, dead: false }]; expect(ids(s)).toContain('t.b2n'); expect(ids(s)).not.toContain('t.b2h');
    s.bossDead[1] = true; expect(ids(s)).toContain('t.b3a'); expect(Tavern.RUMORS.find((r) => r.id === 't.b3a').lines[0][1]).toMatch(/Thunder/);
    s.bossDead[2] = true; expect(ids(s)).toContain('t.b4a'); s.bossDead[3] = true; expect(ids(s)).toContain('t.b5a'); expect(ids(s)).toContain('t.b5b');
    s.flags.weakPoint = true; expect(ids(s)).not.toContain('t.b5b');
  });
  it('reacts to what the party did: Pip vengeance or mercy, Choir, Mirror, ledger, orchard, bosses, moons', () => {
    const s = fresh(); const seen = (id) => { (s.seen ||= {})['rx:' + id] = 1; };
    seen('g.venge'); seen('choir.p.free'); seen('glass.k.gaze'); seen('led.run'); seen('orch.g.broken'); s.bossDead[0] = true; s.moon = 3;
    const e = ids(s); for (const id of ['r.venge', 'r.freed', 'r.gaze', 'r.ledgerB', 'r.orchBad', 'r.boss0', 'r.moon3']) expect(e).toContain(id);
    for (const id of ['r.mercy', 'r.bound', 'r.shatter', 'r.ledgerA', 'r.orchGood', 'r.boss1', 'r.moon1']) expect(e).not.toContain(id);
  });
  it('plays unheard reactions first, never repeats a rumour until every relevant one is heard, then cycles', () => {
    const s = fresh(); (s.seen ||= {})['rx:g.mercy'] = 1;
    const first = Tavern.overhear(s, () => 0); expect(first.rumor.kind).toBe('react'); expect(first.first).toBe(true);
    const n = Tavern.eligible(s).length; const got = [first.rumor.id];
    for (let i = 1; i < n; i++) got.push(Tavern.overhear(s, () => Math.random()).rumor.id);
    expect(new Set(got).size).toBe(n); // every eligible rumour exactly once before any repeat
    const prio = got.map((id) => Tavern.RUMORS.find((r) => r.id === id).pri); expect(prio).toEqual([...prio].sort((a, b) => b - a));
    const again = Tavern.overhear(s, () => 0); expect(again.first).toBe(false); expect(Tavern.heardCount(s)).toBe(n);
  });
  it('files quest hints in the Journal once, and tavern lines are logged for the game log', () => {
    const s = fresh(); const before = s.journal.length;
    const r = G.listenIn(s, seq([0.9, 0])); expect(r.kind).toBe('rumor'); expect(r.logs[0]).toMatch(/^🗣 Overheard, /);
    if (r.rumor.jr) { expect(s.journal.length).toBe(before + 1); expect(s.journal.at(-1).text).toBe(r.rumor.jr); }
    const s2 = fresh(); const h = Tavern.RUMORS.find((x) => x.id === 'h.ledger0');
    Tavern.overhear(s2, () => 0, (st, t) => G.Story.addJournal(st, t)); // hints outrank tips and chatter
    expect(s2.journal.some((j) => /Odalys/.test(j.text) || /Rumour/.test(j.text))).toBe(true); expect(h.jr).toMatch(/Odalys/);
  });
  it('about one tap in four is party banter, only when a companion is present', () => {
    const s = fresh(); let b = 0; for (let i = 0; i < 400; i++) if (G.listenIn(s, () => (i % 4 === 0 ? 0.1 : 0.9)).kind === 'banter') b++;
    expect(b).toBe(100);
    s.party = [{ name: 'Hero', cls: 'fighter', hp: 10, maxHp: 10, dead: false }]; expect(G.listenIn(s, () => 0.1).kind).toBe('rumor');
  });
  it('survives a save round trip with its heard list', () => {
    const s = fresh(); Tavern.overhear(s, () => 0); const d = G.deserialize(G.serialize(s)); expect(Tavern.heardCount(d)).toBe(1);
  });
});
