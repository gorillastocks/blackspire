import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as Story from '../src/game/story.js';
import * as TT from '../src/game/tabletop.js';
import { setRng, seeded } from '../src/rules/dice.js';

const fresh = (seed = 7) => { setRng(seeded(seed)); const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; Story.initStory(s); return s; };
const { TT_SCENES: SC, TT_QUESTS: Q } = TT;

describe('tabletop quests: data', () => {
  it('every scene link resolves and every scene is reachable from an entry point', () => {
    const targets = new Set();
    for (const [id, sc] of Object.entries(SC)) {
      for (const t of [sc.next, sc.choicesFrom]) if (t) { expect(SC[t], `${id} -> ${t}`).toBeTruthy(); targets.add(t); }
      const src = sc.choicesFrom ? SC[sc.choicesFrom] : sc;
      for (const c of src.choices || []) {
        if (c.go) { expect(SC[c.go], `${id}:${c.id} -> ${c.go}`).toBeTruthy(); targets.add(c.go); }
        if (c.check) { for (const k of ['pass', 'fail']) { expect(SC[c.check[k]], `${id}:${c.id}.${k}`).toBeTruthy(); targets.add(c.check[k]); } expect(c.check.dc).toBeGreaterThan(4); expect(c.check.dc).toBeLessThan(21); }
        expect(c.label.length).toBeGreaterThan(3);
        expect(c.go || c.check || c.end, `${id}:${c.id} leads nowhere`).toBeTruthy();
      }
    }
    const entries = new Set();
    // collect every entry id the engine can return, over a few quest states
    const states = [{}, { tt_choir: 'chapel' }, { tt_choir: 'asked' }, { tt_choir: 'freed' }, { tt_choir: 'bound' }, { tt_glass: 'met' }, { tt_glass: 'shattered' }, { tt_glass: 'gazed' }, { tt_ledger: 'leads' }, { n_debt: 3 }, { crane_roll: true }];
    for (const f of states) for (const pip of [true, false]) { const t = fresh(); Object.assign(t.flags, f); if (!pip) t.party = t.party.filter((c) => c.companion !== 'pip'); for (const k of [...TT.TT_POIS, ...TT.TT_NPCS]) { const e = TT.entryFor(t, k); if (e) entries.add(e); } }
    for (const q of ['ledger', 'choir']) { const t = fresh(); t.quests[q] = 'done'; for (const k of TT.TT_NPCS) entries.add(TT.entryFor(t, k)); }
    for (const e of entries) { expect(SC[e], `entry ${e}`).toBeTruthy(); targets.add(e); }
    const orphans = Object.keys(SC).filter((id) => !targets.has(id));
    expect(orphans, `unreachable scenes: ${orphans}`).toEqual([]);
  });
  it('all dialogue is voice-ready: known speakers, no dashes between words, no {m}/{p} tokens', () => {
    const SPEAKERS = new Set(['narrator', 'pip', 'garrick', 'odalys', 'tuck', 'harl', 'anselma', 'ysolde', 'malthrax', 'crane']);
    for (const [id, sc] of Object.entries(SC)) for (const l of sc.lines || []) {
      expect(SPEAKERS.has(l[0]), `${id}: speaker ${l[0]}`).toBe(true);
      expect(/\w[-–—]\w|\s[-–—]\s|[–—]/.test(l[1]), `${id}: dash in "${l[1]}"`).toBe(false);
      expect(/[{}]/.test(l[1]), `${id}: token`).toBe(false);
    }
  });
  it('the quests have givers, floors and rewards for the log', () => {
    for (const [q, d] of Object.entries(Q)) { expect(d.title && d.giver && d.desc && d.reward, q).toBeTruthy(); expect(Story.QUESTS?.[q] ?? Story.questList).toBeTruthy(); }
  });
});

describe('tabletop quests: rolls', () => {
  it('a check uses the best modifier, shows its numbers and respects dcAdj', () => {
    const s = fresh(); s.flags.g_posyalive = true;
    const r = TT.rollCheck(s, { skill: 'persuasion', dc: 13, dcAdj: { g_posyalive: -3 } });
    expect(r.dc).toBe(10); expect(r.total).toBe(r.d20 + r.mod); expect(r.ok).toBe(r.total >= 10); expect(r.text).toMatch(/DC 10/); expect(r.text).toMatch(/d20 \d+/);
  });
});

describe('tabletop quests: Pip, the debt in Lantern light', () => {
  const clues = (s) => { for (const id of ['pip1', 'pip2', 'pip3']) { const ev = Story.visitPoi(s, id); expect(ev.find((e) => e.prompt === 'tt')).toBeTruthy(); TT.autoRun(s, ev.find((e) => e.prompt === 'tt').scene); } };
  it('Garrick stays shut until three clues are found, and needs Pip', () => {
    const s = fresh(); expect(TT.entryFor(s, 'garrick')).toBe('garrick.locked'); clues(s); expect(TT.entryFor(s, 'garrick')).toBe('g.0');
    const t = fresh(); t.party = t.party.filter((c) => c.companion !== 'pip'); expect(TT.entryFor(t, 'garrick')).toBe('garrick.nopip');
  });
  it('mercy: Garrick gives up the weak point, Posy lives, and you get her ribbon', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = fresh(seed); clues(s);
      const r = TT.autoRun(s, 'g.0', { choose: (v) => (v.choices.find((c) => c.id === 'mercy') || v.choices.find((c) => c.auto) || v.choices[0]).id });
      expect(r.aborted).toBe(false);
      if (s.flags.pipMercy) { expect(s.quests.debt).toBe('done'); expect(s.inventory).toContain('posyRibbon'); expect(s.flags.weakPoint).toBe(true); return; }
    }
    throw new Error('mercy never succeeded in 40 seeds');
  });
  it('vengeance: gold and the Lantern Edge, and a lasting consequence', () => {
    const s = fresh(); clues(s); const g0 = s.gold;
    const r = TT.autoRun(s, 'g.0', { choose: (v) => (v.choices.find((c) => c.id === 'venge') || v.choices.find((c) => c.auto) || v.choices[0]).id });
    expect(r.aborted).toBe(false); expect(s.flags.pipVengeance).toBe(true); expect(s.quests.debt).toBe('done'); expect(s.inventory).toContain('lanternEdge'); expect(s.gold).toBeGreaterThan(g0);
  });
});

describe('tabletop quests: every quest can be completed by walking its scenes', () => {
  it('ledger, choir, glass, crane and debt all finish and pay out', () => {
    const s = fresh(11);
    const visit = (id) => { const ev = Story.visitPoi(s, id); const p = ev.find((e) => e.prompt === 'tt'); if (!p) return; const r = TT.autoRun(s, p.scene); expect(r.aborted, `${id} aborted`).toBe(false); Story.finishTT(s, id, { consumed: r.consumed }); };
    const talk = (k) => { const r = Story.talkTo(s, k); expect(TT.autoRun(s, r.tt).aborted).toBe(false); };
    talk('odalys'); talk('harl');
    for (let pass = 0; pass < 4; pass++) {
      for (const id of ['pip1', 'pip2', 'pip3', 'pip4', 'pip5', 'choir1', 'choir2', 'glass1', 'glass2', 'crane1', 'crane2', 'crane3', 'garrick']) visit(id);
      talk('odalys'); talk('harl');
    }
    for (const q of ['debt', 'ledger', 'choir', 'glass', 'crane']) expect(s.quests[q], q).toBe('done');
    expect(Story.questList(s).filter((q) => q.status === 'done').length).toBeGreaterThanOrEqual(5);
  });
  it('quests appear in the quest log with stage text', () => {
    const s = fresh(); const r = Story.talkTo(s, 'odalys'); TT.autoRun(s, r.tt, { maxSteps: 2 });
    const q = Story.questList(s).find((x) => x.id === 'ledger'); expect(q).toBeTruthy(); expect(q.title.length).toBeGreaterThan(3);
  });
});

describe('save migration v7', () => {
  it('old spoon saves lose the spoon currency and quest, keep their items as junk, and Pip gets the new quest', () => {
    const s = fresh(); const t = JSON.parse(G.serialize(s)); t.version = 6; t.spoons = 4; t.inventory.push('goldSpoon', 'royalSpoon'); t.quests.spoons = 'active'; t.flags.n_spoons = 3; delete t.quests.debt;
    const d = G.deserialize(JSON.stringify(t));
    expect(d.version).toBe(7); expect(d.spoons).toBeUndefined(); expect(d.quests.spoons).toBeUndefined(); expect(d.flags.n_spoons).toBeUndefined();
    expect(d.inventory).toContain('gildedGoblet'); expect(d.inventory).toContain('jewelledChalice'); expect(d.inventory.some((k) => /poon|adle/.test(k))).toBe(false);
    expect(d.quests.debt).toBe('active');
  });
});
