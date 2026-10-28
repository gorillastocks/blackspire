import { ABILITIES, RACES, CLASSES, WEAPONS, ARMOR, ITEMS, SKILLS, SPELLS, slotsFor, XP_LEVELS, MAX_LEVEL, STANDARD_ARRAY, profBonus } from './data.js';
import { die, roll, d20 } from './dice.js';
import { activeSpells, ensureSpells, autoFill } from './spellcasting.js';

export const mod = (score) => Math.floor((score - 10) / 2);
export const fmtMod = (m) => (m >= 0 ? '+' : '') + m;
let uid = 1;

export function roll4d6() { const r = [die(6), die(6), die(6), die(6)].sort((a, b) => a - b); return r[1] + r[2] + r[3]; }
/** Assign values (highest first) to the class's ability priority. */
export function assignByPriority(cls, values = STANDARD_ARRAY) {
  const v = [...values].sort((a, b) => b - a); const out = {};
  CLASSES[cls].primary.forEach((ab, i) => { out[ab] = v[i]; });
  return out;
}

export function createCharacter({ name, race, cls, base, companion = null, skills = null, portrait = null }) {
  const R = RACES[race], C = CLASSES[cls];
  const scores = {};
  for (const a of ABILITIES) scores[a] = Math.min(20, (base[a] || 10) + (R.bonus[a] || 0));
  const st = C.start;
  const c = {
    id: 'c' + (uid++) + Math.floor(Math.random() * 1e6), name, race, cls, level: 1, xp: 0, scores, companion, portrait,
    skills: skills || [...C.skillChoices.slice(0, 2), ...(R.skills || [])], expertise: C.expertise ? [...C.expertise] : [], tempHp: 0,
    equip: { weapon: { base: st.weapon, magic: 0 }, ranged: st.ranged ? { base: st.ranged, magic: 0 } : null, armor: st.armor ? { base: st.armor, magic: 0 } : null, shield: !!st.shield, ring: null, cloak: null },
    hp: 0, maxHp: 0, tempMaxBonus: 0, hitDice: 1, conditions: {}, deathSaves: { s: 0, f: 0 }, dead: false, stable: false,
    slots: [], maxSlots: [], concentration: null, res: {}, ai: !!companion, hpHistory: [],
  };
  if (race === 'dragonborn' && cls === 'wizard') {/* fine */}
  c.maxHp = C.hitDie + mod(c.scores.con) + (R.hpPerLevel || 0) + (cls === 'sorcerer' ? 1 : 0);
  c.hp = c.maxHp;
  refreshResources(c, true);
  ensureSpells(c);
  return c;
}

export function hasFeature(c, feat) {
  const F = CLASSES[c.cls].features; for (let l = 1; l <= c.level; l++) if ((F[l] || []).some((f) => f.startsWith(feat))) return true; return false;
}
export function hasTrait(c, t) { return RACES[c.race].traits.includes(t); }
export const prof = (c) => profBonus(c.level);
export function abilityMod(c, a) { return mod(c.scores[a]); }
export function skillMod(c, s) {
  let m = abilityMod(c, SKILLS[s]);
  if (c.skills.includes(s)) m += prof(c);
  if (c.expertise.includes(s)) m += prof(c);
  return m;
}
export function passive(c, s) { return 10 + skillMod(c, s); }
/** Pieces of the Dawn Regalia worn by one character. */
export function setCount(c) {
  const e = c.equip || {}; let n = 0;
  if (e.weapon?.key && ITEMS[e.weapon.key]?.set) n++;
  if (e.armor?.key && ITEMS[e.armor.key]?.set) n++;
  if (e.shield === 'sunshardAegis') n++;
  if (e.helm && ITEMS[e.helm]?.set) n++;
  if (e.cloak && ITEMS[e.cloak]?.set) n++;
  return n;
}
export function saveMod(c, a) {
  let m = abilityMod(c, a);
  if (CLASSES[c.cls].saves.includes(a)) m += prof(c);
  if (c.equip.ring) m += ITEMS[c.equip.ring].saves || 0;
  if (c.equip.cloak) m += ITEMS[c.equip.cloak].saves || 0;
  if (setCount(c) >= 5) m += 1;
  return m;
}
export function isProficientWeapon(c, wkey) {
  const W = WEAPONS[wkey], list = CLASSES[c.cls].weapons; return list.includes(W.cat) || list.includes(wkey);
}
export function canWearArmor(c, akey) { return akey === null || CLASSES[c.cls].armor.includes(ARMOR[akey].type); }

export function armorClass(c) {
  const dex = abilityMod(c, 'dex');
  let ac;
  const arm = c.equip.armor;
  if (arm) {
    const A = ARMOR[arm.base];
    ac = A.base + (A.type === 'light' ? dex : A.type === 'medium' ? Math.min(2, dex) : 0) + (arm.magic || 0);
    if (c.cls === 'fighter' || (c.cls === 'paladin' && c.level >= 2)) ac += 1; // Fighting Style: Defense
  } else {
    ac = 10 + dex;
    if (c.conditions.mageArmor || c.cls === 'sorcerer') ac = Math.max(ac, 13 + dex); // Mage Armor / Draconic Resilience
    if (c.cls === 'barbarian') ac = Math.max(ac, 10 + dex + abilityMod(c, 'con'));
    if (c.cls === 'monk' && !c.equip.shield) ac = Math.max(ac, 10 + dex + abilityMod(c, 'wis'));
  }
  if (c.equip.shield && CLASSES[c.cls].armor.includes('shield')) ac += 2 + (c.equip.shield === 'sunshardAegis' ? 1 : 0);
  if (c.equip.ring) ac += ITEMS[c.equip.ring].ac; if (c.equip.cloak) ac += ITEMS[c.equip.cloak].ac;
  if (c.equip.helm) ac += ITEMS[c.equip.helm]?.ac || 0;
  const sc = setCount(c); if (sc >= 5) ac += 2; else if (sc >= 3) ac += 1;
  if (c.conditions.shieldOfFaith) ac += 2;
  if (c.conditions.shieldSpell) ac += 5;
  return ac;
}

/** Attack bonus and damage for a weapon slot ('weapon' | 'ranged'). */
/** Sum of a named-item effect over everything a character has equipped (e.g. 'healOnKill'). */
export function fxSum(c, name) {
  let n = 0; const eq = c.equip || {};
  for (const v of [eq.weapon, eq.ranged, eq.armor]) if (v && v.key && ITEMS[v.key]?.fx?.[name]) n += ITEMS[v.key].fx[name];
  for (const k of [eq.ring, eq.cloak, eq.helm]) if (typeof k === 'string' && ITEMS[k]?.fx?.[name]) n += ITEMS[k].fx[name];
  return n;
}
export function weaponStats(c, slot = 'weapon') {
  const w = c.equip[slot]; if (!w) return null;
  const W = WEAPONS[w.base];
  const ranged = W.props.includes('ranged');
  const finesse = W.props.includes('finesse');
  const monkWpn = c.cls === 'monk' && !ranged && (W.cat === 'simple' || w.base === 'shortsword') && !W.props.includes('heavy');
  const abil = ranged ? 'dex' : (finesse || monkWpn) ? (abilityMod(c, 'dex') > abilityMod(c, 'str') ? 'dex' : 'str') : 'str';
  const m = abilityMod(c, abil);
  let dmg = W.dmg;
  // Versatile weapons used two-handed when no shield
  if (W.props.includes('versatile') && !c.equip.shield) dmg = { longsword: '1d10', battleaxe: '1d10', warhammer: '1d10', quarterstaff: '1d8', spear: '1d8' }[w.base] || dmg;
  if (monkWpn) { const md = martialDie(c); if (+md.slice(2) > +dmg.split('d')[1]) dmg = md; }
  const bonus = m + (isProficientWeapon(c, w.base) ? prof(c) : 0) + (w.magic || 0) + (ranged && c.cls === 'ranger' && c.level >= 2 ? 2 : 0);
  const fx = w.key ? ITEMS[w.key]?.fx : null;
  return { elem: fx?.elem || null, name: (w.key && (ITEMS[w.key]?.set || ITEMS[w.key]?.fx) ? ITEMS[w.key].name : w.magic ? `${W.name} +${w.magic}` : W.name), bonus, dmg, dmgBonus: m + (w.magic || 0), type: W.type, ranged, finesse };
}
export function spellMod(c) { const a = CLASSES[c.cls].caster; return a ? abilityMod(c, a) : 0; }
export function spellDC(c) { return 8 + prof(c) + spellMod(c); }
export function spellAttack(c) { return prof(c) + spellMod(c); }
export function maxSlotLevel(c) { return c.maxSlots.length; }
export function knownSpells(c) {
  if (!CLASSES[c.cls].caster) return [];
  return activeSpells(c);
}
export function sneakDice(c) { return c.cls === 'rogue' ? Math.ceil(c.level / 2) : 0; }
export const martialDie = (c) => (c.level >= 5 ? '1d6' : '1d4');
export const rageDamage = (c) => (c.level >= 9 ? 3 : 2);
export const inspirationDie = (c) => (c.level >= 5 ? 'd8' : 'd6');
/** Monk unarmed strike for Martial Arts / Flurry of Blows. */
export function unarmedStats(c) { const m = Math.max(abilityMod(c, 'dex'), abilityMod(c, 'str')); return { name: 'Unarmed Strike', bonus: m + prof(c), dmg: martialDie(c), dmgBonus: m, type: 'bludgeoning', ranged: false, finesse: true }; }
export function cantripDice(c) { return c.level >= 5 ? 2 : 1; }
export function attacksPerAction(c) { return ['fighter', 'barbarian', 'monk', 'paladin', 'ranger'].includes(c.cls) && c.level >= 5 ? 2 : 1; }
export function critRange(c) { return c.cls === 'fighter' && c.level >= 3 ? 19 : 20; }

export function refreshResources(c, full) {
  const C = CLASSES[c.cls];
  if (C.caster) { c.maxSlots = slotsFor(c.cls, c.level); if (full) c.slots = [...c.maxSlots]; }
  if (full) {
    c.res = {
      secondWind: c.cls === 'fighter' ? 1 : 0,
      actionSurge: c.cls === 'fighter' && c.level >= 2 ? 1 : 0,
      channelDivinity: c.cls === 'cleric' && c.level >= 2 ? (c.level >= 6 ? 2 : 1) : 0,
      arcaneRecovery: c.cls === 'wizard' || (c.cls === 'druid' && c.level >= 2) ? 1 : 0,
      rage: c.cls === 'barbarian' ? (c.level >= 6 ? 4 : c.level >= 3 ? 3 : 2) : 0,
      ki: c.cls === 'monk' && c.level >= 2 ? c.level : 0,
      layOnHands: c.cls === 'paladin' ? 5 * c.level : 0,
      sacredWeapon: c.cls === 'paladin' && c.level >= 3 ? 1 : 0,
      inspiration: c.cls === 'bard' ? Math.max(1, abilityMod(c, 'cha')) : 0,
      sorcery: c.cls === 'sorcerer' && c.level >= 2 ? c.level : 0,
      relentless: c.race === 'halfOrc' ? 1 : 0,
      breath: c.race === 'dragonborn' ? 1 : 0,
    };
  }
}

export const isDown = (c) => c.dead || c.hp <= 0;
export const canAct = (c) => !isDown(c) && !c.conditions.paralyzed && !c.conditions.unconscious;

export function heal(c, amt) {
  if (c.dead) return 0;
  const before = c.hp; c.hp = Math.min(c.maxHp, Math.max(0, c.hp) + amt);
  if (c.hp > 0) { c.deathSaves = { s: 0, f: 0 }; c.stable = false; delete c.conditions.unconscious; }
  return c.hp - before;
}

export function shortRest(c) {
  if (c.dead) return [];
  const log = [];
  // spend hit dice until 75% or out
  let spent = 0;
  while (c.hitDice > 0 && c.hp < c.maxHp * 0.75 && c.hp > 0) {
    c.hitDice--; spent++;
    heal(c, Math.max(1, die(CLASSES[c.cls].hitDie) + abilityMod(c, 'con')));
  }
  if (spent) log.push(`${c.name} spends ${spent} Hit ${spent > 1 ? 'Dice' : 'Die'}.`);
  if (c.cls === 'fighter') { c.res.secondWind = 1; if (c.level >= 2) c.res.actionSurge = 1; }
  if (c.cls === 'cleric' && c.level >= 2) c.res.channelDivinity = c.level >= 6 ? 2 : 1;
  if (c.cls === 'monk' && c.level >= 2) c.res.ki = c.level;
  if (c.cls === 'paladin' && c.level >= 3) c.res.sacredWeapon = 1;
  if (c.cls === 'bard' && c.level >= 5) c.res.inspiration = Math.max(1, abilityMod(c, 'cha'));
  if (CLASSES[c.cls].pact) c.slots = [...c.maxSlots];
  if ((c.cls === 'wizard' || c.cls === 'druid') && c.res.arcaneRecovery) {
    // Arcane Recovery: recover slots with combined level <= half wizard level (rounded up), none 6th+
    let budget = Math.ceil(c.level / 2), got = [];
    for (let l = Math.min(budget, c.maxSlots.length); l >= 1; l--) {
      while (budget >= l && c.slots[l - 1] < c.maxSlots[l - 1]) { c.slots[l - 1]++; budget -= l; got.push(l); }
    }
    if (got.length) { c.res.arcaneRecovery = 0; log.push(`${c.name} uses ${c.cls === 'druid' ? 'Natural' : 'Arcane'} Recovery (slots ${got.join(', ')}).`); }
  }
  return log;
}
export function longRest(c) {
  if (c.dead) return;
  c.hp = c.maxHp; c.deathSaves = { s: 0, f: 0 }; c.stable = false;
  c.hitDice = Math.min(c.level, c.hitDice + Math.max(1, Math.floor(c.level / 2)));
  const keep = {}; if (c.conditions.mageArmor) keep.mageArmor = c.conditions.mageArmor; c.tempHp = 0;
  if (c.conditions.aid) { c.maxHp -= 5; c.hp = c.maxHp; }
  c.conditions = keep; c.concentration = null;
  refreshResources(c, true);
}

export function xpForNext(c) { return c.level >= MAX_LEVEL ? Infinity : XP_LEVELS[c.level]; }
export function canLevelUp(c) { return !c.dead && c.xp >= xpForNext(c); }
/** Level up (Training Grounds). Uses fixed average HP per SRD option. Returns array of messages. */
export function levelUp(c) {
  if (!canLevelUp(c)) return [];
  const C = CLASSES[c.cls];
  c.level++;
  const gain = Math.max(1, Math.floor(C.hitDie / 2) + 1 + abilityMod(c, 'con') + (RACES[c.race].hpPerLevel || 0) + (c.cls === 'sorcerer' ? 1 : 0));
  c.maxHp += gain; c.hp += gain; c.hitDice++;
  const msgs = [`${c.name} reaches level ${c.level}! (+${gain} HP)`];
  if ((C.features[c.level] || []).includes('Ability Score Improvement')) {
    // +2 to the primary ability (cap 20), spill to second
    let pts = 2; for (const a of C.primary) { while (pts > 0 && c.scores[a] < 20) { c.scores[a]++; pts--; } if (!pts) break; }
    msgs.push(`Ability Score Improvement: ${C.primary[0].toUpperCase()} now ${c.scores[C.primary[0]]}.`);
  }
  if (c.cls === 'rogue' && c.level === 6) c.expertise.push('investigation', 'acrobatics');
  for (const f of C.features[c.level] || []) if (f !== 'Ability Score Improvement') msgs.push(`New feature: ${f}`);
  const oldSlots = c.maxSlots.length;
  refreshResources(c, false);
  if (C.caster) { const prev = slotsFor(c.cls, c.level - 1); c.slots = c.maxSlots.map((m, i) => (C.pact ? m : Math.min(m, (c.slots[i] ?? 0) + (m - (prev[i] || 0))))); if (c.maxSlots.length > oldSlots) msgs.push(`Can now cast level ${c.maxSlots.length} spells!`); }
  // newly gained per-rest resources are ready immediately
  const fresh = { ...c.res }, keepSlots = [...c.slots]; refreshResources(c, true); const gained = c.res; c.res = fresh; c.slots = keepSlots;
  for (const k of ['rage', 'ki', 'layOnHands', 'sacredWeapon', 'inspiration', 'sorcery']) if ((gained[k] || 0) > (fresh[k] || 0)) c.res[k] = (fresh[k] || 0) + (gained[k] - (fresh[k] || 0));
  if (C.caster) { ensureSpells(c); autoFill(c); } // AI/default picks; the UI may let the player change them
  if (c.cls === 'bard' && c.level === 3) c.expertise.push('persuasion', 'performance');
  if (c.cls === 'fighter' && c.level === 2) c.res.actionSurge = 1;
  if (c.cls === 'cleric' && c.level === 2) c.res.channelDivinity = 1;
  return msgs;
}

/** Ability check helper with optional advantage etc. Returns {total, nat}. */
export function check(c, skillOrAbility, { adv = false, dis = false, guidance = false } = {}) {
  const isSkill = !!SKILLS[skillOrAbility];
  const m = isSkill ? skillMod(c, skillOrAbility) : abilityMod(c, skillOrAbility);
  const poisonDis = !!c.conditions.poisoned || !!c.conditions.frightened;
  const nat = d20({ adv, dis: dis || poisonDis, lucky: hasTrait(c, 'Lucky') });
  return { nat, total: nat + m + (guidance ? roll('1d4') : 0) };
}
export function thievesTools(c) { return abilityMod(c, 'dex') + (c.cls === 'rogue' ? prof(c) * 2 : 0); }

/** Re-train a character into another class at the same level (Training Grounds). Keeps identity, XP and level. */
export function reclass(c, cls) {
  const R = RACES[c.race], base = {};
  for (const a of ABILITIES) base[a] = c.scores[a] - (R.bonus[a] || 0);
  const order = CLASSES[c.cls].primary.map((a) => base[a]).sort((x, y) => y - x);
  let asi = 0; for (let l = 1; l <= c.level; l++) if ((CLASSES[c.cls].features[l] || []).includes('Ability Score Improvement')) asi += 2;
  for (let i = 0; asi > 0 && i < order.length; i++) { const take = Math.min(asi, Math.max(0, order[i] - 15)); order[i] -= take; asi -= take; }
  order.sort((x, y) => y - x);
  const n = createCharacter({ name: c.name, race: c.race, cls, base: assignByPriority(cls, order), companion: c.companion, portrait: c.portrait });
  const target = c.level, xp = c.xp;
  n.xp = 999999; while (n.level < target) levelUp(n);
  Object.assign(n, { id: c.id, xp, ai: c.ai, tactics: c.tactics, side: c.side });
  longRest(n);
  return n;
}
