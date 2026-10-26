import { describe, it, expect } from 'vitest';
import { SPELLS, CLASSES } from '../src/rules/data.js';
import { createCharacter, assignByPriority, levelUp, knownSpells, reclass } from '../src/rules/character.js';
import * as SC from '../src/rules/spellcasting.js';
import { deserialize, serialize, newGame } from '../src/game/game.js';

const mk = (cls, lvl = 1) => { const c = createCharacter({ name: 'T', race: 'human', cls, base: assignByPriority(cls) }); c.xp = 999999; while (c.level < lvl) levelUp(c); return c; };

describe('SRD spell selection', () => {
  it('wizard: 3 cantrips + 6 first-level spells in the book, prepares INT mod + level', () => {
    const w = mk('wizard');
    expect(w.cantrips.length).toBe(3); expect(w.spells.length).toBe(6); expect(w.spells.every((k) => SPELLS[k].level === 1)).toBe(true);
    expect(w.prepared.length).toBe(Math.max(1, Math.floor((w.scores.int - 10) / 2) + 1));
    expect(knownSpells(w).length).toBe(3 + w.prepared.length);
  });
  it('wizard book grows by 2 per level (capped by spells that exist) and never loses spells', () => {
    const w = mk('wizard'); let prev = [...w.spells];
    for (let l = 2; l <= 9; l++) { w.xp = 999999; levelUp(w); expect(prev.every((k) => w.spells.includes(k))).toBe(true); expect(w.spells.length).toBe(SC.bookMax(w)); prev = [...w.spells]; }
    expect(knownSpells(w)).toContain('fireball');
  });
  it('spells-known casters follow the SRD table (capped by pool)', () => {
    expect(mk('sorcerer').spells.length).toBe(2); expect(mk('bard').spells.length).toBe(4); expect(mk('warlock').spells.length).toBe(2);
    expect(mk('ranger').spells.length).toBe(0); expect(mk('ranger', 2).spells.length).toBe(2); expect(mk('sorcerer', 5).spells.length).toBe(6);
  });
  it('cantrips known per table', () => {
    expect(mk('cleric').cantrips.length).toBe(3); expect(mk('druid').cantrips.length).toBe(1); expect(mk('warlock').cantrips).toEqual(['eldritchBlast']);
    expect(mk('paladin').cantrips.length).toBe(0);
  });
  it('prepared casters prepare mod + level (paladin half level), not the whole list', () => {
    const c = mk('cleric'); expect(c.prepared.length).toBe(Math.floor((c.scores.wis - 10) / 2) + 1);
    const p = mk('paladin', 4); expect(p.prepared.length).toBe(Math.min(SC.classPool('paladin', 1).length, Math.max(1, Math.floor((p.scores.cha - 10) / 2) + 2)));
    expect(mk('paladin').prepared.length).toBe(0);
    expect(c.prepared).toContain('cureWounds');
  });
  it('level-up swap rules: picker allows at most one swap for known casters', () => {
    const s = mk('sorcerer', 2); const prev = SC.snapshot(s); s.xp = 999999; levelUp(s);
    const secs = SC.pickerSections(s, 'levelup', prev); const sp = secs.find((x) => x.id === 'spells');
    expect(SC.sectionValid(s, secs, sp)).toBe(true);
    const others = sp.pool.filter((k) => !sp.sel.includes(k));
    sp.sel = [...sp.sel.slice(1), others[0]]; expect(SC.sectionValid(s, secs, sp)).toBe(true);
    sp.sel = sp.pool.filter((k) => !prev.spells.includes(k)).slice(0, sp.n); if (prev.spells.length >= 2) expect(SC.sectionValid(s, secs, sp)).toBe(false);
    SC.autoPickSections(s, secs); expect(secs.every((x) => SC.sectionValid(s, secs, x))).toBe(true);
  });
  it('old saves migrate: casters keep a trimmed set, wizards keep their spellbook, no crash', () => {
    const g = newGame({ cls: 'wizard' }); for (const c of g.party) { c.xp = 999999; while (c.level < 5) levelUp(c); delete c.cantrips; delete c.spells; delete c.prepared; delete c.spellsInit; }
    const s = deserialize(serialize(g));
    for (const c of s.party) { if (!CLASSES[c.cls].caster) continue; const k = knownSpells(c); expect(k.length).toBeGreaterThan(0); }
    const w = s.party.find((c) => c.cls === 'wizard'); expect(w.spells.length).toBe(SC.classPool('wizard', 3).length);
  });
  it('reclass into a caster gets valid picks', () => { const c = reclass(mk('fighter', 5), 'druid'); expect(c.prepared.length).toBe(SC.preparedMax(c)); });
});
