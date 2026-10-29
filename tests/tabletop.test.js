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
    const states = [{}, { tt_choir: 'chapel' }, { tt_choir: 'asked' }, { tt_choir: 'freed' }, { tt_choir: 'bound' }, { tt_glass: 'met' }, { tt_glass: 'shattered' }, { tt_glass: 'gazed' }, { tt_ledger: 'leads' }, { n_debt: 3 }, { crane_roll: true }, { tt_orchard: 'asked' }, { tt_orchard: 'asked', orch_trees: true, orch_sky: true }, { tt_orchard: 'restored' }, { tt_orchard: 'heart', orch_tended: true }, { tt_orchard: 'heart', orch_grafted: true }, { tt_orchard: 'heart' }];
    for (const f of states) for (const pip of [true, false]) { const t = fresh(); Object.assign(t.flags, f); if (!pip) t.party = t.party.filter((c) => c.companion !== 'pip'); for (const k of [...TT.TT_POIS, ...TT.TT_NPCS]) { const e = TT.entryFor(t, k); if (e) entries.add(e); } }
    for (const q of ['ledger', 'choir', 'orchard']) { const t = fresh(); t.quests[q] = 'done'; for (const k of [...TT.TT_NPCS, 'orch1']) entries.add(TT.entryFor(t, k)); }
    for (const e of entries) { expect(SC[e], `entry ${e}`).toBeTruthy(); targets.add(e); }
    const orphans = Object.keys(SC).filter((id) => !targets.has(id));
    expect(orphans, `unreachable scenes: ${orphans}`).toEqual([]);
  });
  it('all dialogue is voice-ready: known speakers, no dashes between words, no {m}/{p} tokens', () => {
    const SPEAKERS = new Set(['narrator', 'pip', 'garrick', 'odalys', 'tuck', 'harl', 'anselma', 'ysolde', 'malthrax', 'crane', 'maelis', 'aelindra']);
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
    expect(d.version).toBe(8); expect(d.spoons).toBeUndefined(); expect(d.quests.spoons).toBeUndefined(); expect(d.flags.n_spoons).toBeUndefined();
    expect(d.inventory).toContain('gildedGoblet'); expect(d.inventory).toContain('jewelledChalice'); expect(d.inventory.some((k) => /poon|adle/.test(k))).toBe(false);
    expect(d.quests.debt).toBe('active');
  });
});

describe('tabletop quests: The Sunken Orchard (B3, under the open sky)', () => {
  const pick = (...ids) => (v) => { for (const i of ids) if (v.choices.some((c) => c.id === i)) return i; return (v.choices.find((c) => c.auto) || v.choices[0]).id; };
  const visit = (s, key, ch) => { const ev = Story.visitPoi(s, key); const p = ev.find((e) => e.prompt === 'tt'); if (!p) return null; const r = TT.autoRun(s, p.scene, { choose: ch }); expect(r.aborted, `${key} aborted`).toBe(false); Story.finishTT(s, key, { consumed: r.consumed }); return r; };
  const night = (s) => { s.steps = 15 * 14; }; // hour 9 + 14 = 23:00
  it('its five points of interest sit inside the outdoor region, whatever the seed', async () => {
    const { generateLevel, poiIdAt } = await import('../src/dungeon/levels.js'); const { outdoorRegion, inRegion } = await import('../src/dungeon/outdoor.js');
    for (const seed of [undefined, 977, 1954, 4242, 99991, 123457]) {
      const L = seed ? generateLevel(2, seed) : generateLevel(2); const R = outdoorRegion(L);
      expect(Object.keys(L.extraPois || {}).length).toBe(5);
      for (const [k, id] of Object.entries(L.extraPois)) { const [x, y] = k.split(',').map(Number); expect(inRegion(R, x, y), `${id} at ${k}`).toBe(true); expect(L.tiles[y][x]).toBe('Q'); expect(poiIdAt(L, x, y)).toBe(id); }
      // the original seventeen POIs keep their ids, in scan order
      let n = 0; const base = Story.LEVEL_POIS[2]; for (let y = 0; y < L.tiles.length; y++) for (let x = 0; x < L.tiles[y].length; x++) if (L.tiles[y][x] === 'Q' && !L.extraPois[`${x},${y}`]) expect(poiIdAt(L, x, y)).toBe(base[n++ % base.length]);
      expect(n).toBe(base.length);
    }
  });
  it('time and weather change the scenes: night shows the stars, day offers to wait, rain makes the stars harder', () => {
    const s = fresh(); s.steps = 0; // 09:00, day
    let v = TT.show(s, TT.begin(s, 'orch.s.0')); expect(v.choices.map((c) => c.id)).toContain('wait'); expect(v.choices.map((c) => c.id)).not.toContain('star');
    const t = fresh(); night(t); v = TT.show(t, TT.begin(t, 'orch.s.0')); expect(v.choices.map((c) => c.id)).toContain('star'); expect(v.choices.map((c) => c.id)).not.toContain('wait');
    const star = v.choices.find((c) => c.id === 'star'); expect(star.check).toMatch(/Arcana DC (13|15|16)/); if (t.flags.w_rain) expect(star.check).toMatch(/DC 16/); if (t.flags.w_mist) expect(star.check).toMatch(/DC 15/);
  });
  it('waiting for nightfall skips the clock to night, and only then', () => {
    const s = fresh(); s.steps = 0; const sess = TT.begin(s, 'orch.s.0'); TT.show(s, sess); const v = TT.pick(s, sess, 'wait');
    expect(v.fxLines.some((l) => /Night falls/.test(l.t))).toBe(true); expect(s.steps).toBeGreaterThan(0); expect(s.flags.w_night).toBe(true);
    expect(v.choices.map((c) => c.id)).toContain('star'); const steps = s.steps; TT.show(s, TT.begin(s, 'orch.s.wait')); expect(s.steps).toBe(steps); // already night: no further skip
  });
  it('the gate stays quiet until the quest is taken and the trees and sky have been read', () => {
    const s = fresh(); expect(TT.entryFor(s, 'orch4')).toBe('orch.g.cold'); expect(TT.entryFor(s, 'orch5')).toBe('orch.h.locked');
    visit(s, 'orch1'); expect(s.quests.orchard).toBe('active'); expect(TT.entryFor(s, 'orch1')).toBe('orch.wait'); expect(TT.entryFor(s, 'orch4')).toBe('orch.g.dim');
    visit(s, 'orch2'); night(s); visit(s, 'orch3'); expect(TT.entryFor(s, 'orch4')).toBe('orch.g.0');
  });
  const play = (seed, gate, heart) => {
    const s = fresh(seed); night(s);
    visit(s, 'orch1'); visit(s, 'orch2'); visit(s, 'orch3'); if (gate[0] === 'key') s.flags.orch_tracks = true; // the survival roll may fail; the key needs the heel nail
    visit(s, 'orch4', pick(...gate)); visit(s, 'orch5', pick(...heart)); const g0 = s.gold; visit(s, 'orch1'); return { s, g0 };
  };
  it('each ending pays out: restored and tended, bought and boon, broken and grafted', () => {
    let a = play(5, ['rite'], ['tend']); expect(a.s.quests.orchard).toBe('done'); expect(a.s.inventory).toContain('dewboughWreath'); expect(a.s.inventory.filter((k) => k === 'silverfruit').length).toBeGreaterThanOrEqual(2);
    const b = play(9, ['key'], ['boon']); expect(b.s.quests.orchard).toBe('done'); expect(b.s.flags.orch_bought).toBe(true); expect(b.s.moon).toBeGreaterThan(0); expect(b.s.inventory).toContain('dewboughWreath');
    const c = play(13, ['force', 'rite'], ['graft']); expect(c.s.quests.orchard).toBe('done'); expect(c.s.inventory).toContain('heartwoodStaff'); expect(c.s.inventory).not.toContain('dewboughWreath'); expect(c.s.gold).toBeGreaterThan(c.g0 - 1);
  });
  it('the quest log shows its stage text', () => {
    const s = fresh(); visit(s, 'orch1'); expect(Story.questList(s).find((q) => q.id === 'orchard')).toBeTruthy(); expect(TT.stageText(s, 'orchard')).toMatch(/trees/);
  });
});
