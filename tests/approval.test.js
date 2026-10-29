import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as RX from '../src/game/reactions.js';
import * as Story from '../src/game/story.js';
import * as TT from '../src/game/tabletop.js';
import { newGame } from '../src/game/game.js';

const fresh = () => { const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; return s; };
const withComp = (s, ...keys) => { for (const k of keys) { const c = s.party[s.party.length - 1]; c.companion = k; c.name = k; s.party.push({ ...c }); s.party.pop(); } return s; };
const party = (keys) => { const s = fresh(); s.party = keys.map((k) => ({ name: k, companion: k, hp: 10, maxHp: 10, dead: false })); return s; };

describe('companion approval and reactions', () => {
  it('has a reaction row for every approve/object/joke, only for known companions, with no dashes between words', () => {
    for (const [id, E] of Object.entries(RX.EVENTS)) for (const [k, row] of Object.entries(E.lines)) {
      expect(RX.COMP_KEYS, id).toContain(k); expect(['approve', 'object', 'joke'].includes({ approve: 'approve', object: 'object', joke: 'joke' }[row[0]]), id).toBe(true);
      expect(/\s[-–—]\s|[–—]/.test(row[1]), `${id}/${k}`).toBe(false); expect(/grok/i.test(row[1])).toBe(false);
    }
    expect(RX.allLines().length).toBeGreaterThan(80);
  });
  it('wires every required choice point to a reaction event', () => {
    for (const id of ['g.venge', 'g.mercy', 'orch.h.tend', 'orch.h.graft', 'glass.k.shatter', 'glass.k.gaze', 'choir.p.free', 'choir.p.bind', 'led.law', 'led.deal', 'led.run', 'led.squeeze', 'story.vow', 'story.grim', 'story.collapse']) { expect(RX.isEvent(id), id).toBe(true); }
    const tt = Object.keys(RX.EVENTS).filter((id) => !id.startsWith('story.'));
    for (const id of tt) expect(TT.TT_SCENES[id], `scene ${id} exists`).toBeTruthy();
  });
  it('approve +1, object -1, one point at most per companion per event, clamped', () => {
    const s = party(['pip', 'liora']); const r = RX.react(s, 'g.venge');
    expect(r.lines.find((l) => l.who === 'pip').react).toBe('approve'); expect(RX.approval(s, 'pip')).toBe(1);
    expect(r.lines.find((l) => l.who === 'liora').react).toBe('object'); expect(RX.approval(s, 'liora')).toBe(-1);
    for (let i = 0; i < 40; i++) RX.addApproval(s, 'pip', 1); expect(RX.approval(s, 'pip')).toBe(RX.APPROVAL_MAX);
    for (let i = 0; i < 40; i++) RX.addApproval(s, 'pip', -1); expect(RX.approval(s, 'pip')).toBe(RX.APPROVAL_MIN);
  });
  it('reacts once per event per save; absent companions are silent and unchanged', () => {
    const s = party(['pip']); expect(RX.react(s, 'g.venge').lines.length).toBeGreaterThan(0);
    expect(RX.react(s, 'g.venge').lines).toEqual([]); expect(RX.approval(s, 'pip')).toBe(1);
    expect(RX.approval(s, 'liora')).toBe(0); expect(RX.react(s, 'no.such.event')).toEqual({ lines: [], fx: [] });
  });
  it('dead companions do not react', () => {
    const s = party(['pip', 'liora']); s.party[0].dead = true; const r = RX.react(s, 'g.venge');
    expect(r.lines.some((l) => l.who === 'pip')).toBe(false); expect(RX.approval(s, 'pip')).toBe(0);
  });
  it('crossing the warm threshold adds exactly one bonus line, once', () => {
    const s = party(['pip']); RX.addApproval(s, 'pip', RX.WARM_AT - 1);
    const r = RX.react(s, 'g.venge'); const b = r.lines.filter((l) => l.bonus); expect(b.length).toBe(1); expect(b[0].text).toBe(RX.BONUS.warm.pip);
    const r2 = RX.react(s, 'g.snap'); expect(r2.lines.some((l) => l.bonus)).toBe(false);
  });
  it('labels and icons follow the value', () => {
    expect(RX.approvalLabel(0)).toBe('Neutral'); expect(RX.approvalLabel(RX.WARM_AT)).toBe('Fond'); expect(RX.approvalLabel(RX.COLD_AT)).toBe('Cold'); expect(RX.approvalLabel(7)).toBe('Devoted');
    expect(RX.approvalIcon(7)).not.toBe(RX.approvalIcon(-4));
  });
  it('a tabletop choice that leads to a reaction scene shows the lines and notes in its view', () => {
    const s = party(['pip', 'liora']); const sess = TT.begin(s, 'g.venge'); const v = TT.show(s, sess);
    expect(v.reactions.length).toBeGreaterThan(0); expect(v.lines.some((l) => l.react)).toBe(true); expect(v.fxLines.some((t) => /approves|disapproves/.test(JSON.stringify(t)))).toBe(true);
  });
  it('the prologue vow and grim choices react in the dungeon view', () => {
    const s = party(['brambur', 'zizzy']); s.flags.prologue = false; const out = Story.finishPrologue(s, 'grim');
    expect(out.some((e) => e.react && e.banter?.length)).toBe(true); expect(RX.approval(s, 'zizzy')).toBe(1); expect(RX.approval(s, 'brambur')).toBe(-1);
  });
  it('approval survives a save round trip and a fresh save has none', () => {
    const s = party(['pip']); RX.react(s, 'g.venge'); const d = G.deserialize(G.serialize(s)); expect(RX.approval(d, 'pip')).toBe(1);
    expect(RX.approval(fresh(), 'pip')).toBe(0); expect(G.deserialize(G.serialize(fresh())).approval).toEqual({});
  });
});
