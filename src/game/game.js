// Core game state & exploration logic (DOM-free, so it can be unit tested and simulated).
import { getLevel, DIRS, W, H, tileOrdinal, LEVEL_DEFS, setDungeonSeeds, randomSeeds } from '../dungeon/levels.js';
import { createCharacter, assignByPriority, longRest, shortRest, levelUp, canLevelUp, check, thievesTools, passive, isDown, abilityMod, canWearArmor, skillMod, knownSpells, spellMod, heal } from '../rules/character.js';
import { ITEMS, WEAPONS, ARMOR, CLASSES, XP_LEVELS, SPELLS } from '../rules/data.js';
import { roll, rand, pick, die, d20 } from '../rules/dice.js';
import { COMPANIONS, COMPANION_KEYS, banter } from './companions.js';
import * as Story from './story.js';
import { randomPortrait, PORTRAIT_COUNT } from '../portraits.js';
const givePortrait = (c, want = null) => { c.portrait = Number.isInteger(want) && want >= 0 && want < PORTRAIT_COUNT ? want : randomPortrait(c.race, c.cls); return c; };
import * as Narr from './narration.js';
export { Narr };
export { Story };
export const NLEVELS = LEVEL_DEFS.length;

export const SAVE_KEY = 'blackspire.save.v1';

export function newGame({ name = 'Hero', race = 'human', cls = 'fighter', base = null, randomDungeons = false, seeds = null, portrait = null } = {}) {
  const dseeds = seeds || (randomDungeons ? randomSeeds() : null); setDungeonSeeds(dseeds);
  const hero = createCharacter({ name, race, cls, base: base || assignByPriority(cls) });
  hero.ai = false; givePortrait(hero, portrait);
  const comps = COMPANION_KEYS.map((k) => { const C = COMPANIONS[k]; return createCharacter({ name: C.short, race: C.race, cls: C.cls, base: C.base, companion: k, skills: C.skills }); }).map((c) => givePortrait(c));
  // Default marching order: fighter-types in front
  const party = [hero, ...comps];
  const order = { fighter: 0, cleric: 1, rogue: 2, wizard: 3 };
  party.sort((a, b) => order[a.cls] - order[b.cls]);
  if (!party.slice(0, 2).includes(hero) && hero.cls !== 'wizard') { /* hero rogue goes 3rd; ok */ }
  return {
    version: 2, party, roster: [], gold: 120, inventory: ['potionHealing', 'potionHealing', 'potionHealing'], spoons: 0,
    mode: 'town', level: 0, x: 1, y: 1, dir: 1, mods: LEVEL_DEFS.map(() => ({})), explored: LEVEL_DEFS.map(() => []), maxDepth: 0,
    bossDead: LEVEL_DEFS.map(() => false), victory: false, steps: 0, sinceEncounter: 0, keys: [], playTime: 0,
    seeds: dseeds, randomDungeons: !!dseeds,
    flags: {}, journal: [], notes: [], moon: 0, rests: 0, quests: { main: 'active' }, pois: {},
  };
}
export const isHero = (c) => !c.companion && !c.recruit;
export function heroOf(s) { return s.party.find(isHero) || s.party[0]; }

/* ---------- Recruiting / roster ---------- */
export const MAX_PARTY = 4;
export function partyLevel(s) {
  const a = [...s.party, ...(s.roster || [])].filter((c) => !c.dead);
  return Math.max(1, a.length ? Math.round(a.reduce((t, c) => t + c.level, 0) / a.length) : 1);
}
function raiseTo(c, L) {
  while (c.level < L) { c.xp = Math.max(c.xp, XP_LEVELS[c.level]); if (!levelUp(c).length) break; }
  c.xp = Math.max(c.xp, XP_LEVELS[c.level - 1] || 0); longRest(c); c.hp = c.maxHp;
}
function place(s, c) {
  s.roster ||= [];
  if (s.party.length < MAX_PARTY) { s.party.push(c); return `${c.name} joins the party!`; }
  s.roster.push(c); return `The party is full — ${c.name} waits in the roster at the Tavern.`;
}
export function availableCompanions(s) {
  const used = new Set([...s.party, ...(s.roster || [])].map((c) => c.companion).filter(Boolean));
  return Object.keys(COMPANIONS).filter((k) => !used.has(k));
}
export function recruitCompanion(s, key) {
  const C = COMPANIONS[key]; if (!C || !availableCompanions(s).includes(key)) return [{ log: 'They are not available.', cls: 'dim' }];
  const c = createCharacter({ name: C.short, race: C.race, cls: C.cls, base: C.base, companion: key, skills: C.skills }); givePortrait(c);
  raiseTo(c, partyLevel(s));
  const out = [{ log: place(s, c), cls: 'good' }];
  if (C.lines.recruit) out.push({ banter: { who: C.short, color: C.color, text: pick(C.lines.recruit) } });
  return out;
}
export function createRecruit(s, { name, race, cls, base, portrait = null }) {
  const c = createCharacter({ name: (name || 'Recruit').trim().slice(0, 18) || 'Recruit', race, cls, base: base || assignByPriority(cls) });
  c.recruit = true; c.ai = true; givePortrait(c, portrait); raiseTo(c, partyLevel(s));
  const ev = [{ log: place(s, c), cls: 'good' }]; ev.char = c; return ev;
}
export function dismiss(s, c) {
  if (isHero(c)) return [{ log: 'You cannot dismiss yourself.', cls: 'dim' }];
  const i = s.party.indexOf(c); if (i < 0) return [];
  s.party.splice(i, 1); (s.roster ||= []).push(c);
  return [{ log: `${c.name} ${c.dead ? 'is carried to' : 'heads to'} the Tavern roster.`, cls: 'sys' }];
}
export function rejoin(s, c) {
  const i = (s.roster || []).indexOf(c); if (i < 0) return [];
  if (s.party.length >= MAX_PARTY) return [{ log: 'The party is full (4). Dismiss someone first.', cls: 'bad' }];
  s.roster.splice(i, 1); s.party.push(c); return [{ log: `${c.name} rejoins the party.`, cls: 'good' }];
}
/** Characters who just became able to level up (one-time notice). */
export function newlyReady(s) {
  const out = [];
  for (const c of s.party) { const r = canLevelUp(c); if (r && !c.readyNotified) { c.readyNotified = true; out.push(c); } else if (!r) c.readyNotified = false; }
  return out;
}

/* ---------- Tiles ---------- */
export function tile(s, x, y, lvl = s.level) {
  if (x < 0 || y < 0 || x >= W || y >= H) return '#';
  const m = s.mods[lvl][`${x},${y}`]; if (m !== undefined) return m;
  return getLevel(lvl).tiles[y][x];
}
export function setTile(s, x, y, ch, lvl = s.level) { s.mods[lvl][`${x},${y}`] = ch; }
export const isSolid = (ch) => ch === '#' || ch === 'S' || ch === 'L';
export function markExplored(s) {
  const e = new Set(s.explored[s.level]);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) e.add(`${s.x + dx},${s.y + dy}`);
  // line of sight: reveal the corridor ahead (and its walls) until a solid tile, like the 3D view shows
  const [fx, fy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][s.dir];
  for (let i = 1, x = s.x + fx, y = s.y + fy; i <= 6; i++, x += fx, y += fy) {
    e.add(`${x},${y}`); e.add(`${x + fy},${y + fx}`); e.add(`${x - fy},${y - fx}`);
    if (x < 0 || y < 0 || isSolid(tile(s, x, y))) break;
  }
  s.explored[s.level] = [...e];
}

export function enterDungeon(s, lvl = 0) {
  s.mode = 'dungeon'; s.level = lvl;
  const L = getLevel(lvl);
  if (lvl === 0 || !s.arriveAtDown) { s.x = L.start[0]; s.y = L.start[1]; s.dir = L.start[2]; }
  s.sinceEncounter = 0; markExplored(s);
  return [{ log: `You enter ${L.def.name}.`, cls: 'sys' }, ...Narr.floorIntro(s, lvl)];
}

function encounterGroups(table) {
  return pick(table).map((g) => ({ key: g.key, count: g.count[0] + Math.floor(rand() * (g.count[1] - g.count[0] + 1)) }));
}
export function randomEncounter(s) { return encounterGroups(getLevel(s.level).def.table); }
const bestBy = (s, f) => s.party.filter((c) => !isDown(c)).reduce((b, c) => (f(c) > f(b) ? c : b), s.party.find((c) => !isDown(c)) || s.party[0]);
const guidance = (s) => s.party.some((c) => c.cls === 'cleric' && !isDown(c));

export function turn(s, d) { s.dir = (s.dir + d + 4) % 4; markExplored(s); return []; }

/** Try to move. rel: 0 forward, 2 back, 1 strafe right, 3 strafe left. Returns events. */
export function move(s, rel = 0) {
  if (s.mode !== 'dungeon') return [];
  const d = (s.dir + rel) % 4; const [dx, dy] = DIRS[d];
  const nx = s.x + dx, ny = s.y + dy; const ch = tile(s, nx, ny);
  const out = [];
  if (ch === '#' || ch === 'S') return [{ log: 'Ouch! A wall.', cls: 'dim', bump: true }];
  if (ch === 'L') {
    const def = getLevel(s.level).def;
    if (s.keys.includes(def.key)) { setTile(s, nx, ny, 'd'); out.push({ log: `You unlock the door with the ${ITEMS[def.key].name}.`, cls: 'good', sfx: 'door' }); }
    else return [{ log: 'A heavy locked door. (Find the key, or use Pick Lock / Force from the Search menu.)', cls: 'dim', bump: true, locked: { x: nx, y: ny } }];
  }
  if (ch === 'D') { setTile(s, nx, ny, 'd'); out.push({ log: 'The door creaks open.', sfx: 'door' }); }
  s.x = nx; s.y = ny; s.steps++; s.sinceEncounter++;
  for (const c of s.party) if (c.conditions.poisoned && c.conditions.poisoned.steps && --c.conditions.poisoned.steps <= 0) { delete c.conditions.poisoned; out.push({ log: `${c.name} is no longer poisoned.` }); }
  markExplored(s);
  out.push(...Narr.secretAt(s, getLevel(s.level), nx, ny));
  out.push(...enterTile(s));
  return out;
}

export function enterTile(s) {
  const ch = tile(s, s.x, s.y); const L = getLevel(s.level); const def = L.def; const out = [...Narr.areaAt(s, L, s.x, s.y)];
  const passivePerc = Math.max(...s.party.filter((c) => !isDown(c)).map((c) => passive(c, 'perception')));
  // Passive notice of adjacent secret doors
  for (const [dx, dy] of DIRS) if (tile(s, s.x + dx, s.y + dy) === 'S' && passivePerc >= def.secretDC + 3) { setTile(s, s.x + dx, s.y + dy, 'D'); out.push({ log: 'Your keen eyes notice a hidden door!', cls: 'good', card: true, banter: banter(s.party, 'secret', {}, 0.9), reveal: true }); }
  switch (ch) {
    case 'T': {
      if (passivePerc >= def.trapDC) { setTile(s, s.x, s.y, 't'); out.push({ log: `You spot a hidden ${def.trapKind === 'pit' ? 'pit' : 'dart trap'} (passive Perception ${passivePerc}) and step around it.`, card: true, cls: 'good' }); break; }
      setTile(s, s.x, s.y, 't');
      if (def.trapKind === 'pit') {
        const v = s.party.find((c) => !isDown(c)); const dc = 15;
        const sv = d20() + abilityMod(v, 'dex'); if (sv >= dc) out.push({ log: `A pit opens! ${v.name} leaps aside (Dex ${sv}).` });
        else { const d = roll(def.trapDmg); v.hp = Math.max(1, v.hp - d); out.push({ log: `A pit opens! ${v.name} falls in for ${d} damage.`, cls: 'bad', card: true, banter: banter(s.party, 'trap', {}, 0.9), shake: true }); }
      } else {
        for (const c of s.party.filter((c) => !isDown(c))) {
          const hit = d20() + 8 >= (c.equip ? 10 : 10) + (c.equip.armor ? 4 : 2) + abilityMod(c, 'dex');
          if (!hit) continue; let d = roll('1d4');
          const con = d20() + abilityMod(c, 'con') + (c.race === 'hillDwarf' ? 2 : 0); let p = roll(def.trapDmg);
          if (con >= 15) p = Math.floor(p / 2); else c.conditions.poisoned = { steps: 60 };
          if (c.race === 'hillDwarf') p = Math.floor(p / 2);
          d += p; c.hp = Math.max(1, c.hp - d); out.push({ log: `Poison darts hit ${c.name} for ${d}${con < 15 ? ' — poisoned!' : ''}.`, cls: 'bad' });
        }
        out.push({ banter: banter(s.party, 'trap', {}, 0.9), shake: true });
      }
      break;
    }
    case 'C': out.push({ prompt: 'chest' }); break;
    case 'K': {
      setTile(s, s.x, s.y, '.'); s.keys.push(def.key); s.inventory.push(def.key);
      out.push({ log: `You found the ${ITEMS[def.key].name}!`, cls: 'good', banter: banter(s.party, 'loot', {}, 0.7) }); break;
    }
    case 'Q': {
      const id = Story.poiAt(s.level, tileOrdinal(L, s.x, s.y));
      const ev = Story.visitPoi(s, id); if (ev.consumed) setTile(s, s.x, s.y, '.');
      out.push(...ev); if (ev.some((e) => e.combat)) { s.sinceEncounter = 0; return out; }
      if (ev.some((e) => e.prompt)) return out;
      break;
    }
    case 'M': out.push({ log: def.messages[tileOrdinal(L, s.x, s.y) % def.messages.length], cls: 'lore', card: true }); break;
    case 'F': {
      out.push({ log: 'A glowing fountain. You drink: the party is healed and refreshed.', cls: 'good' });
      for (const c of s.party) if (!c.dead) { c.hp = c.maxHp; delete c.conditions.poisoned; }
      setTile(s, s.x, s.y, 'f'); break;
    }
    case 'E': {
      const groups = encounterGroups([def.fixed[tileOrdinal(L, s.x, s.y) % def.fixed.length]]);
      setTile(s, s.x, s.y, '.');
      out.push({ log: 'Something is lurking here!', cls: 'bad', combat: { groups, fixed: true } }); s.sinceEncounter = 0; return out;
    }
    case 'B': {
      if (!s.bossDead[s.level]) {
        if (def.phase2 && s.flags?.boss4p1) { out.push({ log: 'The vault floor splits open. GORVAX THE TYRANT rises!', cls: 'bad', shake: true, combat: { groups: def.phase2.map((g) => ({ key: g.key, count: g.count[0] })), boss: true, phase2: true } }); return out; }
        out.push({ log: `${def.bossName} blocks the way!`, cls: 'bad', combat: { groups: def.boss.map((g) => ({ key: g.key, count: g.count[0] })), boss: true } }); return out;
      }
      break;
    }
    case '>': out.push({ prompt: 'down' }); break;
    case '<': out.push({ prompt: 'up' }); break;
    case 'A': out.push({ prompt: 'altar' }); break;
  }
  // Random encounters
  if (!out.some((o) => o.combat || o.prompt) && s.sinceEncounter > 6 && rand() < 0.045) {
    s.sinceEncounter = 0; out.push({ log: 'Monsters appear!', cls: 'bad', combat: { groups: randomEncounter(s) } });
  }
  return out;
}

export function afterCombat(s, combat, info = {}) {
  const out = [];
  if (combat.state === 'won') {
    s.gold += combat.gold;
    const def = getLevel(s.level).def;
    const chain = info.boss && def.phase2 && !info.phase2;
    if (info.boss && !chain) { s.bossDead[s.level] = true; setTile(s, s.x, s.y, '.'); const q = [600, 3000, 9000, 22000, 0][s.level] || 0; if (q) for (const c of s.party) if (!c.dead) c.xp += q; out.push({ log: `The guardian is defeated! The way onward is open.${q ? ` Quest bonus: ${q} XP each.` : ''}`, cls: 'good' }); }
    if (info.poi && tile(s, s.x, s.y) === 'Q') setTile(s, s.x, s.y, '.');
    out.push(...Story.onCombatWon(s, info, s.level));
    if (rand() < 0.2) { s.inventory.push('potionHealing'); out.push({ log: 'Found a Potion of Healing among the remains.', cls: 'good' }); }
    if (rand() < 0.06) { s.inventory.push('spoon'); s.spoons++; out.push({ log: 'Found a Silver Spoon!', cls: 'good', banter: banter(s.party, 'spoon', {}, 1) }); }
    if (info.boss && def.final && !chain) { s.victory = true; s.quests.main = 'done'; s.flags.elowenRescued = true; if (s.notes?.length >= 10 && s.quests.notes) s.quests.notes = 'done'; }
    // Unconscious survivors wake with 1 HP
    for (const c of s.party) if (!c.dead && c.hp <= 0) { c.hp = 1; delete c.conditions.unconscious; c.stable = false; c.deathSaves = { s: 0, f: 0 }; out.push({ log: `${c.name} is patched up and wakes with 1 HP.` }); }
    for (const c of s.party) delete c.conditions.grappled;
    if (chain) {
      out.push({ log: 'Malthrax falls to his knees, laughing. "You think I came alone? WAKE, GORVAX!" The vault floor splits open...', cls: 'crit', shake: true });
      out.push({ combat: { groups: def.phase2.map((g) => ({ key: g.key, count: g.count[0] })), boss: true, phase2: true } });
    }
  } else if (combat.state === 'lost') {
    // Rescue: a party of temple acolytes drags you back to town
    s.mode = 'town'; const lost = Math.floor(s.gold / 2); s.gold -= lost;
    for (const c of s.party) { if (!c.dead) { c.hp = 1; c.conditions = {}; c.deathSaves = { s: 0, f: 0 }; c.stable = false; } }
    out.push({ log: `Total party knockout! Temple acolytes drag you back to town. They charge ${lost} gold for the trouble.`, cls: 'bad', toTown: true });
  } else if (combat.state === 'fled') {
    for (const c of s.party) delete c.conditions.grappled;
    // step back
    const [dx, dy] = DIRS[(s.dir + 2) % 4]; if (!isSolid(tile(s, s.x + dx, s.y + dy))) { s.x += dx; s.y += dy; }
  }
  return out;
}

/* ---------- Search, locks, chests ---------- */
export function search(s) {
  const def = getLevel(s.level).def; const out = [];
  const who = bestBy(s, (c) => c.skills.includes('perception') ? passive(c, 'perception') : passive(c, 'perception') - 1);
  const r = check(who, 'perception', { guidance: guidance(s) });
  let found = false;
  for (const [dx, dy] of DIRS) {
    const x = s.x + dx, y = s.y + dy;
    if (tile(s, x, y) === 'S' && r.total >= def.secretDC) { setTile(s, x, y, 'D'); found = true; }
    if (tile(s, x, y) === 'T' && r.total >= def.trapDC) { setTile(s, x, y, 't'); out.push({ log: `${who.name} finds a hidden trap and disarms it.`, cls: 'good', card: true }); }
  }
  out.unshift({ log: `${who.name} searches (Perception ${r.total})… ${found ? 'a secret door!' : 'nothing obvious.'}`, cls: found ? 'good' : 'dim', reveal: found });
  if (found) out.push({ banter: banter(s.party, 'secret', {}, 0.9) });
  if (rand() < 0.08) out.push({ log: 'Your searching made noise…', cls: 'bad', combat: { groups: randomEncounter(s) } });
  return out;
}
export function lockAt(s) { for (const [dx, dy] of DIRS) if (tile(s, s.x + dx, s.y + dy) === 'L') return [s.x + dx, s.y + dy]; return null; }
export function pickLock(s, force = false) {
  const p = lockAt(s); if (!p) return [{ log: 'There is no locked door here.', cls: 'dim' }];
  const def = getLevel(s.level).def;
  if (force) {
    const who = bestBy(s, (c) => abilityMod(c, 'str')); const r = check(who, 'athletics');
    if (r.total >= def.lockDC + 2) { setTile(s, p[0], p[1], 'd'); return [{ log: `${who.name} shoulders the door open! (Athletics ${r.total})`, cls: 'good', sfx: 'door' }]; }
    return [{ log: `${who.name} bounces off the door. (Athletics ${r.total})`, cls: 'dim' }, ...(rand() < 0.35 ? [{ log: 'The racket attracts attention!', cls: 'bad', combat: { groups: randomEncounter(s) } }] : [])];
  }
  const who = bestBy(s, thievesTools); const r = d20({}) + thievesTools(who);
  if (r >= def.lockDC) { setTile(s, p[0], p[1], 'd'); return [{ log: `${who.name} picks the lock! (${r})`, cls: 'good', sfx: 'door' }]; }
  return [{ log: `${who.name} fails to pick the lock. (${r} vs DC ${def.lockDC})`, cls: 'dim' }];
}
function chestState(s) { const k = `chest:${s.level}:${s.x},${s.y}`; s.chests = s.chests || {}; if (!s.chests[k]) { s.chests[k] = { trapped: rand() < 0.45, found: false, disarmed: false }; } return s.chests[k]; }
export function inspectChest(s) {
  const st = chestState(s); const def = getLevel(s.level).def;
  const who = bestBy(s, (c) => c.cls === 'rogue' ? 99 : abilityMod(c, 'int')); const r = check(who, 'investigation');
  if (st.trapped && r.total >= def.trapDC) { st.found = true; return [{ log: `${who.name} inspects the chest (Investigation ${r.total}): a poison needle trap!`, cls: 'bad' }]; }
  return [{ log: `${who.name} inspects the chest (Investigation ${r.total}): looks safe${st.trapped ? '…?' : '.'}`, cls: 'dim' }];
}
export function disarmChest(s) {
  const st = chestState(s); const def = getLevel(s.level).def;
  const who = bestBy(s, thievesTools); const r = d20() + thievesTools(who);
  if (!st.trapped) return [{ log: `${who.name} fiddles with the lock. There was no trap.`, cls: 'dim' }];
  if (r >= def.trapDC) { st.trapped = false; return [{ log: `${who.name} disarms the trap (${r}).`, cls: 'good' }]; }
  if (r < def.trapDC - 5) { return [...springNeedle(s, who), ...openChest(s, true)]; }
  return [{ log: `${who.name} can't quite disarm it (${r}). Try again?`, cls: 'dim' }];
}
function springNeedle(s, who) {
  const st = chestState(s); st.trapped = false;
  const d = 1 + roll('2d10'); const con = d20() + abilityMod(who, 'con'); let dmg = d; const out = [];
  if (con < 15) { who.conditions.poisoned = { steps: 80 }; out.push({ log: `${who.name} is poisoned!`, cls: 'bad' }); } else dmg = Math.floor(d / 2);
  if (who.race === 'hillDwarf') dmg = Math.floor(dmg / 2);
  who.hp = Math.max(1, who.hp - dmg);
  out.unshift({ log: `A poison needle stabs ${who.name} for ${dmg}!`, cls: 'bad', banter: banter(s.party, 'trap', {}, 0.9) });
  return out;
}
export function openChest(s, skipTrap = false) {
  const st = chestState(s); const def = getLevel(s.level).def; const out = [];
  if (st.trapped && !skipTrap) out.push(...springNeedle(s, s.party.find((c) => !isDown(c))));
  const gold = def.loot.gold[0] + Math.floor(rand() * (def.loot.gold[1] - def.loot.gold[0]));
  s.gold += gold;
  const n = 1 + (rand() < 0.5 ? 1 : 0); const items = [];
  for (let i = 0; i < n; i++) { const it = pick(def.loot.items); s.inventory.push(it); items.push(it); if (ITEMS[it].spoon) s.spoons++; }
  setTile(s, s.x, s.y, 'o');
  out.push({ log: `The chest holds ${gold} gold and: ${items.map((i) => ITEMS[i].name).join(', ')}.`, cls: 'good', sfx: 'chest' });
  const spoon = items.some((i) => ITEMS[i].spoon);
  out.push({ banter: banter(s.party, spoon ? 'spoon' : 'loot', {}, spoon ? 1 : 0.7) });
  return out;
}

/* ---------- Stairs ---------- */
export function goDown(s) {
  if (s.level >= LEVEL_DEFS.length - 1) return [];
  s.level++; s.maxDepth = Math.max(s.maxDepth, s.level);
  const L = getLevel(s.level); s.x = L.start[0]; s.y = L.start[1]; s.dir = L.start[2]; markExplored(s);
  const intro = Narr.floorIntro(s, s.level);
  return [{ log: `You descend to ${L.def.name}.`, cls: 'sys', banter: intro.some((e) => e.card) ? null : banter(s.party, 'stairs', {}, 0.9) }, ...intro];
}
export function goUp(s) {
  if (s.level === 0) { s.mode = 'town'; return [{ log: 'You climb back to the town of Emberhollow.', cls: 'sys', toTown: true }]; }
  s.level--; const L = getLevel(s.level);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.tiles[y][x] === '>') { s.x = x; s.y = y; }
  // face away from dead end
  for (let d = 0; d < 4; d++) { const [dx, dy] = DIRS[d]; if (!isSolid(tile(s, s.x + dx, s.y + dy))) s.dir = d; }
  markExplored(s);
  return [{ log: `You climb up to ${L.def.name}.`, cls: 'sys', banter: banter(s.party, 'stairs', {}, 0.6) }, ...Narr.floorIntro(s, s.level)];
}

/* ---------- Rest ---------- */
export function rest(s, kind) {
  const out = [];
  if (s.mode === 'dungeon' && rand() < (kind === 'long' ? 0.3 : 0.12)) {
    out.push({ log: 'Your rest is interrupted by monsters!', cls: 'bad', combat: { groups: randomEncounter(s) } }); return out;
  }
  if (kind === 'short') { for (const c of s.party) for (const l of shortRest(c)) out.push({ log: l }); out.push({ log: 'The party takes a short rest (1 hour).', cls: 'good' }); }
  else { for (const c of s.party) longRest(c); out.push({ log: 'The party takes a long rest. HP, spell slots and abilities restored.', cls: 'good' }); out.push(...Story.onLongRest(s)); }
  out.push({ banter: banter(s.party, 'rest', {}, 0.9) });
  return out;
}

/* ---------- Town ---------- */
export function innRest(s) {
  const cost = s.flags?.freeInn ? 0 : 10; if (s.gold < cost) return [{ log: 'Not enough gold for a room (10 gp).', cls: 'bad' }];
  s.gold -= cost; for (const c of s.party) longRest(c);
  return [{ log: cost ? 'You rent rooms at the Boar & Spoon Inn and sleep soundly. (−10 gp)' : 'Marga waves you upstairs. "On the house, love." You sleep soundly.', cls: 'good' }, ...Story.onLongRest(s)];
}
/** Combat options derived from story state (lieutenant/boss set-pieces). */
export function combatOpts(s, info = {}) { return Story.storyCombat(s, info, s.level); }
export function templeCost(c) { return c.dead ? 100 * c.level : c.conditions.poisoned ? 20 : c.hp < c.maxHp ? 5 * c.level : 0; }
export function templeHeal(s, c) {
  let cost = templeCost(c); if (!cost) return [{ log: `${c.name} needs no healing.`, cls: 'dim' }];
  if (c.dead && s.flags?.freeRaise) { s.flags.freeRaise = 0; cost = 0; }
  if (s.gold < cost) return [{ log: `The priests require ${cost} gp.`, cls: 'bad' }];
  s.gold -= cost; const was = c.dead; c.dead = false; c.hp = was ? 1 : c.maxHp; c.conditions = {}; c.deathSaves = { s: 0, f: 0 };
  return [{ log: was ? `The priests of the Temple of Cant raise ${c.name} from the dead! (−${cost} gp)` : `${c.name} is healed. (−${cost} gp)`, cls: 'good' }];
}
export function train(s, c) { if (!canLevelUp(c)) return [{ log: `${c.name} needs more experience.`, cls: 'dim' }]; const m = levelUp(c).map((l) => ({ log: l, cls: 'good' })); m.push({ banter: banter(s.party, 'levelUp', { who: c }, 1) }); return m; }
export function priceOf(key) {
  if (key === 'shield') return 10;
  if (key.startsWith('w:')) return WEAPONS[key.slice(2)].cost;
  if (key.startsWith('a:')) return ARMOR[key.slice(2)].cost;
  return ITEMS[key].cost;
}
export function nameOf(key) {
  if (key === 'shield') return 'Shield';
  if (key.startsWith('w:')) return WEAPONS[key.slice(2)].name;
  if (key.startsWith('a:')) return ARMOR[key.slice(2)].name + ' Armor';
  return ITEMS[key]?.name || key;
}
export function buy(s, key) { const p = priceOf(key); if (s.gold < p) return [{ log: 'Not enough gold.', cls: 'bad' }]; s.gold -= p; s.inventory.push(key); return [{ log: `Bought ${nameOf(key)} for ${p} gp.`, cls: 'good' }]; }
export function sell(s, idx) {
  const key = s.inventory[idx]; if (!key || ITEMS[key]?.kind === 'key') return [];
  const p = Math.floor(priceOf(key) / 2); s.inventory.splice(idx, 1); s.gold += p; if (ITEMS[key]?.spoon) s.spoons = Math.max(0, s.spoons - 1);
  const out = [{ log: `Sold ${nameOf(key)} for ${p} gp.` }];
  if (ITEMS[key]?.spoon && s.party.some((c) => c.companion === 'pip')) out.push({ banter: { who: 'Pip', color: COMPANIONS.pip.color, text: 'You SOLD a SPOON? I need a moment.' } });
  return out;
}
/** Equip an inventory item on a character. */
export function equip(s, c, idx) {
  const key = s.inventory[idx]; if (!key) return [];
  let slot, val;
  if (key === 'shield' || key === 'sunshardAegis') {
    if (!CLASSES[c.cls].armor.includes('shield')) return [{ log: `${c.name} can't use shields.`, cls: 'bad' }];
    if (c.equip.shield === (key === 'shield' ? true : key)) return [{ log: 'Already has that shield.' }];
    if (c.equip.weapon && WEAPONS[c.equip.weapon.base]?.props.includes('two-handed')) return [{ log: `${c.name} is wielding a two-handed weapon.`, cls: 'bad' }];
    const old = c.equip.shield; s.inventory.splice(idx, 1); c.equip.shield = key === 'shield' ? true : key; if (old) s.inventory.push(old === true ? 'shield' : old);
    return [{ log: `${c.name} straps on ${key === 'shield' ? 'a shield' : ITEMS[key].name}.`, cls: 'good' }];
  }
  if (key.startsWith('w:') || ITEMS[key]?.kind === 'weapon') {
    const base = key.startsWith('w:') ? key.slice(2) : ITEMS[key].base; val = { base, magic: ITEMS[key]?.magic || 0 }; if (ITEMS[key]?.set || ITEMS[key]?.kind === 'weapon') val.key = key;
    slot = WEAPONS[base].props.includes('ranged') ? 'ranged' : 'weapon';
    if (WEAPONS[base].props.includes('two-handed') && slot === 'weapon' && c.equip.shield) { s.inventory.push(c.equip.shield === true ? 'shield' : c.equip.shield); c.equip.shield = false; }
  } else if (key.startsWith('a:') || ITEMS[key]?.kind === 'armor') {
    const base = key.startsWith('a:') ? key.slice(2) : ITEMS[key].base; if (!canWearArmor(c, base)) return [{ log: `${c.name} isn't proficient with ${ARMOR[base].type} armor.`, cls: 'bad' }];
    val = { base, magic: ITEMS[key]?.magic || 0 }; if (ITEMS[key]) val.key = key; slot = 'armor';
  } else if (['ring', 'cloak', 'helm'].includes(ITEMS[key]?.kind)) { slot = ITEMS[key].kind; val = key; }
  else return [{ log: 'That cannot be equipped.', cls: 'dim' }];
  const old = c.equip[slot]; s.inventory.splice(idx, 1); c.equip[slot] = val;
  if (old) s.inventory.push(typeof old === 'string' ? old : old.key ? old.key : (old.magic ? Object.keys(ITEMS).find((k) => ITEMS[k].base === old.base && ITEMS[k].magic === old.magic) : (slot === 'armor' ? 'a:' : 'w:') + old.base));
  return [{ log: `${c.name} equips ${nameOf(key)}.`, cls: 'good' }];
}
export function usePotion(s, idx, c) {
  const key = s.inventory[idx]; const I = ITEMS[key]; if (!I || I.kind !== 'potion') return [];
  s.inventory.splice(idx, 1); const out = [];
  if (I.heal) { const b = c.hp; c.hp = Math.min(c.maxHp, Math.max(0, c.hp) + roll(I.heal)); c.deathSaves = { s: 0, f: 0 }; delete c.conditions.unconscious; out.push({ log: `${c.name} drinks ${I.name} (+${c.hp - b} HP).`, cls: 'good' }); }
  if (I.cure) { delete c.conditions[I.cure]; out.push({ log: `${c.name} feels the poison fade.`, cls: 'good' }); }
  return out;
}

/* ---------- Save / Load ---------- */
export function serialize(s) { return JSON.stringify(s); }
export function deserialize(str) {
  const s = JSON.parse(str); if (!s || !Array.isArray(s.party) || !s.party.length) throw new Error('bad save');
  // normalise older / odd saves so they always land somewhere playable (never inside a town sub-screen or a stale combat)
  if (s.mode !== 'dungeon') s.mode = 'town';
  s.roster = Array.isArray(s.roster) ? s.roster : [];
  for (const c of [...s.party, ...s.roster]) if (!Number.isInteger(c.portrait) || c.portrait < 0 || c.portrait >= PORTRAIT_COUNT) givePortrait(c); // old saves: random portrait
  const N = LEVEL_DEFS.length;
  if (!Array.isArray(s.seeds) || s.seeds.length !== N) { s.seeds = null; s.randomDungeons = false; } setDungeonSeeds(s.seeds); // old saves: fixed classic layouts
  s.mods ||= []; s.explored ||= []; s.bossDead ||= [];
  if ((s.version | 0) < 2) { // GrokWizard (3 floors) -> BLACKSPIRE (5 floors): old B3 vault became B5; the new B3 starts fresh
    s.mods[2] = {}; s.explored[2] = []; s.bossDead[2] = false; s.victory = false; if (s.level === 2 && s.mode === 'dungeon') { s.mode = 'town'; } s.maxDepth = Math.min(s.maxDepth | 0, 2);
    s.keys = (s.keys || []).filter((k) => k !== 'key3'); s.inventory = (s.inventory || []).filter((k) => k !== 'key3');
    s.flags = { ...(s.flags || {}), prologue: true }; s.version = 2;
  }
  while (s.mods.length < N) s.mods.push({}); while (s.explored.length < N) s.explored.push([]); while (s.bossDead.length < N) s.bossDead.push(false);
  Story.initStory(s);
  for (const c of [...s.party, ...s.roster]) { c.equip ||= {}; if (!('helm' in c.equip)) c.equip.helm = null; }
  s.level = Math.min(N - 1, Math.max(0, s.level | 0)); s.maxDepth = Math.max(s.maxDepth | 0, s.level);
  if (s.mode === 'dungeon' && !(Number.isInteger(s.x) && Number.isInteger(s.y))) s.mode = 'town';
  return s;
}
export function campDialogue(s) {
  const alive = s.party.filter((c) => c.companion && !c.dead);
  if (!alive.length) return 'The camp is quiet. Too quiet.';
  const c = pick(alive); return pick(COMPANIONS[c.companion].camp);
}
export { die };

/** Best living party member attempts a skill check. */
export function partyCheck(s, skill, dc) {
  const live = s.party.filter((c) => !c.dead && c.hp > 0); if (!live.length) return false;
  const best = Math.max(...live.map((c) => skillMod(c, skill))); return d20() + best >= dc;
}

/* ---------- Camp healing: spells and potions on a chosen ally ---------- */
export const CAMP_HEALS = ['cureWounds', 'healingWord', 'prayerOfHealing', 'massCureWounds', 'lesserRestoration'];
const CAMP_HEAL_LINES = {
  cureWounds: ['{c} lays a glowing hand on {t}; torn flesh draws itself closed.', '{c} murmurs a prayer over {t}, and warm light seeps into every wound.'],
  healingWord: ['{c} speaks a single bright word, and {t}\'s bruises fade like breath on glass.', '{c} whispers {t}\'s name with a blessing; the pain simply lets go.'],
  prayerOfHealing: ['{c} leads ten quiet minutes of prayer. Candlelight seems to pour into the whole party.'],
  massCureWounds: ['{c} raises both hands, and a wave of golden light rolls over the camp.'],
  lesserRestoration: ['{c} touches {t}\'s brow; the sickness drains away like ink from water.'],
  potion: ['{t} gulps the red potion. It tastes of cinnamon and copper, and the wounds knit shut.'],
};
const fill = (k, o) => { const a = CAMP_HEAL_LINES[k]; return a[Math.floor(rand() * a.length)].replace('{c}', o.c).replace('{t}', o.t); };
export const hurt = (c) => !c.dead && c.hp < c.maxHp;
const ailing = (c) => !c.dead && ['poisoned', 'paralyzed', 'blinded'].some((k) => c.conditions[k]);
/** Heal spells a conscious caster can cast now, with the slot levels they could use. */
export function campHealOptions(c) {
  if (c.dead || isDown(c)) return [];
  return knownSpells(c).filter((k) => CAMP_HEALS.includes(k)).map((k) => ({ k, s: SPELLS[k], levels: c.slots.map((n, i) => (n > 0 && i + 1 >= SPELLS[k].level ? i + 1 : 0)).filter(Boolean) })).filter((o) => o.levels.length);
}
export function campTargetsFor(s, k) { return k === 'lesserRestoration' ? s.party.filter(ailing) : s.party.filter(hurt); }
export function campHeal(s, c, k, lvl, target) {
  const S = SPELLS[k]; if (!S || !c.slots[lvl - 1]) return { ev: [{ log: 'No slot left for that.', cls: 'dim' }] };
  const tgs = S.target === 'allAllies' ? s.party.filter((p) => !p.dead).slice(0, 6) : [target];
  if (!tgs.length || tgs.some((t) => !t || t.dead)) return { ev: [{ log: 'The dead need the temple, not a spell.', cls: 'dim' }] };
  c.slots[lvl - 1]--;
  const rows = [];
  if (k === 'lesserRestoration') { const t = tgs[0]; const cured = S.cure.filter((x) => t.conditions[x]); for (const x of cured) delete t.conditions[x]; rows.push({ t, before: t.hp, after: t.hp, note: cured.length ? `cured of ${cured.join(', ')}` : 'nothing to cure' }); }
  else {
    const up = lvl - S.level, sm = spellMod(c);
    for (const t of tgs) { const before = t.hp; let amt = roll(S.perLevel && up ? `${(parseInt(S.heal) || 1) + up}${S.heal.slice(S.heal.indexOf('d'))}` : S.heal) + (S.addMod ? sm : 0); if (c.cls === 'cleric') amt += 2 + lvl; heal(t, Math.max(1, amt)); rows.push({ t, before: Math.max(0, before), after: t.hp, revived: before <= 0 && t.hp > 0 }); }
  }
  const text = fill(k, { c: c.name, t: tgs.length > 1 ? 'the party' : tgs[0].name });
  const lines = rows.map((r) => `${r.note ? '💊' : '❤'} ${r.t.name}: ${r.note || `HP ${r.before} → ${r.after}/${r.t.maxHp}`}${r.revived ? ' — back on their feet!' : ''}`);
  lines.push(`✦ ${c.name} spends a level ${lvl} slot (${c.slots[lvl - 1]} left)`);
  return { ev: [{ log: `${c.name} casts ${S.name}${lvl > S.level ? ` at level ${lvl}` : ''}. ${lines.slice(0, -1).map((l) => l.slice(2)).join('; ')}.`, cls: 'spell' }], card: { text: `✨ ${text}`, cls: 'loot', lines } };
}
export function campPotion(s, target) {
  const i = s.inventory.indexOf('potionHealing'); if (i < 0 || !target || target.dead) return { ev: [{ log: 'No potion to use.', cls: 'dim' }] };
  s.inventory.splice(i, 1); const before = Math.max(0, target.hp); heal(target, roll(ITEMS.potionHealing.heal)); const left = s.inventory.filter((x) => x === 'potionHealing').length;
  const lines = [`❤ ${target.name}: HP ${before} → ${target.hp}/${target.maxHp}${before === 0 && target.hp > 0 ? ' — back on their feet!' : ''}`, `🧪 ${left} Potion${left === 1 ? '' : 's'} of Healing left`];
  return { ev: [{ log: `${target.name} drinks a Potion of Healing (HP ${before} → ${target.hp}).`, cls: 'good' }], card: { text: `🧪 ${fill('potion', { t: target.name })}`, cls: 'loot', lines } };
}
