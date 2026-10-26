import { describe, it, expect } from 'vitest';
import { PORTRAITS, PORTRAIT_COUNT, portraitURL, randomPortrait } from '../src/portraits.js';
import * as G from '../src/game/game.js';
describe('portraits', () => {
  it('has 24+ distinct portraits across races, genders and classes', () => {
    expect(PORTRAIT_COUNT).toBeGreaterThanOrEqual(24);
    expect(new Set(PORTRAITS.map((p) => p.race)).size).toBe(9);
    expect(new Set(PORTRAITS.map((p) => p.sex)).size).toBe(2);
    expect(new Set(PORTRAITS.map((p) => p.cls)).size).toBe(12);
    expect(new Set(PORTRAITS.map((p) => portraitURL(p.id))).size).toBe(PORTRAIT_COUNT);
  });
  it('random prefers race', () => { for (let i = 0; i < 20; i++) expect(PORTRAITS[randomPortrait('tiefling')].race).toBe('tiefling'); });
  it('new game, companions, recruits and old saves get portraits', () => {
    const s = G.newGame({ name: 'A', portrait: 7 });
    expect(s.party[0].portrait).toBe(7); for (const c of s.party) expect(Number.isInteger(c.portrait)).toBe(true);
    const r = G.createRecruit(s, { name: 'R', race: 'human', cls: 'fighter' }); expect(Number.isInteger(r.char.portrait)).toBe(true);
    const old = JSON.parse(G.serialize ? G.serialize(s) : JSON.stringify(s)); for (const c of [...old.party, ...old.roster]) delete c.portrait;
    const m = G.deserialize(JSON.stringify(old)); for (const c of [...m.party, ...m.roster]) expect(Number.isInteger(c.portrait)).toBe(true);
  });
});
