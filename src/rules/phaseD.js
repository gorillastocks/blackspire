// Phase D (DOM-free): combat clarity. Row rules, condition icons, elemental weaknesses and the Study (Knowledge) check,
// plus the timing of the hero cut-ins. The combat engine and the UI both read from here so the words never drift apart.
import { MONSTERS } from './data.js';

/* ---------- Damage types: icon + name (also used for weakness chips) ---------- */
export const DTYPES = {
  fire: { icon: '🔥', name: 'Fire' }, cold: { icon: '❄️', name: 'Cold' }, lightning: { icon: '⚡', name: 'Lightning' }, thunder: { icon: '🔊', name: 'Thunder' },
  poison: { icon: '☠️', name: 'Poison' }, acid: { icon: '🧪', name: 'Acid' }, necrotic: { icon: '💀', name: 'Necrotic' }, radiant: { icon: '✨', name: 'Radiant' },
  psychic: { icon: '🧠', name: 'Psychic' }, force: { icon: '💥', name: 'Force' },
  bludgeoning: { icon: '🔨', name: 'Bludgeoning' }, piercing: { icon: '🗡️', name: 'Piercing' }, slashing: { icon: '⚔️', name: 'Slashing' },
};
export const dtype = (t) => DTYPES[t] || { icon: '•', name: t };

/** The three ways a monster can treat a damage type, with the short mark shown on its chip. */
export const TRAIT_KINDS = {
  vuln: { mark: '×2', word: 'Weak to', rule: 'takes double damage', cls: 'vuln' },
  resist: { mark: '½', word: 'Resists', rule: 'takes half damage', cls: 'resist' },
  immune: { mark: '✕', word: 'Immune to', rule: 'takes no damage', cls: 'immune' },
};
/** Every trait of a monster template as [{ type, kind }]. */
export function traitsOf(T) {
  const out = [];
  for (const kind of ['vuln', 'resist', 'immune']) for (const type of T?.[kind] || []) out.push({ type, kind });
  return out;
}
/** 'vuln' | 'resist' | 'immune' | null for one damage type against a monster template. */
export function traitFor(T, type) {
  if (T?.immune?.includes(type)) return 'immune'; if (T?.vuln?.includes(type)) return 'vuln'; if (T?.resist?.includes(type)) return 'resist'; return null;
}
/** Damage after the monster's trait: vulnerable doubles, resistant halves (rounded down), immune is zero. */
export function applyTrait(amt, kind) { return kind === 'immune' ? 0 : kind === 'resist' ? Math.floor(amt / 2) : kind === 'vuln' ? amt * 2 : amt; }
/** What the player has learned about a monster: the traits it has revealed so far, and whether it is fully studied. */
export function knownTraits(m) {
  const k = m.known || { types: {}, studied: false };
  return traitsOf(m.T).filter((t) => k.studied || k.types?.[t.type]);
}
export const isStudied = (m) => !!m.known?.studied;
export const hiddenTraitCount = (m) => traitsOf(m.T).length - knownTraits(m).length;

/* ---------- Study: a Knowledge check to learn a monster's weaknesses ---------- */
const STUDY_BY_TYPE = { undead: 'religion', fiend: 'religion', celestial: 'religion', beast: 'nature', plant: 'nature', ooze: 'arcana', construct: 'arcana', elemental: 'arcana', dragon: 'arcana', monstrosity: 'arcana', aberration: 'arcana', humanoid: 'history', giant: 'history' };
export const studySkill = (T) => STUDY_BY_TYPE[T?.type] || 'nature';
export const studyDC = (T) => 10 + Math.min(5, Math.floor(T?.cr || 0)) + (T?.boss ? 2 : 0);

/* ---------- Rows ---------- */
/** How strongly a monster favours each row: a front-row hero is picked about twelve times as often as a back-row hero (roughly 9 attacks in 10 land on the front row).
 *  Fliers and ranged attackers ignore the rows. */
export const ROW_WEIGHT = { front: 12, back: 1 };
export const ignoresRows = (T) => !!(T?.flying || T?.ranged || (T?.attacks || []).some((a) => a.ranged));
export function targetWeights(front, live, T) {
  return live.map((c) => ({ c, w: ignoresRows(T) || !front.length ? 1 : front.includes(c) ? ROW_WEIGHT.front : ROW_WEIGHT.back }));
}
export function pickWeighted(list, r = Math.random()) {
  const tot = list.reduce((s, x) => s + x.w, 0); let x = r * tot;
  for (const it of list) { if ((x -= it.w) < 0) return it.c; }
  return list[list.length - 1]?.c;
}
export const rowName = (isFront) => (isFront ? 'Front row' : 'Back row');

/* ---------- Conditions: one icon, one name, one plain sentence ---------- */
export const COND_INFO = {
  poisoned: { icon: '🤢', name: 'Poisoned', desc: 'Disadvantage on attack rolls.', tone: 'bad' },
  prone: { icon: '🙇', name: 'Prone', desc: 'Disadvantage on its own attacks. Melee attacks against it have advantage, ranged attacks have disadvantage. It stands up next turn.', tone: 'bad' },
  frightened: { icon: '😱', name: 'Frightened', desc: 'Disadvantage on attack rolls while afraid.', tone: 'bad' },
  restrained: { icon: '🕸️', name: 'Restrained', desc: 'Disadvantage on attacks and Dex saves; attacks against it have advantage. Break free with Athletics or Acrobatics.', tone: 'bad' },
  grappled: { icon: '✊', name: 'Grappled', desc: 'Held fast: the party cannot run away while someone is grappled.', tone: 'bad' },
  paralyzed: { icon: '🔒', name: 'Paralyzed', desc: 'Cannot act. Fails Str and Dex saves; attacks against it have advantage and melee hits are critical.', tone: 'bad' },
  unconscious: { icon: '💤', name: 'Unconscious', desc: 'Out cold. Attacks against it have advantage and melee hits are critical.', tone: 'bad' },
  mocked: { icon: '😵', name: 'Rattled', desc: 'Disadvantage on its next attack.', tone: 'bad' },
  marked: { icon: '🎯', name: 'Marked', desc: 'Takes an extra 1d6 from the caster\'s hits.', tone: 'bad' },
  guided: { icon: '🧭', name: 'Guided', desc: 'The next attack against it has advantage.', tone: 'bad' },
  blessed: { icon: '🙏', name: 'Blessed', desc: '+1d4 on attack rolls and saving throws.', tone: 'good' },
  inspired: { icon: '🎵', name: 'Inspired', desc: 'Adds a bardic die to the next attack.', tone: 'good' },
  dodging: { icon: '🛡️', name: 'Dodging', desc: 'Attacks against it have disadvantage until its next turn.', tone: 'good' },
  hidden: { icon: '🌫️', name: 'Hidden', desc: 'Advantage on the next attack, then the hiding ends.', tone: 'good' },
  raging: { icon: '😡', name: 'Raging', desc: 'Bonus melee damage and resistance to weapon damage.', tone: 'good' },
  reckless: { icon: '💢', name: 'Reckless', desc: 'Advantage on melee attacks this turn, and attacks against it have advantage too.', tone: 'good' },
  invisible: { icon: '👻', name: 'Invisible', desc: 'Attacks against it have disadvantage and its own attacks have advantage.', tone: 'good' },
  sacredWeapon: { icon: '☀️', name: 'Sacred Weapon', desc: 'Adds its Charisma bonus to attack rolls.', tone: 'good' },
  shieldOfFaith: { icon: '🛐', name: 'Shield of Faith', desc: '+2 AC while the caster concentrates.', tone: 'good' },
  shieldSpell: { icon: '🔰', name: 'Shield', desc: '+5 AC until its next turn.', tone: 'good' },
  spiritGuardians: { icon: '👼', name: 'Spirit Guardians', desc: 'Radiant spirits burn enemies that start their turn nearby.', tone: 'good' },
};
/** Conditions that are bookkeeping, not something to show as an icon. */
export const HIDDEN_CONDS = ['mageArmor', 'aid'];
export const condInfo = (k) => COND_INFO[k] || { icon: '•', name: k, desc: '', tone: 'bad' };
export const visibleConds = (conds) => Object.keys(conds || {}).filter((k) => !HIDDEN_CONDS.includes(k));

/* ---------- Hero cut-ins ---------- */
export const CUTIN_KINDS = ['melee', 'ranged', 'spell', 'heal'];
export const CUTIN_LABEL = { melee: 'Strike', ranged: 'Shot', spell: 'Spell', heal: 'Heal' };
/** Phase lengths in ms for the slide-in, the strike and the hit flash. f is the battle-speed factor (2× = 0.5); 0 means skipped. */
export function cutinTimes(f = 1, { skipping = false, reduce = false } = {}) {
  if (skipping) return { slide: 0, strike: 0, flash: 0, total: 0 };
  const k = Math.max(0.3, f);
  if (reduce) { const t = Math.round(240 * k); return { slide: 0, strike: t, flash: 0, total: t }; }
  const slide = Math.round(240 * k), strike = Math.round(300 * k), flash = Math.round(160 * k);
  return { slide, strike, flash, total: slide + strike + flash };
}
/** The kind of cut-in for a party action id (and, for spells, the spell). */
export function cutinKindFor(id, spell = null) {
  if (['attack', 'smite', 'frenzy', 'martialArts', 'flurry', 'strikeStaff', 'breakCollar'].includes(id)) return 'melee';
  if (['shoot', 'throw'].includes(id)) return 'ranged';
  if (['layOnHands', 'secondWind', 'preserveLife'].includes(id)) return 'heal';
  if (id === 'cast') return spell?.kind === 'heal' ? 'heal' : 'spell';
  if (id === 'item') return spell?.heal || spell?.cure ? 'heal' : null;
  if (id === 'breath') return 'spell';
  return null;
}
export const monsterTemplate = (key) => MONSTERS[key];
