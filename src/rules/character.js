import { ABILITIES, RACES, CLASSES, WEAPONS, ARMOR, ITEMS, SKILLS, SPELLS, FULL_CASTER_SLOTS, XP_LEVELS, MAX_LEVEL, STANDARD_ARRAY, profBonus } from './data.js';
import { die, roll, d20 } from './dice.js';

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
    skills: skills || [...C.skillChoices.slice(0, 2), ...(R.skills || [])], expertise: cls === 'rogue' ? [...C.expertise] : [],
    equip: { weapon: { base: st.weapon, magic: 0 }, ranged: st.ranged ? { base: st.ranged, magic: 0 } : null, armor: st.armor ? { base: st.armor, magic: 0 } : null, shield: !!st.shield, ring: null, cloak: null },
    hp: 0, maxHp: 0, tempMaxBonus: 0, hitDice: 1, conditions: {}, deathSaves: { s: 0, f: 0 }, dead: false, stable: false,
    slots: [], maxSlots: [], concentration: null, res: {}, ai: !!companion, hpHistory: [],
  };
  if (race === 'dragonborn' && cls === 'wizard') {/* fine */}
  c.maxHp = C.hitDie + mod(c.scores.con) + (R.hpPerLevel || 0);
  c.hp = c.maxHp;
  refreshResources(c, true);
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
export function saveMod(c, a) {
  let m = abilityMod(c, a);
  if (CLASSES[c.cls].saves.includes(a)) m += prof(c);
  if (c.equip.ring) m += ITEMS[c.equip.ring].saves || 0;
  if (c.equip.cloak) m += ITEMS[c.equip.cloak].saves || 0;
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
    if (c.cls === 'fighter') ac += 1; // Fighting Style: Defense
  } else ac = c.conditions.mageArmor ? 13 + dex : 10 + dex;
  if (c.equip.shield && CLASSES[c.cls].armor.includes('shield')) ac += 2;
  if (c.equip.ring) ac += ITEMS[c.equip.ring].ac; if (c.equip.cloak) ac += ITEMS[c.equip.cloak].ac;
  if (c.conditions.shieldOfFaith) ac += 2;
  if (c.conditions.shieldSpell) ac += 5;
  return ac;
}

/** Attack bonus and damage for a weapon slot ('weapon' | 'ranged'). */
export function weaponStats(c, slot = 'weapon') {
  const w = c.equip[slot]; if (!w) return null;
  const W = WEAPONS[w.base];
  const ranged = W.props.includes('ranged');
  const finesse = W.props.includes('finesse');
  const abil = ranged ? 'dex' : finesse ? (abilityMod(c, 'dex') > abilityMod(c, 'str') ? 'dex' : 'str') : 'str';
  const m = abilityMod(c, abil);
  let dmg = W.dmg;
  // Versatile weapons used two-handed when no shield
  if (W.props.includes('versatile') && !c.equip.shield) dmg = { longsword: '1d10', battleaxe: '1d10', warhammer: '1d10', quarterstaff: '1d8', spear: '1d8' }[w.base] || dmg;
  const bonus = m + (isProficientWeapon(c, w.base) ? prof(c) : 0) + (w.magic || 0);
  return { name: (w.magic ? `${W.name} +${w.magic}` : W.name), bonus, dmg, dmgBonus: m + (w.magic || 0), type: W.type, ranged, finesse };
}
export function spellMod(c) { const a = CLASSES[c.cls].caster; return a ? abilityMod(c, a) : 0; }
export function spellDC(c) { return 8 + prof(c) + spellMod(c); }
export function spellAttack(c) { return prof(c) + spellMod(c); }
export function maxSlotLevel(c) { return c.maxSlots.length; }
export function knownSpells(c) {
  if (!CLASSES[c.cls].caster) return [];
  const maxL = maxSlotLevel(c);
  return Object.entries(SPELLS).filter(([, s]) => s.cls.includes(c.cls) && s.level <= maxL).map(([k]) => k);
}
export function sneakDice(c) { return c.cls === 'rogue' ? Math.ceil(c.level / 2) : 0; }
export function cantripDice(c) { return c.level >= 5 ? 2 : 1; }
export function attacksPerAction(c) { return c.cls === 'fighter' && c.level >= 5 ? 2 : 1; }
export function critRange(c) { return c.cls === 'fighter' && c.level >= 3 ? 19 : 20; }

export function refreshResources(c, full) {
  const C = CLASSES[c.cls];
  if (C.caster) { c.maxSlots = [...FULL_CASTER_SLOTS[c.level]]; if (full) c.slots = [...c.maxSlots]; }
  if (full) {
    c.res = {
      secondWind: c.cls === 'fighter' ? 1 : 0,
      actionSurge: c.cls === 'fighter' && c.level >= 2 ? 1 : 0,
      channelDivinity: c.cls === 'cleric' && c.level >= 2 ? (c.level >= 6 ? 2 : 1) : 0,
      arcaneRecovery: c.cls === 'wizard' ? 1 : 0,
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
  if (c.cls === 'wizard' && c.res.arcaneRecovery) {
    // Arcane Recovery: recover slots with combined level <= half wizard level (rounded up), none 6th+
    let budget = Math.ceil(c.level / 2), got = [];
    for (let l = Math.min(budget, c.maxSlots.length); l >= 1; l--) {
      while (budget >= l && c.slots[l - 1] < c.maxSlots[l - 1]) { c.slots[l - 1]++; budget -= l; got.push(l); }
    }
    if (got.length) { c.res.arcaneRecovery = 0; log.push(`${c.name} uses Arcane Recovery (slots ${got.join(', ')}).`); }
  }
  return log;
}
export function longRest(c) {
  if (c.dead) return;
  c.hp = c.maxHp; c.deathSaves = { s: 0, f: 0 }; c.stable = false;
  c.hitDice = Math.min(c.level, c.hitDice + Math.max(1, Math.floor(c.level / 2)));
  const keep = {}; if (c.conditions.mageArmor) keep.mageArmor = c.conditions.mageArmor;
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
  const gain = Math.max(1, Math.floor(C.hitDie / 2) + 1 + abilityMod(c, 'con') + (RACES[c.race].hpPerLevel || 0));
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
  if (C.caster) { c.slots = c.maxSlots.map((m, i) => Math.min(m, (c.slots[i] ?? 0) + (m - (FULL_CASTER_SLOTS[c.level - 1][i] || 0)))); if (c.maxSlots.length > oldSlots) msgs.push(`Can now cast level ${c.maxSlots.length} spells!`); }
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
