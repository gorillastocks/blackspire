// Full-campaign playthrough driver. It plays the REAL game rules end to end: it walks the party tile by tile
// with game.move() (doors, keys, traps, secret doors, random encounters), resolves every story point of interest,
// fights every encounter with the real Combat engine (all-AI), returns to town between floors (inn, temple,
// training, townsfolk quests) and finishes with the two-phase finale, Elowen's rescue and the ending.
// Used by the vitest quest suite and, in the browser, by the Playwright playthrough (window.__gw.playthrough).
import * as G from '../game/game.js';
import * as Story from '../game/story.js';
import { Combat } from '../rules/combat.js';
import { getLevel, LEVEL_DEFS, DIRS, W, H } from '../dungeon/levels.js';
import { ITEMS } from '../rules/data.js';
import { canLevelUp } from '../rules/character.js';
import { setRng, seeded } from '../rules/dice.js';
import { COMPANION_KEYS } from '../game/companions.js';

const groupsOf = (gs) => gs.map((g) => ({ key: g.key, count: g.count[0] }));

export function playthrough({ seed = 1, difficulty = 'normal', heroCls = 'fighter', maxLossesPerLevel = 8, randomDungeons = false } = {}) {
  setRng(seeded(seed));
  const s = G.newGame({ name: 'Tester', cls: heroCls, race: 'human', seeds: randomDungeons ? LEVEL_DEFS.map((_, i) => seed * 7717 + i * 131 + 1) : null }); s.difficulty = difficulty;
  const R = { seed, difficulty, heroCls, randomDungeons, fights: 0, wins: 0, losses: 0, floors: [], bosses: {}, problems: [], steps: 0 };
  Story.finishPrologue(s, 'vow');
  for (const k of COMPANION_KEYS) G.recruitCompanion(s, k); // the extra companions wait on the roster (their quests still count)
  for (const k of G.availableCompanions(s)) G.recruitCompanion(s, k);
  const talkAll = () => { for (const k of Story.TOWNFOLK) G.Story.talkTo(s, k); };
  const equipBest = () => {
    for (let i = s.inventory.length - 1; i >= 0; i--) {
      const k = s.inventory[i]; if (!(ITEMS[k]?.set || k === 'weapon2')) continue;
      for (const c of s.party) { const n = s.inventory.length; G.equip(s, c, i); if (s.inventory.length !== n || s.inventory[i] !== k) break; }
    }
  };
  const town = () => {
    s.mode = 'town';
    for (const c of [...s.party]) if (c.dead) { if (s.gold < G.templeCost(c) && !s.flags.freeRaise) s.gold = G.templeCost(c); G.templeHeal(s, c); }
    for (const c of s.party) { let g = 0; while (canLevelUp(c) && g++ < 9) { s.gold += 1000; G.train(s, c); } }
    s.gold += 20; G.innRest(s); talkAll(); equipBest();
    while (s.inventory.filter((k) => k === 'potionHealing').length < 4 && s.gold >= G.priceOf('potionHealing')) G.buy(s, 'potionHealing');
  };
  let lost = false;
  const fight = (info) => {
    const cb = new Combat(s.party, info.groups, { inventory: s.inventory, boss: !!info.boss, canFlee: false, difficulty, story: G.combatOpts(s, info) });
    cb.runAuto(); R.fights++;
    if (info.boss || info.lieutenant) { const k = `B${s.level + 1}:${info.phase2 ? 'phase2' : info.lieutenant ? info.poi : 'boss'}`; R.bosses[k] ||= { tries: 0, won: false }; R.bosses[k].tries++; if (cb.state === 'won') R.bosses[k].won = true; }
    if (cb.state === 'won') R.wins++; else R.losses++;
    const ev = G.afterCombat(s, cb, info);
    if (cb.state === 'lost') { lost = true; return; }
    handle(ev);
  };
  function handle(ev) {
    for (const e of ev || []) {
      if (lost) return;
      if (e.combat) fight(e.combat);
      else if (e.prompt === 'poi') { const r = Story.choosePoi(s, e.poi, 'pull', (sk, dc) => G.partyCheck(s, sk, dc)); if (r.consumed) G.setTile(s, s.x, s.y, '.'); handle(r); }
      else if (e.prompt === 'chest') handle(G.openChest(s, true));
    }
  }
  const passable = (ch, goal, x, y) => ch !== '#' && (ch !== 'B' || s.bossDead[s.level] || (x === goal[0] && y === goal[1])) && (ch !== 'L' || s.keys.includes(getLevel(s.level).def.key));
  const path = (goal) => {
    const prev = new Map(); const q = [[s.x, s.y]]; prev.set(`${s.x},${s.y}`, null);
    while (q.length) { const [x, y] = q.shift(); if (x === goal[0] && y === goal[1]) break;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = `${nx},${ny}`; if (prev.has(k) || !passable(G.tile(s, nx, ny), goal, nx, ny)) continue; prev.set(k, [x, y]); q.push([nx, ny]); } }
    if (!prev.has(`${goal[0]},${goal[1]}`)) return null;
    const out = []; let c = goal; while (c && !(c[0] === s.x && c[1] === s.y)) { out.unshift(c); c = prev.get(`${c[0]},${c[1]}`); } return out;
  };
  // walk to a tile; returns 'ok', 'lost' or 'blocked'
  const walkTo = (goal) => {
    for (let guard = 0; guard < 400; guard++) {
      if (s.x === goal[0] && s.y === goal[1]) return 'ok';
      const p = path(goal); if (!p) return 'blocked';
      const [nx, ny] = p[0]; s.dir = DIRS.findIndex(([dx, dy]) => s.x + dx === nx && s.y + dy === ny);
      if (s.party.reduce((a, c) => a + Math.max(0, c.hp), 0) < 0.45 * s.party.reduce((a, c) => a + c.maxHp, 0)) { handle(G.rest(s, 'long')); if (lost) return 'lost'; }
      const ch = G.tile(s, nx, ny); const ev = G.move(s, 0); R.steps++;
      if (ev.some((e) => e.bump)) {
        if (ch === 'S') { for (let i = 0; i < 30 && G.tile(s, nx, ny) === 'S'; i++) { handle(G.search(s)); if (lost) return 'lost'; } if (G.tile(s, nx, ny) === 'S') return 'blocked'; continue; }
        if (ch === 'L') { for (let i = 0; i < 30 && G.tile(s, nx, ny) === 'L'; i++) handle(G.pickLock(s, i % 2 === 1)); continue; }
        return 'blocked';
      }
      handle(ev); if (lost) return 'lost';
      if (s.x === goal[0] && s.y === goal[1]) return 'ok';
    }
    return 'blocked';
  };
  const find = (ch) => { const o = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G.tile(s, x, y) === ch) o.push([x, y]); return o; };

  town();
  for (let L = 0; L < LEVEL_DEFS.length; L++) {
    const fl = { floor: `B${L + 1}`, losses: 0, poisLeft: null, boss: false, party: '' };
    let done = false;
    while (!done) {
      if (fl.losses > maxLossesPerLevel) { R.problems.push(`B${L + 1}: party could not clear the floor (${fl.losses} wipes)`); break; }
      lost = false; G.enterDungeon(s, L);
      let r = 'ok';
      // 1) every point of interest (repeat: some, like the spoon armory, only open after others)
      for (let pass = 0; pass < 3 && r === 'ok'; pass++) {
        const qs = find('Q').sort((a, b) => Math.abs(a[0] - s.x) + Math.abs(a[1] - s.y) - (Math.abs(b[0] - s.x) + Math.abs(b[1] - s.y)));
        for (const q of qs) {
          const needsKey = !path(q) && !s.keys.includes(getLevel(L).def.key);
          if (needsKey) { const k = find('K')[0]; if (k) { r = walkTo(k); if (r !== 'ok') break; } }
          r = walkTo(q); if (r === 'blocked') { R.problems.push(`B${L + 1}: POI at ${q} unreachable`); r = 'ok'; } if (r !== 'ok') break;
        }
      }
      if (r === 'lost') { fl.losses++; town(); continue; }
      // 2) key, rest up, boss
      const k = find('K')[0]; if (k && (r = walkTo(k)) === 'lost') { fl.losses++; town(); continue; }
      handle(G.rest(s, 'long')); if (lost) { fl.losses++; town(); continue; }
      const b = find('B')[0];
      if (b) { r = walkTo(b); if (r === 'lost') { fl.losses++; town(); continue; } if (r === 'blocked') { R.problems.push(`B${L + 1}: boss unreachable`); break; }
        if (!s.bossDead[L]) { handle(G.enterTile(s)); if (lost) { fl.losses++; town(); continue; } } }
      if (!s.bossDead[L]) { fl.losses++; town(); continue; }
      // 3) exit / altar
      const ex = find(LEVEL_DEFS[L].final ? 'A' : '>')[0]; r = walkTo(ex); if (r === 'lost') { fl.losses++; town(); continue; } if (r === 'blocked') { R.problems.push(`B${L + 1}: exit unreachable after the boss`); break; }
      done = true;
    }
    fl.boss = !!s.bossDead[L]; fl.poisLeft = find('Q').length; fl.party = s.party.map((c) => c.level).join('/'); fl.moon = s.moon; R.floors.push(fl);
    if (!fl.boss) break;
    town(); // back up the lift: inn, temple, training, townsfolk
  }
  R.victory = !!s.victory;
  if (s.victory) { const end = Story.endingScene(s); R.ending = end.lines.length; s.flags.ended = true; }
  R.quests = Object.fromEntries(Object.entries(Story.QUESTS).map(([q]) => [q, s.quests[q] || 'not started']));
  R.notes = s.notes.length; R.seals = Story.sealsBroken(s); R.elowen = !!s.flags.elowenRescued; R.spoons = s.spoons;
  R.finalLevels = s.party.map((c) => c.level).join('/');
  setRng(null);
  Object.defineProperty(R, 'state', { value: s, enumerable: false });
  return R;
}
