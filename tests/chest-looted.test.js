import { describe, it, expect, afterEach } from 'vitest';
import * as G from '../src/game/game.js';
import { setRng, seeded } from '../src/rules/dice.js';

afterEach(() => setRng(null));
const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; G.enterDungeon(s, 0); return s; };
function onChest(s) {
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (G.tile(s, x, y) === 'C') { s.x = x; s.y = y; return [x, y]; }
  throw new Error('no chest on the floor');
}

describe('looted chest', () => {
  it('opening turns the tile into an opened chest and it cannot be looted again', () => {
    setRng(seeded(5)); const s = fresh(); const [x, y] = onChest(s);
    expect(G.enterTile(s).some((e) => e.prompt === 'chest'), 'closed chest asks').toBe(true);
    const gold = s.gold; const ev = G.openChest(s);
    expect(ev.some((e) => e.sfx === 'chest')).toBe(true); expect(s.gold).toBeGreaterThan(gold);
    expect(G.tile(s, x, y)).toBe('o');
    const g2 = s.gold, inv = s.inventory.length;
    expect(G.enterTile(s).some((e) => e.prompt === 'chest'), 'opened chest never asks again').toBe(false);
    expect(s.gold).toBe(g2); expect(s.inventory.length).toBe(inv);
  });
  it('stays opened through save/load and when the floor is left and re-entered', () => {
    setRng(seeded(6)); const s = fresh(); const [x, y] = onChest(s); G.openChest(s);
    const t = G.deserialize(G.serialize(s)); expect(G.tile(t, x, y)).toBe('o');
    expect(G.enterTile(t).some((e) => e.prompt === 'chest')).toBe(false);
    const lvl = t.level; t.level = lvl + 1; t.level = lvl; // other floors keep their own overrides
    expect(G.tile(t, x, y)).toBe('o'); expect(t.mods[lvl][`${x},${y}`]).toBe('o');
  });
});
