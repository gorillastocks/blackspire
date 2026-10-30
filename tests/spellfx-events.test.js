import { describe, it, expect, afterEach } from 'vitest';
import { createCharacter, assignByPriority, levelUp } from '../src/rules/character.js';
import { Combat } from '../src/rules/combat.js';
import { setRng, seeded } from '../src/rules/dice.js';

// The renderer flies a bolt for a spell attack when it sees the "spell" event followed by that caster's hit/miss event.
// A caption in between used to reset the marker, so a MISSED Fire Bolt (and rays 2 and 3 of Scorching Ray) flew nowhere.
// So: a miss must be emitted BEFORE its caption, like a hit already is.
afterEach(() => setRng(null));
const hero = () => { const c = createCharacter({ name: 'Hero', race: 'human', cls: 'sorcerer', base: assignByPriority('sorcerer') }); c.xp = 999999; while (c.level < 5) levelUp(c); c.spells = [...new Set([...c.spells, 'fireBolt', 'scorchingRay'])]; c.slots = c.slots.map(() => 9); return c; };
function cast(seed, spell, ac) {
  setRng(seeded(seed)); const w = hero(); const cb = new Combat([w], [{ key: 'giantRat', count: 3 }]); cb.turn = { action: 1, bonus: 1 }; cb.order = [w, ...cb.order.filter((x) => x !== w)]; cb.turnIdx = 0;
  for (const m of cb.monsters) { m.hp = m.maxHp = 500; m.ac = ac; }
  cb.drain(); cb.castSpell(w, spell, { target: cb.monsters[0], slot: spell === 'scorchingRay' ? 2 : undefined }); return cb.drain().events;
}
describe('a hero spell attack: its hit/miss event always comes straight after the spell event, never behind a caption', () => {
  for (const spell of ['fireBolt', 'scorchingRay']) {
    for (const [tag, ac] of [['hit', 1], ['miss', 99]]) {
      it(`${spell} (${tag}): no caption sits between the spell event and any of its hit/miss events`, () => {
        for (let seed = 1; seed <= 8; seed++) {
          const ev = cast(seed, spell, ac); const s = ev.findIndex((e) => e.type === 'spell' && e.spell === spell); expect(s, 'spell event').toBeGreaterThanOrEqual(0);
          const results = ev.map((e, i) => [e, i]).filter(([e]) => (e.type === 'hit' || e.type === 'miss') && e.att?.name === 'Hero');
          expect(results.length, 'at least one result').toBeGreaterThanOrEqual(spell === 'scorchingRay' ? 3 : 1);
          // each result is followed by its own caption; a caption directly before a result can only be the PREVIOUS ray's caption
          for (const [e, i] of results) {
            const rest = ev.slice(i + 1).map((x) => x.type); expect(rest.indexOf('caption'), `seed ${seed}: ${e.type} then its caption`).toBeGreaterThanOrEqual(0); expect(rest.slice(0, rest.indexOf('caption')).every((t) => ['hurt', 'crit'].includes(t)), `seed ${seed}: only damage events between a result and its caption`).toBe(true);
            if (ev[i - 1]?.type === 'caption') expect(ev.slice(0, i - 1).some((x) => x.type === 'hit' || x.type === 'miss'), `seed ${seed}: a caption before ${e.type} must belong to an earlier ray`).toBe(true);
          }
        }
      });
    }
  }
});
