import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { COMPANIONS } from '../src/game/companions.js';

describe('recruiting + roster', () => {
  it('has at least 4 new hireable companions with full banter', () => {
    const s = G.newGame({});
    const avail = G.availableCompanions(s);
    expect(avail.length).toBeGreaterThanOrEqual(4);
    for (const k of avail) for (const ev of ['combatStart', 'kill', 'victory', 'trap', 'stairs', 'rest', 'recruit']) expect(COMPANIONS[k].lines[ev].length).toBeGreaterThan(0);
  });
  it('dismisses dead members to the roster, recruits near party level, caps at 4, rejoins, raises', () => {
    const s = G.newGame({});
    for (const c of s.party) { c.level = 1; }
    s.party[0].level = 3; s.party[1].level = 3; s.party[2].level = 3; s.party[3].level = 3;
    const dead = s.party.filter((c) => !G.isHero(c)).slice(0, 2); dead.forEach((c) => { c.dead = true; c.hp = 0; });
    dead.forEach((c) => G.dismiss(s, c));
    expect(s.party.length).toBe(2); expect(s.roster).toEqual(dead);
    expect(G.dismiss(s, G.heroOf(s))[0].log).toMatch(/yourself/);
    G.recruitCompanion(s, 'zizzy');
    const z = s.party.find((c) => c.companion === 'zizzy'); expect(z.level).toBe(3); expect(z.ai).toBe(true);
    G.createRecruit(s, { name: 'Bob', race: 'human', cls: 'fighter' });
    expect(s.party.length).toBe(4); expect(s.party.at(-1).recruit).toBe(true);
    G.recruitCompanion(s, 'grumsh'); expect(s.party.length).toBe(4); expect(s.roster.some((c) => c.companion === 'grumsh')).toBe(true);
    expect(G.rejoin(s, dead[0])[0].log).toMatch(/full/);
    s.gold = 9999; G.templeHeal(s, dead[0]); expect(dead[0].dead).toBe(false);
    G.dismiss(s, z); G.rejoin(s, dead[0]); expect(s.party).toContain(dead[0]);
    expect(G.heroOf(s).recruit).toBeFalsy();
  });
  it('old saves without a roster load with an empty one; level-up readiness fires once', () => {
    const s = G.newGame({}); delete s.roster; const t = G.deserialize(JSON.stringify(s));
    expect(t.roster).toEqual([]);
    t.party[0].xp = 300; expect(G.newlyReady(t).length).toBe(1); expect(G.newlyReady(t).length).toBe(0);
  });
});
