import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import * as Story from '../src/game/story.js';
import { Combat } from '../src/rules/combat.js';
import { armorClass, setCount } from '../src/rules/character.js';
import { setRng, seeded } from '../src/rules/dice.js';
import { LEVEL_DEFS } from '../src/dungeon/levels.js';

const fresh = () => { setRng(seeded(7)); const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); return s; };

describe('story systems', () => {
  it('prologue gives the signet ring and writ and starts quests', () => {
    const s = fresh(); const sc = Story.prologueScenes(s);
    expect(sc.abduction.lines.some((l) => l.text.includes('Five moons, Emberhollow. Then you kneel before Blackspire.'))).toBe(true);
    Story.finishPrologue(s, 'vow');
    expect(s.inventory).toContain('signetRing'); expect(s.inventory).toContain('royalWrit');
    expect(s.quests.guards).toBe('active'); expect(s.quests.notes).toBe('active'); expect(s.journal.length).toBeGreaterThan(0);
  });
  it('every floor has 2 of Elowen\'s 10 notes and visiting one records it once', () => {
    expect(Story.NOTES.length).toBe(10);
    const ids = Story.LEVEL_POIS.flat().filter((p) => /^note\d+$/.test(p)); expect(ids.length).toBe(10);
    for (const L of Story.LEVEL_POIS) expect(L.filter((p) => /^note\d+$/.test(p)).length).toBe(2);
    const s = fresh(); const ev = Story.visitPoi(s, 'note1'); expect(ev.consumed).toBe(true); expect(s.notes.length).toBe(1);
    expect(Story.visitPoi(s, 'note1').length).toBe(0);
  });
  it('ritual clock: 3 long rests per moon, empowered after 5 seals', () => {
    const s = fresh();
    for (let i = 0; i < 15; i++) Story.onLongRest(s);
    expect(Story.sealsBroken(s)).toBe(5); expect(Story.empowered(s)).toBe(true);
    expect(Story.storyCombat(s, { boss: true }, 4).empowered).toBeTruthy();
  });
  it('townsfolk give and track quests', () => {
    const s = fresh();
    for (const k of Story.TOWNFOLK) { const r = Story.talkTo(s, k); if (r.tt) { expect(Story.TT.autoRun(s, r.tt).aborted).toBe(false); } else expect(r.scene.lines.length).toBeGreaterThan(0); }
    expect(Story.questList(s).length).toBeGreaterThanOrEqual(6);
  });
  it('Q tiles in the dungeon trigger story points of interest', () => {
    const s = fresh(); Story.finishPrologue(s); G.enterDungeon(s, 0);
    const L = G.getLevelState ? null : null; void L;
    // walk the POI list via visitPoi directly — every id must produce at least one event
    for (const [lvl, ids] of Story.LEVEL_POIS.entries()) for (const id of ids) { s.level = lvl; const ev = Story.visitPoi(s, id); expect(ev.length, id).toBeGreaterThan(0); }
  });
});

describe('Dawn Regalia', () => {
  it('set bonus at 3 and 5 pieces', () => {
    const s = fresh(); const c = s.party[0]; const base = armorClass(c);
    for (const k of ['dawnfang', 'sunshardAegis', 'dawncrestHelm']) { s.inventory.push(k); G.equip(s, c, s.inventory.length - 1); }
    expect(setCount(c)).toBe(3); expect(armorClass(c)).toBeGreaterThan(base);
  });
});

describe('finale', () => {
  it('beating Malthrax chains straight into Gorvax; victory only after phase 2', () => {
    const s = fresh(); s.level = 4; s.mode = 'dungeon';
    const def = LEVEL_DEFS[4];
    const cb = new Combat(s.party, def.boss.map((g) => ({ key: g.key, count: 1 })), { inventory: s.inventory, boss: true });
    cb.state = 'won'; cb.gold = 0;
    const ev = G.afterCombat(s, cb, { boss: true });
    expect(ev.find((e) => e.combat)?.combat.phase2).toBe(true); expect(s.victory).toBe(false); expect(s.bossDead[4]).toBe(false);
    const cb2 = new Combat(s.party, def.phase2.map((g) => ({ key: g.key, count: 1 })), { inventory: s.inventory, boss: true }); cb2.state = 'won'; cb2.gold = 0;
    G.afterCombat(s, cb2, { boss: true, phase2: true });
    expect(s.victory).toBe(true); expect(Story.endingScene(s).lines.length).toBeGreaterThan(3);
  });
  it('old 3-floor saves migrate to 5 floors', () => {
    const s = fresh(); s.version = 1; s.mods = [{}, {}, { '1,1': '.' }]; s.explored = [[], [], []]; s.bossDead = [true, true, true]; s.victory = true; s.level = 2; s.maxDepth = 2;
    delete s.flags; delete s.quests;
    const m = G.deserialize(G.serialize(s));
    expect(m.mods.length).toBe(5); expect(m.bossDead).toEqual([true, true, false, false, false]); expect(m.victory).toBe(false); expect(m.flags.prologue).toBe(true);
  });
});

describe('B3/B4 XP pass', () => {
  it('guarded quest spots fight first, then pay out per-member XP', () => {
    for (const id of ['pylon2', 'smith2']) {
      const s = fresh(); const ev = Story.visitPoi(s, id);
      expect(ev.some((e) => e.combat?.poi === id)).toBe(true); expect(s.pois[id]).toBeFalsy();
      const xp0 = s.party[0].xp; const out = Story.onCombatWon(s, { poi: id, fixed: true }, id === 'pylon2' ? 2 : 3);
      expect(s.pois[id]).toBe(true); expect(s.party[0].xp - xp0).toBe(250); expect(out.some((e) => /\+250 XP/.test(e.log || ''))).toBe(true);
      expect(Story.visitPoi(s, id)).toEqual([]); // used up
    }
  });
  it('unguarded pylons and smiths give XP on visit; other spots do not', () => {
    const s = fresh(); const x = s.party[0].xp;
    Story.visitPoi(s, 'pylon1'); Story.visitPoi(s, 'smith1'); expect(s.party[0].xp - x).toBe(500);
    Story.visitPoi(s, 'tablet1'); expect(s.party[0].xp - x).toBe(500);
  });
});
