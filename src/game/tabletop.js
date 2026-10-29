// Phase F: the tabletop quest engine. DOM-free. A quest is a graph of scenes (tabletop_text.js); the narrator is the Dungeon Master.
// Choices can carry a visible d20 check (the party's best modifier for the skill, DC shown); failing forward is the rule:
// a failed roll costs something or gives less, and almost never locks a quest. Saves only keep flags, quest state and stage names.
import { TT_SCENES, TT_QUESTS } from './tabletop_text.js';
import { ITEMS } from '../rules/data.js';
import { skillMod } from '../rules/character.js';
import { d20 } from '../rules/dice.js';
import * as PC from './phaseC.js';
import * as Prog from './progress.js';
import { hourAt, todName, weatherFor, OUTDOOR_LEVEL } from '../dungeon/outdoor.js';
import { getLevel } from '../dungeon/levels.js';

export { TT_SCENES, TT_QUESTS };
export const SKILL_NAME = { sleightOfHand: 'Sleight of Hand', animalHandling: 'Animal Handling' };
export const skillLabel = (k) => SKILL_NAME[k] || k.charAt(0).toUpperCase() + k.slice(1);

const live = (s) => (s.party || []).filter((c) => !c.dead && c.hp > 0);
const prog = (s, q) => s.flags['n_' + q] || 0;
export const stageOf = (s, q) => s.flags?.['tt_' + q] || null;
export const stageText = (s, q) => TT_QUESTS[q]?.stages?.[stageOf(s, q)] || '';
function journal(s, text) { (s.journal ||= []).push({ t: s.steps || 0, moon: s.moon, text }); if (s.journal.length > 120) s.journal.shift(); }
function startQ(s, q) { s.quests ||= {}; if (!s.quests[q]) { s.quests[q] = 'active'; journal(s, `New quest: ${TT_QUESTS[q].title}. ${TT_QUESTS[q].desc}`); } }

/** World flags (time of day and the Orchard's weather), refreshed whenever a scene is shown: w_night, w_day, w_rain, w_mist, w_night_rain, w_night_mist. */
export function worldFlags(s) {
  const night = todName(hourAt(s.steps || 0)).name === 'night'; let wx = 'rain'; try { wx = weatherFor(getLevel(OUTDOOR_LEVEL)); } catch { /* the default weather */ }
  const f = (s.flags ||= {}); f.w_night = night; f.w_day = !night; f.w_rain = wx === 'rain'; f.w_mist = wx === 'mist'; f.w_night_rain = night && wx === 'rain'; f.w_night_mist = night && wx === 'mist';
  return f;
}

/** Evaluate a condition: 'pip' (companion in party), '!x', 'f:flag', 'n>=2:a,b,c'. A bare name on a choice is a flag. */
export function cond(s, c, isChoice = false) {
  if (!c) return true;
  if (c[0] === '!') return !cond(s, c.slice(1), isChoice);
  if (c.startsWith('n>=')) { const [n, list] = c.slice(3).split(':'); return list.split(',').filter((f) => s.flags[f]).length >= +n; }
  if (c.startsWith('f:')) return !!s.flags[c.slice(2)];
  if (isChoice) return !!s.flags[c];
  return (s.party || []).some((m) => m.companion === c && !m.dead);
}

/** Roll a visible check for the best living party member. */
export function rollCheck(s, ck) {
  const dc = ck.dc + Object.entries(ck.dcAdj || {}).reduce((a, [f, d]) => a + (s.flags[f] ? d : 0), 0);
  const pool = live(s); const group = pool.length ? pool : s.party || [];
  let best = group[0], bm = -99; for (const c of group) { const m = skillMod(c, ck.skill); if (m > bm) { bm = m; best = c; } }
  const adv = !!(ck.adv && s.flags[ck.adv]);
  const r = d20({ adv, lucky: best?.race === 'lightfootHalfling' });
  const total = r + bm, ok = total >= dc;
  const text = `🎲 ${skillLabel(ck.skill)} (${best?.name || 'party'}): d20 ${r}${adv ? ' with advantage' : ''} ${bm < 0 ? '−' : '+'} ${Math.abs(bm)} = ${total} vs DC ${dc}. ${ok ? 'SUCCESS' : 'FAILURE'}`;
  return { who: best?.name, skill: ck.skill, d20: r, mod: bm, total, dc, ok, adv, text };
}

const nameOf = (k) => ITEMS[k]?.name || k;
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
/** Apply a scene's effects once. Returns display lines. */
export function applyFx(s, fx = {}, view) {
  const L = []; const add = (t, cls = 'good') => L.push({ t, cls });
  if (fx.q) { startQ(s, fx.q[0]); s.quests[fx.q[0]] = fx.q[1]; if (fx.q[1] === 'done') { journal(s, `Completed: ${TT_QUESTS[fx.q[0]].title}.`); add(`Quest complete: ${TT_QUESTS[fx.q[0]].title}`); } else if (fx.q[1] === 'ready') add(`Quest objective complete: ${TT_QUESTS[fx.q[0]].title}`); }
  if (fx.stage) { startQ(s, fx.stage[0]); s.flags['tt_' + fx.stage[0]] = fx.stage[1]; }
  if (fx.prog) { startQ(s, fx.prog); const n = (s.flags['n_' + fx.prog] = prog(s, fx.prog) + 1); add(`${TT_QUESTS[fx.prog].title}: ${Math.min(n, TT_QUESTS[fx.prog].need || 5)}/${TT_QUESTS[fx.prog].need || 5}`, 'sys'); }
  for (const f of arr(fx.flag)) s.flags[f] = true;
  if (fx.gold) { if (fx.gold > 0) { s.gold += fx.gold; add(`+${fx.gold} gp`); } else { const g = Math.min(s.gold, -fx.gold); s.gold -= g; add(`−${g} gp`, 'bad'); } }
  if (fx.xp) { const r = Prog.giveXp(s, fx.xp); add(`+${r.base} XP each`); }
  for (const it of arr(fx.item)) { s.inventory.push(it); add(`Received: ${nameOf(it)}`); }
  if (fx.hurt) { for (const c of s.party) if (!c.dead) c.hp = Math.max(1, c.hp - fx.hurt); add(`Everyone takes ${fx.hurt} damage`, 'bad'); }
  if (fx.moon) { s.moon = Math.min(5, (s.moon || 0) + fx.moon); add(`A seal cracks (${s.moon}/5 broken)`, 'bad'); }
  if (fx.bless) { const B = PC.addBuff(s, fx.bless); if (B) add(`Blessing: ${B.label}. ${B.desc}`); }
  if (fx.curse) { const B = PC.addBuff(s, fx.curse); if (B) add(`Curse: ${B.label}. ${B.desc}`, 'bad'); }
  if (fx.aff) for (const [k, n] of Object.entries(fx.aff)) { PC.addAff(s, k, n); if (s.party.some((c) => c.companion === k)) add(n > 0 ? `${k === 'pip' ? 'Pip' : k} warms to you` : `${k === 'pip' ? 'Pip' : k} is quiet`, n > 0 ? 'good' : 'bad'); }
  if (fx.time === 'night') { const h = hourAt(s.steps || 0); if (todName(h).name !== 'night') { s.steps = (s.steps || 0) + Math.ceil(((21 - h + 24) % 24) * (360 / 24)); add('🌙 Hours pass. Night falls, and the sky opens.', 'sys'); } }
  if (fx.journal) journal(s, fx.journal);
  if (fx.consume && view) view.consume = true;
  return L;
}

/** Who answers each entry point (an NPC key or a POI id). null = nothing to do. */
export function entryFor(s, key) {
  const st = (q) => stageOf(s, q); const qs = (q) => s.quests?.[q];
  switch (key) {
    case 'odalys': return qs('ledger') === 'done' ? 'led.done' : st('ledger') ? 'led.wait' : 'led.0';
    case 'harl': { const x = st('choir'); return qs('choir') === 'done' ? 'choir.h.done' : x === 'freed' ? 'choir.h.free' : x === 'bound' ? 'choir.h.bound' : x ? 'choir.h.wait' : 'choir.0'; }
    case 'pip1': case 'pip2': case 'pip3': case 'pip4': case 'pip5': return 'pip.' + key.slice(3);
    case 'garrick': return !cond(s, 'pip') ? 'garrick.nopip' : prog(s, 'debt') < 3 ? 'garrick.locked' : 'g.0';
    case 'choir1': return 'choir.c1';
    case 'choir2': return st('choir') === 'chapel' ? 'choir.p.0' : 'choir.p.locked';
    case 'glass1': { const x = st('glass'); return x === 'shattered' ? 'glass.rs' : x === 'gazed' ? 'glass.rg' : x === 'met' ? 'glass.wait' : 'glass.0'; }
    case 'glass2': return 'glass.k.0';
    case 'crane1': return 'crane.0';
    case 'crane2': return 'crane.b.0';
    case 'orch1': { if (qs('orchard') === 'done') return 'orch.done'; const x = st('orchard'); return !x ? 'orch.0' : x === 'asked' ? 'orch.wait' : x === 'heart' ? (s.flags.orch_tended ? 'orch.pay.a' : s.flags.orch_grafted ? 'orch.pay.b' : 'orch.pay.c') : 'orch.mid'; }
    case 'orch2': return st('orchard') ? 'orch.t.0' : 'orch.t.cold';
    case 'orch3': return st('orchard') ? 'orch.s.0' : 'orch.s.cold';
    case 'orch4': { const x = st('orchard'); return !x ? 'orch.g.cold' : x === 'asked' && !(s.flags.orch_trees && s.flags.orch_sky) ? 'orch.g.dim' : 'orch.g.0'; }
    case 'orch5': return ['restored', 'broken', 'bought'].includes(st('orchard')) ? 'orch.h.0' : 'orch.h.locked';
    case 'crane3': return s.flags.crane_roll ? 'crane.v.0' : 'crane.v.locked';
    default: return null;
  }
}
export const TT_POIS = ['pip1', 'pip2', 'pip3', 'pip4', 'pip5', 'garrick', 'choir1', 'choir2', 'glass1', 'glass2', 'crane1', 'crane2', 'crane3', 'orch1', 'orch2', 'orch3', 'orch4', 'orch5'];
export const TT_NPCS = ['odalys', 'harl'];
export const isTTPoi = (id) => TT_POIS.includes(id);
export function npcStatus(s, npc) {
  const q = { odalys: 'ledger', harl: 'choir' }[npc]; const st = s.quests?.[q];
  return st === 'ready' || (npc === 'harl' && ['freed', 'bound'].includes(stageOf(s, 'choir')) && st !== 'done') ? '❗ quest ready' : st === 'done' ? '✔' : st ? '…' : '❓ new quest';
}

/* ---------- Sessions ---------- */
export function begin(s, entry) { return { id: entry, consumed: false, done: false, view: null, rolls: [] }; }
const sceneOf = (id) => { const sc = TT_SCENES[id]; if (!sc) throw new Error('unknown tabletop scene ' + id); return sc; };
/** The current scene as a view (effects are applied the first time it is shown). */
export function show(s, sess) {
  if (sess.view && sess.view.id === sess.id) return sess.view;
  const sc = sceneOf(sess.id); const src = sc.choicesFrom ? sceneOf(sc.choicesFrom) : sc;
  worldFlags(s);
  const view = { id: sess.id, title: sc.title || src.title || '', lines: [], choices: [], consume: false, fxLines: [], roll: sess.pendingRoll || null };
  sess.pendingRoll = null;
  view.fxLines = applyFx(s, sc.fx, view); worldFlags(s);
  view.lines = (sc.lines || []).filter((l) => cond(s, l[2])).map((l) => ({ who: l[0], text: l[1] }));
  if (sc.next) view.choices = [{ id: '__next', label: 'Continue ▶', go: sc.next }];
  else view.choices = (src.choices || []).filter((c) => cond(s, c.if, true) && !(c.ifNot && cond(s, c.ifNot, true))).map((c) => ({ id: c.id, label: c.label, check: c.check ? `${skillLabel(c.check.skill)} DC ${c.check.dc + Object.entries(c.check.dcAdj || {}).reduce((a, [f, d]) => a + (s.flags[f] ? d : 0), 0)}${c.check.adv && s.flags[c.check.adv] ? ', advantage' : ''}` : '', end: !!c.end, auto: !!c.auto }));
  if (!view.choices.length) view.choices = [{ id: '__end', label: 'Continue ▶', end: true }];
  if (view.consume) sess.consumed = true;
  sess.view = view; return view;
}
/** Pick a choice: rolls its check if it has one, moves to the next scene. Returns the new view (with the roll attached), or null when the session is over. */
export function pick(s, sess, choiceId) {
  const view = show(s, sess);
  if (choiceId === '__end') { sess.done = true; return null; }
  const sc = sceneOf(sess.id); const src = sc.choicesFrom ? sceneOf(sc.choicesFrom) : sc;
  let ch = choiceId === '__next' ? { go: sc.next } : (src.choices || []).find((c) => c.id === choiceId);
  if (!ch || (!view.choices.some((c) => c.id === choiceId))) throw new Error(`no choice ${choiceId} in ${sess.id}`);
  if (ch.end && !ch.go && !ch.check) { sess.done = true; return null; }
  if (ch.check) { const r = rollCheck(s, ch.check); sess.rolls.push(r); sess.pendingRoll = r; sess.id = r.ok ? ch.check.pass : ch.check.fail; }
  else sess.id = ch.go;
  return show(s, sess);
}
/** Play a whole session without a UI (the playthrough sim and the tests): always the first `auto` choice, else the first. */
export function autoRun(s, entry, { maxSteps = 80, choose = null } = {}) {
  const sess = begin(s, entry); let v = show(s, sess); let n = 0; const trail = [v.id];
  while (v && n++ < maxSteps) {
    const pickId = (choose && choose(v, s)) || (v.choices.find((c) => c.auto) || v.choices[0]).id;
    v = pick(s, sess, pickId); if (v) trail.push(v.id);
  }
  if (process.env.TRACE && /orch/.test(entry)) console.log('TT', entry, trail.join('>'));
  return { consumed: sess.consumed, steps: n, trail, rolls: sess.rolls, aborted: !sess.done };
}
