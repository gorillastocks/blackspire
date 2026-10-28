import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { getLevel } from '../src/dungeon/levels.js';
describe('elite map pin', () => {
  it('disappears once the elite is defeated', () => {
    const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; s.mode = 'dungeon'; s.level = 0;
    const e = getLevel(0).elites[0]; s.pins = s.pins || {}; s.pins[0] = [{ x: 3, y: 3, icon: '☠', note: `Elite: ${e.title} (guards here)` }, { x: 4, y: 4, icon: '📍', note: 'mine' }];
    G.liveElites(s); expect(s.pins[0].length).toBe(2);
    s.disc[`elite:0:${e.id}`] = 1; G.liveElites(s);
    expect(s.pins[0].some((p) => p.icon === '☠')).toBe(false); expect(s.pins[0].length).toBe(1);
  });
});
