import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { Combat } from '../src/rules/combat.js';
import { readFileSync } from 'node:fs';

const fresh = () => { const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; s.mode = 'dungeon'; s.level = 1; return s; };
const lostFight = () => ({ state: 'lost', monsters: [], xp: 0, gold: 0, events: [] });

describe('total party wipe', () => {
  it('with deferWipe the fall is announced but nothing changes until the player chooses', () => {
    const s = fresh(); s.gold = 101; s.party.forEach((c) => { c.hp = 0; c.conditions = { unconscious: true }; });
    const ev = G.afterCombat(s, lostFight(), { deferWipe: true });
    expect(ev.some((e) => e.wiped)).toBe(true); expect(ev.some((e) => e.toTown)).toBe(false);
    expect(s.mode).toBe('dungeon'); expect(s.gold).toBe(101); expect(s.party.every((c) => c.hp === 0)).toBe(true);
  });
  it('without deferWipe (simulators) the town penalty still applies at once', () => {
    const s = fresh(); s.gold = 100; s.party.forEach((c) => { c.hp = 0; });
    const ev = G.afterCombat(s, lostFight(), {}); expect(ev.some((e) => e.toTown)).toBe(true); expect(s.mode).toBe('town'); expect(s.gold).toBe(50);
  });
  it('Return to Town: half the gold, downed heroes wake at 1 HP clean, slain heroes stay dead and need the Temple', () => {
    const s = fresh(); s.gold = 301; const [a, b, c, d] = s.party;
    s.party.forEach((x) => { x.hp = 0; x.conditions = { unconscious: true, poisoned: true }; x.deathSaves = { s: 1, f: 2 }; });
    b.dead = true; c.dead = true; const pv = G.wipePreview(s);
    expect(pv.goldLost).toBe(150); expect(pv.dead).toEqual([b.name, c.name]); expect(pv.down).toEqual([a.name, d.name]); expect(pv.mercy).toBe(false);
    const ev = G.wipeToTown(s);
    expect(ev[0].toTown).toBe(true); expect(ev[0].log).toMatch(/150 gold/); expect(s.mode).toBe('town'); expect(s.gold).toBe(151);
    for (const x of [a, d]) { expect(x.hp).toBe(1); expect(x.conditions).toEqual({}); expect(x.deathSaves).toEqual({ s: 0, f: 0 }); expect(x.dead).toBeFalsy(); }
    expect(b.dead && c.dead).toBe(true); expect(G.templeCost(b)).toBe(100 * b.level);
    s.gold = 10000; G.templeHeal(s, b); expect(b.dead).toBe(false); expect(b.hp).toBe(1);
  });
  it('if every hero is slain the acolytes raise the leader for free so the party is never stranded', () => {
    const s = fresh(); s.gold = 0; s.party.forEach((x) => { x.hp = 0; x.dead = true; });
    expect(G.wipePreview(s).mercy).toBe(true);
    const ev = G.wipeToTown(s); expect(s.party[0].dead).toBe(false); expect(s.party[0].hp).toBe(1); expect(s.party.slice(1).every((x) => x.dead)).toBe(true);
    expect(ev.some((e) => /pity/.test(e.log))).toBe(true);
  });
  it('a real lost fight ends in state lost and reports the wipe', () => {
    const s = fresh(); s.party.forEach((x) => { x.hp = 1; });
    const cb = new Combat(s.party, [{ key: 'tyrannosaurus', count: 3 }]); expect(['lost', 'won', 'fled']).toContain(cb.runAuto());
    if (cb.state === 'lost') expect(G.afterCombat(s, cb, { deferWipe: true }).some((e) => e.wiped)).toBe(true);
  });
  it('the fallen screen copy is themed and never says Grok, and no voiced line is added without existing audio', () => {
    const src = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('function showFallen()'), src.indexOf('function returnToTownFromWipe()'));
    expect(block).toContain('Your party has fallen'); expect(block).toContain('Load Save'); expect(block).toContain('Return to Town');
    expect(/grok/i.test(block)).toBe(false); expect(/playVoiceLine|voiceLine|say\(/.test(block)).toBe(false);
    const lore = block.match(/fallen-lore' \}, '([^']+)'/)[1]; expect(/[-–—]/.test(lore)).toBe(false);
  });
});
