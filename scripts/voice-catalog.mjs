// Every spoken-worthy line in the game, gathered by running the real game code (so texts match what the player sees).
// Used by scripts/queue-phaseE.mjs (queue the missing clips), scripts/voice-audit.mjs (counts) and tests/voice-coverage.test.js.
import '../src/game/narration.js'; // merges the newArea quips into COMPANIONS
import { COMPANIONS } from '../src/game/companions.js';
import * as N from '../src/game/narration.js';
import * as Story from '../src/game/story.js';
import * as PC from '../src/game/phaseC.js';
import * as G from '../src/game/game.js';
import * as DM from '../src/game/dm.js';
import * as RX from '../src/game/reactions.js';
import * as Tavern from '../src/game/tavern.js';
import * as CampTalk from '../src/game/camptalk.js';
import { TT_SCENES } from '../src/game/tabletop_text.js';
import { getLevel } from '../src/dungeon/levels.js';
import { LORE } from '../src/dungeon/extras.js';
import { MONSTERS } from '../src/rules/data.js';
import { spokenText, normVoiceText } from '../src/voices/norm.js';

export const HERO = 'Ser Aldric';
const CK = Object.keys(COMPANIONS);
const SHORT = Object.fromEntries(CK.map((k) => [k, COMPANIONS[k].short]));
const NAMES = [...CK.map((k) => SHORT[k]), HERO]; // who can be "down" ({p}) in the default roster
const MONSTER_NAMES = [...new Set(Object.values(MONSTERS).map((m) => m.name))];
const MIN_ALNUM = 3;

/** cat (category), pri (record order, high first). */
export function catalog() {
  const out = []; const seen = new Set();
  const add = (cat, speaker, display, src, pri, extra = {}) => {
    if (!display) return;
    const text = spokenText(display);
    if (!text || (text.match(/[A-Za-z0-9]/g) || []).length < MIN_ALNUM) return;
    if (/\{[a-z]\}/.test(text)) return;
    const k = `${speaker}|${normVoiceText(text)}`; if (seen.has(k)) return; seen.add(k);
    out.push({ cat, speaker, text, src, pri, ...extra });
  };
  const mockState = (comps = CK) => {
    const s = G.newGame({ name: 'Tester', race: 'human', cls: 'fighter' });
    s.party = [s.party[0], ...comps.map((k) => ({ companion: k, name: SHORT[k], dead: false, hp: 10, maxHp: 10, conditions: {}, level: 1 }))];
    s.roster = []; Story.initStory(s); PC.ensure(s); return s;
  };
  const sayCat = (k) => (k === 'liora' ? 'Liora' : 'Party companions');
  const base = (k) => (k === 'liora' ? 100 : 95);

  // ---- companions (and Liora): every banter variant ----
  for (const k of CK) {
    const C = COMPANIONS[k], sp = SHORT[k].toLowerCase();
    for (const [ev, arr] of Object.entries(C.lines)) for (const t of arr) {
      if (/\{p\}/.test(t)) for (const nm of NAMES.filter((n) => n !== SHORT[k])) add(`${sayCat(k)}: name variants`, sp, t.replaceAll('{p}', nm).replaceAll('{m}', 'creature'), `lines.${ev}`, 90);
      else if (/\{m\}/.test(t)) for (const m of MONSTER_NAMES) add(`${sayCat(k)}: monster-name variants`, sp, t.replaceAll('{m}', m), `lines.${ev}`, 40);
      else add(`${sayCat(k)}: banter`, sp, t, `lines.${ev}`, base(k));
    }
    for (const raw of C.camp || []) {
      for (const m of raw.matchAll(/([A-Z][a-z]+): "([^"]*)"/g)) add(`${sayCat(k)}: camp`, m[1].toLowerCase(), m[2], 'camp', base(k) - 1);
    }
  }
  for (const [k, trigs] of Object.entries(PC.REACT)) for (const [trig, arr] of Object.entries(trigs)) for (const t of arr) {
    const sp = SHORT[k].toLowerCase();
    if (/\{p\}/.test(t)) for (const nm of NAMES.filter((n) => n !== SHORT[k])) add(`${sayCat(k)}: name variants`, sp, t.replaceAll('{p}', nm), `react.${trig}`, 90);
    else add(`${sayCat(k)}: reactions`, sp, t, `react.${trig}`, base(k) - 2);
  }
  for (const [k, threads] of Object.entries(PC.THREAD)) threads.forEach((beats, i) => beats.forEach((t) => add(`${sayCat(k)}: personal threads`, SHORT[k].toLowerCase(), t, `thread${i}`, base(k) - 2)));

  // ---- Liora's romance: intro, five conversations, endings ----
  PC.lioraIntro({}).lines.forEach((l) => add('Liora: romance scenes', l.who, l.text, 'liora.intro', 100));
  PC.MOMENTS.forEach((M, i) => {
    M.intro.forEach((t) => add('Liora: romance scenes', 'liora', t, `moment${i}`, 100));
    const s = mockState(); for (const b of ['friend', 'close', 'sweetheart']) { PC.ensure(s).aff.liora = { friend: 0, close: 5, sweetheart: 9 }[b]; PC.momentScene(s, i).lines.forEach((l) => add('Liora: romance scenes', l.who, l.text, `moment${i}.lead`, 100)); }
    M.choices.forEach((c) => c.reply.forEach((t) => add('Liora: romance scenes', /^She |^Her /.test(t) ? 'narrator' : 'liora', t, `moment${i}.${c.id}`, 100)));
  });
  for (const v of Object.values(PC.LIORA_ENDING)) v.forEach((t) => add('Liora: romance scenes', /^She /.test(t) ? 'narrator' : 'liora', t, 'liora.ending', 100));

  // ---- the hero (Ser Aldric): the lines the player speaks by choosing a quoted reply ----
  const quoted = (label) => { const m = label.match(/[“"]([^”"]+)[”"]/); return m ? m[1] : null; };
  const s0 = mockState(); const pro = Story.prologueScenes(s0);
  for (const sc of Object.values(pro)) for (const c of sc.choices) { const q = quoted(c.label); if (q) add('Hero lines (Ser Aldric)', 'serAldric', q, 'prologue.choice', 92); }
  PC.MOMENTS.forEach((M, i) => M.choices.forEach((c) => { const q = quoted(c.label); if (q) add('Hero lines (Ser Aldric)', 'serAldric', q, `moment${i}.choice`, 92); }));

  // ---- story scenes (prologue + finale), every companion variant ----
  for (const sc of Object.values(pro)) sc.lines.forEach((l) => add('Story scenes', l.who, l.text, 'prologue', 80));
  const ends = [];
  for (const full of [true, false]) {
    const s = mockState(); s.inventory = full ? ['warhorn'] : []; s.notes = full ? Array(10).fill(1) : [];
    s.flags = full ? { hammer: true, counterspell: true, gateBlown: true, weakPoint: true } : {}; s.quests = full ? { debt: 'done', ballad: 'done', decree: 'done' } : {};
    for (const aff of [0, 5, 9]) { PC.ensure(s).aff.liora = aff; ends.push(...Story.endingScene(s).lines); }
  }
  for (const pf of ['pipMercy', 'pipVengeance']) { const s = mockState(); s.flags = { [pf]: true }; ends.push(...Story.endingScene(s).lines); } // Pip's two epilogues
  ends.forEach((l) => add('Story scenes', l.who, l.text, 'ending', 80));

  // ---- town folk ----
  for (const npc of Story.TOWNFOLK) {
    for (const st of [undefined, 'ready', 'done']) { const s = mockState(); if (st) s.quests[{ rowan: 'guards', marga: 'tunnel', osric: 'satchel', wren: 'glowcaps', dobbin: 'smiths', tamsin: 'horn' }[npc]] = st; Story.talkTo(s, npc).scene.lines.forEach((l) => add('Town folk', l.who, l.text, `talk.${npc}.${st || 'ask'}`, 78)); }
    for (const t of Object.values(PC.NPC_MEMORY[npc] || {})) add('Town folk: memory remarks', npc, t, `memory.${npc}`, 77);
  }
  add('Town folk', 'osric', 'You carry shadows, child. Hold still... There. The Temple has lifted what clung to you.', 'talk.osric.curse', 78);
  add('Town folk', 'marga', 'On the house, love.', 'inn.free', 77);

  // ---- bosses and the finale ----
  add('Boss and finale lines', 'malthrax', 'You think I came alone? WAKE, GORVAX!', 'finale.phase2', 85);
  add('Boss and finale lines', 'malthrax', 'Five moons, Emberhollow.', 'moonrise5', 85);
  add('Boss and finale lines', 'narrator', "Gorvax the Tyrant falls! The Blackspire's lights go dark.", 'finale.fall', 84);
  add('Boss and finale lines', 'narrator', 'The Blackspire is dark. Princess Elowen is home, and Emberhollow is free. Arise, Knight of the Dawn.', 'victory.screen', 84);
  add('Boss and finale lines', 'narrator', "Somewhere far below, a sixth seal stirs. And Malthrax's staff was never found…", 'victory.screen', 84);
  add('Boss and finale lines', 'narrator', 'Torchlight gutters on the stair below. Something vast breathes in the dark, and it says your names. Skarn was only the doorman.', 'paywall.cliffhanger', 83);
  add('Boss and finale lines', 'narrator', 'The camp is quiet. Too quiet.', 'camp.empty', 60);
  add('Party companions: banter', 'vexrath', "My clan's honour... restored. I will carry this to the throne myself.", 'poi.decree', 95);
  add('Party companions: banter', 'zizzy', 'Oh, we are SO using this on the gate.', 'poi.powder', 95);

  // ---- POI narration (run the real code) ----
  const poiIds = [...new Set(Object.values(Story.LEVEL_POIS).flat())];
  for (const id of poiIds) for (const variant of ['all', 'bare', 'ready']) {
    const s = mockState(variant === 'bare' ? ['brambur'] : CK); s.level = 0; if (variant === 'ready') { s.flags.powder = true; s.flags.n_debt = 5; }
    let ev = []; try { ev = Story.visitPoi(s, id) || []; } catch { continue; }
    if (id === 'collapse') { ev.forEach((e) => e.prompt && add('POI and quest narration', 'narrator', e.text, 'poi.collapse.prompt', 70)); try { const s2 = mockState(); (Story.choosePoi(s2, 'collapse', 'pull', () => true) || []).forEach((e) => e.voice && add('POI and quest narration', 'narrator', e.voice === true ? e.log : e.voice.text, 'poi.collapse', 70)); } catch { /* */ } }
    for (const e of ev) { const v = e.voice === true ? { text: e.log, who: 'narrator' } : e.voice || (e.cls === 'lore' && e.log ? { text: e.log, who: 'narrator' } : null); if (v) add(v.who === 'elowen' ? 'Elowen notes' : 'POI and quest narration', v.who, v.text, `poi.${id}`, v.who === 'elowen' ? 75 : 70); if (e.banter) add('Party companions: banter', SHORT[Object.keys(SHORT).find((c) => SHORT[c] === e.banter.who)].toLowerCase(), e.banter.text, `poi.${id}.banter`, 95); }
  }
  // boss / lieutenant defeat lines
  for (const info of [{ poi: 'vey' }, { poi: 'sporegrave' }, { boss: true, level: 0 }, { boss: true, level: 3 }]) {
    const s = mockState(); s.level = info.level ?? 1; s.quests.hammer = 'active'; s.flags.hammerClue = true;
    for (const e of Story.onCombatWon(s, info, s.level)) { const v = e.voice === true ? { text: e.log, who: 'narrator' } : e.voice || (e.cls === 'lore' && e.log ? { text: e.log, who: 'narrator' } : null); if (v) add('POI and quest narration', v.who, v.text, 'onCombatWon', 72); }
  }
  for (const n of [1, 2, 3, 4, 5]) { const s = mockState(); s.moon = n - 1; s.rests = n * 3 - 1; for (const e of Story.onLongRest(s)) { const v = e.voice; if (v) add('POI and quest narration', v.who, v.text, 'moonrise', 72); } }
  Story.NOTES.forEach((t) => add('Elowen notes', 'elowen', t, 'notes', 75));
  [...Story.TABLETS, ...Story.TALES].forEach((t) => add('Lore tablets, clues and tales', 'narrator', t, 'lore', 66));
  for (const [id, sc] of Object.entries(TT_SCENES)) for (const l of sc.lines || []) add('Tabletop quests', l[0], l[1], `tt.${id}`, l[0] === 'narrator' ? 94 : 96);
  Story.VERSES.forEach((t, i) => add('Lore tablets, clues and tales', 'narrator', `A drunken carving on the wall inspires Grumsh. ${t}`, 'verse', 66));

  // ---- wall writings, lore nooks, area narration ----
  for (let i = 0; i < 5; i++) getLevel(i).def.messages.forEach((t) => add('Wall writings and lore nooks', 'narrator', t, `wall.b${i + 1}`, 62));
  LORE.forEach((a, i) => a.forEach((t) => add('Wall writings and lore nooks', 'narrator', t, `nook.b${i + 1}`, 62)));
  N.FLOOR_INTROS.forEach((t) => add('Area and floor narration', 'dm', t, 'floor.intro', 58));
  N.FLOOR_REMINDERS.forEach((t) => add('Area and floor narration', 'dm', t, 'floor.reminder', 58));
  N.AREAS.forEach((A, i) => { for (const [k, v] of Object.entries(A)) (Array.isArray(v) ? v : [v]).forEach((t) => add('Area and floor narration', 'dm', t, `area.b${i + 1}.${k}`, 58)); });
  Object.entries(N.TOWN).forEach(([k, t]) => add('Area and floor narration', 'dm', t, `town.${k}`, 58));

  // ---- the Dungeon Master's beats (key places, boss lairs, discoveries, quest beats) and the party's reactions ----
  for (const [id, t] of Object.entries(DM.BEATS)) add('Dungeon Master beats', 'dm', t, `dm.${id}`, id.startsWith('lair') || id === 'gorvax' || id === 'orchard' || id === 'kiln' ? 97 : 90);
  for (const [k, t, id] of RX.allLines()) add('Party reactions', k, t, `react.${id}`, 88);

  // ---- tavern patrons (Listen In) and camp heart to hearts (Talk) ----
  for (const [k, tx, id] of Tavern.allLines()) add('Tavern rumours (Listen In)', k, tx, `rumor.${id}`, 80);
  for (const [k, tx, id] of CampTalk.allLines()) add('Camp talk (heart to hearts)', k, tx, id, 80);

  // ---- branching events (run each card for every Liora / check variant) ----
  for (const E of PC.EVENT_LIST) for (const withL of [true, false]) {
    const s = mockState(withL ? CK : CK.filter((k) => k !== 'liora')); let c; try { c = E.card(s); } catch { continue; }
    const pri = E.id === 'b1-liora' ? 96 : 65; add('Branching events', 'narrator', c.text, `event.${E.id}`, pri);
    for (const ch of c.choices) {
      if (ch.res) add('Branching events', 'narrator', ch.res, `event.${E.id}.${ch.id}`, pri);
      if (ch.check) { add('Branching events', 'narrator', ch.check.pass.res, `event.${E.id}.${ch.id}.pass`, pri); add('Branching events', 'narrator', ch.check.fail.res, `event.${E.id}.${ch.id}.fail`, pri); }
      const q = quoted(ch.label || ''); if (q) add('Hero lines (Ser Aldric)', 'serAldric', q, `event.${E.id}.choice`, 92);
    }
  }
  return out;
}
