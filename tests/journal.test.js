import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as J from '../src/game/journal.js';
import * as Story from '../src/game/story.js';
import { newGame, enterDungeon } from '../src/game/game.js';

const fresh = () => { const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; return s; };

describe('journal chapters', () => {
  it('no longer caps the log: 500 entries all stay', () => {
    const s = fresh(); for (let i = 0; i < 500; i++) Story.addJournal(s, 'entry ' + i);
    expect(s.journal.length).toBeGreaterThanOrEqual(500); expect(s.journal.some((e) => e.text === 'entry 0')).toBe(true);
    expect(G.deserialize(G.serialize(s)).journal.length).toBe(s.journal.length);
  });
  it('files each entry under the chapter of the current mode and floor', () => {
    const s = fresh(); Story.addJournal(s, 'in town');
    for (let lv = 0; lv < 5; lv++) { enterDungeon(s, lv); Story.addJournal(s, 'down ' + lv); }
    const ch = s.journal.map((e) => e.ch); expect(ch[ch.length - 5]).toBe('b1'); expect(ch.slice(-5)).toEqual(['b1', 'b2', 'b3', 'b4', 'b5']);
    expect(s.journal.find((e) => e.text === 'in town').ch).toBe('town');
    expect(J.chapterOf({ mode: 'town', level: 3 })).toBe('town');
  });
  it('groups newest chapter first, entries newest first, Earlier last', () => {
    const s = { journal: [{ text: 'old', ch: 'earlier' }, { text: 'a', ch: 'town' }, { text: 'b', ch: 'b1' }, { text: 'c', ch: 'b1' }, { text: 'd', ch: 'town' }, { text: 'e', ch: 'b2' }] };
    const g = J.groupJournal(s); expect(g.map((x) => x.id)).toEqual(['b2', 'town', 'b1', 'earlier']);
    expect(g.find((x) => x.id === 'b1').entries.map((e) => e.text)).toEqual(['c', 'b']);
    expect(g[0].label).toMatch(/B2/); expect(J.groupJournal({ journal: [] })).toEqual([]);
  });
  it('migrates old saves: plain strings and chapterless entries are inferred or filed under Earlier, nothing lost', () => {
    const s = fresh(); const raw = JSON.parse(G.serialize(s)); raw.version = 7;
    raw.journal = ['A plain string entry', { t: 1, moon: 0, text: 'Reached B3 and found the kiln.' }, { t: 2, moon: 0, text: 'Odalys Fenn asked for help in Emberhollow.' }, { t: 3, moon: 0, text: 'Something unremarkable.' }, { t: 4, moon: 1, text: 'kept', ch: 'b4' }];
    const d = G.deserialize(JSON.stringify(raw)); expect(d.journal.length).toBe(5);
    expect(d.journal.map((e) => e.ch)).toEqual(['earlier', 'b3', 'town', 'earlier', 'b4']); expect(d.journal[0].text).toBe('A plain string entry');
    expect(G.deserialize(G.serialize(d)).journal).toEqual(d.journal); // idempotent
  });
  it('every chapter has a label and an unknown id falls back to Earlier', () => {
    for (const c of J.CHAPTERS) expect(c.label.length).toBeGreaterThan(3);
    expect(J.chapterLabel('zzz')).toBe('Earlier entries'); expect(J.groupJournal({ journal: [{ text: 'x', ch: 'zzz' }] })[0].id).toBe('earlier');
  });
});
