import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, enterDungeon, serialize, deserialize, tile, autoResolve, isTrivial, goDown, search } from '../src/game/game.js';
import * as P from '../src/game/progress.js';
import * as E from '../src/entitlements.js';
import { getLevel } from '../src/dungeon/levels.js';

const fresh = () => { const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; enterDungeon(s, 0); return s; };

describe('discovery XP', () => {
  it('pays once per find, scaled by tier', () => {
    const s = fresh(); const before = s.party[0].xp;
    expect(P.discover(s, 'secret', '3,4', 'x')[0].xp).toBe(60);
    expect(P.discover(s, 'secret', '3,4', 'x')).toEqual([]);
    expect(s.party[0].xp).toBe(before + 60);
    s.level = 2; expect(P.discover(s, 'secret', '3,4', 'x')[0].xp).toBe(180);
    expect(s.stats.secrets).toBe(2);
  });
  it('catch-up gives weaker heroes more, benched half', () => {
    const s = fresh(); const a = s.party[0]; a.level = 4; const b = { name: 'B', level: 2, xp: 0, hp: 5, maxHp: 5 }; s.party.push(b);
    const r = P.giveXp(s, 100); expect(r.gains.get(a)).toBe(100); expect(r.gains.get(b)).toBe(160);
    const r2 = P.giveXp(s, 100); expect(r2.gains.get(b)).toBe(160);
  });
  it('rested pool adds bonus and drains', () => {
    const s = fresh(); s.rested = 30; const a = s.party[0]; const x0 = a.xp; P.giveXp(s, 100);
    expect(a.xp - x0).toBe(130); expect(s.rested).toBe(0);
  });
  it('quest sweep pays once and old saves are marked silently', () => {
    const s = fresh(); s.quests.ballad = 'done'; const x0 = s.party[0].xp;
    expect(P.sweepQuests(s).length).toBe(1); expect(P.sweepQuests(s).length).toBe(0); expect(s.party[0].xp).toBeGreaterThan(x0);
  });
});

describe('encounter rates', () => {
  it('drop as the area is explored, fought through and cleared', () => {
    const s = fresh(); const base = P.encounterScale(s); expect(base).toBeCloseTo(1, 1);
    const L = getLevel(0); for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] !== '#') s.explored[0].push(`${x},${y}`);
    const explored = P.encounterScale(s); expect(explored).toBeLessThan(0.2);
    expect(explored).toBeGreaterThanOrEqual(0.15 * 0.12 - 1e-9);
  });
  it('winning a random fight marks the spot as cleared', () => {
    const s = fresh(); expect(P.inClearedZone(s)).toBe(false);
    P.noteFightWon(s, { random: true }); expect(P.inClearedZone(s)).toBe(true); expect(s.fightsWon[0]).toBe(1);
    expect(P.encounterScale(s)).toBeLessThan(0.15);
    const t = fresh(); P.noteFightWon(t, { boss: true }); expect(P.inClearedZone(t)).toBe(false);
  });
});

describe('trivial fights and auto-resolve', () => {
  const rats = [{ key: 'giantRat', count: 2 }];
  it('only when the party is far stronger and healthy', () => {
    const s = fresh(); expect(isTrivial(s, { groups: rats })).toBe(false);
    for (const c of s.party) c.level = 5;
    expect(isTrivial(s, { groups: rats })).toBe(true);
    expect(isTrivial(s, { groups: rats, boss: true })).toBe(false);
    expect(isTrivial(s, { groups: rats, elite: true })).toBe(false);
    s.party[0].hp = 1; expect(isTrivial(s, { groups: rats })).toBe(false);
  });
  it('auto-resolve wins, pays XP and restores AI flags', () => {
    const s = fresh(); for (const c of s.party) { c.level = 5; c.maxHp = 60; c.hp = 60; c.ai = false; } const x0 = s.party[0].xp;
    const r = autoResolve(s, { groups: rats, random: true });
    expect(r.combat.state).toBe('won'); expect(s.party[0].xp).toBeGreaterThan(x0); expect(s.party[0].ai).toBe(false);
  });
});

describe('pathing and pins', () => {
  it('finds a route over explored floor only', () => {
    const s = fresh(); const t = (x, y) => tile(s, x, y); const L = getLevel(0);
    // explore a straight run along the first open corridor from the start
    const cells = []; const seen = new Set([`${s.x},${s.y}`]); const q = [[s.x, s.y]];
    while (q.length && cells.length < 12) { const [x, y] = q.shift(); cells.push([x, y]); for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const k = `${x + dx},${y + dy}`; if (!seen.has(k) && L.tiles[y + dy]?.[x + dx] === '.') { seen.add(k); q.push([x + dx, y + dy]); } } }
    s.explored[0] = cells.map(([x, y]) => `${x},${y}`);
    const [tx, ty] = cells[cells.length - 1]; const path = P.findPath(s, tx, ty, t);
    expect(path).toBeTruthy(); expect(path.at(-1)).toEqual([tx, ty]);
    let [px, py] = [s.x, s.y]; for (const [x, y] of path) { expect(Math.abs(x - px) + Math.abs(y - py)).toBe(1); [px, py] = [x, y]; }
    expect(P.findPath(s, 0, 0, t)).toBeNull(); // unexplored / wall
    expect(P.findPath(s, s.x, s.y, t)).toBeNull();
  });
  it('pins add, replace, remove per level', () => {
    const s = fresh(); P.addPin(s, 2, 3, '❗', 'door?'); P.addPin(s, 2, 3, '💰', 'chest'); expect(s.pins[0].length).toBe(1);
    expect(P.pinAt(s, 2, 3).icon).toBe('💰'); expect(P.removePin(s, 2, 3)).toBe(true); expect(s.pins[0].length).toBe(0);
  });
  const exploreAll = (s) => {
    const L = getLevel(s.level); s.explored[s.level] = [];
    for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) s.explored[s.level].push(`${x},${y}`);
    return L;
  };
  const go = (s, x, y) => P.findPath(s, x, y, (a, b) => tile(s, a, b));

  it('walks up to a suspicious wall instead of refusing the route (B4 Go pins)', () => {
    const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; enterDungeon(s, 3);
    const L = exploreAll(s);
    const secrets = (L.secretCells || []).map((c) => c.split(',').map(Number));
    expect(secrets.length).toBeGreaterThan(0);
    // From the up-stairs, at least one secret is on the near side of the locked door.
    const reachable = secrets.filter(([x, y]) => go(s, x, y));
    expect(reachable.length, 'at least one B4 secret should have an approach path').toBeGreaterThan(0);
    for (const [sx, sy] of reachable) {
      const path = go(s, sx, sy);
      const [ex, ey] = path.at(-1);
      expect(tile(s, ex, ey)).not.toBe('S');
      expect(Math.abs(ex - sx) + Math.abs(ey - sy)).toBe(1);
    }
    // Outer wall with no floor neighbor stays unreachable
    expect(go(s, 0, 0)).toBeNull();
  });

  it('crosses a B4 message tile after it has been read, not before', () => {
    const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; enterDungeon(s, 3);
    exploreAll(s);
    // M at 15,2 is the only way into the trap alcove at 15,1; the tile stays "M" after reading, so pathing used to refuse forever.
    expect(tile(s, 15, 2)).toBe('M');
    expect(tile(s, 15, 1)).toBe('T');
    expect(go(s, 15, 1)).toBeNull();
    s.disc['lore:3:15,2'] = 1;
    const path = go(s, 15, 1);
    expect(path).toBeTruthy();
    expect(path.some(([x, y]) => x === 15 && y === 2)).toBe(true);
    expect(path.at(-1)).toEqual([15, 1]);
  });

  it('on B1–B5, Go to a seen secret walks up to the wall, and a read message is no longer a dead end', () => {
    for (let lvl = 0; lvl < 5; lvl++) {
      const s = newGame({ name: 'T', cls: 'fighter', race: 'human' }); s.flags.prologue = true; enterDungeon(s, lvl);
      const L = exploreAll(s);
      const secrets = (L.secretCells || []).map((c) => c.split(',').map(Number));
      const approached = secrets.filter(([x, y]) => {
        const path = go(s, x, y); return path && Math.abs(path.at(-1)[0] - x) + Math.abs(path.at(-1)[1] - y) === 1;
      });
      expect(approached.length, `B${lvl + 1} should approach at least one secret`).toBeGreaterThan(0);
      const msgs = [];
      for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) if (L.tiles[y][x] === 'M') msgs.push([x, y]);
      const reachableBefore = msgs.filter(([x, y]) => go(s, x, y));
      for (const [x, y] of msgs) s.disc[`lore:${lvl}:${x},${y}`] = 1;
      for (const [mx, my] of reachableBefore) {
        expect(go(s, mx, my), `B${lvl + 1} still paths to read M at ${mx},${my}`).toBeTruthy();
        // Floor next to that message that was blocked only by the unread M should open up.
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = mx + dx, ny = my + dy; if (tile(s, nx, ny) === '.') {
            const path = go(s, nx, ny);
            if (path) expect(path.at(-1)).toEqual([nx, ny]);
          }
        }
      }
    }
  });
});

describe('save migration', () => {
  it('v2 saves load with the new fields and keep their data', () => {
    const s = fresh(); s.quests.ballad = 'done'; const raw = JSON.parse(serialize(s));
    for (const k of ['disc', 'rested', 'fightsWon', 'cleared', 'pins', 'session', 'stats']) delete raw[k]; raw.version = 2;
    const d = deserialize(JSON.stringify(raw));
    expect(d.version).toBe(8); expect(d.pins.length).toBe(5); expect(d.disc['quest:ballad']).toBe(1); expect(d.party[0].name).toBe(s.party[0].name);
    expect(deserialize(serialize(d)).version).toBe(8);
  });
});

describe('entitlements', () => {
  beforeEach(() => { const m = new Map(); globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; });
  it('web build is unlocked by default', () => { expect(E.paywallActive()).toBe(false); expect(E.isLevelLocked(3)).toBe(false); });
  it('dev flag locks levels 2-5 until the placeholder purchase / restore', async () => {
    E.setPaywallDev(true); expect(E.isLevelLocked(0)).toBe(false); expect(E.isLevelLocked(1)).toBe(true);
    const s = fresh(); expect(goDown(s)).toEqual([{ paywall: true, cliffhanger: true }].length ? expect.arrayContaining([expect.objectContaining({ paywall: true })]) : []);
    expect(enterDungeon(newGame(), 2)[0].paywall).toBe(true);
    expect((await E.restore()).status).toBe("nothing"); await E.purchase(); expect((await E.restore()).status).toBe("restored"); expect(E.isLevelLocked(1)).toBe(false);
    E.resetEntitlement(); expect(E.isLevelLocked(1)).toBe(true);
  });
});

describe('elite kills', () => {
  it('lieutenants and guards pay double combat XP', () => {
    const s = fresh(); const a = s.party[0]; const x0 = a.xp; P.awardCombatXp(s, 50, { lieutenant: true }); expect(a.xp - x0).toBe(100);
    const y0 = a.xp; P.awardCombatXp(s, 50, {}); expect(a.xp - y0).toBe(50);
  });
});
