// Camp Talk: a short heart to heart with one companion. DOM-free.
// Each companion has about four backstory chapters, unlocked by approval and by how deep the party has been. A chapter finished is +1 approval and a Journal entry.
// With no chapter ready the companion gives a practical tip about the floor (and a nudge toward their own quest). The first talk after each rest also earns a small
// camp bonus, scaled by approval. One talk per companion per rest; pending Liora moments (phaseC) always keep working.
import { COMPANIONS } from './companions.js';
import * as RX from './reactions.js';
import * as Story from './story.js';
import * as PC from './phaseC.js';

export const COMPANION_QUEST = { brambur: 'hammer', fizzwick: 'pages', pip: 'debt', grumsh: 'ballad', zizzy: 'powder', vexrath: 'decree', nettle: 'tale' };
/** Chapter gates: approval needed and the deepest floor reached (0 = B1). Chapter 1 is open to anyone not hostile. */
export const GATES = [{ appr: -2, floor: 0 }, { appr: 1, floor: 1 }, { appr: 3, floor: 2 }, { appr: 5, floor: 3 }];

const C = (title, ...lines) => ({ title, lines });
export const CHAPTERS = {
  brambur: [
    C("Mum's Hammer", 'My mum was a smith before she was anything else. She forged a hammer for every child she blessed.', 'Someone took hers from the forge. It is somewhere below us, and I keep apologizing to the rats in case they have it.', 'If you see dwarven boot prints, will you tell me? Please? Sorry. Please.'),
    C('The Mine', 'I did not tell you about my father. He went down a mine and counted the dark instead of the days.', 'Mother Pellwen says every second chance is a door. I only have to knock, instead of apologizing to it.'),
    C('Useful', 'I used to pray for the courage to be brave. Lately I pray for the courage to be useful.', 'You make me useful. I wanted you to know that. It is the nicest thing anyone has done for me.', 'Sorry. I mean thank you.'),
    C('Hearthsong', 'The hammer has a name. Hearthsong. My mum sang to the iron while she worked.', 'When we find it, I would like you to hear it ring. That is all. That is everything.'),
  ],
  fizzwick: [
    C('Scattered Pages', 'Fizzwick\'s spellbook was scattered by cultists. Pages, you understand, written in his own tiny hand.', 'Without them Fizzwick is merely brilliant. With them, Fizzwick is inevitable.', 'Keep an eye out for torn pages. Fizzwick will pretend he does not care.'),
    C('The Library Fireball', 'Fizzwick was expelled from the Academy of Brightspire. Officially, for a fireball in the library.', 'The fireball was peer review, a rather harsh one. The library has since been rebuilt, and it is bigger.'),
    C('Loud in the Dark', 'Fizzwick will tell you something he has told no one. He fears nobody remembers a gnome who is not loud.', 'So Fizzwick is very loud. Even in the dark. Especially in the dark.'),
    C('The Footnote', 'Fizzwick has never had a friend who stayed after the explosion. You stayed.', 'Fizzwick has noted this in a footnote. It is the longest footnote he has ever written.'),
  ],
  pip: [
    C('Eleven Lanterns', 'The Lantern Row Crew had eleven. We lit one lantern for each of us, over the old bakery door.', 'Garrick Vane was my partner, and my best friend. He sold the whole crew to the cult for a pocket of gold.', 'So I follow the Lantern Row marks down the floors. Three clues, then the Seneschal\'s door.'),
    C('Posy', 'Posy was the youngest. Nine years old, pockets like a magician. Garrick swore he would keep her safe.', 'I do not want to talk about Posy. Thank you for not making me.'),
    C('Two Plans', 'Some nights I plan to stab him. Some nights I plan to hear him say sorry.', 'I like the second plan less. Whatever you decide when we get there, I will remember it. I remember everything.'),
    C('A Little Trust', 'I do not trust anybody. But I trust you a little. For me, that is a lot.', 'When we reach the Seneschal\'s door, stand where I can see you. That is all I ask.'),
  ],
  grumsh: [
    C('Five Verses', 'I am writing a ballad. One verse for every floor of the Blackspire. Five verses, no chorus.', 'My mother wanted a bard. I am a disappointment with a very good rhyme for slaughter.', 'If you find a verse on a wall, in a carving or a drunk\'s scrawl, tell me. It may be the one.'),
    C('Syllables', 'My father was a warlord. He taught me to count enemies. My mother taught me to count syllables.', 'I am better at the second. No one has ever cheered a syllable.'),
    C('The Kind Storm', 'When I was small, I sang to the wounded in the camp. They said I sounded like a kind storm.', 'Then my father heard. He called it weakness, and I put the songs away for twenty years.'),
    C('The Humming', 'Last night I hummed in my sleep. Brambur says it was lovely.', 'I will sing the ballad aloud when we win. You may stand at the back. I will still see you.'),
  ],
  zizzy: [
    C('A Keg of Hugs', 'Zizzy needs blasting powder! Dwarven blasting powder, the good stuff, in the Ashforge somewhere!', 'The Ashforge gate is locked. Locks are just very small walls, and walls are very slow explosions.', 'Find the powder and Zizzy will make you a firework. A tiny one. Medium.'),
    C('Hide the Fire', 'My family did not like the fire. The tiefling parts of me that go boom. They told me to hide it.', 'Zizzy did not hide it. Zizzy made it a hobby, then a career. Look how well it is going!'),
    C('Staying Small', 'Zizzy has a secret. When it is quiet, I get scared the fire will not stop.', 'When you are near, it stays small. I do not know why. I am not complaining. Do not tell Vexrath, he will file it.'),
    C('The Heart Firework', 'Zizzy made you a gift. A very small firework, shaped like a heart. It exploded. Sorry!', 'I will make another. You are my favorite explosion and my favorite person, in that order.'),
  ],
  vexrath: [
    C('Forged in Ink', 'My clan was exiled by royal decree, forty years ago. I have read the decree. I believe it is forged.', 'The original is sealed in crystal somewhere on the third floor. I will find it, or I will file a complaint.', 'If you see a royal seal, bring it to me. Bring it gently. It is evidence.'),
    C('Every Promise', 'Ledgerus teaches that every promise is a debt, and every debt will be called. I take that seriously.', 'I fear I have not always kept my promises to my own family.'),
    C('The Signature', 'My sister begged me not to sign the exile. I signed. I thought it was the law. It was a lie.', 'I have been filing that mistake in my heart for forty years. It has no folder.'),
    C('A Character Reference', 'I have drafted a document. It is a character reference. It is for you.', 'It reads, in full: honest, brave, irregular. Please note that I have stamped it twice.'),
  ],
  nettle: [
    C('The Staff\'s Tale', 'I am collecting the true legend of the Sovereign\'s staff. One fragment per floor, from the second floor down.', 'Everyone agrees on the staff. Nobody agrees on the details. That is how you know it is true.', 'If a smith or a ghost starts talking, listen. I pay in stories.'),
    C('The Door', 'Truth time. I did not invent the door. I only wanted to be the sort of person who might have.', 'Everything else I told you is true. Possibly. That is the truth.'),
    C('The Galley', 'I grew up in a ship\'s galley. My mother sold stories to sailors for an extra ladle of soup.', 'She said a lie is a gift when you give it away. I have given away a great many gifts.'),
    C('The True Story', 'I tried writing the true story of this party. It came out better than any lie I own.', 'I am keeping it. Somebody should remember us properly, and it might as well be a liar.'),
  ],
};
/** Quest nudges, for a companion whose quest is still open. */
export const QUEST_HINTS = {
  brambur: 'Any word of dwarven boot prints? Mum\'s hammer is out there, on the first floor, and the fourth.',
  fizzwick: 'Fizzwick\'s missing pages are on the second floor and the third. Torn, in tiny handwriting. You cannot miss them.',
  pip: 'The Lantern Row marks are on every floor. Three clues, then the Seneschal\'s door.',
  grumsh: 'There is a verse waiting on every floor. Wall carvings, drunken scrawls. I will know it when I hear it.',
  zizzy: 'Blasting powder, in the Ashforge! A keg, a barrel! Zizzy would settle for a thimble.',
  vexrath: 'The original decree is sealed in crystal on the third floor. I would know the seal anywhere.',
  nettle: 'One tale fragment per floor, from the second down. Ask the smiths and the ghosts. They love a story.',
};
/** Floor tips: [floor index][companion]. Anyone without one for the floor gives a general tip. */
export const FLOOR_TIPS = [
  { pip: 'Traps on this floor like dull corridors. Walk slowly, listen for clicks, and check the plate stones.', zizzy: 'The spiders on this floor burn! Zizzy will bring the fire. The rats burn too, but they do not enjoy it.' },
  { brambur: 'Old Clubtail hits very hard. Keep us healed, and keep the healer standing. That is me. Sorry.', liora: 'The Grotto floods in places. Look for the chapel and the black pool, and listen for singing.', fizzwick: 'Wasps and water. Fizzwick advises thunder, or at least dry socks.' },
  { vexrath: 'Glasshide turns the careless to glass. Thunder shatters it. Poison does nothing. I have filed this.', nettle: 'The orchard in the Glimmerdeep is real, and so is the kiln. Look for open sky and a glint of silver.', pip: 'The mirrors on this floor lie. Do not stare at one longer than a breath.' },
  { zizzy: 'Cindermaw hates cold! Zizzy has no cold. Zizzy has other fun things.', grumsh: 'Brakk wears fire like a coat. Steel or cold, not flame. I will write him a short verse.', fizzwick: 'Smiths in chains. Fizzwick does not enjoy chains. Free them, and they will help us.' },
  { liora: 'Malthrax hates radiant light, and the dark does nothing. If you have anything holy, save it for him.', nettle: 'The staff has a crack under the third ring. Strike there and it ends. I have it on good authority.', pip: 'The Seneschal\'s door is somewhere on this floor. Check every wall before you check every door.' },
];
export const GENERAL_TIPS = {
  brambur: 'Rest before you push on, please. A tired party is a sorry party. I am saying sorry in advance.',
  fizzwick: 'Fizzwick advises you to read the walls. Walls are the oldest books, and the rudest.',
  pip: 'Check every chest twice and every door once. Then check your own pockets.',
  grumsh: 'Fight with your back to a wall. Make the enemy walk around your rhyme.',
  zizzy: 'If it is stuck, burn it. If it is not stuck, ask first. Mostly burn.',
  vexrath: 'Prepare, then proceed. A properly prepared slate of spells wins more fights than courage.',
  nettle: 'When in doubt, ask the ghosts. They love to talk, and they never charge.',
  liora: 'Watch for loose stones, cold drafts and fresh footprints. The floor always tells the truth.',
};

/* ---------- state ---------- */
const ensure = (s) => { const t = (s.talk ||= {}); t.rest |= 0; t.used ||= {}; t.done ||= {}; t.tips ||= {}; if (t.bonus == null) t.bonus = -1; return t; };
/** Call after every completed rest (short, long or the inn) so each companion can talk again. */
export function newRest(s) { ensure(s).rest++; }
/** The deepest floor the party has reached (0 = B1). */
export const deepest = (s) => Math.max(0, s.maxDepth | 0, s.mode === 'dungeon' ? s.level | 0 : 0, (s.bossDead || []).filter(Boolean).length);
/** The floor a tip is about: where the party stands, else the frontier. */
export const tipFloor = (s) => Math.min(4, s.mode === 'dungeon' && Number.isInteger(s.level) ? s.level : Math.max(0, (s.bossDead || []).findIndex((d) => !d) < 0 ? 4 : (s.bossDead || []).findIndex((d) => !d)));
export const chaptersDone = (s, k) => ensure(s).done[k] | 0;
export const talkedThisRest = (s, k) => ensure(s).used[k] === ensure(s).rest;
export const chapterCount = (k) => (CHAPTERS[k] || []).length;
/** The next chapter if its gates are met (approval and floor), else null. */
export function nextChapter(s, k) {
  const n = chaptersDone(s, k), ch = CHAPTERS[k]?.[n]; if (!ch) return null;
  const g = GATES[n] || GATES[GATES.length - 1];
  return RX.approval(s, k) >= g.appr && deepest(s) >= g.floor ? { n: n + 1, ...ch } : null;
}
/** Companions in the party who can talk right now, with whether they have something new ("!"). */
export function roster(s) {
  return (s.party || []).filter((c) => c.companion && COMPANIONS[c.companion] && !c.dead).map((c) => {
    const k = c.companion, used = talkedThisRest(s, k), moment = k === 'liora' && PC.pendingMoment(s) != null;
    return { k, name: COMPANIONS[k].short, used, fresh: moment || (!used && !!nextChapter(s, k)), moment, approval: RX.approval(s, k) };
  });
}

/* ---------- the camp bonus ---------- */
export function campBonus(s, k) {
  const t = ensure(s); const a = RX.approval(s, k), who = COMPANIONS[k].short, tier = RX.approvalLabel(a);
  if (t.bonus === t.rest) return { fx: [{ t: 'Camp bonus already claimed since the last rest.', cls: 'sys' }] };
  if (a < 1) return { fx: [] };
  t.bonus = t.rest; const alive = (s.party || []).filter((c) => !c.dead);
  let text;
  if (a >= 6) {
    let done = false;
    for (const c of alive) { const mx = c.maxSlots || [], sl = c.slots || []; for (let l = mx.length - 1; l >= 0 && !done; l--) if ((sl[l] | 0) < (mx[l] | 0)) { sl[l] = (sl[l] | 0) + 1; text = `${c.name} regains a level ${l + 1} spell slot.`; done = true; } if (done) break; }
    if (!done) { for (const c of alive) c.tempHp = Math.max(c.tempHp || 0, 8); text = 'everyone gains 8 temporary HP.'; }
  } else if (a >= RX.WARM_AT) { for (const c of alive) c.tempHp = Math.max(c.tempHp || 0, 4); text = 'everyone gains 4 temporary HP.'; }
  else { (s.flags ||= {}).campInit = 1; text = '+1 to initiative in your next fight.'; }
  return { fx: [{ t: `☀ Camp bonus from ${who} (${tier}): ${text}`, cls: 'good' }], text };
}

/* ---------- a talk ---------- */
/** Talk with one companion (not a pending Liora moment: the caller handles that). Returns { kind, title, lines:[{who,text}], fx, logs }. */
export function talkWith(s, k) {
  const t = ensure(s), C0 = COMPANIONS[k]; if (!C0) return { kind: 'none', lines: [], fx: [], logs: [] };
  if (talkedThisRest(s, k)) return { kind: 'used', title: `💬 ${C0.short}`, lines: [{ who: k, text: '' }], fx: [], logs: [], used: true };
  const fx = [], logs = []; let kind, title, lines = [];
  const ch = nextChapter(s, k), q = COMPANION_QUEST[k];
  if (ch) {
    kind = 'chapter'; title = `💬 ${C0.short}: ${ch.title}`; lines = ch.lines.map((text) => ({ who: k, text }));
    if (ch.n === 1 && q) Story.startQuest(s, q);
    t.done[k] = ch.n; const before = RX.approval(s, k), now = RX.addApproval(s, k, 1);
    fx.push({ t: `${C0.short} opens up (chapter ${ch.n} of ${chapterCount(k)}).  ${RX.approvalIcon(now)} ${RX.approvalLabel(now)}${now > before ? ' (+1)' : ''}`, cls: 'good' });
    Story.addJournal(s, `Bond, ${C0.short}, chapter ${ch.n}, "${ch.title}": ${ch.lines[0]}`);
  } else {
    kind = 'tip'; title = `💬 ${C0.short}`; const fl = tipFloor(s);
    lines.push({ who: k, text: FLOOR_TIPS[fl]?.[k] || GENERAL_TIPS[k] });
    if (q && QUEST_HINTS[k] && s.quests?.[q] !== 'done') { if (!s.quests?.[q]) Story.startQuest(s, q); lines.push({ who: k, text: QUEST_HINTS[k] }); }
    t.tips[k] = (t.tips[k] | 0) + 1;
  }
  t.used[k] = t.rest;
  const b = campBonus(s, k); fx.push(...b.fx);
  for (const f of fx) logs.push(f.t);
  return { kind, title, lines, fx, logs, chapter: ch ? ch.n : 0 };
}
/** What the Journal's Bonds tab shows: each companion's chapters heard, by title. */
export function bondLog(s, k) { const n = chaptersDone(s, k); return (CHAPTERS[k] || []).slice(0, n).map((c, i) => `${i + 1}. ${c.title}`); }

/** Every spoken line, for the voice catalogue: [speaker, text, id]. */
export function allLines() {
  const o = [];
  for (const [k, list] of Object.entries(CHAPTERS)) list.forEach((c, i) => c.lines.forEach((t) => o.push([k, t, `talk.${k}.${i + 1}`])));
  for (const [k, t] of Object.entries(QUEST_HINTS)) o.push([k, t, `talk.${k}.quest`]);
  FLOOR_TIPS.forEach((row, f) => { for (const [k, t] of Object.entries(row)) o.push([k, t, `talk.tip.b${f + 1}`]); });
  for (const [k, t] of Object.entries(GENERAL_TIPS)) o.push([k, t, `talk.${k}.tip`]);
  return o;
}
