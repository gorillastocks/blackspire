// BLACKSPIRE story layer: NPCs, quests, points of interest ('Q' tiles), the ritual clock, dialogue scenes and the ending.
// DOM-free so it can be unit-tested and driven by the balance sim.
import { ITEMS } from '../rules/data.js';
import { COMPANIONS } from './companions.js';
import { memoryLines, liftCurses, lioraEnding } from './phaseC.js';
import * as TT from './tabletop.js';
import { addEntry } from './journal.js';
import * as Journal from './journal.js';
export { Journal };
import { bubbles } from './reactions.js';
/** A choice's reactions as dungeon-view events: the approval notes for the log, then the companions' spoken lines. */
export function reactionEvents(s, id) {
  const r = bubbles(s, id, (k) => COMPANIONS[k]?.color); const out = r.fx.map((f) => ({ log: f.t, cls: f.cls }));
  if (r.say.length) out.push({ banter: r.say, react: true }); return out;
}

/* ---------- Cast (portraits are emoji on a coloured disc) ---------- */
export const NPCS = {
  narrator: { name: '', icon: '📜', color: '#c9b27a' },
  elowen: { name: 'Princess Elowen', icon: '👑', color: '#ffd77a' },
  malthrax: { name: 'Malthrax, the Dread Sovereign of Blackspire', icon: '💀', color: '#c03cff' },
  rowan: { name: 'Captain Rowan', icon: '🛡', color: '#7fb0ff' },
  marga: { name: 'Marga Hobb, innkeeper', icon: '🍺', color: '#ffb36b' },
  osric: { name: 'Brother Osric', icon: '⛪', color: '#fff1b0' },
  wren: { name: 'Wren the herbalist', icon: '🌿', color: '#8fe388' },
  dobbin: { name: 'Dobbin Varr, smith', icon: '⚒', color: '#ff8a4a' },
  tamsin: { name: 'Old Tamsin', icon: '🧓', color: '#d0c0ff' },
  garrick: { name: 'Garrick Vane, Seneschal of Keys', icon: '🗝', color: '#c9a0ff' },
  odalys: { name: 'Odalys Fenn, pawnbroker', icon: '🪙', color: '#e8c98a' },
  harl: { name: 'Harl Tollow, fisherman', icon: '🎣', color: '#7fd0e8' },
  anselma: { name: 'Anselma Tollow', icon: '🔔', color: '#9fe0e0' },
  ysolde: { name: 'Ysolde Verrin, glasswright', icon: '🔮', color: '#9fffd0' },
  tuck: { name: 'Tuck Harrow, gravedigger', icon: '⚰', color: '#b8a888' },
  crane: { name: 'Sergeant Aldous Crane', icon: '🛡', color: '#b8d8ff' },
  maelis: { name: 'Maelis Dewbough, orchard keeper', icon: '🌳', color: '#a8e6a0' },
  aelindra: { name: 'Aelindra, the Heartroot', icon: '🌙', color: '#c8d8ff' },
  hero: { name: 'You', icon: '⚔', color: '#ffa24a' },
};
const C = (k) => ({ name: COMPANIONS[k].short, icon: { brambur: '🔨', fizzwick: '⚙', pip: '🏮', grumsh: '🪓', zizzy: '🔥', vexrath: '🐉', nettle: '🎻', liora: '🌅' }[k], color: COMPANIONS[k].color, img: COMPANIONS[k].portrait });
export function speaker(who) { return NPCS[who] || (COMPANIONS[who] ? C(who) : NPCS.narrator); }
const L = (who, text) => ({ who, text });

/* ---------- Quests ---------- */
export const QUESTS = {
  main: { title: 'Rescue Princess Elowen', giver: 'rowan', floor: 'B1–B5', desc: 'Malthrax took Elowen to the Blackspire vault, five floors below Emberhollow. Five moons until the seals break.', reward: 'Knighthood' },
  guards: { title: 'The Lost Patrol', giver: 'rowan', floor: 'B1', need: 4, desc: 'Find and free the 4 town guards the cultists dragged into the Rat-Warrens.', reward: 'Escort buff (guards fight beside you on B1) + 75 gp' },
  tunnel: { title: "Marga's Cellar", giver: 'marga', floor: 'B1', desc: 'Something is digging into the inn cellar from below. Find the tunnel and collapse it.', reward: 'Free rooms at the inn' },
  satchel: { title: "Elowen's Satchel", giver: 'osric', floor: 'B2', desc: 'Elowen carried a satchel of temple relics. It fell in the Drowned Grotto.', reward: 'Free Raise Dead + 2 Potions of Greater Healing' },
  glowcaps: { title: 'Glowcaps for Wren', giver: 'wren', floor: 'B3', need: 3, desc: 'Gather 3 glowcap mushrooms from the Glimmerdeep.', reward: 'Potions of Stone-to-Flesh' },
  smiths: { title: 'Chains of Ashforge', giver: 'dobbin', floor: 'B4', need: 3, desc: 'Free the 3 smiths chained at the Ashforge anvils.', reward: 'A +2 smith-blessed blade (and the smiths fight at the finale)' },
  horn: { title: "The Warden's Horn", giver: 'tamsin', floor: 'B5', desc: 'The old Warden\'s warhorn lies in the vault. Sound it when the Tyrant rises.', reward: 'The Warhorn, used in the finale' },
  // companion quests
  hammer: { title: "Mum's Hammer", giver: 'brambur', floor: 'B1, B4', desc: 'Brambur\'s mother\'s hammer was stolen. Its trail starts in the Rat-Warrens and ends with Forgemaster Brakk.', reward: 'Brambur blesses the party at every boss fight' },
  pages: { title: 'The Scattered Spellbook', giver: 'fizzwick', floor: 'B2, B3', need: 2, desc: 'Fizzwick\'s spellbook pages were stolen by cultists. Two are missing.', reward: 'Fizzwick counterspells Malthrax once' },
  ballad: { title: 'The Ballad of Blackspire', giver: 'grumsh', floor: 'Every floor', need: 5, desc: 'Grumsh is writing a ballad. One verse waits on every floor.', reward: 'Feast buff: 10 temporary HP after every inn rest' },
  powder: { title: 'Big Boom', giver: 'zizzy', floor: 'B4', desc: 'Find Zizzy some blasting powder in the Ashforge.', reward: 'Blow open the Ashforge gate and skip its guards' },
  decree: { title: 'The Royal Decree', giver: 'vexrath', floor: 'B3', desc: 'Vexrath swears a royal decree exiling his clan was forged. Find the original.', reward: 'Vexrath\'s honour restored' },
  tale: { title: 'A Tall Tale', giver: 'nettle', floor: 'B2–B5', need: 4, desc: 'Nettle collects the legend of the Sovereign\'s staff, one fragment per floor.', reward: 'Reveals the weak point of Malthrax\'s staff' },
  notes: { title: "Elowen's Trail", giver: 'elowen', floor: 'Every floor', need: 10, desc: 'Elowen is leaving notes for you as she is dragged deeper — 2 per floor.', reward: 'A last word from Elowen and +1 initiative in the finale' },
};
const COMPANION_QUEST = { hammer: 'brambur', pages: 'fizzwick', debt: 'pip', ballad: 'grumsh', powder: 'zizzy', decree: 'vexrath', tale: 'nettle' };
for (const [q, d] of Object.entries(TT.TT_QUESTS)) QUESTS[q] = { title: d.title, giver: d.giver, floor: d.floor, need: d.need, desc: d.desc, reward: d.reward };

/* ---------- Elowen's notes ---------- */
export const NOTES = [
  'Note 1: "If you are reading this, you followed. Good. They tied my hands but not my pencil. Yours, E."',
  'Note 2: "The spider-rider is called Skarn. He talks to his mount. It does not answer. Neither do I."',
  'Note 3: "Water to my knees. Sister Vey sings to the old lizard. It is very bad singing."',
  'Note 4: "Malthrax says there are five seals and one breaks with every moonrise. Hurry. But eat something."',
  'Note 5: "The crystals hum when the basilisk looks at them. Mirrors, perhaps? Bring something shiny."',
  'Note 6: "Mushrooms that scream. I am not making this up. Kill the little ones first."',
  'Note 7: "Ashforge. They chain smiths to the anvils. The chimera wears a collar. Brakk is afraid of it."',
  'Note 8: "Brakk carries a dwarf-made hammer far too fine for him. Brambur will know it."',
  'Note 9: "I can see the vault. Something very large is sleeping under the floor. Malthrax keeps saying \'Gorvax\'."',
  'Note 10: "His staff is the anchor. Break it and I am free. I will be ready. Your friend, E."',
];

/* ---------- Points of interest per floor ('Q' tiles, in scan order) ---------- */
// Each entry is an id; the behaviour lives in visitPoi below.
export const LEVEL_POIS = [
  ['note1', 'guard1', 'tablet1', 'pip1', 'guard2', 'tunnel', 'verse1', 'hammerClue', 'guard3', 'collapse', 'note2', 'guard4'],
  ['note3', 'page1', 'pip2', 'satchel', 'verse2', 'tale1', 'tablet2', 'vey', 'note4', 'choir1', 'choir2'],
  ['note5', 'pylon1', 'glowcap1', 'page2', 'pip3', 'decree', 'pylon2', 'verse3', 'glowcap2', 'glass1', 'tale2', 'sporegrave', 'pylon3', 'glowcap3', 'tablet3', 'note6', 'glass2'],
  ['note7', 'smith1', 'powder', 'pip4', 'gate', 'verse4', 'smith2', 'crane1', 'tale3', 'tablet4', 'smith3', 'note8'],
  ['note9', 'horn', 'pip5', 'verse5', 'tale4', 'garrick', 'tablet5', 'note10', 'crane2', 'crane3'],
];
// Extra points of interest that are NOT placed by scan order: they are dropped inside the outdoor region of the floor (the Sunken Orchard on B3).
export const LEVEL_EXTRA_POIS = [[], [], ['orch1', 'orch2', 'orch3', 'orch4', 'orch5'], [], []];
export const TABLETS = [
  'Lore tablet: "Emberhollow was founded on a sealed tower. The founders buried it, built an inn on top, and agreed never to mention it again."',
  'Lore tablet: "The First Warden bound the Tyrant-lizard Gorvax beneath the vault with five seals and a very large horn."',
  'Lore tablet: "Glimmerdeep crystals drink light. Shatter them and the light they hoarded is set free."',
  'Lore tablet: "Ashforge was a dwarven forge-hall until Brakk sold it — and its smiths — to the Sovereign."',
  'Lore tablet: "MALTHRAX. Once court wizard of Emberhollow. Exiled for \'excessive candlelight\'. Took it personally."',
];
export const VERSES = [
  'Verse 1: "Down in the Warrens where the rat-kings sup, / Grumsh drew his axe and the rats gave up!"',
  'Verse 2: "In the Grotto deep where the waters sing, / a lizard with a club tail met a better thing!"',
  'Verse 3: "Through Glimmerdeep\'s glow where the toadstools scream, / Grumsh screamed louder (it was quite the scene)!"',
  'Verse 4: "In Ashforge\'s heat where the anvils ring, / Grumsh rang louder, being Grumsh, the king!"',
  'Verse 5: "In the Blackspire vault where the Tyrant lay — / [Grumsh: \'Last line comes after we win.\']"',
];
export const TALES = [
  'Tall tale 1: "The staff was carved from a lightning-struck spire," Nettle writes. "Everyone agrees. Nobody saw it."',
  'Tall tale 2: "It hums when he lies," Nettle notes. "So it hums constantly."',
  'Tall tale 3: "A smith says the staff has a crack near the crystal — mended with cultist spit."',
  'Tall tale 4: "There it is: the crack is under the third ring. Strike there and the whole thing goes." Nettle underlines it twice.',
];

/* ---------- State ---------- */
export function initStory(s) {
  s.flags ||= {}; s.journal ||= []; s.notes ||= []; s.moon ||= 0; s.rests ||= 0; s.quests ||= {}; s.pois ||= {};
  s.quests.main ||= 'active';
  return s;
}
export const hasComp = (s, k) => [...(s.party || []), ...(s.roster || [])].some((c) => c.companion === k && !c.dead);
const inParty = (s, k) => (s.party || []).some((c) => c.companion === k);
const prog = (s, q) => s.flags['n_' + q] || 0;
const bump = (s, q) => (s.flags['n_' + q] = prog(s, q) + 1);
export function addJournal(s, text) { initStory(s); addEntry(s, text); } // filed under the current chapter; the log is never trimmed
export function startQuest(s, q) { initStory(s); if (!s.quests[q]) { s.quests[q] = 'active'; addJournal(s, `New quest: ${QUESTS[q].title} — ${QUESTS[q].desc}`); return true; } return false; }
const ready = (s, q) => s.quests[q] === 'ready';
function progress(s, q, out, line) {
  startQuest(s, q); const n = bump(s, q); const need = QUESTS[q].need || 1;
  if (s.quests[q] === 'active' && n >= need) { s.quests[q] = 'ready'; out.push({ log: `Quest objective complete: ${QUESTS[q].title}.${QUESTS[q].giver in NPCS && !COMPANION_QUEST[q] ? ` Return to ${NPCS[QUESTS[q].giver].name}.` : ''}`, cls: 'good', sfx: 'level' }); addJournal(s, `${QUESTS[q].title}: objective complete.`); }
  else if (line) out.push({ log: `${QUESTS[q].title}: ${Math.min(n, need)}/${need}.`, cls: 'sys' });
  return n;
}
function give(s, key, out, note = '') { s.inventory.push(key); out.push({ log: `Received ${ITEMS[key].name}!${note}`, cls: 'good' }); }

/* ---------- Ritual clock: 5 seals, one breaks per moonrise (every third long rest) ---------- */
export const RESTS_PER_MOON = 3;
export function sealsBroken(s) { return Math.min(5, s.moon || 0); }
export function empowered(s) { return (s.moon || 0) >= 5; }
export function onLongRest(s) {
  initStory(s); const out = [];
  if (s.flags.ended) return out;
  s.rests++;
  if (s.rests % RESTS_PER_MOON === 0) {
    s.moon++; const b = sealsBroken(s);
    if (s.moon <= 5) { out.push({ log: `🌕 The moon rises over Emberhollow. A seal on the Blackspire cracks and breaks — ${b} of 5 broken.`, cls: 'crit', voice: { text: 'The moon rises over Emberhollow. A seal on the Blackspire cracks and breaks.', who: 'narrator' } }); addJournal(s, `Moonrise ${s.moon}: seal ${b} of 5 broken.`); }
    if (s.moon === 5) { out.push({ log: '“Five moons, Emberhollow.” Malthrax\'s laughter rolls up from below. He grows stronger (the finale is harder, but not lost).', cls: 'bad', voice: { text: 'Five moons, Emberhollow.', who: 'malthrax' } }); addJournal(s, 'All five seals are broken. Malthrax is empowered.'); }
  }
  if (s.quests.ballad === 'done' && s.mode === 'town') { for (const c of s.party) if (!c.dead) c.tempHp = Math.max(c.tempHp || 0, 10); out.push({ log: 'Grumsh\'s ballad has the inn singing. Feast buff: 10 temporary HP each.', cls: 'good' }); }
  return out;
}

/* ---------- Visiting a point of interest ---------- */
export function poiAt(levelIdx, ordinal) { const list = LEVEL_POIS[levelIdx] || []; return list[ordinal % Math.max(1, list.length)]; }
// Guarded quest spots: a fixed fight that must be won before the spot can be used (B3/B4 XP pass).
export const POI_GUARDS = {
  pylon2: { log: 'The pylon is wrapped in a quivering ochre jelly, and darkmantles drop from the crystals above!', groups: [{ key: 'ochreJelly', count: 1 }, { key: 'darkmantle', count: 2 }] },
  smith2: { log: 'The captive smith\'s chain is held by a cult fanatic and a hell hound. "Kill the heroes!"', groups: [{ key: 'cultFanatic', count: 1 }, { key: 'hellHound', count: 1 }] },
};
// Quest-spot XP, awarded to every living party member.
export const POI_XP = { pylon: 250, smith: 250 };
function poiXp(s, kind, out) { const n = POI_XP[kind]; if (!n) return; for (const c of s.party || []) if (!c.dead) c.xp += n; out.push({ log: `+${n} XP each.`, cls: 'good' }); }
export function visitPoi(s, id) {
  initStory(s); const out = []; if (!id || s.pois[id]) return out;
  if (POI_GUARDS[id] && !s.flags['guarded_' + id]) { out.push({ log: POI_GUARDS[id].log, cls: 'bad', combat: { groups: POI_GUARDS[id].groups, fixed: true, poi: id, guard: true } }); return out; }
  if (TT.isTTPoi(id)) { const sc = TT.entryFor(s, id); if (sc) out.push({ prompt: 'tt', scene: sc, poi: id }); return out; }
  const done = () => { s.pois[id] = true; out.consumed = true; };
  const m = /^(note|guard|verse|tale|tablet|page|glowcap|smith|pylon)(\d+)$/.exec(id); const kind = m ? m[1] : id; const n = m ? +m[2] : 0;
  switch (kind) {
    case 'note': { done(); s.notes.push(n); const t = NOTES[n - 1]; out.push({ log: `📜 You find a folded note in Elowen's hand. ${t}`, cls: 'lore', sfx: 'chest', voice: { text: t, who: 'elowen' } }); addJournal(s, t); progress(s, 'notes', out, true);
      if (s.notes.length >= 10) out.push({ log: 'You have every one of Elowen\'s notes. You know her plan — and she knows you are coming. (+1 initiative in the finale)', cls: 'good', voice: { text: 'You have every one of Elowen\'s notes. You know her plan, and she knows you are coming.', who: 'narrator' } }); break; }
    case 'guard': { done(); startQuest(s, 'guards'); out.push({ log: `You cut a bound town guard free. "Captain Rowan sent you? Bless you!" (${prog(s, 'guards') + 1}/4)`, cls: 'good', voice: { text: 'You cut a bound town guard free. "Captain Rowan sent you? Bless you!"', who: 'narrator' } }); progress(s, 'guards', out); break; }
    case 'tablet': { done(); out.push({ log: TABLETS[n - 1], cls: 'lore' }); addJournal(s, TABLETS[n - 1]); s.flags.tablets = (s.flags.tablets || 0) + 1; break; }
    case 'verse': { done(); startQuest(s, 'ballad'); out.push({ log: `A drunken carving on the wall inspires Grumsh. ${VERSES[n - 1]}`, cls: 'lore' }); addJournal(s, VERSES[n - 1]); progress(s, 'ballad', out, true); if (ready(s, 'ballad')) { s.quests.ballad = 'done'; out.push({ log: 'Grumsh\'s ballad is complete! Inn rests now come with a feast (10 temp HP).', cls: 'good' }); } break; }
    case 'tale': { done(); startQuest(s, 'tale'); out.push({ log: TALES[n - 1], cls: 'lore' }); addJournal(s, TALES[n - 1]); progress(s, 'tale', out, true); if (ready(s, 'tale')) { s.quests.tale = 'done'; s.flags.weakPoint = true; out.push({ log: 'Nettle knows the weak point of the Sovereign\'s staff: one clean strike will shatter it.', cls: 'good' }); } break; }
    case 'page': { done(); startQuest(s, 'pages'); out.push({ log: `A torn spellbook page, covered in Fizzwick's tiny handwriting ("NOTE TO SELF: COUNTERSPELL. ALWAYS COUNTERSPELL.").`, cls: 'lore' }); progress(s, 'pages', out, true); if (ready(s, 'pages')) { s.quests.pages = 'done'; s.flags.counterspell = true; out.push({ log: 'Fizzwick\'s spellbook is whole. He can counterspell Malthrax once in the finale.', cls: 'good' }); } break; }
    case 'glowcap': { done(); startQuest(s, 'glowcaps'); out.push({ log: 'You pick a softly glowing glowcap mushroom.', cls: 'good' }); progress(s, 'glowcaps', out, true); break; }
    case 'smith': { done(); startQuest(s, 'smiths'); out.push({ log: `You smash the chains of a captive smith. "Tell Dobbin we're coming home — and we'll be at the vault when you need us."`, cls: 'good', voice: true }); progress(s, 'smiths', out, true); break; }
    case 'pylon': { done(); s.flags.pylons = (s.flags.pylons || 0) + 1; out.push({ log: `You shatter a humming crystal pylon. Stored dawn-light spills out and sinks into the floor, heading deeper. (${s.flags.pylons}/3)`, cls: 'good', sfx: 'crit', voice: { text: 'You shatter a humming crystal pylon. Stored dawn-light spills out and sinks into the floor, heading deeper.', who: 'narrator' } }); addJournal(s, `Crystal pylon ${s.flags.pylons}/3 shattered.`); break; }
    case 'tunnel': { done(); startQuest(s, 'tunnel'); s.quests.tunnel = 'ready'; out.push({ log: 'A fresh tunnel, dug straight up toward the Boar & Spoon cellar. You kick out the supports and it caves in. Marga will want to hear.', cls: 'good', voice: true }); addJournal(s, 'Collapsed the tunnel under Marga\'s cellar.'); break; }
    case 'hammerClue': { done(); startQuest(s, 'hammer'); s.flags.hammerClue = true; out.push({ log: 'Dwarven boot-prints, and a hammer-shaped dent in a rat. "That\'s Mum\'s hammer," Brambur whispers. "Someone took it deeper."', cls: 'lore', voice: true }); addJournal(s, 'Mum\'s hammer was carried deeper — toward Ashforge.'); break; }
    case 'collapse': { out.push({ prompt: 'poi', poi: id, title: 'A Rotten Support Beam', text: 'The ceiling here sags over a side-passage where you hear cultists chanting. One good pull would bring it down on them — or on you.', choices: [{ id: 'pull', label: '💪 Pull the beam (Athletics DC 12)' }, { id: 'leave', label: 'Leave it' }] }); break; }
    case 'satchel': { done(); startQuest(s, 'satchel'); s.quests.satchel = 'ready'; out.push({ log: 'Half-sunk in the grotto: a satchel stitched with the royal sun. Elowen\'s temple relics, still dry inside. Brother Osric will want this.', cls: 'good', voice: true }); break; }
    case 'decree': { done(); startQuest(s, 'decree'); s.quests.decree = 'done'; s.gold += 150; out.push({ log: 'A crystal-sealed royal decree — the ORIGINAL. It does not exile Vexrath\'s clan; it knights them. (+150 gp from the seal\'s gold leaf)', cls: 'good', voice: { text: 'A crystal-sealed royal decree. The ORIGINAL. It does not exile Vexrath\'s clan; it knights them.', who: 'narrator' }, banter: inParty(s, 'vexrath') ? { who: 'Vexrath', color: COMPANIONS.vexrath.color, text: 'My clan\'s honour... restored. I will carry this to the throne myself.' } : null }); addJournal(s, 'Found the true royal decree: Vexrath\'s clan was never exiled.'); break; }
    case 'powder': { done(); startQuest(s, 'powder'); s.flags.powder = true; s.quests.powder = 'done'; out.push({ log: `A keg of dwarven blasting powder.${hasComp(s, 'zizzy') ? ' Zizzy\'s eyes light up. "Oh, we are SO using this on the gate."' : ' It looks like the sort of thing a sorcerer would enjoy.'}`, cls: 'good', voice: true }); break; }
    case 'gate': {
      if (s.flags.powder && hasComp(s, 'zizzy')) { done(); s.flags.gateBlown = true; out.push({ log: 'Zizzy packs the powder against the Ashforge gate. KA-BOOM! The gate — and its guards — are no longer a problem.', cls: 'good', shake: true, voice: true }); break; }
      out.push({ log: 'The Ashforge gate grinds open — and its guardians step out!', cls: 'bad', combat: { groups: [{ key: 'gargoyle', count: 2 }, { key: 'magmin', count: 2 }], fixed: true, poi: id } }); break;
    }
    case 'horn': { done(); startQuest(s, 'horn'); s.quests.horn = 'done'; give(s, 'warhorn', out, ' Old Tamsin\'s tale was true. You will sound it when the Tyrant rises.'); out[out.length - 1].voice = { text: 'Old Tamsin\'s tale was true. You will sound it when the Tyrant rises.', who: 'narrator' }; break; }
    case 'vey': out.push({ log: 'Sister Vey rises from the black water, singing. "The princess passed this way. You will not."', cls: 'bad', combat: { groups: [{ key: 'sisterVey', count: 1 }, { key: 'cultist', count: 2 }], fixed: true, poi: id, lieutenant: true } }); break;
    case 'sporegrave': out.push({ log: 'The cavern floor heaves. Mother Sporegrave unfurls, shriekers wailing around her!', cls: 'bad', combat: { groups: [{ key: 'motherSporegrave', count: 1 }, { key: 'shrieker', count: 2 }], fixed: true, poi: id, lieutenant: true } }); break;
    default: break;
  }
  if (out.consumed) poiXp(s, kind, out);
  return out;
}
/** A tabletop session at a POI ended: use the spot up when the scene said so. Returns true if the tile should be cleared. */
export function finishTT(s, poi, sess) { if (poi && sess?.consumed) { s.pois[poi] = true; return true; } return false; }
export { TT };
/** Resolve a choice prompt from a POI. */
export function choosePoi(s, id, choice, checkFn) {
  const out = []; if (s.pois[id]) return out;
  if (id === 'collapse') {
    if (choice !== 'pull') { out.push({ log: 'You leave the beam alone. Probably wise.', cls: 'dim' }); return out; }
    s.pois[id] = true; out.consumed = true;
    const ok = checkFn ? checkFn('athletics', 12) : true;
    if (ok) { s.flags.collapsed = true; s.gold += 40; out.push({ log: 'CRACK! The ceiling caves in on the cultist side-passage. Silence — and a pouch of 40 gp rolls out of the dust.', cls: 'good', shake: true, voice: true }); out.push(...reactionEvents(s, 'story.collapse')); }
    else { const v = s.party.find((c) => !c.dead && c.hp > 0); if (v) v.hp = Math.max(1, v.hp - 6); out.push({ log: `The beam slips! Rubble clips ${v ? v.name : 'you'} for 6 damage, and the cultists come running.`, cls: 'bad', shake: true, combat: { groups: [{ key: 'cultist', count: 3 }], fixed: true } }); }
  }
  return out;
}

/* ---------- Boss / lieutenant rewards ---------- */
const BOSS_REWARD = ['dawnfang', 'sunshardAegis', 'dawncrestHelm', 'emberwardCloak', 'crownGuardPlate'];
export function onCombatWon(s, info, level) {
  initStory(s); const out = [];
  if (info?.poi && POI_GUARDS[info.poi]) { s.flags['guarded_' + info.poi] = true; out.push(...visitPoi(s, info.poi)); return out; } // guards beaten: use the spot
  if (info?.poi) s.pois[info.poi] = true; // fight-POIs are only used up once you win
  if (info?.poi === 'vey') { out.push({ log: 'Sister Vey sinks beneath the water, her hymn ending in bubbles.', cls: 'good', voice: true }); give(s, 'potionGreater', out); }
  if (info?.poi === 'sporegrave') { out.push({ log: 'Mother Sporegrave collapses into a heap of harmless puffballs.', cls: 'good', voice: true }); give(s, 'potionStoneFlesh', out); }
  if (info?.boss && level === 4 && !info.phase2) { s.flags.boss4p1 = true; return out; } // phase 1 of the finale: the Tyrant comes next
  if (info?.boss && !s.flags['boss' + level]) {
    s.flags['boss' + level] = true;
    give(s, BOSS_REWARD[level], out, ' A piece of the Dawn Regalia!');
    if (level === 0) { out.push({ log: 'Skarn tumbles from the Broodmother\'s back. Among his things: Elowen\'s ribbon, and a map marked "B2".', cls: 'lore' }); addJournal(s, 'Defeated Skarn and the Broodmother. Dawnfang recovered.'); }
    if (level === 1) addJournal(s, 'Old Clubtail falls. The Sunshard Aegis gleams like a mirror.');
    if (level === 2) addJournal(s, 'Glasshide the basilisk is stone — its own gaze turned back on it.');
    if (level === 3) { addJournal(s, 'Forgemaster Brakk is defeated in the ruins of Ashforge.'); if (s.quests.hammer) { s.quests.hammer = 'done'; s.flags.hammer = true; out.push({ log: 'Brambur pries his mother\'s hammer from Brakk\'s grip and weeps into his beard. (Free Bless at every boss fight)', cls: 'good', voice: { text: 'Brambur pries his mother\'s hammer from Brakk\'s grip and weeps into his beard.', who: 'narrator' } }); } }
    if (level === 4) { give(s, 'dawnstoneAmulet', out); s.flags.finaleWon = true; }
  }
  return out;
}

/** Extra combat options for story fights (see Combat `story`). */
export function storyCombat(s, info, level) {
  initStory(s); const o = {};
  if (info?.boss || info?.lieutenant) {
    if (s.flags.hammer && hasComp(s, 'brambur')) o.bless = 'Brambur raises his mother\'s hammer: "Bless us, Mum!"';
  }
  if ((info?.boss || info?.lieutenant) && s.flags.craneAid && !o.bless) o.bless = 'Sergeant Crane\'s ghost raises a pale sword: "Hold the line!"';
  if (level === 0 && s.flags.escort) o.guards = true; // escort buff on B1 (applied in game logic)
  if (info?.boss && level === 2) o.aegis = true;
  if (info?.boss && level === 3) o.collar = true;
  if (info?.boss && level === 4 && !info.phase2) {
    o.staff = { hitsNeeded: s.flags.weakPoint ? 1 : 2, ac: s.flags.weakPoint ? 12 : 16 };
    if (s.flags.counterspell && hasComp(s, 'fizzwick')) o.counter = true;
    if (empowered(s)) o.empowered = true;
    if (s.notes.length >= 10) o.initBonus = 1;
  }
  if (info?.boss && level === 4 && info.phase2) {
    o.crystals = s.flags.pylons || 0; o.smiths = s.quests.smiths === 'done' || prog(s, 'smiths') >= 3; o.warhorn = s.inventory.includes('warhorn');
    o.elowen = true; if (s.notes.length >= 10) o.initBonus = 1; if (empowered(s)) o.empowered = true;
  }
  if (info?.boss && level === 4 && s.flags.mirrorShattered) o.initBonus = (o.initBonus || 0) + 1;
  return o;
}

/* ---------- Town folk ---------- */
export const TOWNFOLK = ['rowan', 'marga', 'osric', 'wren', 'dobbin', 'tamsin', 'odalys', 'harl'];
const OFFERS = { rowan: 'guards', marga: 'tunnel', osric: 'satchel', wren: 'glowcaps', dobbin: 'smiths', tamsin: 'horn' };
/** Talk to a townsperson: gives or completes their quest. Returns a dialogue scene + events. */
export function talkTo(s, npc) {
  initStory(s);
  if (TT.TT_NPCS.includes(npc)) return { scene: { lines: [] }, out: [], tt: TT.entryFor(s, npc), npc }; const q = OFFERS[npc]; const out = []; const lines = [];
  const st = s.quests[q];
  if (!st) {
    startQuest(s, q);
    const ask = {
      rowan: 'Four of my guards chased the cultists into the Rat-Warrens and never came back. Bring them home and I\'ll see you paid, and they\'ll fight at your side.',
      marga: 'Something\'s digging into my cellar from below. Scratching all night. Collapse that tunnel and you\'ll never pay for a room again.',
      osric: 'The princess carried a satchel of relics from this temple. If it survived, it fell in the Drowned Grotto. Bring it back and the Temple will owe you a life.',
      wren: 'Glowcaps! The Glimmerdeep is full of them. Three, and I can brew you something for basilisk trouble. Stone-to-flesh, dear. Very fashionable.',
      dobbin: 'They took my brother smiths to the Ashforge in chains. Free them and I\'ll forge you the finest blade in Emberhollow.',
      tamsin: 'When I was a girl, the Warden kept a horn that woke the whole valley. It\'s down in the vault still. Sound it when the big lizard wakes. Trust an old woman.',
    }[npc];
    lines.push(L(npc, ask)); out.push({ log: `Quest accepted: ${QUESTS[q].title}.`, cls: 'sys' });
  } else if (st === 'ready') {
    s.quests[q] = 'done'; addJournal(s, `Completed: ${QUESTS[q].title}.`);
    if (npc === 'rowan') { s.gold += 75; s.flags.escort = true; lines.push(L('rowan', 'All four, alive! Here\'s 75 gold. They\'ll walk the Warrens with you from now on.')); out.push({ log: '+75 gp. Escort buff: guards fight beside you on B1.', cls: 'good' }); }
    if (npc === 'marga') { s.flags.freeInn = true; lines.push(L('marga', 'Quiet as a tomb down there now. Rooms are free for you, love. Forever. Don\'t tell the others.')); out.push({ log: 'The inn is now free for your party.', cls: 'good' }); }
    if (npc === 'osric') { s.flags.freeRaise = 1; s.inventory.push('potionGreater', 'potionGreater'); lines.push(L('osric', 'Her relics! The Temple owes you a life. One Raise Dead, free. And take these.')); out.push({ log: 'Received 2 Potions of Greater Healing and one free Raise Dead.', cls: 'good' }); }
    if (npc === 'wren') { s.inventory.push('potionStoneFlesh', 'potionStoneFlesh', 'potionStoneFlesh'); lines.push(L('wren', 'Perfect caps! Three Potions of Stone-to-Flesh. Drink one if you start feeling... gravelly.')); out.push({ log: 'Received 3 Potions of Stone-to-Flesh.', cls: 'good' }); }
    if (npc === 'dobbin') { s.inventory.push('weapon2'); lines.push(L('dobbin', 'My brothers are home. This blade took all six of us to forge. +2, and it sings when it cuts.')); out.push({ log: 'Received a +2 Smith-Blessed Blade. The smiths will be at the vault for the finale.', cls: 'good' }); }
  } else if (st === 'done') {
    lines.push(L(npc, { rowan: 'The town\'s behind you. Bring her home.', marga: 'Room\'s ready whenever you are.', osric: 'The Temple stands with you.', wren: 'Mind the basilisk, dear.', dobbin: 'The forges are lit for you.', tamsin: 'Blow it hard. Wake the valley.' }[npc]));
  } else {
    lines.push(L(npc, `${QUESTS[q].desc} (${prog(s, q)}/${QUESTS[q].need || 1})`));
  }
  // Phase C: the town remembers what you did below, and Brother Osric lifts curses.
  const mem = memoryLines(s, npc).map((t) => L(npc, t)); lines.unshift(...mem);
  if (npc === 'osric') { const n = liftCurses(s); if (n) { lines.push(L('osric', 'You carry shadows, child. Hold still... There. The Temple has lifted what clung to you.')); out.push({ log: 'Brother Osric lifts the curse upon you.', cls: 'good' }); } }
  return { scene: { lines }, out };
}
export function townfolkStatus(s, npc) { if (TT.TT_NPCS.includes(npc)) return TT.npcStatus(s, npc); const st = s.quests?.[OFFERS[npc]]; return st === 'ready' ? '❗ quest ready' : st === 'done' ? '✔' : st ? '…' : '❓ new quest'; }
export function questList(s) {
  initStory(s);
  return Object.entries(s.quests).filter(([q]) => QUESTS[q]).map(([q, st]) => ({ id: q, ...QUESTS[q], desc: (st !== 'done' && TT.stageText(s, q)) || QUESTS[q].desc, status: st, progress: QUESTS[q].need ? `${Math.min(prog(s, q), QUESTS[q].need)}/${QUESTS[q].need}` : '' }));
}

/* ---------- Opening scene ---------- */
export function prologueScenes(s) {
  const comp = (k, t) => (inParty(s, k) ? [L(k, t)] : []);
  return {
    feast: { title: 'The Harvest Feast', lines: [
      L('narrator', 'Emberhollow, harvest night. The Boar & Spoon is packed to the rafters, and Princess Elowen herself is pouring the cider.'),
      L('elowen', 'To Emberhollow, and to whoever finally finishes Marga\'s pie!'),
      L('marga', 'Nobody finishes my pie. That\'s the tradition.'),
      ...comp('brambur', 'I\'ll have a go. For Mum.'), ...comp('fizzwick', 'Fizzwick calculates the pie at forty percent gravy, sixty percent ambition.'), ...comp('pip', 'Lovely party. Everyone smiling. I never trust a room where everyone is smiling.'),
      L('narrator', 'Then the candles gutter out, all at once. Robed figures pour through the cellar door, with rats and wolf-spiders at their heels.'),
    ], choices: [{ id: 'fight', label: '⚔ Defend the feast!' }, { id: 'skip', label: '⏩ Skip the fight (I know how this goes)' }] },
    abduction: { title: 'The Dread Sovereign', lines: [
      L('narrator', 'As the last cultist falls, the hearth fire turns violet. A tall shadow steps out of it, wearing a crown of black iron.'),
      L('malthrax', 'Princess. You will make a lovely key.'),
      L('narrator', 'Shadow-hands seize Elowen. As she is dragged into the fire, she wrenches her signet ring free and throws it to you.'),
      L('elowen', 'Take it! Follow me down, I\'ll leave you a trail!'),
      L('malthrax', 'Five moons, Emberhollow. Then you kneel before Blackspire.'),
      L('narrator', 'The fire goes out. Elowen is gone. The floor of the cellar has cracked open onto a stair leading down.'),
      L('rowan', 'You. You fought like the Dawn\'s own knight. Take this writ. It gives you the Crown\'s authority below. Bring her back. I\'ll have work for you in town, too.'),
      ...comp('brambur', 'Right. Pie can wait. Princess can\'t.'), ...comp('fizzwick', 'Fizzwick has prepared a list of reasons to be afraid. It is long. Let us go anyway.'), ...comp('pip', 'He took the Princess. Fine. I have been waiting years for a reason to go down there.'),
    ], choices: [{ id: 'vow', label: '“I will bring her home.”' }, { id: 'grim', label: '“Malthrax will kneel first.”' }] },
  };
}
export const PROLOGUE_FIGHT = [{ key: 'cultist', count: 2 }, { key: 'giantRat', count: 2 }, { key: 'giantWolfSpider', count: 1 }];
export function finishPrologue(s, choice) {
  initStory(s); if (s.flags.prologue) return [];
  s.flags.prologue = true; if (!s.inventory.includes('signetRing')) s.inventory.push('signetRing', 'royalWrit');
  addJournal(s, 'Harvest night: Malthrax abducted Princess Elowen. She threw me her signet ring. Captain Rowan gave me the Crown\'s writ.');
  if (choice === 'grim') addJournal(s, 'I swore Malthrax would kneel before I did.');
  startQuest(s, 'guards');
  for (const [q, k] of Object.entries(COMPANION_QUEST)) if (hasComp(s, k)) startQuest(s, q);
  startQuest(s, 'notes');
  return [{ log: 'Received Elowen\'s Signet Ring and Captain Rowan\'s Writ. Your journal (📖) tracks quests.', cls: 'good' }, ...reactionEvents(s, choice === 'grim' ? 'story.grim' : 'story.vow')];
}

/* ---------- Ending ---------- */
export function endingScene(s) {
  const comp = (k, t) => (hasComp(s, k) ? [L(k, t)] : []);
  const lines = [
    L('narrator', 'Gorvax the Tyrant crashes down, and the Blackspire shudders. One by one its violet lights go dark.'),
    ...(s.inventory.includes('warhorn') ? [L('narrator', 'You raise the Warden\'s Warhorn and blow. The note rolls up through five floors of stone, and far above, Emberhollow\'s bells answer.')] : []),
    L('elowen', s.notes.length >= 10 ? 'You found every note. Every single one. I kept writing because I knew you would.' : 'You came. I knew you would.'),
    L('narrator', 'Back in Emberhollow, in the Boar & Spoon, which still smells faintly of smoke, Elowen draws Dawnfang and lays it on your shoulder.'),
    L('elowen', 'Rise, Knight of the Dawn.'),
    ...comp('brambur', s.flags.hammer ? 'Mum\'s hammer is going over the fireplace. Next to the pie.' : 'I\'m having that pie now. All of it.'),
    ...comp('fizzwick', s.flags.counterspell ? 'Fizzwick counterspelled a Dread Sovereign. Fizzwick will be insufferable for a decade.' : 'Fizzwick will be writing a book. You are in a footnote.'),
    ...comp('pip', s.flags.pipMercy ? 'I would say I forgive him. I would be lying. I am just tired of carrying it.' : s.flags.pipVengeance ? 'Garrick is dead, and the Row is paid. I thought I would feel lighter. Ask me again in a year.' : 'Malthrax is down. Garrick is still out there somewhere. Do not look so worried. I am patient.'),
    ...(hasComp(s, 'pip') && s.flags.pipMercy ? [L('narrator', 'At a corner table of the Boar & Spoon, a small halfling girl with a scorched blue ribbon pretends she has not been crying. Pip crosses the whole room without a word, and then says several.')] : []),
    ...(hasComp(s, 'pip') && s.flags.pipVengeance ? [L('narrator', 'That night, Pip hangs a lantern in the window of the Boar & Spoon. It burns for the eleven of the Row, and for one more, Pip hopes.')] : []),
    ...comp('grumsh', s.quests.ballad === 'done' ? 'Final verse: "And the Tyrant fell, and the town sang along — and that is the end of Grumsh\'s song!"' : 'Grumsh will finish the ballad. Someday.'),
    ...comp('zizzy', s.flags.gateBlown ? 'Best. Explosion. Ever.' : 'Next time, more explosions.'),
    ...comp('vexrath', s.quests.decree === 'done' ? 'My clan returns to Emberhollow with honour. Thanks to you.' : 'Honour is earned. Today, we earned it.'),
    ...comp('nettle', s.flags.weakPoint ? 'The tale of the cracked staff. I\'ll be telling it for years. Badly. With improvements.' : 'I\'ll make this sound even better than it was.'),
    ...(hasComp(s, 'liora') ? lioraEnding(s) : []),
    L('rowan', 'One more thing, Knight. The Sovereign\'s staff... we never found it among the rubble.'),
    L('narrator', 'Far below, in the dark of the empty vault, a sixth seal nobody knew about begins to glow.'),
  ];
  return { title: 'Dawn over Emberhollow', lines, choices: [{ id: 'end', label: '✦ The End… for now' }] };
}
