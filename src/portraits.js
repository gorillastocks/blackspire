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

function svg(p) {
  const C = CLS[p.cls], f = p.sex === 'f', S = p.skin, H = p.hair, out = [];
  const drag = p.race === 'dragonborn', dwarf = p.race === 'hillDwarf', gnome = p.race === 'rockGnome', half = p.race === 'lightfootHalfling';
  const elfish = ['highElf', 'halfElf'].includes(p.race), orc = p.race === 'halfOrc', tief = p.race === 'tiefling';
  const hw = dwarf ? 15 : gnome || half ? 13 : 12, hy = gnome || half ? 30 : 28; // head half-width, centre y
  out.push(`<rect width="64" height="64" rx="10" fill="${p.bg}"/>`, `<circle cx="32" cy="26" r="24" fill="#ffffff10"/>`);
  if (f && !drag && !['helm', 'goldhelm', 'hood', 'hoodgreen', 'hoodpurple'].includes(C.gear) && p.cls !== 'monk') out.push(`<path d="M${32 - hw - 4} ${hy} Q32 ${hy - 26} ${32 + hw + 4} ${hy} L${32 + hw + 5} ${hy + 22} L${32 - hw - 5} ${hy + 22}Z" fill="${H}"/>`); // long hair behind
  out.push(`<path d="M6 64 Q8 ${hy + 18} 32 ${hy + 16} Q56 ${hy + 18} 58 64Z" fill="${C.cloth}"/>`, `<path d="M26 ${hy + 10} h12 v8 h-12z" fill="${S}"/>`); // shoulders, neck
  if (elfish || gnome) for (const s of [-1, 1]) out.push(`<path d="M${32 + s * (hw - 1)} ${hy - 2} L${32 + s * (hw + (p.race === 'highElf' ? 9 : 6))} ${hy - 9} L${32 + s * (hw - 1)} ${hy + 4}Z" fill="${S}"/>`);
  else if (!drag) for (const s of [-1, 1]) out.push(`<circle cx="${32 + s * hw}" cy="${hy + 1}" r="3" fill="${S}"/>`);
  if (drag) out.push(`<path d="M${32 - hw} ${hy - 6} Q32 ${hy - 18} ${32 + hw} ${hy - 6} L${32 + hw - 1} ${hy + 6} Q32 ${hy + 16} ${32 - hw + 1} ${hy + 6}Z" fill="${S}"/>`, `<path d="M24 ${hy + 4} Q32 ${hy + 14} 40 ${hy + 4} L38 ${hy + 9} Q32 ${hy + 13} 26 ${hy + 9}Z" fill="#00000030"/>`,
    `<path d="M${32 - hw + 2} ${hy - 8} l-5 -9 l9 5Z M${32 + hw - 2} ${hy - 8} l5 -9 l-9 5Z" fill="#e8e0c8"/>`, `<path d="M26 ${hy - 10} q6 3 12 0" stroke="#00000040" fill="none"/>`);
  else out.push(`<ellipse cx="32" cy="${hy}" rx="${hw}" ry="${hw + 2}" fill="${S}"/>`);
  // eyes, brows, mouth
  const ey = hy - 1, glow = C.gear === 'glow' || tief, eye = glow ? '#ffd040' : drag ? '#ffcf3a' : '#1b1b24';
  out.push(`<ellipse cx="${32 - 5}" cy="${ey}" rx="2" ry="${f ? 2.2 : 1.8}" fill="${eye}"/>`, `<ellipse cx="${32 + 5}" cy="${ey}" rx="2" ry="${f ? 2.2 : 1.8}" fill="${eye}"/>`);
  if (f) out.push(`<path d="M${32 - 8} ${ey - 2} l2 -1 M${32 + 8} ${ey - 2} l-2 -1" stroke="#1b1b24" stroke-width="1"/>`);
  out.push(`<path d="M${32 - 8} ${ey - 4} q3 -2 6 0 M${32 + 2} ${ey - 4} q3 -2 6 0" stroke="${drag ? '#00000060' : H}" stroke-width="1.6" fill="none"/>`);
  if (!drag) out.push(`<path d="M29 ${hy + 6} q3 ${f ? 2.5 : 1.5} 6 0" stroke="${f ? '#b3404a' : '#5a2a20'}" stroke-width="${f ? 1.8 : 1.3}" fill="none"/>`, `<path d="M32 ${ey + 1} l-1.5 4 h3" stroke="#00000030" fill="none"/>`);
  if (orc) out.push(`<path d="M28 ${hy + 6} l-1 -4 l2 3Z M36 ${hy + 6} l1 -4 l-2 3Z" fill="#fff8e0"/>`);
  if (!f && (dwarf || ['cleric', 'barbarian', 'wizard'].includes(p.cls) && !drag && !elfish)) out.push(`<path d="M${32 - hw + 1} ${hy + 2} Q32 ${hy + (dwarf ? 22 : 15)} ${32 + hw - 1} ${hy + 2} Q32 ${hy + 9} ${32 - hw + 1} ${hy + 2}Z" fill="${H}"/>`);
  if (f && dwarf) out.push(`<path d="M${32 - hw} ${hy} q-3 12 2 18 M${32 + hw} ${hy} q3 12 -2 18" stroke="${H}" stroke-width="4" fill="none"/>`);
  if (tief) out.push(`<path d="M${32 - 8} ${hy - hw + 1} q-8 -6 -6 -14 q2 8 9 10Z M${32 + 8} ${hy - hw + 1} q8 -6 6 -14 q-2 8 -9 10Z" fill="#3a2a3a"/>`);
  // hair on top (when not covered)
  const covered = ['helm', 'goldhelm', 'hood', 'hoodgreen', 'hoodpurple', 'hat'].includes(C.gear);
  if (!drag && !covered && p.cls !== 'monk') out.push(`<path d="M${32 - hw - 1} ${hy - 1} Q${32 - hw} ${hy - hw - 8} 32 ${hy - hw - 4} Q${32 + hw} ${hy - hw - 8} ${32 + hw + 1} ${hy - 1} Q${32 + 4} ${hy - hw + 1} ${32 - hw - 1} ${hy - 1}Z" fill="${H}"/>`);
  // class gear
  const top = hy - hw - 2;
  switch (C.gear) {
    case 'helm': case 'goldhelm': { const m = C.gear === 'goldhelm' ? '#e0b84a' : '#a9b2c0', d = C.gear === 'goldhelm' ? '#9a7a2a' : '#6a7280'; out.push(`<path d="M${32 - hw - 2} ${hy - 1} Q32 ${top - 10} ${32 + hw + 2} ${hy - 1} L${32 + hw + 2} ${hy + 3} L${32 - hw - 2} ${hy + 3}Z" fill="${m}" stroke="${d}" stroke-width="1.5"/>`, `<path d="M32 ${top - 4} v${hw + 6}" stroke="${d}" stroke-width="2.5"/>`); if (C.gear === 'goldhelm') out.push(`<path d="M32 ${top - 4} q-2 -8 4 -10" stroke="#fff" stroke-width="2" fill="none"/>`); break; }
    case 'hat': out.push(`<path d="M${32 - hw - 9} ${hy - 4} Q32 ${hy - 9} ${32 + hw + 9} ${hy - 4} Q32 ${hy - 1} ${32 - hw - 9} ${hy - 4}Z" fill="#2a2d80"/>`, `<path d="M${32 - hw + 1} ${hy - 6} L${36} ${top - 18} Q40 ${top - 20} 42 ${top - 14} L${32 + hw - 1} ${hy - 6}Z" fill="#3c3fa8"/>`, `<circle cx="33" cy="${top - 2}" r="1.6" fill="#ffd34d"/>`); break;
    case 'hood': case 'hoodgreen': case 'hoodpurple': { const c = C.gear === 'hood' ? '#2c2c36' : C.gear === 'hoodgreen' ? '#35602c' : '#4a2a6a'; out.push(`<path d="M${32 - hw - 5} ${hy + 14} Q${32 - hw - 6} ${top - 12} 32 ${top - 8} Q${32 + hw + 6} ${top - 12} ${32 + hw + 5} ${hy + 14} L${32 + hw - 1} ${hy + 6} Q${32 + hw} ${hy - hw} 32 ${hy - hw} Q${32 - hw} ${hy - hw} ${32 - hw + 1} ${hy + 6}Z" fill="${c}"/>`); break; }
    case 'circlet': out.push(`<path d="M${32 - hw} ${hy - 6} Q32 ${hy - 9} ${32 + hw} ${hy - 6}" stroke="#e8c84a" stroke-width="2" fill="none"/>`, `<circle cx="32" cy="${hy - 8}" r="2.2" fill="#7fd1ff"/>`); break;
    case 'feather': out.push(`<path d="M${32 - hw - 3} ${hy - 6} Q32 ${top - 6} ${32 + hw + 3} ${hy - 6}Z" fill="#7a2a4a"/>`, `<path d="M${32 + hw - 2} ${hy - 9} q8 -10 14 -16 q-4 10 -12 17" fill="#f0e070"/>`); break;
    case 'leaves': for (let i = -2; i <= 2; i++) out.push(`<ellipse cx="${32 + i * 6}" cy="${top + 2 + Math.abs(i)}" rx="3.2" ry="1.6" transform="rotate(${i * 25} ${32 + i * 6} ${top + 2 + Math.abs(i)})" fill="#5fa84a"/>`); break;
    case 'paint': out.push(`<path d="M${32 - 9} ${ey - 1} l6 3 M${32 + 9} ${ey - 1} l-6 3" stroke="#3a6ad8" stroke-width="2"/>`); break;
    case 'band': out.push(`<path d="M${32 - hw} ${hy - 6} Q32 ${hy - 9} ${32 + hw} ${hy - 6}" stroke="#c03030" stroke-width="3" fill="none"/>`); break;
    case 'glow': out.push(`<circle cx="32" cy="${top - 2}" r="3" fill="#ff8040" opacity=".8"/>`); break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${out.join('')}</svg>`;
}
const cache = new Map();
/** data: URL of portrait i (any integer; wraps). */
export function portraitURL(i) { i = ((i | 0) % PORTRAIT_COUNT + PORTRAIT_COUNT) % PORTRAIT_COUNT; if (!cache.has(i)) cache.set(i, 'data:image/svg+xml;utf8,' + encodeURIComponent(svg(PORTRAITS[i]))); return cache.get(i); }
/** Random portrait, preferring one of the character's race (and class) when there is one. */
export function randomPortrait(race = null, cls = null, rnd = Math.random) {
  let pool = PORTRAITS.filter((p) => p.race === race && p.cls === cls); if (!pool.length) pool = PORTRAITS.filter((p) => p.race === race); if (!pool.length) pool = PORTRAITS;
  return pool[Math.floor(rnd() * pool.length)].id;
}
