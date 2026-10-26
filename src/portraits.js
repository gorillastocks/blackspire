const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
// Original, procedurally drawn SVG portraits (owned by the project; no external art). Each is a small 64×64 bust.
const SKIN = { human: ['#f1c7a3', '#c98e64', '#8a5a3c'], hillDwarf: ['#e9b893', '#b97e5a'], highElf: ['#f6dcc4', '#d9b69a'], lightfootHalfling: ['#f0c39c', '#c48b62'], rockGnome: ['#f2cfae', '#d6a27e'], halfOrc: ['#8fae7a', '#6f9160'], dragonborn: ['#b8433a', '#3f8a6a', '#c9a24a', '#4a6fb0'], tiefling: ['#c94a5a', '#8a4fa8'], halfElf: ['#efcfb2', '#b88462'] };
const HAIR = ['#2b1d14', '#6b3f1d', '#c9862e', '#e8d18a', '#9a9a9a', '#b8322a', '#1d1d2b', '#f2f2f2'];
const CLS = {
  fighter: { cloth: '#7a8394', gear: 'helm' }, wizard: { cloth: '#3c3fa8', gear: 'hat' }, cleric: { cloth: '#e8e2c8', gear: 'circlet' },
  rogue: { cloth: '#3a3a44', gear: 'hood' }, ranger: { cloth: '#3f6b34', gear: 'hoodgreen' }, barbarian: { cloth: '#7a4a2a', gear: 'paint' },
  bard: { cloth: '#a8325a', gear: 'feather' }, druid: { cloth: '#5a7a3a', gear: 'leaves' }, paladin: { cloth: '#d8c27a', gear: 'goldhelm' },
  sorcerer: { cloth: '#8a2a2a', gear: 'glow' }, warlock: { cloth: '#3a2050', gear: 'hoodpurple' }, monk: { cloth: '#d8892a', gear: 'band' },
};
const BG = ['#2a1f50', '#1e3a4a', '#4a2a2a', '#2a4a2e', '#4a3a1e', '#3a1e4a'];
// 36 hand-picked combinations: every race, both genders, every class.
const LIST = [
  ['human', 'm', 'fighter', 0, 1], ['human', 'f', 'wizard', 1, 3], ['human', 'f', 'paladin', 0, 2], ['human', 'm', 'rogue', 2, 0], ['human', 'm', 'monk', 1, 6], ['human', 'f', 'ranger', 2, 5],
  ['hillDwarf', 'm', 'cleric', 0, 5], ['hillDwarf', 'f', 'fighter', 1, 2], ['hillDwarf', 'm', 'barbarian', 1, 4], ['hillDwarf', 'f', 'druid', 0, 1],
  ['highElf', 'f', 'wizard', 0, 3], ['highElf', 'm', 'ranger', 1, 7], ['highElf', 'f', 'sorcerer', 0, 6], ['highElf', 'm', 'bard', 1, 2],
  ['lightfootHalfling', 'm', 'rogue', 0, 1], ['lightfootHalfling', 'f', 'bard', 1, 2], ['lightfootHalfling', 'f', 'cleric', 0, 3],
  ['rockGnome', 'm', 'wizard', 0, 4], ['rockGnome', 'f', 'warlock', 1, 5], ['rockGnome', 'f', 'monk', 0, 7],
  ['halfOrc', 'm', 'barbarian', 0, 0], ['halfOrc', 'f', 'fighter', 1, 6], ['halfOrc', 'm', 'paladin', 1, 0], ['halfOrc', 'f', 'druid', 0, 1],
  ['dragonborn', 'm', 'paladin', 0, 0], ['dragonborn', 'f', 'sorcerer', 1, 0], ['dragonborn', 'm', 'fighter', 2, 0], ['dragonborn', 'f', 'cleric', 3, 0],
  ['tiefling', 'f', 'warlock', 0, 6], ['tiefling', 'm', 'sorcerer', 1, 0], ['tiefling', 'f', 'bard', 0, 7], ['tiefling', 'm', 'rogue', 1, 1],
  ['halfElf', 'f', 'ranger', 0, 2], ['halfElf', 'm', 'bard', 1, 1], ['halfElf', 'f', 'cleric', 0, 3], ['halfElf', 'm', 'warlock', 1, 6],
];
export const PORTRAITS = LIST.map(([race, sex, cls, skin, hair], i) => ({ id: i, race, sex, cls, skin: SKIN[race][skin % SKIN[race].length], hair: HAIR[hair], bg: BG[i % BG.length] }));
export const PORTRAIT_COUNT = PORTRAITS.length;

/** URL of painted portrait i (any integer; wraps). */
export function portraitURL(i) { i = ((i | 0) % PORTRAIT_COUNT + PORTRAIT_COUNT) % PORTRAIT_COUNT; return BASE + 'portraits/p' + String(i).padStart(2, '0') + '.webp'; }
/** Random portrait, preferring one of the character's race (and class) when there is one. */
export function randomPortrait(race = null, cls = null, rnd = Math.random) {
  let pool = PORTRAITS.filter((p) => p.race === race && p.cls === cls); if (!pool.length) pool = PORTRAITS.filter((p) => p.race === race); if (!pool.length) pool = PORTRAITS;
  return pool[Math.floor(rnd() * pool.length)].id;
}
