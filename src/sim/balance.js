// Balance-pass simulator. A seeded, all-AI party plays the REAL game rules from level 1 to the ending:
// it walks the maze tile by tile with game.move() (random encounters, fixed encounters, elites, chests, points of interest),
// fights with the real Combat engine, camps / returns to town when hurt, levels up, buys gear, auto-resolves trivial fights,
// grinds when it is under-levelled for the boss, and kills the boss. Every fight and every floor is instrumented.
// Used by scripts/balance-sim.mjs (a few hundred runs, a report) and tests/balance-targets.test.js (a small guard).
import * as G from '../game/game.js';
import * as Story from '../game/story.js';
import { Combat } from '../rules/combat.js';
import { getLevel, LEVEL_DEFS, DIRS, W, H } from '../dungeon/levels.js';
import { elitePos } from '../dungeon/extras.js';
import { ITEMS, WEAPONS, ARMOR, MONSTERS, CLASSES, SHOP_STOCK, CR_XP } from '../rules/data.js';
import { canLevelUp, levelUp, armorClass, weaponStats, attacksPerAction, isDown, canWearArmor, isProficientWeapon } from '../rules/character.js';
import { setRng, seeded, rand } from '../rules/dice.js';

const NF = LEVEL_DEFS.length;
export const FLOOR_NAMES = LEVEL_DEFS.map((d, i) => `B${i + 1}`);
/** Party level a player is meant to be at when they step onto each floor / when they face its boss (the design target the sim judges against). */
export const EXPECTED_ARRIVAL = [1, 3, 5, 7, 9];
export const EXPECTED_BOSS = [3, 4, 6, 8, 9];
/** standard / nohealer / liora clear every floor (POIs, chests, elites); 'rush' is the standard party skipping all optional content (key, then boss). */
export const COMPOSITIONS = ['standard', 'nohealer', 'liora', 'rush'];
// Rough play-time model so "grind time" can be quoted in minutes: seconds per tile step and per fight (fights are longer deeper down).
const SEC_STEP = 0.7, SEC_FIGHT = (floor, boss) => (boss ? 150 : 35 + floor * 10);

class Wipe extends Error {}

const avgDice = (expr) => { const m = /^(\d+)d(\d+)(?:\+(\d+))?$/.exec(expr); return m ? +m[1] * (+m[2] + 1) / 2 + (+m[3] || 0) : 0; };
const sigOf = (groups) => groups.map((g) => `${g.key}x${g.count}`).join('+');

/** XP "deadly" thresholds per character level (5e DMG), used to put an expected level on a monster group. */
const DEADLY = [100, 200, 400, 500, 1100, 1400, 1700, 2100, 2400];
const mult = (n) => (n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : n <= 10 ? 2.5 : 3);
/** Lowest party level (4 heroes) for whom this group is no more than "deadly" by the SRD encounter maths. */
export function dmgLevelFor(groups) {
  const n = groups.reduce((a, g) => a + g.count, 0); const xp = groups.reduce((a, g) => a + (CR_XP[MONSTERS[g.key].cr] || 10) * g.count, 0) * mult(n);
  for (let l = 1; l <= 9; l++) if (DEADLY[l - 1] * 4 >= xp) return l; return 10;
}

export function makeParty(comp, heroCls, seed) {
  const s = G.newGame({ name: 'Sim', cls: heroCls, race: 'human' });
  Story.finishPrologue(s, 'vow'); s.gold = 120;
  if (comp === 'nohealer') { // swap Brambur for a second front-liner: no cleric, and nobody else who heals
    const i = s.party.findIndex((c) => c.companion === 'brambur'); const [gone] = s.party.splice(i, 1); void gone;
    const cls = heroCls === 'fighter' ? 'barbarian' : heroCls === 'ranger' ? 'fighter' : 'fighter';
    G.createRecruit(s, { name: 'Gruff', race: 'human', cls });
  } else if (comp === 'liora') G.joinLiora(s);
  s.party.forEach((c) => { c.ai = true; });
  return s;
}
const HERO_CLASSES = { rush: ['fighter', 'paladin', 'barbarian', 'ranger'], standard: ['fighter', 'paladin', 'barbarian', 'ranger'], nohealer: ['fighter', 'barbarian', 'ranger', 'fighter'], liora: ['fighter', 'paladin', 'barbarian', 'fighter'] };

/**
 * Play one whole campaign. opts: { comp, heroCls, difficulty, grind: true|false, autoResolve, maxWipesPerFloor, grindCap }
 * Returns { seed, comp, heroCls, result, floors:[per-floor record], fights:[per-fight records], steps, ... }.
 */
export function simulateCampaign(seed, opts = {}) {
  const { comp = 'standard', difficulty = 'normal', grind = true, autoResolve = true, maxWipesPerFloor = 8, grindCap = 2600 } = opts;
  const heroCls = opts.heroCls || HERO_CLASSES[comp][seed % 4];
  const realNow = Date.now; let clock = 1.7e12; Date.now = () => (clock += 3000); // banter has a wall-clock cooldown that would make the dice stream depend on timing
  setRng(seeded(seed * 2654435761 % 2 ** 31 || 1));
  try { return play(seed, comp, heroCls, difficulty, grind, autoResolve, maxWipesPerFloor, grindCap); } finally { setRng(null); Date.now = realNow; }
}

function play(seed, comp, heroCls, difficulty, grindOn, doAuto, maxWipes, grindCap) {
  const s = makeParty(comp, heroCls, seed); s.difficulty = difficulty;
  const R = { seed, comp, heroCls, difficulty, result: 'incomplete', floors: [], fights: [], steps: 0, wipes: 0, moon: 0, empoweredFinale: false };
  const alive = () => s.party.filter((c) => !c.dead);
  const avgLvl = () => { const a = alive(); return a.reduce((t, c) => t + c.level, 0) / Math.max(1, a.length); };
  const effLvl = () => { const a = alive(); return a.reduce((t, c) => t + c.level + (canLevelUp(c) ? 1 : 0), 0) / Math.max(1, a.length); };
  const hpFrac = () => { const a = alive(); return a.reduce((t, c) => t + Math.max(0, c.hp), 0) / Math.max(1, a.reduce((t, c) => t + c.maxHp, 0)); };
  const xpSum = () => s.party.reduce((t, c) => t + c.xp, 0) / Math.max(1, s.party.length);
  let fl = null; let phase = 'explore'; // 'explore' | 'grind'
  const newFloor = (L) => ({
    floor: L + 1, arrLvl: avgLvl(), arrMin: Math.min(...alive().map((c) => c.level)), arrXp: xpSum(), expArrival: EXPECTED_ARRIVAL[L], expBoss: EXPECTED_BOSS[L],
    steps: 0, fights: 0, wins: 0, wipes: 0, deaths: 0, downs: 0, oneShots: 0, bursts: 0, ambushWipes: 0, fullHpWipes: 0, trivial: 0, byKind: {},
    boss: { attempts: 0, wins: 0, firstTry: null, lvlAtFirst: null, p2Attempts: 0, p2Wins: 0, p2First: null }, elite: { n: 0, wins: 0 },
    goldEarned: 0, goldSpent: 0, goldLost: 0, chests: 0, rare: 0, epic: 0, legendary: 0, potionsFound: 0, potionsUsed: 0, xpFight: 0, xpOther: 0,
    grind: { steps: 0, fights: 0, wipes: 0, started: 0 }, townTrips: 0, rests: 0, shortRests: 0, secs: 0, leaveLvl: 0, leaveXp: 0,
  });
  const kindRow = (k) => (fl.byKind[k] ||= { n: 0, wins: 0, downs: 0, deaths: 0, oneShots: 0, wipes: 0, rounds: 0 });

  /* ---------- gold / xp accounting around any game call ---------- */
  const tracked = (fn) => { const g0 = s.gold, x0 = xpSum(), inv0 = s.inventory.length, rf0 = (s.rareFound || []).length; const r = fn(); const dg = s.gold - g0; if (dg > 0) fl.goldEarned += dg; else if (dg < 0) fl.goldSpent -= dg; fl.xpOther += Math.max(0, xpSum() - x0); void inv0; void rf0; return r; };

  /* ---------- fights ---------- */
  function fight(info) {
    const kind = info.boss ? (info.phase2 ? 'phase2' : 'boss') : info.lieutenant ? 'lieutenant' : info.guard ? 'guard' : info.elite ? 'elite' : info.poi ? 'poi' : info.fixed ? 'fixed' : info.ambush ? 'ambush' : 'random';
    const rec = { f: fl.floor, kind, sig: sigOf(info.groups), lvl: avgLvl(), minLvl: Math.min(...alive().map((c) => c.level)), hp0: hpFrac(), n: alive().length, dl: dmgLevelFor(info.groups), grind: phase === 'grind', trivial: false, res: '', rounds: 0, downs: 0, deaths: 0, oneShots: 0, bursts: 0, firstRoundDowns: 0, gold: 0, xp: 0, pots: 0, hp1: 1, osKeys: [], dmgBy: '' };
    const g0 = s.gold, x0 = xpSum(), pots0 = s.inventory.filter((k) => k === 'potionHealing' || k === 'potionGreater').length;
    let cb, ev;
    if (doAuto && !info.boss && G.isTrivial(s, info)) { const r = G.autoResolve(s, info); cb = r.combat; ev = r.events; rec.trivial = true; fl.trivial++; }
    else {
      cb = new Combat(s.party, info.groups, { inventory: s.inventory, boss: !!info.boss, canFlee: !info.boss, difficulty, story: G.combatOpts(s, info), elite: info.elite || null, lore: s.lore });
      const em = cb.emit.bind(cb); cb.emit = (e) => { if (e.type === 'down') { rec.downs++; if (cb.round === 0) rec.firstRoundDowns++; } else if (e.type === 'death') rec.deaths++; return em(e); };
      const mt = cb.monsterTurn.bind(cb);
      cb.monsterTurn = (m) => {
        const before = cb.party.filter((c) => !isDown(c)).map((c) => [c, c.hp, c.maxHp]);
        mt(m);
        for (const [c, hp, mx] of before) if (isDown(c)) { if (hp >= mx) { rec.oneShots++; rec.osKeys.push(m.key); } else if (hp >= 0.75 * mx) { rec.bursts++; rec.osKeys.push('~' + m.key); } }
      };
      cb.runAuto();
      ev = G.afterCombat(s, cb, info);
    }
    rec.res = cb.state; rec.rounds = cb.round + 1; rec.hp1 = hpFrac(); rec.gold = s.gold - g0; rec.xp = Math.round(xpSum() - x0);
    rec.pots = Math.max(0, pots0 - s.inventory.filter((k) => k === 'potionHealing' || k === 'potionGreater').length);
    for (const e of ev) if (e.rare) fl[e.rare.tier] = (fl[e.rare.tier] || 0) + 1; // rare drops from elites
    // accounting
    const kr = kindRow(kind); kr.n++; kr.downs += rec.downs; kr.deaths += rec.deaths; kr.oneShots += rec.oneShots; kr.rounds += rec.rounds;
    fl.fights++; fl.downs += rec.downs; fl.deaths += rec.deaths; fl.oneShots += rec.oneShots; fl.bursts += rec.bursts; fl.potionsUsed += rec.pots;
    if (rec.gold > 0) fl.goldEarned += rec.gold; else fl.goldLost -= rec.gold; fl.xpFight += Math.max(0, rec.xp);
    if (phase === 'grind') fl.grind.fights++;
    if (cb.state === 'won') { fl.wins++; kr.wins++; }
    if (kind === 'elite') { fl.elite.n++; if (cb.state === 'won') fl.elite.wins++; }
    if (kind === 'boss') { fl.boss.attempts++; if (fl.boss.firstTry === null) { fl.boss.firstTry = cb.state === 'won'; fl.boss.lvlAtFirst = rec.lvl; } if (cb.state === 'won') fl.boss.wins++; }
    if (kind === 'phase2') { fl.boss.p2Attempts++; if (fl.boss.p2First === null) fl.boss.p2First = cb.state === 'won'; if (cb.state === 'won') fl.boss.p2Wins++; }
    fl.secs += SEC_FIGHT(fl.floor - 1, !!info.boss);
    R.fights.push(rec);
    if (cb.state === 'lost') {
      fl.wipes++; kr.wipes++; R.wipes++; if (phase === 'grind') fl.grind.wipes++;
      if (rec.hp0 >= 0.9) fl.fullHpWipes++; if (cb.round <= 1 && rec.hp0 >= 0.9) fl.ambushWipes++;
      rec.fullHp = rec.hp0 >= 0.9; throw new Wipe();
    }
    handle(ev);
  }
  function handle(ev) {
    for (const e of ev || []) {
      if (e.combat) fight(e.combat);
      else if (e.prompt === 'poi') { const r = Story.choosePoi(s, e.poi, 'pull', (sk, dc) => G.partyCheck(s, sk, dc)); if (r.consumed) G.setTile(s, s.x, s.y, '.'); handle(r); }
      else if (e.prompt === 'chest') openChest();
    }
  }
  function openChest() {
    const key = `${s.level}:${s.x},${s.y}`; void key;
    tracked(() => {
      // a careful party: inspect, then let the best thief try to disarm; a trap that is not found just gets sprung
      const found = G.inspectChest(s); let guard = 0; void found;
      const st = s.chests?.[`chest:${s.level}:${s.x},${s.y}`];
      if (st?.found) while (G.tile(s, s.x, s.y) === 'C' && st.trapped && guard++ < 4) { const o = G.disarmChest(s); if (o.some((x) => x.sfx === 'chest')) { fl.chests++; return handle(o); } }
      if (G.tile(s, s.x, s.y) === 'C') { const inv0 = s.inventory.length, o = G.openChest(s, st ? !st.trapped || st.found : false); fl.chests++; fl.potionsFound += s.inventory.slice(inv0).filter((k) => k === 'potionHealing' || k === 'potionGreater').length; for (const e of o) if (e.rare) fl[e.rare.tier] = (fl[e.rare.tier] || 0) + 1; }
    });
  }

  /* ---------- walking ---------- */
  const passable = (ch, goal, x, y) => ch !== '#' && ch !== 'S' && (ch !== 'B' || s.bossDead[s.level] || (x === goal[0] && y === goal[1])) && (ch !== 'L' || s.keys.includes(getLevel(s.level).def.key));
  function pathTo(goal, from = [s.x, s.y]) {
    const prev = new Map([[`${from[0]},${from[1]}`, null]]); const q = [from]; let h = 0;
    while (h < q.length) { const [x, y] = q[h++]; if (x === goal[0] && y === goal[1]) break;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = `${nx},${ny}`; if (prev.has(k) || !passable(G.tile(s, nx, ny), goal, nx, ny)) continue; prev.set(k, [x, y]); q.push([nx, ny]); } }
    if (!prev.has(`${goal[0]},${goal[1]}`)) return null;
    const out = []; let c = goal; while (c && !(c[0] === from[0] && c[1] === from[1])) { out.unshift(c); c = prev.get(`${c[0]},${c[1]}`); } return out;
  }
  const slotFrac = () => { let a = 0, b = 0; for (const c of alive()) for (let i = 0; i < c.maxSlots.length; i++) { a += (c.slots[i] || 0) * (i + 1); b += c.maxSlots[i] * (i + 1); } return b ? a / b : 1; };
  /** Camp when hurt or spent: short rest first, long rest if still low. */
  function maybeRest(force = false) {
    const need = force ? hpFrac() < 0.97 || slotFrac() < 0.6 : hpFrac() < 0.55 || (slotFrac() < 0.2 && hpFrac() < 0.8);
    if (!need) return;
    if (!force && hpFrac() >= 0.4) { fl.shortRests++; handle(G.rest(s, 'short')); if (hpFrac() >= 0.6 && slotFrac() >= 0.2) return; }
    fl.rests++; handle(G.rest(s, 'long'));
  }
  function walkTo(goal, { restFirst = true } = {}) {
    for (let guard = 0; guard < 500; guard++) {
      if (s.x === goal[0] && s.y === goal[1]) return 'ok';
      const p = pathTo(goal); if (!p) return 'blocked';
      const [nx, ny] = p[0]; s.dir = DIRS.findIndex(([dx, dy]) => s.x + dx === nx && s.y + dy === ny);
      if (restFirst) maybeRest();
      const ch = G.tile(s, nx, ny); const ev = tracked(() => G.move(s, 0)); R.steps++; fl.steps++; fl.secs += SEC_STEP; if (phase === 'grind') fl.grind.steps++;
      if (ev.some((e) => e.bump)) {
        if (ch === 'L') { for (let i = 0; i < 30 && G.tile(s, nx, ny) === 'L'; i++) handle(G.pickLock(s, i % 2 === 1)); continue; }
        return 'blocked';
      }
      handle(ev);
      if (s.x === goal[0] && s.y === goal[1]) return 'ok';
    }
    return 'blocked';
  }
  const find = (ch) => { const o = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (G.tile(s, x, y) === ch) o.push([x, y]); return o; };
  const nearest = (cells) => cells.map((c) => [c, pathTo(c)]).filter(([, p]) => p).sort((a, b) => a[1].length - b[1].length).map(([c]) => c);

  /* ---------- town ---------- */
  const potCount = (k) => s.inventory.filter((x) => x === k).length;
  const score = (c) => {
    let best = 0;
    for (const slot of ['weapon', 'ranged']) { const w = c.equip[slot]; if (!w) continue; const ws = weaponStats(c, slot); const avg = avgDice(ws.dmg) + ws.dmgBonus + (ws.elem ? avgDice(ws.elem.dmg) : 0); const pHit = Math.min(0.95, Math.max(0.05, (8 + ws.bonus) / 20)); best = Math.max(best, pHit * avg * attacksPerAction(c)); }
    return best + armorClass(c) * 0.9 + (c.equip.ring === 'ringProtection' ? 0.3 : 0);
  };
  function equipBest() {
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (let i = s.inventory.length - 1; i >= 0; i--) {
        const k = s.inventory[i]; const kind = ITEMS[k]?.kind; if (!(['weapon', 'armor', 'ring', 'cloak', 'helm', 'shield'].includes(kind) || k === 'shield' || k === 'sunshardAegis')) continue;
        for (const c of s.party) {
          if (c.dead) continue; const before = score(c), eq0 = JSON.parse(JSON.stringify(c.equip)), inv0 = [...s.inventory];
          G.equip(s, c, i);
          if (score(c) > before + 0.05) { changed = true; break; }
          c.equip = eq0; s.inventory = inv0;
        }
      }
      if (!changed) break;
    }
  }
  function tryShop(c, key) { // would this shop item improve c? returns the score gain
    const eq0 = JSON.parse(JSON.stringify(c.equip)); const before = score(c); let ok = false;
    if (key === 'shield') { if (CLASSES[c.cls].armor.includes('shield') && !(c.equip.weapon && WEAPONS[c.equip.weapon.base].props.includes('two-handed')) && !c.equip.shield) { c.equip.shield = true; ok = true; } }
    else if (key.startsWith('a:')) { const b = key.slice(2); if (canWearArmor(c, b)) { c.equip.armor = { base: b, magic: 0 }; ok = true; } }
    else if (key.startsWith('w:')) { const b = key.slice(2); const ranged = WEAPONS[b].props.includes('ranged'); if (isProficientWeapon(c, b) && !['wizard'].includes(c.cls) && !(c.cls === 'cleric' || c.cls === 'bard' || c.cls === 'druid') ) { if (WEAPONS[b].props.includes('two-handed') && !ranged && c.equip.shield) c.equip.shield = false; c.equip[ranged ? 'ranged' : 'weapon'] = { base: b, magic: 0 }; ok = true; } }
    const gain = ok ? score(c) - before : 0; c.equip = eq0; return gain;
  }
  function town() {
    s.mode = 'town'; fl && fl.townTrips++;
    const spend = (fn) => { const g0 = s.gold; fn(); if (s.gold < g0) fl && (fl.goldSpent += g0 - s.gold); };
    // raise the dead first (sell spoons and spare junk if needed)
    for (const c of [...s.party]) if (c.dead) {
      const cost = G.templeCost(c);
      if (s.gold < cost) for (let i = s.inventory.length - 1; i >= 0 && s.gold < cost; i--) { const I = ITEMS[s.inventory[i]]; if (I?.kind === 'junk') G.sell(s, i); }
      if (s.gold >= cost || s.flags.freeRaise) spend(() => G.templeHeal(s, c));
    }
    for (const c of s.party) { let g = 0; while (canLevelUp(c) && g++ < 9) G.train(s, c); }
    spend(() => G.innRest(s));
    if (s.gold > 10) for (const k of Story.TOWNFOLK) { try { G.Story.talkTo(s, k); } catch { /* quest givers are optional */ } }
    equipBest();
    spend(() => {
      while (potCount('potionHealing') < 4 && s.gold >= G.priceOf('potionHealing') + 20) G.buy(s, 'potionHealing');
      for (let n = 0; n < 14; n++) {
        let best = null;
        for (const c of s.party) { if (c.dead) continue; for (const key of SHOP_STOCK) { if (!/^(a:|w:|shield)/.test(key)) continue; const cost = G.priceOf(key); if (cost > s.gold - 100) continue; const gain = tryShop(c, key); if (gain > 0.35 && (!best || gain / Math.sqrt(cost) > best.v)) best = { c, key, gain, v: gain / Math.sqrt(cost) }; } }
        if (!best) break;
        G.buy(s, best.key); G.equip(s, best.c, s.inventory.lastIndexOf(best.key));
      }
      while (potCount('potionGreater') < 3 && s.gold >= G.priceOf('potionGreater') + 150) G.buy(s, 'potionGreater');
    });
    equipBest();
  }
  /** Walk out of the dungeon, do the town chores, ride the mine lift back. The climb costs steps (no random fights on the way: generous). */
  function townTrip() {
    const L = s.level; const d = pathTo(find('<')[0] || [1, 1]); const climb = (d ? d.length : 20) + L * 45;
    R.steps += climb; fl.steps += climb; fl.secs += climb * SEC_STEP; if (phase === 'grind') fl.grind.steps += climb;
    town(); G.enterDungeon(s, L);
  }

  /* ---------- floors ---------- */
  function exploreFloor(L) {
    const seen = new Set();
    // 1) every point of interest, fixed encounter, chest and nook, nearest first
    for (let guard = 0; guard < 90; guard++) {
      maybeRest();
      const hurt = hpFrac() < 0.75;
      const cells = [...find('Q'), ...find('E'), ...find('C'), ...find('N'), ...(hurt ? find('F') : [])].filter(([x, y]) => !seen.has(`${L}:${x},${y}`));
      const order = nearest(cells); if (!order.length) break;
      const [gx, gy] = order[0]; seen.add(`${L}:${gx},${gy}`);
      const r = walkTo(order[0]); if (r === 'blocked') G.setTile(s, gx, gy, '.');
    }
    // 2) key, then the elites (one at a time, rested)
    const k = find('K')[0]; if (k) walkTo(k);
    for (const e of G.liveElites(s)) {
      maybeRest(true);
      for (let i = 0; i < 90 && G.liveElites(s).some((x) => x.id === e.id); i++) {
        const path = pathTo(elitePos(e, s.steps)); if (!path) break;
        const [nx, ny] = path[0]; s.dir = DIRS.findIndex(([dx, dy]) => s.x + dx === nx && s.y + dy === ny);
        const ev = tracked(() => G.move(s, 0)); R.steps++; fl.steps++; fl.secs += SEC_STEP; if (ev.some((x) => x.bump)) break; handle(ev);
      }
    }
  }
  /** Roam the floor looking for random fights until the party is (about to be) the target level. */
  function grindFloor(target) {
    if (effLvl() >= target) return;
    phase = 'grind'; fl.grind.started++; const t0 = fl.grind.steps;
    const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = G.tile(s, x, y); if (c !== '#' && c !== 'S' && c !== 'L' && c !== 'B') cells.push([x, y]); }
    for (let g = 0; g < 400 && effLvl() < target && fl.grind.steps - t0 < grindCap; g++) {
      const far = cells.filter(([x, y]) => Math.abs(x - s.x) + Math.abs(y - s.y) >= 8); const goal = far[Math.floor(rand() * far.length)] || cells[0];
      if (walkTo(goal) === 'blocked') break;
    }
    phase = 'explore';
  }

  town();
  for (let L = 0; L < NF; L++) {
    fl = newFloor(L); R.floors.push(fl); phase = 'explore';
    let done = false, extra = 0; let gate = EXPECTED_BOSS[L];
    G.enterDungeon(s, L);
    while (!done) {
      if (fl.wipes > maxWipes) break;
      try {
        if (!s.flags['explored' + L]) { if (comp === 'rush') { const k = find('K')[0]; if (k) walkTo(k); } else exploreFloor(L); s.flags['explored' + L] = true; }
        // stay out of the boss room until strong enough (the grind), then rest up and go in
        if (grindOn && effLvl() < gate + extra) grindFloor(gate + extra);
        if (alive().some((c) => canLevelUp(c)) || alive().length < s.party.length || potCount('potionHealing') < 2) townTrip();
        maybeRest(true);
        const b = find('B')[0];
        if (b && !s.bossDead[L]) {
          const r = walkTo(b); if (r === 'blocked') break;
        }
        if (s.bossDead[L]) done = true;
      } catch (err) {
        if (!(err instanceof Wipe)) throw err;
        phase = 'explore'; town(); G.enterDungeon(s, L); if (fl.boss.attempts > 0) extra = Math.min(2, extra + 0.5);
      }
    }
    fl.leaveLvl = avgLvl(); fl.leaveXp = xpSum(); fl.bossDown = !!s.bossDead[L]; fl.moon = s.moon;
    if (!fl.bossDown) { R.result = `stuck on B${L + 1}`; break; }
    if (L < NF - 1) town(); // lift back up for training, shopping and the town folk
    if (L < NF - 1) G.enterDungeon(s, L + 1);
  }
  R.victory = !!s.victory; if (s.victory) R.result = 'victory';
  R.moon = s.moon; R.empoweredFinale = Story.empowered ? Story.empowered(s) : false; R.finalLevels = s.party.map((c) => c.level).join('/'); R.gold = s.gold; R.rests = s.rests;
  return R;

}

/* ======================================================================================================
   Aggregation and report
   ====================================================================================================== */
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const pct = (n, d) => (d ? (100 * n) / d : null);
const f1 = (x) => (x == null ? '–' : x.toFixed(1));
const f0 = (x) => (x == null ? '–' : Math.round(x).toString());

/** Per-floor numbers for a set of runs. */
export function floorStats(runs, L) {
  const fs = runs.map((r) => r.floors[L]).filter(Boolean); const n = fs.length;
  const sum = (k) => fs.reduce((t, f) => t + (f[k] || 0), 0);
  const g = (fn) => mean(fs.map(fn));
  const bossAtt = fs.reduce((t, f) => t + f.boss.attempts, 0), bossWin = fs.reduce((t, f) => t + f.boss.wins, 0);
  const first = fs.filter((f) => f.boss.firstTry !== null); const p2 = fs.filter((f) => f.boss.p2First !== null);
  const fights = sum('fights');
  const rows = (kind) => { let nn = 0, w = 0, d = 0, dt = 0, os = 0, wp = 0; for (const f of fs) { const r = f.byKind[kind]; if (r) { nn += r.n; w += r.wins; d += r.downs; dt += r.deaths; os += r.oneShots; wp += r.wipes || 0; } } return { n: nn, win: pct(w, nn), downs: nn ? d / nn : null, deaths: nn ? dt / nn : null, oneShots: os, wipes: n ? wp / n : 0 }; };
  const grinders = fs.filter((f) => f.grind.fights > 0 || f.grind.steps > 0);
  return {
    floor: L + 1, runs: n, expArrival: EXPECTED_ARRIVAL[L], expBoss: EXPECTED_BOSS[L],
    arrLvl: g((f) => f.arrLvl), arrMin: Math.min(...fs.map((f) => f.arrMin)), arrMax: Math.max(...fs.map((f) => f.arrLvl)),
    bossLvl: mean(first.map((f) => f.boss.lvlAtFirst)),
    bossFirstWin: pct(first.filter((f) => f.boss.firstTry).length, first.length), bossAllWin: pct(bossWin, bossAtt), bossAttempts: bossAtt / Math.max(1, n),
    p2FirstWin: pct(p2.filter((f) => f.boss.p2First).length, p2.length), p2AllWin: pct(fs.reduce((t, f) => t + f.boss.p2Wins, 0), fs.reduce((t, f) => t + f.boss.p2Attempts, 0)),
    wipes: g((f) => f.wipes), wipeRuns: pct(fs.filter((f) => f.wipes > 0).length, n), bossWipes: g((f) => f.boss.attempts - f.boss.wins + f.boss.p2Attempts - f.boss.p2Wins),
    deaths: g((f) => f.deaths), downs: g((f) => f.downs), oneShots: g((f) => f.oneShots), bursts: g((f) => f.bursts), fullHpWipes: g((f) => f.fullHpWipes), ambushWipes: g((f) => f.ambushWipes),
    fights: g((f) => f.fights), trivialShare: pct(sum('trivial'), fights), fightWin: pct(sum('wins'), fights),
    eliteN: g((f) => f.elite.n), eliteWin: pct(fs.reduce((t, f) => t + f.elite.wins, 0), fs.reduce((t, f) => t + f.elite.n, 0)),
    goldEarned: g((f) => f.goldEarned), goldSpent: g((f) => f.goldSpent), goldLost: g((f) => f.goldLost), chests: g((f) => f.chests), rare: g((f) => f.rare), epic: g((f) => f.epic), legendary: g((f) => f.legendary),
    potionsFound: g((f) => f.potionsFound), potionsUsed: g((f) => f.potionsUsed),
    grindShare: pct(grinders.length, n), grindFights: g((f) => f.grind.fights), grindSteps: g((f) => f.grind.steps), grindMin: g((f) => (f.grind.steps * SEC_STEP + f.grind.fights * SEC_FIGHT(L, false)) / 60),
    steps: g((f) => f.steps), minutes: g((f) => f.secs / 60), townTrips: g((f) => f.townTrips), rests: g((f) => f.rests + f.shortRests),
    random: rows('random'), fixed: rows('fixed'), elite: rows('elite'), lieutenant: rows('lieutenant'), guard: rows('guard'), poi: rows('poi'), boss: rows('boss'), phase2: rows('phase2'), ambush: rows('ambush'),
    leaveLvl: g((f) => f.leaveLvl),
  };
}

/** Encounter hot-spots: every (floor, kind, group) with enough samples, with its loss rate, KO rate and one-shot rate. */
export function encounterStats(runs, minN = 6) {
  const m = new Map();
  for (const r of runs) for (const x of r.fights) {
    const k = `${x.f}|${x.kind === 'ambush' ? 'random' : x.kind}|${x.sig}`; let e = m.get(k);
    if (!e) m.set(k, e = { floor: x.f, kind: x.kind === 'ambush' ? 'random' : x.kind, sig: x.sig, dl: x.dl, n: 0, wins: 0, loss: 0, downs: 0, deaths: 0, oneShots: 0, bursts: 0, hpLost: 0, rounds: 0, lvl: 0, trivial: 0, fullLoss: 0 });
    e.n++; if (x.res === 'won') e.wins++; if (x.res === 'lost') { e.loss++; if (x.hp0 >= 0.9) e.fullLoss++; } e.downs += x.downs; e.deaths += x.deaths; e.oneShots += x.oneShots; e.bursts += x.bursts; e.hpLost += Math.max(0, x.hp0 - x.hp1); e.rounds += x.rounds; e.lvl += x.lvl; if (x.trivial) e.trivial++;
  }
  return [...m.values()].filter((e) => e.n >= minN).map((e) => ({ ...e, lossPct: pct(e.loss, e.n), downsPer: e.downs / e.n, deathsPer: e.deaths / e.n, osPer: e.oneShots / e.n, hpLostPct: (100 * e.hpLost) / e.n, roundsAvg: e.rounds / e.n, lvlAvg: e.lvl / e.n, trivialPct: pct(e.trivial, e.n) }));
}
/** Who one-shots whom: monster keys that dropped a full-HP hero in a single turn. */
export function oneShotBy(runs) { const m = {}; for (const r of runs) for (const x of r.fights) for (const k of x.osKeys) if (!k.startsWith('~')) { const kk = `B${x.f} ${k}`; m[kk] = (m[kk] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); }
export function burstBy(runs) { const m = {}; for (const r of runs) for (const x of r.fights) for (const k of x.osKeys) if (k.startsWith('~')) { const kk = `B${x.f} ${k.slice(1)}`; m[kk] = (m[kk] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]); }

export function summarize(runs) {
  const by = {}; for (const c of ['all', ...COMPOSITIONS]) { const rs = c === 'all' ? runs : runs.filter((r) => r.comp === c); if (!rs.length) continue; by[c] = { runs: rs.length, victories: rs.filter((r) => r.victory).length, wipes: mean(rs.map((r) => r.wipes)), steps: mean(rs.map((r) => r.steps)), moon: mean(rs.map((r) => r.moon)), empowered: pct(rs.filter((r) => r.empoweredFinale).length, rs.length), results: rs.reduce((m, r) => ((m[r.result] = (m[r.result] || 0) + 1), m), {}), floors: FLOOR_NAMES.map((_, L) => floorStats(rs, L)) }; }
  return { by, encounters: encounterStats(runs), oneShotBy: oneShotBy(runs), burstBy: burstBy(runs) };
}

export function renderMarkdown(sum, { title = 'Blackspire balance sim', label = '', meta = '' } = {}) {
  const o = []; const P = (s = '') => o.push(s);
  P(`# ${title}${label ? ` — ${label}` : ''}`); if (meta) P(`\n${meta}`);
  for (const [c, B] of Object.entries(sum.by)) {
    P(`\n## ${c === 'all' ? 'All parties' : `Party: ${c}`} (${B.runs} runs; victories ${B.victories}/${B.runs}; results ${JSON.stringify(B.results)}; mean wipes/run ${f1(B.wipes)}; mean moon ${f1(B.moon)}, empowered finale ${f0(B.empowered)}%)\n`);
    P('| Floor | Arrive lvl (exp) | Boss lvl (exp) | Boss win 1st / all % | P2 win 1st / all % | Wipes/run (% runs) | Boss wipes | Fights | Auto-res % | Downs | Deaths | 1-shots | Bursts | Elite win % (n) | Gold in/out | Chests | Rare/Epic/Leg | Grind % runs · fights · min | Steps | Min |');
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const f of B.floors) P(`| B${f.floor} | ${f1(f.arrLvl)} (${f.expArrival}) | ${f1(f.bossLvl)} (${f.expBoss}) | ${f0(f.bossFirstWin)} / ${f0(f.bossAllWin)} | ${f.p2FirstWin == null ? '–' : `${f0(f.p2FirstWin)} / ${f0(f.p2AllWin)}`} | ${f1(f.wipes)} (${f0(f.wipeRuns)}) | ${f1(f.bossWipes)} | ${f1(f.fights)} | ${f0(f.trivialShare)} | ${f1(f.downs)} | ${f1(f.deaths)} | ${f1(f.oneShots)} | ${f1(f.bursts)} | ${f0(f.eliteWin)} (${f1(f.eliteN)}) | ${f0(f.goldEarned)} / ${f0(f.goldSpent)} | ${f1(f.chests)} | ${f1(f.rare)}/${f1(f.epic)}/${f1(f.legendary)} | ${f0(f.grindShare)} · ${f1(f.grindFights)} · ${f1(f.grindMin)} | ${f0(f.steps)} | ${f0(f.minutes)} |`);
  }
  const all = sum.encounters;
  P('\n## Encounter hot-spots (n ≥ 6): highest loss / KO rate\n'); P('| Floor | Kind | Group | n | Loss % | Downs/fight | Deaths/fight | 1-shots/fight | HP lost % | Rounds | Party lvl | SRD-deadly lvl |'); P('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const e of [...all].sort((a, b) => b.lossPct - a.lossPct || b.downsPer - a.downsPer).slice(0, 18)) P(`| B${e.floor} | ${e.kind} | ${e.sig} | ${e.n} | ${f1(e.lossPct)} | ${e.downsPer.toFixed(2)} | ${e.deathsPer.toFixed(2)} | ${e.osPer.toFixed(2)} | ${f0(e.hpLostPct)} | ${f1(e.roundsAvg)} | ${f1(e.lvlAvg)} | ${e.dl} |`);
  P('\n## Too-easy fights (non-boss, n ≥ 6, lowest HP lost, no KOs)\n'); P('| Floor | Kind | Group | n | HP lost % | Downs/fight | Auto-resolved % | Party lvl | SRD-deadly lvl |'); P('|---|---|---|---|---|---|---|---|---|');
  for (const e of [...all].filter((e) => !['boss', 'phase2'].includes(e.kind) && e.downsPer === 0).sort((a, b) => a.hpLostPct - b.hpLostPct).slice(0, 14)) P(`| B${e.floor} | ${e.kind} | ${e.sig} | ${e.n} | ${f0(e.hpLostPct)} | ${e.downsPer.toFixed(2)} | ${f0(e.trivialPct)} | ${f1(e.lvlAvg)} | ${e.dl} |`);
  P('\n## One-shots (a hero at FULL HP dropped by one monster turn), by monster\n'); P(sum.oneShotBy.slice(0, 14).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'none');
  P('\n## Bursts (a hero at ≥75% HP dropped by one monster turn), by monster\n'); P(sum.burstBy.slice(0, 14).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'none');
  return o.join('\n') + '\n';
}
