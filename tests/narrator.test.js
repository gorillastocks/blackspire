import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as DM from '../src/game/dm.js';
import * as TT from '../src/game/tabletop.js';
import { enterDungeon, enterTile, tile, newGame } from '../src/game/game.js';

const fresh = () => { const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; return s; };
const findTile = (s, ch) => { for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (tile(s, x, y) === ch) return [x, y]; return null; };

describe('Dungeon Master read-aloud beats', () => {
  it('every beat is 1 to 3 short sentences, spoken by the dm voice, with no spaced dashes', () => {
    for (const id of DM.BEAT_IDS) {
      const t = DM.BEATS[id]; expect(t.length, id).toBeGreaterThan(20); expect(t.length, id).toBeLessThan(420);
      expect((t.match(/[.!?…](\s|$)/g) || []).length, id).toBeLessThanOrEqual(4);
      expect(/\s[-–—]\s|[–—]/.test(t), `${id} has a dash between words`).toBe(false);
      expect(/grok/i.test(t), id).toBe(false);
    }
    expect(DM.DM_VOICE).toBe('dm');
  });
  it('covers the floors, town, orchard, kiln, both boss lairs and the quest scenes', () => {
    for (const id of ['lair:0', 'lair:1', 'lair:2', 'lair:3', 'lair:4', 'gorvax', 'kiln', 'heartroot', 'start:debt', 'start:ledger', 'start:choir', 'start:glass', 'start:orchard']) expect(DM.BEATS[id], id).toBeTruthy();
    for (const id of Object.values(DM.SCENE_BEATS)) expect(DM.BEATS[id], id).toBeTruthy();
  });
  it('take() gives a beat once per save and records it in s.seen', () => {
    const s = fresh(); expect(DM.beatSeen(s, 'kiln')).toBe(false);
    const a = DM.take(s, 'kiln'); expect(a.who).toBe('dm'); expect(a.text).toBe(DM.BEATS.kiln);
    expect(DM.beatSeen(s, 'kiln')).toBe(true); expect(DM.take(s, 'kiln')).toBeNull();
    expect(DM.take(s, 'no-such-beat')).toBeNull();
  });
  it('beat() is a read-aloud card event: a pre card is not an ambient one, and only fires once', () => {
    const s = fresh();
    const [e] = DM.beat(s, 'lair:0', { pre: true }); expect(e.card && e.dm && e.pre).toBeTruthy(); expect(e.ambient).toBe(false); expect(e.voice).toEqual({ text: DM.BEATS['lair:0'], who: 'dm' });
    expect(DM.beat(s, 'lair:0', { pre: true })).toEqual([]);
    expect(DM.beat(s, 'key:0')[0].ambient).toBe(true);
  });
  it('the boss tile reads the lair first, once per save, then the fight starts', () => {
    const s = fresh(); enterDungeon(s, 0); const [bx, by] = findTile(s, 'B'); s.x = bx; s.y = by;
    const out = enterTile(s); const i = out.findIndex((e) => e.pre && e.dm), c = out.findIndex((e) => e.combat);
    expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(c);
    const again = enterTile(s); expect(again.some((e) => e.pre)).toBe(false); expect(again.some((e) => e.combat)).toBe(true);
  });
  it('floor intros play once per save and persist through serialize/deserialize', () => {
    const s = fresh(); const a = G.Narr.floorIntro(s, 1); expect(a[0].dm).toBe(true); expect(a[0].voice.who).toBe('dm');
    const d = G.deserialize(G.serialize(s)); const b = G.Narr.floorIntro(d, 1);
    expect(b.every((e) => !e.card)).toBe(true); // only a one-line reminder, never the card again
    expect(G.Narr.floorIntro(d, 2)[0].card).toBe(true);
  });
  it('the town square intro is once per save', () => {
    const s = fresh(); expect(G.Narr.townIntro(s)[0].card).toBe(true); expect(G.Narr.townIntro(s)).toEqual([]);
  });
  it('a tabletop scene opens with the DM line the first time and never again', () => {
    const s = fresh(); const sess = TT.begin(s, 'pip.1'); const v = TT.show(s, sess);
    expect(v.lines[0].who).toBe('dm'); expect(v.lines[0].beat).toBe('start:debt');
    const sess2 = TT.begin(s, 'pip.1'); const v2 = TT.show(s, sess2); expect(v2.lines.some((l) => l.who === 'dm')).toBe(false);
  });
  it('v7 saves migrate to v8: lairs already beaten and keys already held are marked told', () => {
    const s = fresh(); const raw = JSON.parse(G.serialize(s)); raw.version = 7; delete raw.approval; raw.bossDead = [true, false, false, false, false];
    const d = G.deserialize(JSON.stringify(raw)); expect(d.version).toBe(8); expect(d.approval).toEqual({});
    expect(DM.beatSeen(d, 'lair:0')).toBe(true); expect(DM.beatSeen(d, 'lair:1')).toBe(false);
    expect(G.deserialize(G.serialize(d)).seen).toEqual(d.seen); // idempotent
  });
});
