import { describe, it, expect } from 'vitest';
import { newGame, enterDungeon, enterTile, tile, setTile } from '../src/game/game.js';

describe('enterTile suppresses ambient narration when combat starts', () => {
  it('fixed encounter tile: area dm/ambient cleared when combat is present', () => {
    const s = newGame();
    enterDungeon(s, 0);
    // Find an E (fixed encounter) tile
    let ex = -1, ey = -1;
    const L = s.levels?.[0] || null;
    // tiles live on state
    outer: for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      if (tile(s, x, y) === 'E') { ex = x; ey = y; break outer; }
    }
    expect(ex).toBeGreaterThan(0);
    // Place party on E and ensure areaAt would have fired (fresh seen)
    s.x = ex; s.y = ey;
    // Clear seen so area description would normally be dm:true
    s.seen = {};
    const out = enterTile(s);
    expect(out.some((e) => e.combat), 'combat event').toBe(true);
    expect(out.some((e) => e.dm || e.ambient), 'no ambient/dm request alongside combat').toBe(false);
    // Log text may still be present without dm/card
    const lore = out.filter((e) => e.log && /Dungeon Master|🕯|🕯️/.test(e.log) || (e.cls === 'lore' && e.log));
    // If area text was emitted it must not ask for a card/voice
    for (const e of out) {
      if (e.log && e.cls === 'lore') {
        expect(e.card).toBeFalsy();
        expect(e.dm).toBeFalsy();
        expect(e.ambient).toBeFalsy();
      }
    }
  });

  it('boss tile suppresses ambient with combat', () => {
    const s = newGame();
    enterDungeon(s, 0);
    let bx = -1, by = -1;
    outer: for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
      if (tile(s, x, y) === 'B') { bx = x; by = y; break outer; }
    }
    expect(bx).toBeGreaterThan(0);
    s.x = bx; s.y = by; s.seen = {};
    const out = enterTile(s);
    expect(out.some((e) => e.combat)).toBe(true);
    expect(out.some((e) => !e.pre && (e.dm || e.ambient)), 'no ambient area card alongside the boss fight').toBe(false);
    const pre = out.findIndex((e) => e.pre && e.dm); // the DM's lair beat is a pre-fight card: never dropped, and read before the fight starts
    expect(pre).toBeGreaterThanOrEqual(0);
    expect(pre).toBeLessThan(out.findIndex((e) => e.combat));
  });
});
