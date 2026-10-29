// Phase C engine (DOM-free): reactive banter that never repeats, per-dungeon companion threads, companion affinity,
// Liora's romance, branching events, curses and blessings, and town NPCs who remember your choices.
import { COMPANIONS } from './companions.js';
import { REACT, THREAD, MOMENTS, LIORA_ENDING, NPC_MEMORY } from './phaseC_text.js';
import { EVENTS, BUFFS } from './phaseC_events.js';
import { rand, pick } from '../rules/dice.js';

export { REACT, THREAD, MOMENTS, LIORA_ENDING, NPC_MEMORY, EVENTS, BUFFS };
export const EVENTS_PER_LEVEL = EVENTS.map((e) => e.length);
export const EVENT_LIST = EVENTS.flat();
export const eventById = (id) => EVENT_LIST.find((e) => e.id === id) || null;

/** Make sure the Phase C block exists on a (possibly old) save. Safe to call repeatedly. */
export function ensure(s) {
  const p = (s.pc ||= {});
  p.said ||= {}; p.aff ||= {}; p.ev ||= {}; p.mem ||= {}; p.memSaid ||= {}; p.buffs ||= []; p.thread ||= {}; p.moments ||= {}; p.areas ||= {}; p.mourned ||= {};
  p.liora ||= {}; p.inTown = !!p.inTown; p.lastRoom = p.lastRoom | 0;
  return p;
}
const live = (s) => s.party.filter((c) => c.companion && !c.dead && c.hp > 0 && COMPANIONS[c.companion]);
const say = (c, text) => ({ who: COMPANIONS[c.companion].short, color: COMPANIONS[c.companion].color, text, personal: true });
export const hasLiora = (s) => s.party.some((c) => c.companion === 'liora' && !c.dead);

/* ---------------- Affinity ---------------- */
export const aff = (s, k) => ensure(s).aff[k] | 0;
export function addAff(s, k, n) {
  const p = ensure(s);
  const keys = k === 'party' ? s.party.filter((c) => c.companion).map((c) => c.companion) : [k];
  for (const key of keys) p.aff[key] = Math.max(0, (p.aff[key] | 0) + n);
}
export const bond = (s) => { const a = aff(s, 'liora'); return a >= 9 ? 'sweetheart' : a >= 5 ? 'close' : 'friend'; };
export const BOND_LABEL = { friend: 'Friend', close: 'Close', sweetheart: 'Sweethearts' };
export const hearts = (s, k) => { const n = Math.min(5, Math.ceil((aff(s, k)) / 2)); return '♥'.repeat(n) + '♡'.repeat(5 - n); };

/* ---------------- Reactive banter (each line plays once per save) ---------------- */
const lineKey = (comp, trig, i) => `${comp}:${trig}:${i}`;
/** An unspoken reaction from a living companion for this trigger, or null once they have run out of things to say. */
export function reactive(s, trig, ctx = {}, chance = 1) {
  const p = ensure(s); if (chance < 1 && rand() > chance) return null;
  const opts = [];
  for (const c of live(s)) {
    const pool = REACT[c.companion]?.[trig]; if (!pool) continue;
    pool.forEach((t, i) => { if (!p.said[lineKey(c.companion, trig, i)]) opts.push({ c, i, t }); });
  }
  if (!opts.length) return null;
  // spread the talking around: prefer whoever has said the least
  const spoken = (c) => Object.keys(p.said).filter((k) => k.startsWith(c.companion + ':')).length;
  const min = Math.min(...opts.map((o) => spoken(o.c))); const o = pick(opts.filter((x) => spoken(x.c) === min));
  p.said[lineKey(o.c.companion, trig, o.i)] = 1;
  return say(o.c, o.t.replaceAll('{p}', ctx.p || 'friend').replaceAll('{m}', ctx.m || 'creature'));
}
/** The reactive line if there is one, otherwise the old generic banter at a low chance (so familiar chatter never floods in). */
export function react(s, trig, fallback, chance = 1, ctx = {}) {
  return reactive(s, trig, ctx, chance) || (fallback ? fallback() : null);
}

/* ---------------- Personal threads: one beat per companion per dungeon ---------------- */
/** On reaching a new area: from the second area of a floor on, play a personal thread beat nobody has heard yet; else a room reaction. */
export function onNewArea(s) {
  const p = ensure(s); const n = p.areas[s.level] = (p.areas[s.level] | 0) + 1;
  if (n >= 2) {
    const cands = [];
    for (const c of live(s)) for (let l = 0; l <= s.level; l++) if (THREAD[c.companion]?.[l] && !p.thread[`${c.companion}:${l}`]) { cands.push({ c, l }); break; }
    if (cands.length) {
      // prefer Liora's search, then a beat for this floor over a catch-up beat
      cands.sort((a, b) => (b.c.companion === 'liora') - (a.c.companion === 'liora') || (b.l === s.level) - (a.l === s.level) || a.l - b.l);
      const { c, l } = cands[0]; p.thread[`${c.companion}:${l}`] = 1;
      return THREAD[c.companion][l].map((t) => ({ ...say(c, t), thread: true }));
    }
  }
  return reactive(s, 'room', {}, n === 1 ? 0.6 : 0.8);
}
export const threadsHeard = (s) => Object.keys(ensure(s).thread).length;

/* ---------------- Town: arrival banter and NPC memory ---------------- */
export function leftTown(s) { ensure(s).inTown = false; }
/** First call after coming back from the dungeon: a reaction, one remark from a townsperson who remembers, and Liora's pending talk. */
export function townArrive(s) {
  const p = ensure(s); if (p.inTown) return []; p.inTown = true; const out = [];
  const b = reactive(s, 'town', {}, 0.9); if (b) out.push({ banter: b });
  const m = nextMemory(s); if (m) out.push({ log: `${m.name}: "${m.text}"`, cls: 'lore', voice: { text: m.text, who: m.npc }, toast: `${m.name} has something to say about you.` });
  const mo = pendingMoment(s); if (mo != null) out.push({ log: '💬 Liora would like a word at the Boar & Spoon (Tavern → Talk with Liora).', cls: 'good' });
  return out;
}
export const NPC_NAME = { rowan: 'Captain Rowan', marga: 'Marga Hobb', osric: 'Brother Osric', wren: 'Wren', dobbin: 'Dobbin Varr', tamsin: 'Old Tamsin' };
export function remember(s, npc, tag) { const m = ensure(s).mem; (m[npc] ||= []); if (!m[npc].includes(tag)) m[npc].push(tag); }
/** Unspoken memories for one NPC (marks them as told). */
export function memoryLines(s, npc) {
  const p = ensure(s); const out = [];
  for (const tag of p.mem[npc] || []) { const k = `${npc}:${tag}`; if (p.memSaid[k]) continue; p.memSaid[k] = 1; if (NPC_MEMORY[npc]?.[tag]) out.push(NPC_MEMORY[npc][tag]); }
  return out;
}
/** One untold memory from any NPC (for the town-arrival remark). */
function nextMemory(s) {
  const p = ensure(s);
  for (const npc of Object.keys(p.mem)) for (const tag of p.mem[npc]) { const k = `${npc}:${tag}`; if (!p.memSaid[k] && NPC_MEMORY[npc]?.[tag]) { p.memSaid[k] = 1; return { npc, name: NPC_NAME[npc] || npc, text: NPC_MEMORY[npc][tag] }; } }
  return null;
}
export const hasMemory = (s, npc) => (ensure(s).mem[npc] || []).some((t) => !ensure(s).memSaid[`${npc}:${t}`]);
export const knownMemories = (s) => Object.entries(ensure(s).mem).flatMap(([npc, tags]) => tags.map((t) => ({ npc, tag: t, text: NPC_MEMORY[npc]?.[t], name: NPC_NAME[npc] || npc })));

/* ---------------- Curses and blessings ---------------- */
export const buffs = (s) => ensure(s).buffs;
export function addBuff(s, id) {
  const B = BUFFS[id]; if (!B) return null; const list = ensure(s).buffs; const have = list.find((b) => b.id === id);
  const fresh = { id, steps: B.steps || 0, fights: B.fights || 0, chests: B.chests || 0 };
  if (have) Object.assign(have, fresh); else list.push(fresh); return B;
}
export const hasBuff = (s, id) => ensure(s).buffs.some((b) => b.id === id);
const drop = (s, id) => { const p = ensure(s); p.buffs = p.buffs.filter((b) => b.id !== id); };
export function tickStep(s) {
  const out = [];
  for (const b of [...ensure(s).buffs]) if (BUFFS[b.id].steps && --b.steps <= 0) { drop(s, b.id); out.push({ log: `${BUFFS[b.id].kind === 'curse' ? '☾ The curse' : '✦ The blessing'} of ${BUFFS[b.id].label} fades.`, cls: 'dim' }); }
  return out;
}
export const encounterMult = (s) => (hasBuff(s, 'hush') ? 0.35 : 1) * (hasBuff(s, 'restless') ? 1.8 : 1);
/** XP multiplier for a fight that is being awarded now (uses up a Scholar's Insight charge). */
export function fightXpMult(s) { const b = ensure(s).buffs.find((x) => x.id === 'scholar'); return b ? 1.25 : 1; }
/** Called once when a fight is won: spends fight-limited buffs and halves gold under Hollow Purse. */
export function afterFight(s, gold) {
  const out = []; let g = gold;
  for (const b of [...ensure(s).buffs]) if (BUFFS[b.id].fights) {
    if (b.id === 'hollow') g = Math.floor(g / 2);
    if (--b.fights <= 0) { drop(s, b.id); out.push({ log: `${BUFFS[b.id].kind === 'curse' ? '☾ The curse' : '✦ The blessing'} of ${BUFFS[b.id].label} is spent.`, cls: 'dim' }); }
  }
  return { gold: g, out };
}
export function chestBuff(s) {
  const b = ensure(s).buffs.find((x) => x.id === 'fortune'); if (!b) return 1;
  if (--b.chests <= 0) drop(s, 'fortune'); return 2;
}
export function liftCurses(s) {
  const p = ensure(s); const n = p.buffs.filter((b) => BUFFS[b.id].kind === 'curse').length;
  p.buffs = p.buffs.filter((b) => BUFFS[b.id].kind !== 'curse'); return n;
}

/* ---------------- Liora: moments ---------------- */
/** The next conversation Liora wants to have (floor reached, in the party), or null. Never skipped, only queued. */
export function pendingMoment(s) {
  if (!hasLiora(s)) return null; const p = ensure(s);
  for (let i = 0; i < MOMENTS.length; i++) if (!p.moments[i] && i <= (s.maxDepth | 0)) return i;
  return null;
}
export function momentScene(s, i) {
  const M = MOMENTS[i]; const b = bond(s);
  const lead = i >= 3 ? (b === 'sweetheart' ? 'She is already smiling before you answer.' : b === 'close' ? 'She watches you with a warm, steady look.' : 'She watches you carefully, not quite sure of her footing yet.') : null;
  const lines = M.intro.map((t) => ({ who: 'liora', text: t }));
  if (lead) lines.push({ who: 'narrator', text: lead });
  return { title: `Liora: ${M.title}`, lines, choices: M.choices.map((c) => ({ id: c.id, label: c.label })) };
}
export function resolveMoment(s, i, choiceId) {
  const M = MOMENTS[i], c = M.choices.find((x) => x.id === choiceId) || M.choices[M.choices.length - 1]; const p = ensure(s);
  p.moments[i] = c.id; addAff(s, 'liora', c.aff);
  if (c.flag) s.flags[c.flag] = true;
  const lines = c.reply.map((t) => ({ who: /^She |^Her /.test(t) ? 'narrator' : 'liora', text: t }));
  return { lines, out: [{ log: `♥ Liora — ${hearts(s, 'liora')} (${BOND_LABEL[bond(s)]})`, cls: 'good' }] };
}
/** Liora's closing lines for the ending scene. */
export const lioraEnding = (s) => LIORA_ENDING[bond(s)].map((t) => ({ who: /^She /.test(t) ? 'narrator' : 'liora', text: t }));
/** Liora's intro scene on joining. */
export function lioraIntro(s) {
  return { title: 'Liora Wardenfall', lines: [
    { who: 'liora', text: 'Liora Wardenfall, Warden\'s Watch. My father went down into the Blackspire twenty years ago. I\'m done waiting at the door. Mind if I join you?' },
    { who: 'liora', text: 'I shoot, I track, and I\'m told I\'m very good company. Mostly by myself, but still.' },
    { who: 'narrator', text: 'Liora Wardenfall, half-elf ranger, joins the party. Her story unfolds as you descend: talk with her at camp or at the Boar & Spoon.' },
  ], choices: [{ id: 'ok', label: 'Welcome aboard ▶' }] };
}

/* ---------------- Events ---------------- */
export const eventDone = (s, id) => { const v = ensure(s).ev[id]; return !!v && v !== 'later'; };
export const eventsAt = (L) => L.events || [];
/** The event standing on the party's tile that is still open, or null. */
export function eventHere(s, L) {
  const e = eventsAt(L).find((x) => x.x === s.x && x.y === s.y);
  return e && !eventDone(s, e.id) ? e : null;
}
export const openEvents = (s, L) => eventsAt(L).filter((e) => !eventDone(s, e.id));
export function lioraState(s) { ensure(s).liora.present = hasLiora(s); }
/** The card for an event, with the party-dependent choice notes filled in. */
export function cardFor(s, id) {
  lioraState(s); const E = eventById(id); if (!E) return null; const c = E.card(s);
  return { id, title: c.title || E.title, who: E.who, color: E.color, portrait: E.portrait ?? null, icon: E.icon || null, text: c.text, choices: c.choices.map((ch) => ({ id: ch.id, label: ch.label, note: ch.note ? ch.note(s) : '', check: ch.check ? `${ch.check.skill} DC ${ch.check.dc}` : '' })) };
}
export function findChoice(s, id, choiceId) {
  lioraState(s); const E = eventById(id); const c = E?.card(s).choices.find((x) => x.id === choiceId); return c || null;
}
