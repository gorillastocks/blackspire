// Core game state & exploration logic (DOM-free, so it can be unit tested and simulated).
import { getLevel, DIRS, W, H, tileOrdinal, LEVEL_DEFS, setDungeonSeeds, randomSeeds } from '../dungeon/levels.js';
import { createCharacter, assignByPriority, longRest, shortRest, levelUp, canLevelUp, check, thievesTools, passive, isDown, abilityMod, canWearArmor, skillMod, knownSpells, spellMod, heal } from '../rules/character.js';
import { ITEMS, WEAPONS, ARMOR, CLASSES, XP_LEVELS, SPELLS, DROP_POOL, tierOf } from '../rules/data.js';
import { elitePos, LORE } from '../dungeon/extras.js';
import { roll, rand, pick, die, d20 } from '../rules/dice.js';
import { COMPANIONS, COMPANION_KEYS, banter } from './companions.js';
import * as Story from './story.js';
import { randomPortrait, PORTRAIT_COUNT, PORTRAIT_TOTAL, LIORA_PORTRAIT } from '../portraits.js';
const goodPortrait = (c, i) => Number.isInteger(i) && i >= 0 && (i < PORTRAIT_COUNT || (c.companion === 'liora' && i < PORTRAIT_TOTAL));
const givePortrait = (c, want = null) => { if (c.companion === 'liora') { c.portrait = LIORA_PORTRAIT; return c; } c.portrait = Number.isInteger(want) && want >= 0 && want < PORTRAIT_COUNT ? want : randomPortrait(c.race, c.cls); return c; };
import * as Narr from './narration.js';
import * as PC from './phaseC.js';
import * as Prog from './progress.js';
import { isLevelLocked } from '../entitlements.js';
import { Combat } from '../rules/combat.js';
export { Narr, Prog, PC };
export { Story };
export const NLEVELS = LEVEL_DEFS.length;

export const SAVE_KEY = 'blackspire.save.v1';

const withPC = (s) => { PC.ensure(s); return s; };
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
  return withPC(Prog.initProgress({
    version: 6, party, roster: [], gold: 120, inventory: ['potionHealing', 'potionHealing', 'potionHealing'], spoons: 0,
    mode: 'town', level: 0, x: 1, y: 1, dir: 1, mods: LEVEL_DEFS.map(() => ({})), explored: LEVEL_DEFS.map(() => []), maxDepth: 0,
    bossDead: LEVEL_DEFS.map(() => false), victory: false, steps: 0, sinceEncounter: 0, keys: [], playTime: 0,
    seeds: dseeds, randomDungeons: !!dseeds,
    flags: {}, lore: {}, journal: [], notes: [], moon: 0, rests: 0, quests: { main: 'active' }, pois: {},
  }));
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
  if (Number.isInteger(C.portrait)) c.portrait = C.portrait;
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
  if (isLevelLocked(lvl)) return [{ paywall: true, log: 'That way is sealed until the full game is unlocked.', cls: 'dim' }];
  s.mode = 'dungeon'; s.level = lvl; Prog.sessionStart(s); PC.leftTown(s);
  const L = getLevel(lvl);
  if (lvl === 0 || !s.arriveAtDown) { s.x = L.start[0]; s.y = L.start[1]; s.dir = L.start[2]; }
  s.sinceEncounter = 0; markExplored(s);
  return [{ log: `You enter ${L.def.name}.`, cls: 'sys' }, ...Narr.floorIntro(s, lvl)];
}

function encounterGroups(table) {
  return pick(table).map((g) => ({ key: g.key, count: g.count[0] + Math.floor(rand() * (g.count[1] - g.count[0] + 1)) }));
}
export function randomEncounter(s) { return encounterGroups(getLevel(s.level).def.table); }
/** Random-encounter chance multiplier for where the party stands: explored / cleared areas get quiet. */
export const quiet = (s) => Prog.encounterScale(s);
const RAND = (s, groups = randomEncounter(s)) => ({ groups, random: true });
const bestBy = (s, f) => s.party.filter((c) => !isDown(c)).reduce((b, c) => (f(c) > f(b) ? c : b), s.party.find((c) => !isDown(c)) || s.party[0]);
const guidance = (s) => s.party.some((c) => c.cls === 'cleric' && !isDown(c));

export function turn(s, d) { s.dir = (s.dir + d + 4) % 4; markExplored(s); return []; }

/** Try to move. rel: 0 forward, 2 back, 1 strafe right, 3 strafe left. Returns events. */
export function move(s, rel = 0) {
  if (s.mode !== 'dungeon') return [];
  const d = (s.dir + rel) % 4; const [dx, dy] = DIRS[d];
  const nx = s.x + dx, ny = s.y + dy; const ch = tile(s, nx, ny);
  const out = [];
  if (ch === '#') return [{ log: 'Ouch! A wall.', cls: 'dim', bump: true }];
  if (ch === 'S') {
    if (!isIllusion(s.level, nx, ny)) return [{ log: 'Ouch! A wall.', cls: 'dim', bump: true }];
    setTile(s, nx, ny, '.'); out.push({ log: 'You lean on the wall and your hand passes straight through: an illusion! A hidden passage opens.', cls: 'good', card: true, sfx: 'chime', reveal: true, banter: secretLine(s) }, ...foundSecret(s, nx, ny, 'illusory wall', 'Illusory wall'));
  }
  if (ch === 'L') {
    const def = getLevel(s.level).def;
    if (s.keys.includes(def.key)) { setTile(s, nx, ny, 'd'); out.push({ log: `You unlock the door with the ${ITEMS[def.key].name}.`, cls: 'good', sfx: 'door' }); }
    else return [{ log: 'A heavy locked door. (Find the key, or use Pick Lock / Force from the Search menu.)', cls: 'dim', bump: true, locked: { x: nx, y: ny } }];
  }
  if (ch === 'D') { setTile(s, nx, ny, 'd'); out.push({ log: 'The door creaks open.', sfx: 'door' }); }
  const ox = s.x, oy = s.y;
  s.x = nx; s.y = ny; s.steps++; s.sinceEncounter++;
  for (const c of s.party) if (c.conditions.poisoned && c.conditions.poisoned.steps && --c.conditions.poisoned.steps <= 0) { delete c.conditions.poisoned; out.push({ log: `${c.name} is no longer poisoned.` }); }
  markExplored(s); out.push(...PC.tickStep(s));
  const elite = eliteContact(s, ox, oy);
  if (elite) { s.sinceEncounter = 0; out.push(eliteFight(s, elite)); return out; }
  out.push(...Narr.secretAt(s, getLevel(s.level), nx, ny));
  out.push(...enterTile(s));
  out.push(...eliteSpotted(s));
  return out;
}


/** If a fight is about to start, keep area text in the log but do not request a DM read-aloud card/voice. */
function suppressAmbientForCombat(out) {
  if (!out?.some((e) => e.combat)) return out;
  for (const e of out) {
    if (e.dm || e.ambient) { e.card = false; e.dm = false; e.ambient = false; delete e.quip; }
  }
  return out;
}

const secretLine = (s) => PC.react(s, 'secret', () => banter(s.party, 'secret', {}, 0.25));

export function enterTile(s) {
  const ch = tile(s, s.x, s.y); const L = getLevel(s.level); const def = L.def; const out = [...Narr.areaAt(s, L, s.x, s.y)];
  if (out.length) { for (const e of out) if (e.dm) e.quip = PC.onNewArea(s); out.push(...Prog.discover(s, 'room', `${s.x},${s.y}`, 'new area explored')); }
  const passivePerc = Math.max(...s.party.filter((c) => !isDown(c)).map((c) => passive(c, 'perception')));
  // Passive notice of adjacent secret doors
  for (const [dx, dy] of DIRS) if (tile(s, s.x + dx, s.y + dy) === 'S' && !isIllusion(s.level, s.x + dx, s.y + dy) && passivePerc >= def.secretDC + 3) { setTile(s, s.x + dx, s.y + dy, 'D'); out.push({ log: 'Your keen eyes notice a hidden door!', cls: 'good', card: true, banter: secretLine(s), reveal: true }, ...foundSecret(s, s.x + dx, s.y + dy, 'hidden door found', 'Hidden door')); }
  out.push(...perceiveSecrets(s, passivePerc));
  switch (ch) {
    case 'N': out.push(...visitNook(s)); break;
    case 'T': {
      if (passivePerc >= def.trapDC) { setTile(s, s.x, s.y, 't'); out.push({ log: `You spot a hidden ${def.trapKind === 'pit' ? 'pit' : 'dart trap'} (passive Perception ${passivePerc}) and step around it.`, card: true, cls: 'good' }, ...Prog.discover(s, 'trap', `${s.x},${s.y}`, 'trap spotted')); break; }
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
      out.push({ log: `You found the ${ITEMS[def.key].name}!`, cls: 'good', banter: banter(s.party, 'loot', {}, 0.7) }, ...Prog.discover(s, 'key', `${s.x},${s.y}`, 'key found')); break;
    }
    case 'Q': {
      const id = Story.poiAt(s.level, tileOrdinal(L, s.x, s.y));
      const ev = Story.visitPoi(s, id); if (ev.consumed) setTile(s, s.x, s.y, '.');
      out.push(...ev); if (ev.some((e) => e.combat)) { s.sinceEncounter = 0; return suppressAmbientForCombat(out); }
      if (ev.some((e) => e.prompt)) return out;
      break;
    }
    case 'M': out.push({ log: def.messages[tileOrdinal(L, s.x, s.y) % def.messages.length], cls: 'lore', card: true }, ...Prog.discover(s, 'lore', `${s.x},${s.y}`, 'lore found')); break;
    case 'F': {
      out.push({ log: 'A glowing fountain. You drink: the party is healed and refreshed.', cls: 'good' }, ...Prog.discover(s, 'fountain', `${s.x},${s.y}`, 'fountain found'));
      for (const c of s.party) if (!c.dead) { c.hp = c.maxHp; delete c.conditions.poisoned; }
      setTile(s, s.x, s.y, 'f'); break;
    }
    case 'E': {
      const groups = encounterGroups([def.fixed[tileOrdinal(L, s.x, s.y) % def.fixed.length]]);
      setTile(s, s.x, s.y, '.');
      out.push({ log: 'Something is lurking here!', cls: 'bad', combat: { groups, fixed: true } }); s.sinceEncounter = 0; return suppressAmbientForCombat(out);
    }
    case 'B': {
      if (!s.bossDead[s.level]) {
        if (def.phase2 && s.flags?.boss4p1) { out.push({ log: 'The vault floor splits open. GORVAX THE TYRANT rises!', cls: 'bad', shake: true, combat: { groups: def.phase2.map((g) => ({ key: g.key, count: g.count[0] })), boss: true, phase2: true } }); return suppressAmbientForCombat(out); }
        out.push({ log: `${def.bossName} blocks the way!`, cls: 'bad', combat: { groups: def.boss.map((g) => ({ key: g.key, count: g.count[0] })), boss: true } }); return suppressAmbientForCombat(out);
      }
      break;
    }
    case '>': out.push({ prompt: 'down' }); break;
    case '<': out.push({ prompt: 'up' }); break;
    case 'A': out.push({ prompt: 'altar' }); break;
  }
  // Phase C: a story event waiting on this tile (a card with choices; walking on never locks it out)
  const evh = PC.eventHere(s, L);
  if (evh && !out.some((o) => o.combat || o.prompt)) { out.push({ prompt: 'event', event: PC.cardFor(s, evh.id), eventId: evh.id, sfx: 'chime' }); return out; }
  // Random encounters
  if (!out.some((o) => o.combat || o.prompt) && s.sinceEncounter > 6 && rand() < 0.045 * quiet(s) * PC.encounterMult(s)) {
    s.sinceEncounter = 0; out.push({ log: 'Monsters appear!', cls: 'bad', combat: RAND(s) });
  }
  return suppressAmbientForCombat(out);
}

export function afterCombat(s, combat, info = {}) {
  const out = [];
  if (combat.state === 'won') {
    const af = PC.afterFight(s, combat.gold); s.gold += af.gold; out.push(...af.out); Prog.noteFightWon(s, info);
    const def = getLevel(s.level).def;
    const chain = info.boss && def.phase2 && !info.phase2;
    if (info.boss && !chain) { s.bossDead[s.level] = true; setTile(s, s.x, s.y, '.'); const q = [600, 3000, 9000, 22000, 0][s.level] || 0; if (q) for (const c of s.party) if (!c.dead) c.xp += q; out.push({ log: `The guardian is defeated! The way onward is open.${q ? ` Quest bonus: ${q} XP each.` : ''}`, cls: 'good' }); }
    if (info.poi && tile(s, s.x, s.y) === 'Q') setTile(s, s.x, s.y, '.');
    out.push(...Story.onCombatWon(s, info, s.level));
    if (info.elite) out.push(...eliteSlain(s, info.elite));
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
  out.push(...mourn(s));
  return out;
}
/** A companion reacts, once, when a friend has died. */
function mourn(s) {
  const p = PC.ensure(s), out = [];
  for (const c of s.party) {
    if (!c.dead) { delete p.mourned[c.id]; continue; }
    if (p.mourned[c.id]) continue; p.mourned[c.id] = 1;
    const b = PC.reactive(s, 'death', { p: c.name }, 1); if (b) out.push({ banter: b });
  }
  return out;
}

/* ---------- Search, locks, chests ---------- */
export function search(s) {
  const def = getLevel(s.level).def; const out = [];
  const who = bestBy(s, (c) => c.skills.includes('perception') ? passive(c, 'perception') : passive(c, 'perception') - 1);
  const r = check(who, 'perception', { guidance: guidance(s) });
  let found = false, near = false;
  for (const [dx, dy] of DIRS) {
    const x = s.x + dx, y = s.y + dy;
    if (tile(s, x, y) === 'S') { near = true; if (r.total >= def.secretDC || isSuspect(s, x, y) || (s.searchMiss | 0) >= 2) { setTile(s, x, y, isIllusion(s.level, x, y) ? '.' : 'D'); found = true; out.push(...foundSecret(s, x, y, isIllusion(s.level, x, y) ? 'illusory wall' : 'hidden door found', isIllusion(s.level, x, y) ? 'Illusory wall' : 'Hidden door')); } }
    if (tile(s, x, y) === 'T' && r.total >= def.trapDC) { setTile(s, x, y, 't'); out.push({ log: `${who.name} finds a hidden trap and disarms it.`, cls: 'good', card: true }, ...Prog.discover(s, 'trap', `${x},${y}`, 'trap found')); }
  }
  if (found) s.searchMiss = 0; else if (near) s.searchMiss = (s.searchMiss | 0) + 1;
  out.unshift({ log: `${who.name} searches (Perception ${r.total})… ${found ? 'a secret door!' : near && s.searchMiss >= 2 ? 'something is definitely off about this wall. Search once more.' : 'nothing obvious.'}`, cls: found ? 'good' : 'dim', reveal: found });
  if (found) out.push({ banter: secretLine(s) });
  if (rand() < 0.08 * quiet(s)) out.push({ log: 'Your searching made noise…', cls: 'bad', combat: { ...RAND(s), ambush: true } });
  return out;
}
export function lockAt(s) { for (const [dx, dy] of DIRS) if (tile(s, s.x + dx, s.y + dy) === 'L') return [s.x + dx, s.y + dy]; return null; }
export function pickLock(s, force = false) {
  const p = lockAt(s); if (!p) return [{ log: 'There is no locked door here.', cls: 'dim' }];
  const def = getLevel(s.level).def;
  if (force) {
    const who = bestBy(s, (c) => abilityMod(c, 'str')); const r = check(who, 'athletics');
    if (r.total >= def.lockDC + 2) { setTile(s, p[0], p[1], 'd'); return [{ log: `${who.name} shoulders the door open! (Athletics ${r.total})`, cls: 'good', sfx: 'door' }]; }
    return [{ log: `${who.name} bounces off the door. (Athletics ${r.total})`, cls: 'dim' }, ...(rand() < 0.35 * quiet(s) ? [{ log: 'The racket attracts attention!', cls: 'bad', combat: { ...RAND(s), ambush: true } }] : [])];
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
  const lucky = PC.chestBuff(s);
  const gold = (def.loot.gold[0] + Math.floor(rand() * (def.loot.gold[1] - def.loot.gold[0]))) * lucky;
  s.gold += gold;
  const n = 1 + (rand() < 0.5 ? 1 : 0); const items = [];
  for (let i = 0; i < n; i++) { const it = pick(def.loot.items); s.inventory.push(it); items.push(it); if (ITEMS[it].spoon) s.spoons++; }
  setTile(s, s.x, s.y, 'o');
  out.push({ log: `The chest holds ${gold} gold and: ${items.map((i) => ITEMS[i].name).join(', ')}.`, cls: 'good', sfx: 'chest' }, ...Prog.discover(s, 'chest', `${s.x},${s.y}`, 'chest opened'));
  const spoon = items.some((i) => ITEMS[i].spoon);
  out.push({ banter: spoon ? banter(s.party, 'spoon', {}, 1) : PC.react(s, 'loot', () => banter(s.party, 'loot', {}, 0.25), 0.8) });
  if (rand() < 0.07 + 0.03 * s.level + (lucky > 1 ? 0.3 : 0)) out.push(...grantRare(s, rollTier(s.level, 'chest'), 'chest')); // after the chest card, so the reveal follows it
  return out;
}

/* ---------- Stairs ---------- */
export function goDown(s) {
  if (s.level >= LEVEL_DEFS.length - 1) return [];
  if (isLevelLocked(s.level + 1)) return [{ paywall: true, cliffhanger: true }];
  s.level++; s.maxDepth = Math.max(s.maxDepth, s.level);
  const L = getLevel(s.level); s.x = L.start[0]; s.y = L.start[1]; s.dir = L.start[2]; markExplored(s);
  const intro = Narr.floorIntro(s, s.level);
  return [{ log: `You descend to ${L.def.name}.`, cls: 'sys', banter: intro.some((e) => e.card) ? null : banter(s.party, 'stairs', {}, 0.9) }, ...intro, ...Prog.discover(s, 'stairs', 'down', 'a new depth reached')];
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
  if (s.mode === 'dungeon' && rand() < (kind === 'long' ? 0.3 : 0.12) * quiet(s)) {
    out.push({ log: 'Your rest is interrupted by monsters!', cls: 'bad', combat: { ...RAND(s), ambush: true } }); return out;
  }
  if (kind === 'short') { for (const c of s.party) for (const l of shortRest(c)) out.push({ log: l }); out.push({ log: 'The party takes a short rest (1 hour).', cls: 'good' }); }
  else { for (const c of s.party) longRest(c); out.push({ log: 'The party takes a long rest. HP, spell slots and abilities restored.', cls: 'good' }); if (Prog.addRested(s, 'camp') > 0) out.push({ log: '☾ Rested: bonus XP on your next finds.', cls: 'dim' }); out.push(...Story.onLongRest(s)); }
  out.push({ banter: banter(s.party, 'rest', {}, 0.9) });
  return out;
}

/* ---------- Town ---------- */
export function innRest(s) {
  const cost = s.flags?.freeInn ? 0 : 10; if (s.gold < cost) return [{ log: 'Not enough gold for a room (10 gp).', cls: 'bad' }];
  s.gold -= cost; for (const c of s.party) longRest(c); Prog.addRested(s, 'inn');
  const lifted = PC.liftCurses(s);
  return [{ log: cost ? 'You rent rooms at the Boar & Spoon Inn and sleep soundly. (−10 gp)' : 'Marga waves you upstairs. "On the house, love." You sleep soundly.', cls: 'good' }, ...(lifted ? [{ log: '☾ A night of safe sleep lifts the curse upon you.', cls: 'good' }] : []), ...Story.onLongRest(s)];
}
/** Combat options derived from story state (lieutenant/boss set-pieces). */
export function combatOpts(s, info = {}) { return { ...Story.storyCombat(s, info, s.level), xpAward: (share) => Prog.awardCombatXp(s, Math.round(share * PC.fightXpMult(s)), info) }; }
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
  for (const c of [...s.party, ...s.roster]) if (!goodPortrait(c, c.portrait)) givePortrait(c); // old saves: random portrait
  const N = LEVEL_DEFS.length;
  if (!Array.isArray(s.seeds) || s.seeds.length !== N) { s.seeds = null; s.randomDungeons = false; } setDungeonSeeds(s.seeds); // old saves: fixed classic layouts
  s.mods ||= []; s.explored ||= []; s.bossDead ||= [];
  if ((s.version | 0) < 2) { // original 3-floor game -> BLACKSPIRE (5 floors): old B3 vault became B5; the new B3 starts fresh
    s.mods[2] = {}; s.explored[2] = []; s.bossDead[2] = false; s.victory = false; if (s.level === 2 && s.mode === 'dungeon') { s.mode = 'town'; } s.maxDepth = Math.min(s.maxDepth | 0, 2);
    s.keys = (s.keys || []).filter((k) => k !== 'key3'); s.inventory = (s.inventory || []).filter((k) => k !== 'key3');
    s.flags = { ...(s.flags || {}), prologue: true }; s.version = 2;
  }
  while (s.mods.length < N) s.mods.push({}); while (s.explored.length < N) s.explored.push([]); while (s.bossDead.length < N) s.bossDead.push(false);
  Story.initStory(s);
  for (const c of [...s.party, ...s.roster]) { c.equip ||= {}; if (!('helm' in c.equip)) c.equip.helm = null; }
  s.level = Math.min(N - 1, Math.max(0, s.level | 0)); s.maxDepth = Math.max(s.maxDepth | 0, s.level);
  const old = (s.version | 0) < 3, old3 = (s.version | 0) < 4; Prog.initProgress(s); if (old) Prog.sweepQuests(s, true); // v3: XP system, pins, cleared zones, session recap
  if (old3) migrateV4(s); // v4: secrets, elites, rare loot
  PC.ensure(s); s.version = Math.max(s.version | 0, 5); // v5: companion threads, Liora, events, curses and blessings, town memory (all additive)
  if (!s.lore || typeof s.lore !== 'object' || Array.isArray(s.lore)) s.lore = {}; s.version = Math.max(s.version | 0, 6); // v6: monster lore (weaknesses the party has discovered); rows stay as party order
  if (s.mode === 'dungeon' && !(Number.isInteger(s.x) && Number.isInteger(s.y))) s.mode = 'town';
  return s;
}
export function campDialogue(s) {
  const alive = s.party.filter((c) => c.companion && !c.dead);
  if (!alive.length) return 'The camp is quiet. Too quiet.';
  const c = pick(alive); return pick(COMPANIONS[c.companion].camp);
}
export { die };

export const sweepQuests = (s) => Prog.sweepQuests(s);
/** Fight a trivial encounter headlessly (everyone on AI); returns the afterCombat events. Party state is updated like a real fight. */
export function autoResolve(s, info) {
  const flags = s.party.map((c) => c.ai); for (const c of s.party) c.ai = true;
  const cb = new Combat(s.party, info.groups, { inventory: s.inventory, canFlee: false, difficulty: s.difficulty || 'normal', story: combatOpts(s, info), elite: info.elite || null, lore: s.lore });
  try { cb.runAuto(); } finally { s.party.forEach((c, i) => { c.ai = flags[i]; }); }
  s.stats.trivial++; return { combat: cb, events: afterCombat(s, cb, info) };
}
export const isTrivial = (s, info) => Prog.isTrivial(s, info.groups || [], info);

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

/* ---------- Phase B: secrets, elites and rare loot ---------- */
const keyOf = (x, y) => `${x},${y}`;
export const isIllusion = (lvl, x, y) => (getLevel(lvl).illusions || []).includes(keyOf(x, y));
export const isSuspect = (s, x, y, lvl = s.level) => !!s.suspect?.[lvl]?.includes(keyOf(x, y));
/** Record a found secret: XP once, an auto pin with a note, and drop the suspicion mark. */
function foundSecret(s, x, y, label, note) {
  const sus = s.suspect?.[s.level]; if (sus) { const i = sus.indexOf(keyOf(x, y)); if (i >= 0) sus.splice(i, 1); }
  Prog.addPin(s, x, y, '🚪', `${note} (found)`);
  return Prog.discover(s, 'secret', keyOf(x, y), label);
}
/** Passive Perception: walls within two steps that look wrong get flagged (a shimmer on the wall and a "?" pin on the map). */
function perceiveSecrets(s, passivePerc) {
  const L = getLevel(s.level), def = L.def, out = []; s.suspect ||= []; const sus = (s.suspect[s.level] ||= []);
  for (const c of L.secretCells || []) {
    const [x, y] = c.split(',').map(Number);
    if (Math.abs(x - s.x) + Math.abs(y - s.y) > 2 || tile(s, x, y) !== 'S' || sus.includes(c)) continue;
    if (passivePerc < def.secretDC - 4) continue;
    sus.push(c); Prog.addPin(s, x, y, '❓', 'Suspicious wall: search here');
    out.push({ log: '🔎 That wall looks wrong. It shimmers faintly (marked on your map). Search next to it, or walk straight into it.', cls: 'good', sfx: 'ping', suspect: true });
  }
  return out;
}
/** Lore nook: tablet, journal line, a once-only cache with a rare chance. */
function visitNook(s) {
  const L = getLevel(s.level); const nk = (L.nooks || []).find((n) => n.x === s.x && n.y === s.y); const out = [];
  const lore = LORE[s.level]?.[nk?.lore ?? 0] || LORE[0][0];
  out.push({ log: `📜 ${lore}`, cls: 'lore', card: true });
  const id = keyOf(s.x, s.y);
  if (!s.disc[`lore:${s.level}:${id}`]) {
    Story.addJournal(s, `A hidden lore room on ${L.def.name}: ${lore}`);
    out.push(...Prog.discover(s, 'lore', id, 'lore room found'));
    const gold = Math.floor((40 + rand() * 40) * (s.level + 1)); s.gold += gold; out.push({ log: `A forgotten cache holds ${gold} gold.`, cls: 'good', sfx: 'chest' });
    out.push(...grantRare(s, rand() < 0.3 ? 'rare' : 'uncommon', 'cache'));
    Prog.addPin(s, s.x, s.y, '📜', 'Lore room');
  }
  return out;
}
/** Roll a loot tier: elites favour rare and up; deeper floors can reach epic and legendary. */
export function rollTier(level, source = 'elite') {
  const W = { elite: [[85, 15, 0], [75, 22, 3], [65, 29, 6], [55, 35, 10], [45, 40, 15]], chest: [[100, 0, 0], [97, 3, 0], [93, 6, 1], [90, 8, 2], [86, 11, 3]] }[source][Math.min(4, Math.max(0, level))];
  const r = rand() * 100; return r < W[0] ? 'rare' : r < W[0] + W[1] ? 'epic' : 'legendary';
}
/** Give one item of a tier (avoiding ones already found) and say so with a rare-drop event. */
export function grantRare(s, tier, from = 'elite') {
  const pool = DROP_POOL[tier] || DROP_POOL.rare; s.rareFound ||= [];
  const fresh = pool.filter((k) => !s.rareFound.includes(k)); const key = pick(fresh.length ? fresh : pool);
  if (tier !== 'uncommon' || key !== 'potionGreater') s.rareFound.push(key);
  s.inventory.push(key);
  return [{ log: `✦ ${tierOf(key) === 'common' ? '' : tierOf(key).toUpperCase() + ' DROP: '}${ITEMS[key].name}! ${ITEMS[key].desc || ''}`.trim(), cls: tier === 'uncommon' ? 'good' : 'crit', rare: { key, tier: tierOf(key), from } }];
}
/** Elites still standing on the current floor, with their position at the current step count. */
export function liveElites(s, lvl = s.level) { return (getLevel(lvl).elites || []).filter((e) => !s.disc?.[`elite:${lvl}:${e.id}`]); }
export function elitePosNow(s, e, steps = s.steps) { return elitePos(e, steps | 0); }
function eliteContact(s, ox, oy) {
  for (const e of liveElites(s)) {
    const p = elitePos(e, s.steps), q = elitePos(e, s.steps - 1);
    if (p[0] === s.x && p[1] === s.y) return e;
    if (q[0] === s.x && q[1] === s.y && p[0] === ox && p[1] === oy) return e; // walked straight through each other
  }
  return null;
}
function eliteFight(s, e) {
  return { log: `⚔ ${e.title} ${e.kind === 'guard' ? 'rears up to defend this spot' : 'catches you on its patrol'}!`, cls: 'bad', shake: true, combat: { groups: e.groups.map((g) => ({ ...g })), elite: { id: e.id, title: e.title, kind: e.kind }, fixed: true } };
}
/** A telegraph the first time an elite comes into view along a straight, open line (or within two tiles). */
function eliteSpotted(s) {
  const out = [];
  for (const e of liveElites(s)) {
    const id = `${s.level}:${e.id}`; if (s.eliteSeen[id]) continue;
    const [ex, ey] = elitePos(e, s.steps); const dx = ex - s.x, dy = ey - s.y; const dist = Math.abs(dx) + Math.abs(dy);
    let seen = dist <= 2;
    if (!seen && (dx === 0 || dy === 0) && dist <= 6) { seen = true; const sx = Math.sign(dx), sy = Math.sign(dy); for (let i = 1; i < dist; i++) if (isSolid(tile(s, s.x + sx * i, s.y + sy * i))) seen = false; }
    if (!seen) continue;
    s.eliteSeen[id] = 1; const p0 = e.path[0];
    Prog.addPin(s, p0[0], p0[1], '☠', `Elite: ${e.title}${e.kind === 'patrol' ? ' (patrols here)' : ' (guards here)'}`);
    out.push({ log: `⚠ ELITE: ${e.title} ${e.kind === 'guard' ? 'stands guard ahead' : 'paces this corridor'}. Fight it, sneak around it, or come back later. Its drops are the best on the floor.`, cls: 'crit', card: true, sfx: 'encounter', elite: e.id, banter: PC.reactive(s, 'elite') });
  }
  return out;
}
function eliteSlain(s, el) {
  const out = []; const lvl = s.level; const e = (getLevel(lvl).elites || []).find((x) => x.id === el.id);
  out.push({ log: `${el.title} falls!`, cls: 'good' }, ...Prog.discover(s, 'elite', el.id, `${el.title} defeated`));
  out.push(...grantRare(s, rollTier(lvl, 'elite'), 'elite'));
  if (rand() < 0.4) out.push(...grantRare(s, 'uncommon', 'elite'));
  const gold = Math.floor((60 + rand() * 60) * (lvl + 1)); s.gold += gold; out.push({ log: `The elite's hoard holds ${gold} gold.`, cls: 'good' });
  if (e) Prog.removePin(s, e.path[0][0], e.path[0][1]);
  return out;
}
/** v3 -> v4: backfill discoveries for secrets that older saves already opened, and never leave the party inside a new hidden door. */
function migrateV4(s) {
  for (let l = 0; l < LEVEL_DEFS.length; l++) {
    const L = getLevel(l);
    for (const c of L.secretCells || []) { const m = s.mods?.[l]?.[c]; if (m && m !== 'S' && !s.disc[`secret:${l}:${c}`]) s.disc[`secret:${l}:${c}`] = 1; }
  }
  if (s.mode === 'dungeon' && tile(s, s.x, s.y) === 'S') setTile(s, s.x, s.y, '.');
}

/* ---------- Phase C: events, Liora, camp talk ---------- */
/** Bring Liora into the party (from the roster, or fresh); if the party is full the last companion steps out to the Tavern, loudly. */
export function joinLiora(s) {
  if (s.party.some((c) => c.companion === 'liora')) return [];
  const out = [];
  if (s.party.length >= MAX_PARTY) {
    const swap = [...s.party].reverse().find((c) => c.companion && c.companion !== 'liora') || [...s.party].reverse().find((c) => !isHero(c));
    if (!swap) return [{ log: 'The party is full.', cls: 'bad' }]; out.push(...dismiss(s, swap));
  }
  const waiting = s.roster.find((c) => c.companion === 'liora');
  out.push(...(waiting ? rejoin(s, waiting) : recruitCompanion(s, 'liora'))); s.flags.lioraMet = true; return out;
}
const fxLine = (t, cls = 'good') => ({ t, cls });
/** Apply one set of event effects; returns display lines and game events. */
function applyFx(s, fx = {}, evs, lines) {
  const tier = s.level + 1;
  if (fx.gold) {
    if (fx.gold > 0) { const g = fx.gold * tier; s.gold += g; lines.push(fxLine(`+${g} gp`)); }
    else { const g = Math.min(s.gold, -fx.gold); s.gold -= g; lines.push(fxLine(`−${g} gp`, 'bad')); }
  }
  if (fx.xp) { const r = Prog.giveXp(s, fx.xp * tier); lines.push(fxLine(`+${r.base} XP each`)); }
  if (fx.item) { s.inventory.push(fx.item); lines.push(fxLine(`Received: ${nameOf(fx.item)}`)); }
  if (fx.rare) { const ev = grantRare(s, fx.rare, 'event'); const r = ev[0].rare; lines.push(fxLine(`Found: ${nameOf(r.key)} (${r.tier})`)); evs.push(...ev); }
  if (fx.heal) { for (const c of s.party) if (!c.dead) { c.hp = c.maxHp; delete c.conditions.unconscious; } lines.push(fxLine('The party is fully healed')); }
  if (fx.hurt) { for (const c of s.party) if (!c.dead) c.hp = Math.max(1, c.hp - fx.hurt); lines.push(fxLine(`Everyone takes ${fx.hurt} damage`, 'bad')); }
  if (fx.aff) for (const [k, n] of Object.entries(fx.aff)) {
    const comp = k === 'party' ? null : COMPANIONS[k]; PC.addAff(s, k, n);
    if (k === 'party') { if (n > 0) lines.push(fxLine('The party grows closer')); }
    else if (s.party.some((c) => c.companion === k)) lines.push(n > 0 ? fxLine(`${comp.short} warms to you${k === 'liora' ? `  ${PC.hearts(s, 'liora')}` : ''}`) : fxLine(`${comp.short} is quiet`, 'bad'));
  }
  if (fx.mem) { PC.remember(s, fx.mem[0], fx.mem[1]); lines.push(fxLine(`${PC.NPC_NAME[fx.mem[0]]} will remember this`, 'dim')); }
  if (fx.bless) { const B = PC.addBuff(s, fx.bless); lines.push(fxLine(`Blessing: ${B.label}. ${B.desc}`)); }
  if (fx.curse) { const B = PC.addBuff(s, fx.curse); lines.push(fxLine(`Curse: ${B.label}. ${B.desc}`, 'bad')); }
  if (fx.flag) s.flags[fx.flag] = true;
  if (fx.recruit === 'liora') { const ev = joinLiora(s); for (const e of ev) if (e.log) lines.push(fxLine(e.log, e.cls === 'bad' ? 'bad' : 'good')); }
}
/** Resolve a choice on an event card. `check(skill, dc)` rolls the party's best modifier. Returns { result, events } */
export function chooseEvent(s, eventId, choiceId, check = (sk, dc) => partyCheck(s, sk, dc)) {
  const ch = PC.findChoice(s, eventId, choiceId), E = PC.eventById(eventId); const evs = [], lines = [];
  if (!ch || !E) return { result: { text: 'Nothing happens.', fx: [] }, events: [] };
  const p = PC.ensure(s); p.ev[eventId] = choiceId; s.pc = p;
  let res = ch.res, fx = ch.fx, rollNote = '';
  if (ch.check) {
    const ok = check(ch.check.skill, ch.check.dc); const side = ok ? ch.check.pass : ch.check.fail;
    res = side.res; fx = side.fx; rollNote = `${ok ? '✔' : '✘'} ${ch.check.skill} (DC ${ch.check.dc})`;
  }
  applyFx(s, fx, evs, lines);
  const title = E.card(s).title || E.title;
  Story.addJournal(s, `${title}: ${ch.label}${rollNote ? ` (${rollNote})` : ''}.`);
  evs.unshift({ log: `✦ ${title}: ${res}`, cls: 'lore' });
  const sp = s.mode === 'dungeon' ? PC.reactive(s, 'loot', {}, 0) : null; void sp;
  return { result: { title, text: res, roll: rollNote, fx: lines }, events: evs };
}
export function deferEvent(s, eventId) { const p = PC.ensure(s); if (!p.ev[eventId]) p.ev[eventId] = 'later'; return []; }
/** Camp / Tavern conversation: Liora's pending talk first, otherwise a campfire line. */
export function campTalk(s) {
  const m = PC.pendingMoment(s);
  if (m != null) return { moment: m, scene: PC.momentScene(s, m) };
  return { line: campDialogue(s) };
}
export function lioraMoment(s, i, choiceId) { const r = PC.resolveMoment(s, i, choiceId); return r; }
