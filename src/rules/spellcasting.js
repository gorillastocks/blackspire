/* SRD 5.1 spell selection: cantrips known, spells known, wizard spellbook, prepared casters. */
import { CLASSES, SPELLS, slotsFor } from './data.js';

export const SCHOOL = {
  sacredFlame: 'Evocation', spareTheDying: 'Necromancy', guidance: 'Divination', bless: 'Enchantment', cureWounds: 'Evocation', healingWord: 'Evocation',
  guidingBolt: 'Evocation', shieldOfFaith: 'Abjuration', inflictWounds: 'Necromancy', aid: 'Abjuration', prayerOfHealing: 'Evocation', lesserRestoration: 'Abjuration',
  spiritualWeapon: 'Evocation', spiritGuardians: 'Conjuration', massHealingWord: 'Evocation', revivify: 'Necromancy', fireBolt: 'Evocation', rayOfFrost: 'Evocation',
  shockingGrasp: 'Evocation', magicMissile: 'Evocation', sleep: 'Enchantment', burningHands: 'Evocation', thunderwave: 'Evocation', shield: 'Abjuration',
  mageArmor: 'Abjuration', scorchingRay: 'Evocation', web: 'Conjuration', holdPerson: 'Enchantment', viciousMockery: 'Enchantment', produceFlame: 'Conjuration',
  eldritchBlast: 'Evocation', dissonantWhispers: 'Enchantment', entangle: 'Conjuration', huntersMark: 'Divination', hex: 'Enchantment', shatter: 'Evocation',
  moonbeam: 'Evocation', callLightning: 'Conjuration', fear: 'Illusion', conjureBarrage: 'Conjuration', massCureWounds: 'Evocation', iceStorm: 'Evocation',
  blight: 'Necromancy', guardianOfFaith: 'Conjuration', greaterInvisibility: 'Illusion', coneOfCold: 'Evocation', flameStrike: 'Evocation',
  insectPlague: 'Conjuration', holdMonster: 'Enchantment', fireball: 'Evocation', lightningBolt: 'Evocation',
};
/** Rough usefulness order used for Recommended / AI picks. */
const PRIORITY = ['fireBolt', 'eldritchBlast', 'sacredFlame', 'viciousMockery', 'produceFlame', 'rayOfFrost', 'shockingGrasp', 'guidance', 'spareTheDying',
  'cureWounds', 'healingWord', 'magicMissile', 'shield', 'bless', 'sleep', 'huntersMark', 'hex', 'guidingBolt', 'burningHands', 'dissonantWhispers', 'entangle', 'thunderwave', 'shieldOfFaith', 'mageArmor', 'inflictWounds',
  'spiritualWeapon', 'scorchingRay', 'moonbeam', 'shatter', 'holdPerson', 'web', 'prayerOfHealing', 'aid', 'lesserRestoration',
  'fireball', 'spiritGuardians', 'callLightning', 'conjureBarrage', 'massHealingWord', 'lightningBolt', 'fear', 'revivify',
  'guardianOfFaith', 'iceStorm', 'blight', 'greaterInvisibility', 'massCureWounds', 'coneOfCold', 'flameStrike', 'insectPlague', 'holdMonster'];
const rank = (k) => { const i = PRIORITY.indexOf(k); return i < 0 ? 999 : i; };

const CANTRIPS = { bard: [2, 3], cleric: [3, 4], druid: [2, 3], sorcerer: [4, 5], warlock: [2, 3], wizard: [3, 4] }; // [L1-3, L4+]
const KNOWN = { bard: [4, 5, 6, 7, 8, 9, 10, 11, 12], sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10], warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10], ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6] };

export function casterType(cls) {
  if (!CLASSES[cls]?.caster) return null;
  if (cls === 'wizard') return 'book';
  return KNOWN[cls] ? 'known' : 'prepared';
}
const modOf = (c) => Math.floor(((c.scores[CLASSES[c.cls].caster] ?? 10) - 10) / 2);
export const maxSpellLevel = (c, level = c.level) => slotsFor(c.cls, level).length;
export const cantripPool = (cls) => Object.keys(SPELLS).filter((k) => SPELLS[k].level === 0 && SPELLS[k].cls.includes(cls));
export const classPool = (cls, maxL) => Object.keys(SPELLS).filter((k) => SPELLS[k].level >= 1 && SPELLS[k].level <= maxL && SPELLS[k].cls.includes(cls));

export function cantripsMax(c, level = c.level) { const t = CANTRIPS[c.cls]; return t ? Math.min(cantripPool(c.cls).length, t[level >= 4 ? 1 : 0]) : 0; }
export function knownMax(c, level = c.level) { const t = KNOWN[c.cls]; return t ? Math.min(classPool(c.cls, maxSpellLevel(c, level)).length, t[level - 1]) : 0; }
/** Spells a wizard may have in the book at a level: 6 + 2 per level-up (limited by what exists). */
export function bookMax(c, level = c.level) { return Math.min(classPool('wizard', maxSpellLevel(c, level)).length, 6 + 2 * (level - 1)); }
export function preparedMax(c, level = c.level) {
  const t = casterType(c.cls); if (t !== 'book' && t !== 'prepared') return 0;
  if (!maxSpellLevel(c, level)) return 0;
  const n = Math.max(1, modOf(c) + (CLASSES[c.cls].half ? Math.floor(level / 2) : level));
  return Math.min(n, prepPool(c, level).length);
}
/** What a preparer may prepare from: wizard's book, or the full class list. */
export function prepPool(c, level = c.level) { const maxL = maxSpellLevel(c, level); return casterType(c.cls) === 'book' ? (c.spells || []).filter((k) => SPELLS[k]?.level <= maxL) : classPool(c.cls, maxL); }

/** Ordered best-first: one of the highest level available first, then one per lower level, then by priority. */
export function recommendOrder(pool) {
  const byP = [...pool].sort((a, b) => rank(a) - rank(b) || SPELLS[b].level - SPELLS[a].level);
  const lv = [...new Set(pool.map((k) => SPELLS[k].level))].sort((a, b) => b - a), first = [];
  for (const l of lv) { const k = byP.find((x) => SPELLS[x].level === l); if (k) first.push(k); }
  return [...first, ...byP.filter((k) => !first.includes(k))];
}
/** Keep `keep` (valid ones, trimmed by recommendation if too many), then fill to n from the pool. */
export function fillPick(pool, n, keep = []) {
  const kept = recommendOrder(keep.filter((k) => pool.includes(k))).slice(0, n);
  for (const k of recommendOrder(pool)) { if (kept.length >= n) break; if (!kept.includes(k)) kept.push(k); }
  return kept;
}

/** Make sure a caster has valid selections; auto-picks (AI) to fill gaps and trims overflow. Old saves are migrated here. */
export function ensureSpells(c) {
  const t = casterType(c.cls); if (!t) return c;
  if (!c.spellsInit) { // migration: old saves learned everything up to their top slot
    const maxL = maxSpellLevel(c);
    c.cantrips = Array.isArray(c.cantrips) ? c.cantrips : [];
    if (t === 'book') c.spells = Array.isArray(c.spells) ? c.spells : (c.level > 1 ? classPool('wizard', maxL) : []); // grandfathered spellbook
    else if (t === 'known') c.spells = Array.isArray(c.spells) ? c.spells : classPool(c.cls, maxL); // trimmed below
    c.prepared = Array.isArray(c.prepared) ? c.prepared : [];
    c.spellsInit = true;
  }
  autoFill(c);
  return c;
}
export function autoFill(c) {
  const t = casterType(c.cls); if (!t) return c;
  c.cantrips = fillPick(cantripPool(c.cls), cantripsMax(c), c.cantrips || []);
  if (t === 'known') c.spells = fillPick(classPool(c.cls, maxSpellLevel(c)), knownMax(c), c.spells || []);
  if (t === 'book') { const pool = classPool('wizard', maxSpellLevel(c)); const book = (c.spells || []).filter((k) => SPELLS[k]); c.spells = book.length >= bookMax(c) ? book : fillPick(pool, bookMax(c), book); }
  if (t === 'book' || t === 'prepared') c.prepared = fillPick(prepPool(c), preparedMax(c), c.prepared || []);
  return c;
}
/** Spells usable right now (cantrips + known or prepared). */
export function activeSpells(c) {
  const t = casterType(c.cls); if (!t) return [];
  ensureSpells(c);
  const maxL = maxSpellLevel(c);
  const lev = (t === 'known' ? c.spells : c.prepared).filter((k) => SPELLS[k] && SPELLS[k].level <= maxL);
  return [...c.cantrips, ...lev];
}

/* ---------- Picker model (UI-agnostic) ---------- */
/** Sections for a picker. mode: 'create' | 'levelup' | 'prepare'. prev = snapshot before level-up. */
export function pickerSections(c, mode, prev = null) {
  ensureSpells(c);
  const t = casterType(c.cls), out = [], maxL = maxSpellLevel(c);
  if (!t) return out;
  if (mode !== 'prepare' && cantripsMax(c)) out.push({ id: 'cantrips', title: 'Cantrips', pool: cantripPool(c.cls), n: cantripsMax(c), sel: [...c.cantrips], locked: prev ? prev.cantrips || [] : [], swaps: 0 });
  if (mode !== 'prepare' && t === 'known' && knownMax(c)) out.push({ id: 'spells', title: 'Spells known', pool: classPool(c.cls, maxL), n: knownMax(c), sel: [...c.spells], locked: prev ? prev.spells || [] : [], swaps: prev ? 1 : 0 });
  if (mode !== 'prepare' && t === 'book') {
    const pool = mode === 'create' ? classPool('wizard', 1) : classPool('wizard', maxL);
    out.push({ id: 'spells', title: 'Spellbook', pool, n: mode === 'create' ? Math.min(6, pool.length) : bookMax(c), sel: [...c.spells], locked: prev ? prev.spells || [] : [], swaps: 0 });
  }
  if ((t === 'book' || t === 'prepared') && preparedMax(c)) out.push({ id: 'prepared', title: 'Prepared spells', pool: null, n: preparedMax(c), sel: [...c.prepared], locked: [], swaps: 0, fromBook: t === 'book' });
  return out;
}
/** Pool for a section given the current state of other sections (prepared depends on the book). */
export function sectionPool(c, secs, s) { if (s.pool) return s.pool; const book = secs.find((x) => x.id === 'spells'); return s.fromBook ? (book ? book.sel : c.spells).filter((k) => SPELLS[k].level <= maxSpellLevel(c)) : classPool(c.cls, maxSpellLevel(c)); }
export function sectionNeed(c, secs, s) { return Math.min(s.n, sectionPool(c, secs, s).length); }
export function sectionValid(c, secs, s) {
  const pool = sectionPool(c, secs, s);
  if (s.sel.length !== sectionNeed(c, secs, s) || s.sel.some((k) => !pool.includes(k))) return false;
  return s.locked.filter((k) => !s.sel.includes(k)).length <= s.swaps;
}
export function recommendSections(c, secs, mode, prev) {
  for (const s of secs) {
    const keep = s.locked.length ? s.locked : [];
    s.sel = fillPick(sectionPool(c, secs, s), sectionNeed(c, secs, s), s.id === 'prepared' ? [] : keep);
  }
  return secs;
}
export function autoPickSections(c, secs) {
  for (const s of secs) {
    const dropped = s.locked.filter((k) => !s.sel.includes(k));
    const keep = dropped.length > s.swaps ? [...s.locked, ...s.sel.filter((k) => !s.locked.includes(k))] : [...s.locked.filter((k) => s.sel.includes(k)), ...s.sel.filter((k) => !s.locked.includes(k))];
    const pool = sectionPool(c, secs, s), n = sectionNeed(c, secs, s);
    const locked = keep.filter((k) => s.locked.includes(k)), rest = keep.filter((k) => !s.locked.includes(k) && pool.includes(k));
    s.sel = [...locked, ...rest].slice(0, n);
    for (const k of recommendOrder(pool)) { if (s.sel.length >= n) break; if (!s.sel.includes(k)) s.sel.push(k); }
  }
  return secs;
}
export function applySections(c, secs) {
  for (const s of secs) { if (s.id === 'cantrips') c.cantrips = [...s.sel]; else if (s.id === 'spells') c.spells = [...s.sel]; else c.prepared = [...s.sel]; }
  c.spellsInit = true;
  if (casterType(c.cls) === 'book') c.prepared = c.prepared.filter((k) => c.spells.includes(k));
  return c;
}
export const snapshot = (c) => ({ cantrips: [...(c.cantrips || [])], spells: [...(c.spells || [])], prepared: [...(c.prepared || [])] });
/** Does this character have any choice to make in a picker of this mode? */
export function hasChoices(c, mode, prev) { return pickerSections(c, mode, prev).some((s) => s.n > 0); }
