import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as CT from '../src/game/camptalk.js';
import * as RX from '../src/game/reactions.js';
import { COMPANIONS } from '../src/game/companions.js';

const KEYS = ['brambur', 'fizzwick', 'pip', 'grumsh', 'zizzy', 'vexrath', 'nettle'];
const mk = (keys, extra = {}) => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; s.party = keys.map((k) => ({ name: COMPANIONS[k].short, companion: k, cls: COMPANIONS[k].cls, level: 1, hp: 20, maxHp: 20, tempHp: 0, dead: false, slots: [], maxSlots: [], conditions: {}, ...extra })); return s; };

describe('camp Talk: heart to hearts', () => {
  it('gives every companion but Liora 3 to 4 chapters of 2 to 4 voiced lines, a quest nudge, no dashes and no banned word', () => {
    for (const k of KEYS) { const ch = CT.CHAPTERS[k]; expect(ch.length, k).toBeGreaterThanOrEqual(3); expect(ch.length).toBeLessThanOrEqual(4); for (const c of ch) { expect(c.lines.length, `${k} ${c.title}`).toBeGreaterThanOrEqual(2); expect(c.lines.length).toBeLessThanOrEqual(4); } expect(CT.QUEST_HINTS[k]).toBeTruthy(); expect(CT.COMPANION_QUEST[k]).toBeTruthy(); }
    for (const [who, t] of CT.allLines()) { expect(COMPANIONS[who], who).toBeTruthy(); expect(/[-–—]/.test(t), t).toBe(false); expect(/grok/i.test(t)).toBe(false); }
  });
  it('keeps Pip female in her chapters', () => { const all = CT.CHAPTERS.pip.flatMap((c) => c.lines).concat(Object.values(CT.FLOOR_TIPS).map((r) => r.pip || '')).join(' '); expect(/\bhe\b.*Pip|Pip.*\bhis\b/.test(all)).toBe(false); expect(COMPANIONS.pip.blurb).toMatch(/\bthief\b/); });
  it('plays chapter one at once, starts the companion quest, adds +1 approval and a Journal entry, and logs the camp bonus', () => {
    const s = mk(['brambur']); expect(s.quests.hammer).toBeUndefined();
    const before = RX.approval(s, 'brambur'), j = s.journal.length;
    const r = CT.talkWith(s, 'brambur');
    expect(r.kind).toBe('chapter'); expect(r.lines.length).toBeGreaterThanOrEqual(2); expect(r.lines.every((l) => l.who === 'brambur')).toBe(true);
    expect(s.quests.hammer).toBe('active'); expect(RX.approval(s, 'brambur')).toBe(before + 1);
    expect(s.journal.length).toBeGreaterThan(j); expect(s.journal.some((e) => /Bond, Brambur, chapter 1/.test(e.text))).toBe(true);
    expect(CT.bondLog(s, 'brambur')).toEqual(["1. Mum's Hammer"]);
    expect(r.fx.some((f) => /Camp bonus from Brambur/.test(f.t))).toBe(true); expect(r.logs.length).toBe(r.fx.length);
  });
  it('allows one talk per companion per rest, and everyone again after a rest', () => {
    const s = mk(['brambur', 'pip']); expect(CT.talkWith(s, 'brambur').kind).toBe('chapter');
    expect(CT.talkWith(s, 'brambur').kind).toBe('used'); expect(CT.chaptersDone(s, 'brambur')).toBe(1);
    expect(CT.talkWith(s, 'pip').kind).toBe('chapter'); // another companion is not blocked
    CT.newRest(s); expect(CT.talkedThisRest(s, 'brambur')).toBe(false); expect(CT.talkWith(s, 'brambur').kind).not.toBe('used');
    const s2 = mk(['zizzy']); s2.flags.freeInn = true; s2.gold = 50; CT.talkWith(s2, 'zizzy'); expect(CT.talkedThisRest(s2, 'zizzy')).toBe(true);
    G.innRest(s2); expect(CT.talkedThisRest(s2, 'zizzy')).toBe(false); // the inn counts as a rest
  });
  it('gates later chapters by approval and floor', () => {
    const s = mk(['pip']); CT.talkWith(s, 'pip'); CT.newRest(s);
    expect(CT.nextChapter(s, 'pip')).toBeNull(); // chapter two needs approval 1 (met by chapter one) and B2
    s.maxDepth = 1; expect(CT.nextChapter(s, 'pip')?.n).toBe(2); RX.addApproval(s, 'pip', -3); expect(CT.nextChapter(s, 'pip')).toBeNull();
    RX.addApproval(s, 'pip', 5); expect(CT.nextChapter(s, 'pip')?.n).toBe(2);
    CT.talkWith(s, 'pip'); CT.newRest(s); expect(CT.nextChapter(s, 'pip')).toBeNull(); s.maxDepth = 2; expect(CT.nextChapter(s, 'pip')?.n).toBe(3);
    const r = CT.roster(s).find((x) => x.k === 'pip'); expect(r.fresh).toBe(true);
  });
  it('walks every companion through all chapters when approval and depth allow, +1 approval each, capped at the maximum', () => {
    for (const k of KEYS) {
      const s = mk([k]); s.maxDepth = 4; RX.addApproval(s, k, 3); const n = CT.chapterCount(k); let a = RX.approval(s, k);
      for (let i = 0; i < n; i++) { const r = CT.talkWith(s, k); expect(r.kind, `${k} ${i}`).toBe('chapter'); expect(r.chapter).toBe(i + 1); expect(RX.approval(s, k)).toBeGreaterThanOrEqual(Math.min(a + 1, 8)); a = RX.approval(s, k); CT.newRest(s); }
      expect(CT.nextChapter(s, k)).toBeNull(); expect(CT.roster(s)[0].fresh).toBe(false);
    }
  });
  it('gives a floor tip plus a quest nudge when no chapter is ready, and starts a quest that has not begun', () => {
    const s = mk(['zizzy']); s.maxDepth = 3; s.level = 3; s.mode = 'dungeon'; s.done = null; CT.talkWith(s, 'zizzy'); CT.newRest(s);
    const t = CT.talkWith(s, 'zizzy'); expect(t.kind).toBe('chapter'); // chapters first
    for (let i = 0; i < 6; i++) { CT.newRest(s); CT.talkWith(s, 'zizzy'); }
    CT.newRest(s); const tip = CT.talkWith(s, 'zizzy'); expect(tip.kind).toBe('tip');
    expect(tip.lines[0].text).toBe(CT.FLOOR_TIPS[3].zizzy); expect(tip.lines.at(-1).text).toBe(CT.QUEST_HINTS.zizzy);
    s.quests.powder = 'done'; CT.newRest(s); const t2 = CT.talkWith(s, 'zizzy'); expect(t2.lines.length).toBe(1);
    const s2 = mk(['nettle']); s2.maxDepth = 0; s2.talk = { rest: 0, used: {}, done: { nettle: 4 }, tips: {}, bonus: -1 }; const g = CT.talkWith(s2, 'nettle'); expect(g.kind).toBe('tip'); expect(s2.quests.tale).toBe('active');
    const s3 = mk(['grumsh']); s3.talk = { rest: 0, used: {}, done: { grumsh: 4 }, tips: {}, bonus: -1 }; expect(CT.talkWith(s3, 'grumsh').lines[0].text).toBe(CT.GENERAL_TIPS.grumsh);
  });
  it('grants one camp bonus per rest by approval: initiative, temporary HP, then a spell slot', () => {
    const s = mk(['brambur', 'pip'], { slots: [1, 0], maxSlots: [2, 1] }); // friendly
    RX.addApproval(s, 'brambur', 1); let r = CT.talkWith(s, 'brambur'); expect(s.flags.campInit).toBe(1); expect(r.fx.some((f) => /initiative/.test(f.t))).toBe(true);
    const p = CT.talkWith(s, 'pip'); expect(p.fx.some((f) => /already claimed/.test(f.t))).toBe(true); expect(s.flags.campInit).toBe(1);
    CT.newRest(s); delete s.flags.campInit; RX.addApproval(s, 'pip', 3); // fond (4)
    r = CT.talkWith(s, 'pip'); expect(s.party.every((c) => c.tempHp === 4)).toBe(true); expect(RX.approval(s, 'pip')).toBe(4);
    CT.newRest(s); RX.addApproval(s, 'brambur', 5); // devoted
    r = CT.talkWith(s, 'brambur'); expect(s.party[0].slots[0] + s.party[0].slots[1]).toBe(2); expect(r.fx.some((f) => /spell slot/.test(f.t))).toBe(true);
    const cold = mk(['pip']); RX.addApproval(cold, 'pip', -4); expect(CT.talkWith(cold, 'pip').fx.some((f) => /Camp bonus/.test(f.t))).toBe(false);
  });
  it('the initiative bonus feeds the next fight once and is then spent', () => {
    const s = mk(['brambur']); s.flags.campInit = 1; expect(G.combatOpts(s, {}).initBonus).toBeGreaterThanOrEqual(1);
    G.afterCombat(s, { state: 'fled', monsters: [], xp: 0, gold: 0, events: [] }, {}); expect(s.flags.campInit).toBeUndefined();
  });
  it('marks companions with something new, keeps Liora\'s pending moment working, and round trips the save', () => {
    const s = mk(['brambur']); G.joinLiora(s); expect(G.talkRoster(s).some((r) => r.fresh)).toBe(true);
    const pend = G.PC.pendingMoment(s); const lr = G.talkRoster(s).find((r) => r.k === 'liora');
    if (pend != null) { expect(lr.fresh).toBe(true); const t = G.talkWith(s, 'liora'); expect(t.kind).toBe('moment'); expect(t.scene.lines.length).toBeGreaterThan(0); expect(CT.talkedThisRest(s, 'liora')).toBe(false); }
    CT.talkWith(s, 'brambur'); const d = G.deserialize(G.serialize(s)); expect(CT.chaptersDone(d, 'brambur')).toBe(1); expect(CT.talkedThisRest(d, 'brambur')).toBe(true);
    expect(G.talkRoster(s).find((r) => r.k === 'brambur').fresh).toBe(false);
  });
});
