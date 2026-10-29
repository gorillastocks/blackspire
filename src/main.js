import { PORTRAITS, portraitURL, randomPortrait } from './portraits.js';
import './style.css';
import * as G from './game/game.js';
import { SLOT_KEYS, slotInfo, loadSettings, saveSettings, BATTLE_SPEEDS, ANIM_SLOW } from './menu.js';
import { getLevel, DIRS, DIR_NAMES, W, H, LEVEL_DEFS, poiIdAt } from './dungeon/levels.js';
import { outdoorRegion, inRegion, hourAt, todName, WEATHER_INFO } from './dungeon/outdoor.js';
import { Combat, projectileCount, projectileNoun, TACTIC_STYLES, defaultTactics, tacticsOf, DIFFICULTY } from './rules/combat.js';
import { RACES, CLASSES, SKILLS, SKILL_LABEL, SPELLS, ITEMS, ABILITIES, ABILITY_NAMES, CONDITIONS, SHOP_STOCK, MONSTERS, TIER_COLOR, TIER_LABEL, tierOf, STANDARD_ARRAY, WEAPONS, ARMOR } from './rules/data.js';
import { createCharacter, assignByPriority, roll4d6, mod, fmtMod, armorClass, weaponStats, speedOf, skillMod, saveMod, spellDC, spellAttack, prof, knownSpells, xpForNext, canLevelUp, isDown, passive, reclass } from './rules/character.js';
import * as SC from './rules/spellcasting.js';
import * as D from './rules/phaseD.js';
import { SPELL_FX, TYPE_COLOR, weaponKind } from './render/fx.js';
import { COMPANIONS, COMPANION_KEYS, banter } from './game/companions.js';
import { sfx, setMuted, setSfxOn, WEAPON_SFX, SPELL_SFX, SFX_NAMES } from './sfx.js';
import { play as playMusic, ambience, setVolumes, currentTrack, currentAmbience, prefetchMusic, playVictorySting, victoryStingState, duckBed, ac, unlock as unlockAudio, isMuted } from './audio.js';
import { voiceBusy, clipSeconds, msSinceVoiceEnd, playVoiceLine, playAmbientNarration, stopVoice, setVoicesEnabled, setVoiceVolume, unlockVoices, voicesEnabled, voiceVolume, testVoice, voiceMisses, currentVoice, hasVoice, playVictoryMusic, prefetchVictory, victoryMusicState, testVictoryMusic, lastVictoryAttempt, invalidateAmbientVoices, setAmbientVoiceGate, voiceGeneration } from './voices/voice.js';
import { PACKS, DEFAULT_PACK, packById, packOf, packLine, createBarkLimiter } from './voices/packs.js';
import { writeSave, readSave, initStorage, exportCode, importCode, isNative } from './storage.js';
import * as ENT from './entitlements.js';
// After a redeploy, an old tab's lazy chunks 404: reload once to pick up the new build.
window.addEventListener('vite:preloadError', (e) => {
  try { if (sessionStorage.getItem('gw-chunk-reload')) return; sessionStorage.setItem('gw-chunk-reload', '1'); } catch { return; }
  e.preventDefault(); location.reload();
});
window.addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem('gw-chunk-reload'); } catch {} }, 10000));


const $ = (s) => document.querySelector(s);
const INFO = new WeakMap(); // element → () => [title, ...lines] for press-and-hold info popups
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (k === 'info') { if (v) { INFO.set(e, v); e.classList.add('has-info'); } } else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (v !== false && v != null) e.setAttribute(k, v); }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
};
const btn = (label, onclick, attrs = {}) => h('button', { onclick: (e) => { sfx('click'); onclick(e); }, ...attrs }, label);
/** Big two-line menu button: a bold title with a short description under it. */
const bigBtn = (title, sub, onclick, attrs = {}) => btn([h('b', { class: 'bt' }, title), sub ? h('small', { class: 'bs' }, sub) : null], onclick, { ...attrs, class: ('bigbtn ' + (attrs.class || '')).trim() });
/** A row of large tabs that splits a long menu into short pages. tabs = [[id, label, badge?]]. */
const tabBar = (tabs, cur, pick) => h('div', { class: 'maintabs', role: 'tablist' }, tabs.map(([id, label, badge]) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(id === cur), 'data-tab': id, class: id === cur ? 'on' : '', onclick: () => { if (id !== cur) { sfx('click'); pick(id); } } }, label, badge ? h('span', { class: 'tabbadge' }, String(badge)) : null)));

let S = null; // game state
let R = null; // renderer
let combat = null; let combatInfo = null; let busy = false; let autoBattle = false;
for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, unlockVoices, { capture: true, passive: true });
const speed = () => BATTLE_SPEEDS[loadSettings().battleSpeed] || BATTLE_SPEEDS.pause;
function setSpeed(k) { const st = loadSettings(); st.battleSpeed = k; st.battleSpeedSet = true; saveSettings(st); }
const modal = $('#modal');
const Story = G.Story;

/* ---------- Voice helpers: the hero's quoted replies, narrated logs ---------- */
/** The quoted words of a reply button ("I will bring her home.") are spoken by the hero when picked. */
function heroSpeak(label) {
  const m = String(label || '').match(/[“"]([^”"]+)[”"]/); if (!m || !S || heroPackVoice()) return;
  playVoiceLine(m[1], 'serAldric', { kind: 'dialog' });
}
/** Hook for a hero voice pack (character creation): when the hero chose a pack the default Ser Aldric voice is not used. */
function heroPackVoice() { const p = S && packOf(G.heroOf(S)); return p && p.id !== DEFAULT_PACK ? p : null; }

/* ---------- Voice packs: short spoken reactions for player-created characters (combat + camp), rate limited ---------- */
const barkLimiter = createBarkLimiter(); const lastPackLine = new Map(); const lowHpSaid = new Set();
/** A reaction of `kind` from this character's voice pack (hero default: Ser Aldric). Rate limited and never interrupts another voice (except downed and level up). */
function packBark(c, kind) {
  const pack = c && packOf(c); if (!pack || (c.dead && kind !== 'downed')) return;
  if (!barkLimiter.allow(performance.now(), c.id || c.name, kind, voiceBusy())) return;
  const line = packLine(pack, kind, lastPackLine.get(c.id || c.name)); if (!line || !hasVoice(line, pack.cast)) return;
  lastPackLine.set(c.id || c.name, line);
  playVoiceLine(line, pack.cast, kind === 'downed' || kind === 'levelUp' || kind === 'select' ? { kind: 'battle' } : { kind: 'battle', ifIdle: true });
}
/** A random living pack character of the party reacts (victory, camp). */
function packBarkAny(kind) { const a = (S?.party || []).filter((c) => !c.companion && !c.dead && !isDown(c)); if (a.length) packBark(a[Math.floor(Math.random() * a.length)], kind); }
/** The text and speaker to voice for a log event: an explicit `voice`, else the log itself when it is a lore card. */
function voiceOf(e) {
  if (e.voice === true) return { text: e.log, who: 'narrator' };
  if (e.voice) return e.voice;
  return e.log && (e.cls === 'lore' || e.card) ? { text: e.log, who: 'narrator' } : null;
}
/** Say a narrated/spoken line that has no card of its own, after whatever is speaking now. Narration obeys the ambient (no fight/menu/dialogue) gate. */
function voiceLine(vz) {
  if (!vz || !hasVoice(vz.text, vz.who)) return;
  if (vz.who === 'narrator') {
    const tok = ambientToken();
    playVoiceLine(vz.text, 'narrator', { kind: 'ambient', ambient: true, queue: true, maxWait: 20000, token: tok, stillValid: (t) => ambientVoiceAllowed() && t?.move === ambientMoveToken && t?.level === S?.level && t?.mode === S?.mode });
  } else playVoiceLine(vz.text, vz.who, { kind: 'dialog', queue: true, maxWait: 20000 });
}

/* ---------- Story dialogue (portraits, line-by-line, choices) ---------- */
function showDialogue(scene, { closable = false } = {}) {
  return new Promise((resolve) => {
    const lines = scene.lines || []; let i = 0;
    const draw = () => {
      const ln = lines[Math.min(i, lines.length - 1)] || { who: 'narrator', text: '' }; const sp = scene.dm && ln.who === 'narrator' ? { name: 'Dungeon Master', icon: '🎲', color: '#d8c48a' } : Story.speaker(ln.who); const last = i >= lines.length - 1;
      playVoiceLine(ln.text, ln.who, { kind: 'dialog', queue: true, maxWait: 12000 }); // queue: a hero reply or card that is still speaking is not cut off
      openModal([h('div', { class: 'dialogue' },
        scene.title ? h('h2', {}, scene.title) : null,
        scene.roll ? h('div', { class: `ttroll ${scene.roll.ok ? 'ok' : 'bad'}`, 'data-roll': scene.roll.ok ? 'success' : 'failure' }, scene.roll.text) : null,
        h('div', { class: 'dlgrow' }, speakerPortrait(sp),
          h('div', { class: 'dlgtext' }, sp.name ? h('b', { style: `color:${sp.color}` }, sp.name) : null, h('p', { class: ln.who === 'narrator' ? 'lore' : '' }, ln.text))),
        last && scene.fx?.length ? h('div', { class: 'fxlist' }, scene.fx.map((f) => h('div', { class: `fx ${f.cls}` }, f.t))) : null,
        h('div', { class: 'hint' }, `${Math.min(i + 1, lines.length)} / ${lines.length}`),
        h('div', { class: 'menu' }, last
          ? (scene.choices?.length ? scene.choices : [{ id: 'ok', label: 'Continue ▶' }]).map((c) => btn(c.check ? `🎲 ${c.label} · ${c.check}` : c.label, () => { stopVoice(); closeModal(); heroSpeak(c.label); resolve(c.id); }, { class: 'primary', 'data-choice': c.id, id: 'dlg-next' }))
          : [btn('Next ▶', () => { stopVoice(); i++; draw(); }, { class: 'primary', id: 'dlg-next' }), btn('Skip ⏭', () => { stopVoice(); i = lines.length - 1; draw(); }, { class: 'small', id: 'dlg-skip' })]))], { closable });
    };
    draw();
  });
}
/** A tabletop quest scene: the Dungeon Master narrates, d20 checks are rolled in the open, choices branch (see game/tabletop.js). */
async function runTT(entry, { poi = null } = {}) {
  const TT = Story.TT; const sess = TT.begin(S, entry); let view = TT.show(S, sess);
  while (view) {
    if (view.roll) sfx('dice');
    for (const f of view.fxLines) log(f.t, f.cls === 'bad' ? 'bad' : f.cls === 'sys' ? 'sys' : 'good');
    const id = await showDialogue({ title: view.title, lines: view.lines, choices: view.choices, roll: view.roll, fx: view.fxLines, dm: true });
    view = TT.pick(S, sess, id);
  }
  if (Story.finishTT(S, poi, sess)) G.setTile(S, S.x, S.y, '.');
  autosave(); rebuild();
}
/** Round portrait for a dialogue speaker: a painted image when they have one (Liora, event guests), else the emoji disc. */
function speakerPortrait(sp) {
  if (Number.isInteger(sp.img)) return h('span', { class: 'dlgportrait pimgwrap', style: `border-color:${sp.color}` }, h('img', { src: portraitURL(sp.img), alt: `${sp.name || 'Speaker'} portrait`, draggable: 'false' }));
  return h('span', { class: 'dlgportrait', style: `border-color:${sp.color}` }, sp.icon || (sp.name || '?')[0]);
}
let prologueFight = false;
async function runPrologue() {
  const sc = Story.prologueScenes(S);
  if (await showDialogue(sc.feast) === 'skip') { await afterPrologueFight(); return; }
  prologueFight = true; S.mode = 'town';
  startCombat({ groups: Story.PROLOGUE_FIGHT, town: true });
}
async function afterPrologueFight() {
  prologueFight = false;
  const choice = await showDialogue(Story.prologueScenes(S).abduction);
  handle(Story.finishPrologue(S, choice)); autosave(); showTown(); startTutorial();
}
let journalTab = 'quests';
function showJournal(back, tab) {
  if (tab) journalTab = tab;
  const qs = Story.questList(S), notes = S.notes || [], entries = S.journal || [];
  const tabs = [['quests', '📜 Quests', qs.filter((q) => q.status === 'ready').length || null], ['bonds', '💞 Bonds'], ['notes', '🗒 Notes'], ['entries', '🕮 Entries']];
  const pages = {
    quests: () => [h('p', { class: 'hint' }, `Moon ${Math.min(5, (S.moon | 0) + 1)} of 5 · Seals broken: ${Story.sealsBroken(S)}/5${Story.empowered(S) ? ' · ⚠ Malthrax is EMPOWERED' : ''}`),
      h('div', { class: 'menu' }, qs.map((q) => h('p', {}, h('b', {}, `${q.status === 'done' ? '✔' : q.status === 'ready' ? '❗' : '•'} ${q.title || q.id}`), q.progress ? ` (${q.progress})` : '', q.desc ? h('br') : null, q.desc ? h('span', { class: 'hint' }, q.desc) : null)))],
    bonds: () => [bondsPanel()],
    notes: () => [h('h3', {}, `Elowen's notes (${notes.length}/10)`), ...notes.map((n) => h('p', { class: 'lore' }, typeof n === 'string' ? n : Story.NOTES[n - 1] || ''))],
    entries: () => [...(entries.length ? entries.slice().reverse().map((j) => h('p', { class: 'hint' }, typeof j === 'string' ? j : j.text)) : [h('p', { class: 'hint' }, 'Nothing written yet.')])],
  };
  const p = openModal(h('div', { class: 'tabpage', 'data-page': journalTab }, pages[journalTab]()), { title: '📖 Journal', tabs: tabBar(tabs, journalTab, (id) => showJournal(back, id)) });
  const cl = p.querySelector('.closebtn'); if (cl) cl.id = 'btn-journal-close'; // ✕ Close returns to wherever the Journal was opened from (town square or the maze)
}
/** Journal: companion bonds (hearts), Liora's story, curses and blessings, and what Emberhollow remembers. */
function bondsPanel() {
  const P = G.PC, kids = [h('h3', {}, 'Bonds & Omens')];
  const who = [...S.party, ...(S.roster || [])].filter((c) => c.companion);
  if (who.length) kids.push(h('div', { class: 'bonds' }, who.map((c) => h('div', { class: 'bondrow' }, h('b', { style: `color:${COMPANIONS[c.companion].color}` }, COMPANIONS[c.companion].short), ' ', h('span', { class: 'heart' }, P.hearts(S, c.companion)),
    c.companion === 'liora' ? h('span', { class: 'hint' }, ` ${P.BOND_LABEL[P.bond(S)]}`) : null))));
  const th = P.threadsHeard(S); if (th) kids.push(h('p', { class: 'hint' }, `Personal stories heard: ${th}`));
  for (const b of P.buffs(S)) kids.push(h('p', { class: P.BUFFS[b.id].kind === 'curse' ? 'bad' : 'good' }, `${P.BUFFS[b.id].kind === 'curse' ? '☾' : '✦'} ${P.BUFFS[b.id].label}: ${P.BUFFS[b.id].desc}`));
  const mem = P.knownMemories(S); if (mem.length) kids.push(h('p', { class: 'hint' }, `Emberhollow remembers: ${mem.map((m) => m.name).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.`));
  const open = P.EVENT_LIST.filter((e) => !P.eventDone(S, e.id) && e.id === 'b1-liora' && !G.Story.hasComp(S, 'liora')); if (open.length) kids.push(h('p', { class: 'hint' }, 'A ranger is rumoured to be waiting near the entrance of the Warrens…'));
  return h('div', {}, ...kids);
}
/** Camp / tavern talk: Liora's next conversation (hearts rise with your choices, nothing is ever lost), else a campfire remark. */
async function campTalk(back) {
  const r = G.campTalk(S); if (r.line) { log(r.line, 'lore'); speakCamp(r.line); return; }
  const id = await showDialogue(r.scene);
  const res = G.lioraMoment(S, r.moment, id);
  await showDialogue({ title: r.scene.title, lines: res.lines });
  handle(res.out); autosave(); if (back) back();
}
/** A campfire remark: `Name: "words"` segments, each read by that companion in turn (an unvoiced fallback is read by the narrator). */
function speakCamp(line) {
  const segs = [...String(line).matchAll(/([A-Z][a-z]+): "([^"]*)"/g)].map((m) => ({ who: m[1], text: m[2] }));
  if (!segs.length) segs.push({ who: 'narrator', text: line });
  segs.filter((x) => hasVoice(x.text, x.who)).forEach((x, i) => playVoiceLine(x.text, x.who, i ? { kind: 'dialog', queue: true, maxWait: 30000 } : { kind: 'dialog' }));
}
function showTownFolk() {
  openModal([h('h2', {}, 'Emberhollow Folk'), h('div', { class: 'menu' }, Story.TOWNFOLK.map((k) => { const sp = Story.speaker(k);
    return btn(`${sp.icon} ${sp.name} — ${Story.townfolkStatus(S, k)}`, async () => { const r = Story.talkTo(S, k); handle(r.out); autosave(); if (r.tt) { await runTT(r.tt); showTownFolk(); return; } await showDialogue({ lines: r.scene.lines }, { closable: true }); showTownFolk(); }, { 'data-npc': k }); })),
    btn('← Back', () => showTown(), { class: 'backbtn' })], { closable: false, cls: 'transparent' });
}

/* ---------- Log & banter ---------- */
function log(t, cls = '') {
  const el = $('#log'); el.append(h('div', { class: cls }, t)); while (el.children.length > 200) el.firstChild.remove(); el.scrollTop = el.scrollHeight;
  // while a dialog is open the log is underneath it, so also echo the message inside the dialog itself
  const out = !modal.classList.contains('hidden') && modal.querySelector('.dlgout');
  if (out) { out.hidden = false; out.append(h('div', { class: cls }, t)); while (out.children.length > 8) out.firstChild.remove(); out.scrollTop = out.scrollHeight; if (!matchMedia('(max-width: 760px), (max-height: 520px) and (orientation: landscape)').matches) out.scrollIntoView({ block: 'nearest' }); } // on phones the message strip sticks to the bottom of the dialog, so the dialog never scrolls away from its buttons
}
function say(b, o = {}) {
  if (!b) return;
  if (Array.isArray(b)) { // a personal thread beat: lines follow one another, each after the previous clip ends
    let t = 0;
    b.filter(Boolean).forEach((x, i) => { if (i) setTimeout(() => S && say(x, { queue: true }), t); else say(x, { queue: true }); t += Math.round((clipSeconds(x.text, x.who) ?? 1.8) * 1000) + 700; });
    return;
  }
  // Barks never cut another voice off and are spaced out (about 5s in a fight, 3s outside); queued ones (after a card or a thread beat) wait their turn.
  const gap = combat ? 5000 : 3000;
  if (b.thread || o.queue) playVoiceLine(b.text, b.who, { kind: 'battle', queue: true, maxWait: 14000 });
  else if (msSinceVoiceEnd() >= gap) playVoiceLine(b.text, b.who, { kind: 'battle', ifIdle: true });
  const el = h('div', { class: `bubble${b.thread ? ' thread' : ''}` }, h('b', { style: `color:${b.color}` }, b.who + ':'), b.text);
  $('#banter').append(el); log(`${b.who}: "${b.text}"`, b.thread ? 'good' : 'lore'); setTimeout(() => el.remove(), b.thread ? 6500 : 5200);
  while ($('#banter').children.length > (combat ? 1 : 2)) $('#banter').firstChild.remove(); // one bubble at a time in a fight, so they never pile up over the stage
  placeBanter();
}
/** In combat, companion speech bubbles go in the free band under the monsters (and under any caption), or above the
 *  monsters if that band is full; if neither fits they stay hidden (the line is in the log anyway). Never over a monster. */
function placeBanter() {
  const bn = $('#banter'); bn.classList.remove('offband'); bn.style.top = ''; bn.style.left = ''; bn.style.transform = ''; bn.style.width = '';
  if (!combat || !R?.monsterRect || !bn.children.length) return;
  const view = $('#view').getBoundingClientRect(), r = R.monsterRect(); if (!r || !view.height) return;
  const hb = bn.offsetHeight; let bottom = view.bottom - 6;
  // the acting-hero / foe portrait and the 2x / Auto chips sit along the bottom edge of the stage: the bubble stays above all of them
  for (const sel of ['#turnport', '#foeport', '#combatchips']) { const e = document.querySelector(sel); if (!e || !e.offsetParent) continue; const b = e.getBoundingClientRect(); if (b.height >= 8 && b.top < bottom && b.bottom > view.top) bottom = Math.min(bottom, b.top - 6); }
  for (const sel of ['#cmenu', '#modal.combat .panel']) { const m = document.querySelector(sel); if (!m || !m.offsetParent) continue; const b = m.getBoundingClientRect(); if (b.height && b.top < bottom && b.bottom > view.top) bottom = Math.min(bottom, b.top - 6); }
  const cap = $('#caption'), cr = cap.classList.contains('show') ? cap.getBoundingClientRect() : null;
  let top = view.top + (r.bottom / 100) * view.height + 6; if (cr && cr.height) top = Math.max(top, cr.bottom + 6);
  if (top + hb <= bottom) { bn.style.top = `${top - view.top}px`; return; }
  const tight = R.monsterScreenRect?.(); // the band is short: try again just under the sprites' real outline (the padded box leaves room for lunges)
  if (tight) { let t2 = view.top + (tight.bottom / 100) * view.height + 3; if (cr && cr.height) t2 = Math.max(t2, cr.bottom + 6); if (t2 + hb <= bottom) { bn.style.top = `${t2 - view.top}px`; return; } }
  const hud = $('#hud').getBoundingClientRect(), mb = $('#btn-menu')?.getBoundingClientRect(), mTop = view.top + (r.top / 100) * view.height - 6;
  const plateTop = Math.min(Infinity, ...[...document.querySelectorAll('#targets .mtag')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect().top));
  for (const withPlates of (Number.isFinite(plateTop) && plateTop < mTop ? [true, false] : [false])) for (const narrow of [false, true]) { // above the monsters (and, when there is room, above their name plates); on a phone the top-right Menu button is dodged by narrowing the bubble to its left
    if (!narrow) { bn.style.left = ''; bn.style.transform = ''; bn.style.width = ''; }
    if (narrow) { if (!mb || !mb.width || mb.left < view.left + view.width * 0.4) break; bn.style.left = '8px'; bn.style.transform = 'none'; bn.style.width = `${mb.left - view.left - 14}px`; }
    const h2 = bn.offsetHeight, above = (withPlates ? plateTop - 4 : mTop) - h2, minTop = Math.max(view.top + 4, hud.bottom + 2);
    const clash = mb && mb.width && mb.bottom > above && mb.top < above + h2 && (narrow ? false : mb.right > bn.getBoundingClientRect().left && mb.left < bn.getBoundingClientRect().right);
    if (above >= minTop && !clash) { bn.style.top = `${above - view.top}px`; return; }
  }
  bn.style.left = ''; bn.style.transform = ''; bn.style.width = '';
  bn.classList.add('offband');
}
function handle(events) {
  const list = events || [];
  const willCombat = list.some((e) => e.combat) || combatStarting;
  for (const e of list) {
    if (e.dm || e.ambient) {
      log(e.log, e.cls);
      // Never queue area narration into a fight, menu, or dialogue; keep the log line only.
      if (loadSettings().areaDesc !== false && !combat && !willCombat && !menuOpen() && !dialogueOpen()) {
        queueMessage({ text: e.log, cls: 'lore', quip: e.quip, ambient: true, token: ambientToken() });
      } else if (e.quip && !combat && !willCombat) say(e.quip);
    } else if (e.log) {
      log(e.log, e.cls);
      const vz = voiceOf(e);
      if (!combat && !willCombat && S?.mode === 'dungeon' && (e.card || e.cls === 'lore')) {
        queueMessage({ text: e.log, cls: e.cls || 'lore', ambient: true, token: ambientToken(), voice: vz });
      } else if (vz && !combat && (!willCombat || vz.who !== 'narrator') && (S?.mode !== 'dungeon' || !menuOpen())) voiceLine(vz); // narrated outcome or a character's words, spoken after any card
    }
    if (e.banter) say(e.banter, { queue: !!(e.card || e.voice || e.cls === 'lore') }); if (e.bump) { R.bump(); sfx('bump'); } if (e.shake) { R.shake(); flashRed(); sfx('hurt'); }
    if (e.sfx) sfx(e.sfx);
    if (e.toast) toast(e.toast);
    if (e.rare && !combat && !willCombat && S?.mode === 'dungeon') revealRare(e.rare);
    if (e.suspect) toast('❓ Something about that wall is off — try 🔍 Search');
    if (e.reveal || e.sfx === 'door' || e.sfx === 'chest') rebuild();
    if (e.xp) toast(`✦ +${e.xp} XP each`);
    if (e.paywall) { prompt('paywall', e); return; }
    if (e.toTown) { const rc = G.Prog.sessionRecap(S); if (rc) queueMessage(rc); autosave(); showTown(); return; }
    if (e.combat) { startCombat(e.combat); return; }
    if (e.prompt) { if (msgRunning) messagesDone().then(() => S && !combat && prompt(e.prompt, e)); else prompt(e.prompt, e); } // read the card first
  }
  if (S) for (const q of G.sweepQuests(S)) { log(q.log, q.cls); toast(`✦ +${q.xp} XP each — quest complete`); }
  refresh();
}
/** A glowing drop-reveal card for a named or tiered item found outside a fight. */
function revealRare(r) {
  const k = r.key, t = r.tier || tierOf(k), I = ITEMS[k];
  queueMessage({ text: `✨ ${TIER_LABEL[t]} find!`, cls: 'rare', tier: t, lines: [G.nameOf(k), I?.desc || ''].filter(Boolean), lineTiers: [t], rareSfx: t, from: r.from });
}
const tierStyle = (k) => { const t = tierOf(k); return t === 'common' ? '' : `color:${TIER_COLOR[t]};text-shadow:0 0 6px ${TIER_COLOR[t]}66`; };
function flashRed(crit = false) { const f = $('#flash'); f.classList.toggle('crit', !!crit); f.style.opacity = 1; setTimeout(() => (f.style.opacity = 0), crit ? 380 : 250); }
function reduceMotion() { const st = loadSettings(); return st.reduceMotion ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false); }
function syncFxSettings() { if (!R) return; R.speedF = speed().f; R.reduceMotion = reduceMotion(); document.body.classList.toggle('reducemotion', R.reduceMotion); }
function healFx(c) { const el = document.getElementById('card-' + c.id); if (!el) return; el.classList.remove('healed'); void el.offsetWidth; el.classList.add('healed');
  for (let i = 0; i < 8; i++) { const sp = h('span', { class: 'sparkle', style: `left:${8 + Math.random() * 84}%;top:${30 + Math.random() * 60}%;animation-delay:${(Math.random() * 0.35).toFixed(2)}s` }, '✦'); el.append(sp); setTimeout(() => sp.remove(), 1300); }
  setTimeout(() => el.classList.remove('healed'), 1200); }
const DTYPE_CSS = (t) => { const c = TYPE_COLOR[t]; return c && !['slashing', 'piercing', 'bludgeoning'].includes(t) ? '#' + c.toString(16).padStart(6, '0') : null; };

/* ---------- Party panel ---------- */
function portrait(c, cls = 'portrait') {
  if (!Number.isInteger(c.portrait)) { const col = c.companion ? COMPANIONS[c.companion].color : c.recruit ? '#ffd0a0' : '#6dffa8'; return h('span', { class: cls, style: `background:${col}` }, c.name[0]); }
  return h('img', { class: cls + ' pimg', src: portraitURL(c.portrait), alt: `${c.name} portrait`, draggable: 'false' });
}
/** Portrait grid. sel = index or null (Random). onPick(index|null). */
/** The Voice step of character creation: a list of voice packs; tapping one selects it and plays its "select" line as a preview. */
function voiceGrid(sel, onPick) {
  const preview = (p) => { unlockAudio(); unlockVoices(); const l = packLine(p, 'select'); if (l) playVoiceLine(l, p.cast, { kind: 'dialog' }); };
  return h('div', { class: 'voicelist', id: 'voice-list', role: 'listbox', 'aria-label': 'Voice' }, PACKS.map((p) => h('div', { class: `voiceopt${p.id === sel ? ' sel' : ''}`, role: 'option', 'aria-selected': p.id === sel ? 'true' : 'false', 'data-voice': p.id, tabindex: 0,
    onclick: () => { preview(p); if (p.id !== sel) onPick(p.id); } },
  h('span', { class: 'vplay', 'aria-hidden': 'true' }, '▶'), h('span', { class: 'vtxt' }, h('b', {}, p.name + (p.id === DEFAULT_PACK ? ' (default)' : '')), h('small', {}, p.blurb)))));
}
function portraitGrid(sel, onPick, { random = true } = {}) {
  return h('div', { class: 'pgrid', id: 'pgrid', role: 'listbox', 'aria-label': 'Choose a portrait' },
    random ? h('button', { class: `pick prand ${sel === null ? 'on' : ''}`, id: 'pick-random', title: 'Random portrait', onclick: () => onPick(null) }, '🎲') : null,
    PORTRAITS.map((p) => h('button', { class: `pick ${sel === p.id ? 'on' : ''}`, 'data-pid': p.id, title: `${RACES[p.race].name} ${CLASSES[p.cls].name}`, onclick: () => onPick(p.id) }, h('img', { src: portraitURL(p.id), alt: '' }))));
}
function showPortraitPicker(c, back) {
  openModal([h('h2', {}, `Portrait — ${c.name}`), portraitGrid(c.portrait, (i) => { c.portrait = i === null ? randomPortrait(c.race, c.cls) : i; autosave(); refresh(); back(); }),
    h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px' }, btn('Cancel', back))], { closable: true });
}
/* ---------- Phase D: condition icons, weakness chips, rows ---------- */
function condChips(conds, cls = '') {
  const ks = D.visibleConds(conds); if (!ks.length) return null;
  return h('div', { class: 'cicons ' + cls }, ks.map((k) => { const i = D.condInfo(k); return h('span', { class: `cchip ${i.tone}`, 'data-cond': k, title: `${i.name}: ${i.desc}`, 'aria-label': i.name, role: 'img', info: () => [`${i.icon} ${i.name}`, i.desc] }, i.icon); }));
}
function traitChips(m) {
  const kn = D.knownTraits(m), hid = D.hiddenTraitCount(m); if (!kn.length && !hid) return null;
  const chips = kn.map((t) => { const d = D.dtype(t.type), k = D.TRAIT_KINDS[t.kind]; return h('span', { class: `wchip ${k.cls}`, 'data-trait': `${t.kind}:${t.type}`, title: `${k.word} ${d.name.toLowerCase()}: ${k.rule}.`, 'aria-label': `${k.word} ${d.name}`, role: 'img', info: () => [`${d.icon} ${k.word} ${d.name}`, `${m.name} ${k.rule} from ${d.name.toLowerCase()}.`] }, d.icon, h('b', {}, k.mark)); });
  if (hid > 0) chips.push(h('span', { class: 'wchip unk', 'data-trait': 'unknown', title: 'Unknown weaknesses. Hit it with different damage types, or use the Study action.', 'aria-label': 'Unknown weaknesses', info: () => ['❔ Not yet discovered', `${hid} weakness${hid > 1 ? 'es or resistances' : ' or resistance'} still hidden. Hit it with different kinds of damage, or Study it (bonus action Knowledge check).`] }, '❔'));
  return h('div', { class: 'wchips' }, chips);
}
/** Is this hero in the front row right now? (In a fight, downed heroes step aside.) */
function inFrontRow(c) { const i = S.party.indexOf(c); return combat && combat.state === 'running' && combat.party === S.party && !isDown(c) ? combat.inFront(c) : i < 2; }
function roleOf(c) {
  const w = c.equip.weapon && WEAPONS[c.equip.weapon.base]; const reach = !!w?.props.includes('reach');
  const parts = [];
  if (CLASSES[c.cls].caster) parts.push('spells');
  if (c.equip.weapon) parts.push(reach ? 'melee (reach)' : 'melee'); else if (!CLASSES[c.cls].caster) parts.push('unarmed');
  if (c.equip.ranged) parts.push('ranged');
  return parts.join(' + ');
}
/** Formation board: tap a hero, then a hero in the other row, to trade places. */
function formationBoard(redraw) {
  let sel = null;
  const root = h('div', { class: 'formation', id: 'formation' });
  const draw = () => {
    root.innerHTML = '';
    const col = (title, hint, from, to, id) => h('div', { class: 'fcol', id }, h('div', { class: 'fhead' }, h('b', {}, title), h('small', {}, hint)),
      S.party.slice(from, to).map((c, k) => { const i = from + k; return h('button', { type: 'button', class: `fhero ${sel === c ? 'sel' : ''} ${c.hp <= 0 ? 'down' : ''}`, 'data-hero': c.id, title: `${c.name}: ${roleOf(c)}. Tap, then tap a hero in the other row to swap.`,
        onclick: () => {
          if (sel === c) { sel = null; draw(); return; }
          if (!sel) { sel = c; draw(); return; }
          const a = S.party.indexOf(sel), b = i; if (a >= 0 && (a < 2) !== (b < 2)) { [S.party[a], S.party[b]] = [S.party[b], S.party[a]]; log(`${sel.name} and ${c.name} trade rows.`, 'sys'); sel = null; autosave(); refresh(); redraw ? redraw() : draw(); } else { sel = c; draw(); }
        } }, portrait(c, 'cport'), h('span', { class: 'fnm' }, c.name), h('small', {}, CLASSES[c.cls].name, h('span', { class: 'frole' }, ` · ${roleOf(c)}`))); }));
    root.append(col('⚔ Front row', 'melee · hit first', 0, 2, 'frow-front'), col('🏹 Back row', 'ranged, spells, reach', 2, S.party.length, 'frow-back'),
      h('details', { class: 'fnote' }, h('summary', {}, 'ℹ How rows work'), 'Only the front row can melee (unless wielding a glaive, halberd, pike or whip). Monsters pick the front row about 9 times in 10. In a fight, swapping costs a bonus action. Tap a hero, then a hero in the other row, to swap.'));
  };
  draw(); return root;
}
function renderParty() {
  const el = $('#party'); el.innerHTML = '';
  if (!S) return;
  const cur = combat && combat.state === 'running' ? combat.current() : null;
  S.party.forEach((c, i) => {
    const pct = Math.max(0, c.hp) / c.maxHp * 100;
    const front = inFrontRow(c);
    const card = h('div', { class: `card ${cur === c ? 'active' : ''} ${c.dead ? 'dead' : c.hp <= 0 ? 'down' : ''}`, id: 'card-' + c.id, onclick: () => showSheet(c), info: () => memberInfo(c) },
      h('div', { class: 'nm' }, h('span', { class: 'nmw' }, portrait(c, 'cport'), h('span', { class: 'cnm', title: c.name }, h('span', { class: 'rowic', title: front ? 'Front row: can melee, draws most attacks' : 'Back row: ranged attacks and spells (or a reach weapon); monsters rarely target it' }, front ? '⚔' : '🏹'), ` ${c.name}`), canLevelUp(c) ? h('span', { class: 'lvchip', title: 'Ready to level up! Make camp or visit the Training Grounds', 'aria-label': 'Ready to level up' }, '⬆') : null),
        !G.isHero(c) ? h('button', { class: `aitog small ${c.ai ? 'on' : ''}`, title: 'Toggle AI / player control', onclick: (e) => { e.stopPropagation(); c.ai = !c.ai; log(`${c.name} is now ${c.ai ? 'AI-controlled' : 'player-controlled'}.`, 'sys'); refresh(); if (combat) combatLoop(); } }, c.ai ? 'AI' : 'YOU') : h('span', { class: 'tag' }, 'YOU')),
      h('div', { class: 'sub' }, `L${c.level} ${RACES[c.race].name} ${CLASSES[c.cls].name} · AC ${armorClass(c)}`),
      h('div', { class: `bar hp ${pct < 30 ? 'low' : ''}` }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'row', style: 'justify-content:space-between;font-size:11px' }, h('span', {}, c.dead ? 'DEAD' : c.hp <= 0 ? `DOWN ${c.deathSaves.s}✓${c.deathSaves.f}✗` : `HP ${c.hp}/${c.maxHp}`),
        c.slots.length ? h('span', { class: 'slots' }, 'Slots ' + c.slots.map((n, l) => `${l + 1}:${n}`).join(' ')) : null),
      condChips(c.conditions),
      null);
    el.append(card);
  });
}
function checkReady() {
  if (!S) return;
  for (const c of G.newlyReady(S)) { log(`⬆ ${c.name} is ready to level up! Make camp or visit the Training Grounds.`, 'crit'); say({ who: c.name, color: '#ffd34d', text: 'Ready to level up! Make camp or visit the Training Grounds.' }); }
}
/* ---------- Phase E: the open-air window on this floor (render-only; the tiles are unchanged) ---------- */
const _regCache = new WeakMap();
function outReg() { if (!S || S.mode !== 'dungeon') return null; const L = getLevel(S.level); if (!_regCache.has(L)) _regCache.set(L, outdoorRegion(L)); return _regCache.get(L); }
const outNear = () => { const r = outReg(); return !!r && S.x >= r.x0 - 1 && S.x <= r.x1 + 1 && S.y >= r.y0 - 1 && S.y <= r.y1 + 1; };
const outHour = () => R?.outdoor?.forceHour ?? hourAt(S?.steps || 0);
let wasOutdoors = false;
function outdoorEntry() {
  const r = outReg(), now = !!r && inRegion(r, S.x, S.y);
  if (now && !wasOutdoors) { const t = todName(outHour()), w = WEATHER_INFO[r.weather]; toast(`${r.name} — open sky · ${t.icon} ${t.name} · ${w.icon} ${w.name}`); log(`🌳 ${r.name}: the roof has fallen in and the sky shows through. It is ${t.name}; ${r.weather === 'rain' ? 'rain patters on the grass' : 'a thin mist hangs over the ground'}.`, 'note'); }
  wasOutdoors = now;
}
function refresh() { checkReady(); renderParty(); drawMinimap($('#minimap')); renderHud(); if (R) R.steps = S?.steps || 0; outdoorEntry(); syncAudio(); syncWorld(); }
/** Phase B: push flagged walls and live elites into the 3D view. */
function syncWorld() {
  if (!R || !S || S.mode !== 'dungeon' || S.level !== lastBuiltLevel) return;
  const sus = (S.suspect?.[S.level] || []).map((c) => c.split(',').map(Number)).filter(([x, y]) => G.tile(S, x, y) === 'S');
  const el = G.liveElites(S).map((e) => { const [x, y] = G.elitePosNow(S, e); return { id: e.id, kind: e.kind, title: e.title, key: e.groups[0].key, x, y }; });
  R.syncDynamic((x, y) => G.tile(S, x, y), sus, el).catch(() => {});
  R.syncEvents(G.PC.openEvents(S, getLevel(S.level)).map((e) => { const E = G.PC.eventById(e.id); return { id: e.id, x: e.x, y: e.y, color: E.color, icon: '✦' }; }));
}
function renderHud() {
  const el = $('#hud'); if (!S) { el.innerHTML = ''; return; }
  if (S.mode === 'dungeon') { const sc = G.Prog.secretCount(S, S.level); const oreg = outNear() ? outReg() : null, otod = oreg ? todName(outHour()) : null; el.innerHTML = `<span>${getLevel(S.level).def.name}${oreg ? ` · <b class="outdoor" title="${oreg.name}: ${otod.name}, ${oreg.weather}">${otod.icon}${WEATHER_INFO[oreg.weather].icon}</b>` : ''} · <b class="secrets" title="Secrets found on this floor">🔍 ${sc.found}/${sc.total}</b></span><span>⌖ ${S.x},${S.y} · ${DIR_NAMES[S.dir]} · ${S.gold} gp</span>`; }
  else el.innerHTML = `<span>Emberhollow</span><span>${S.gold} gp</span>`;
}

/* ---------- Minimap ---------- */
const MAPCOL = { Q: '#ffd77a', '#': null, '.': '#2a2448', D: '#c08040', d: '#6b4a2a', L: '#ff3050', '<': '#80a0ff', '>': '#40ffd0', C: '#ffc040', o: '#665522', T: '#2a2448', t: '#ff3030', K: '#ffd040', E: '#2a2448', B: '#ff2040', M: '#b060ff', F: '#30a0ff', f: '#203040', A: '#ffd040', S: null, N: '#8a6ad0' };
function drawMinimap(cv, big = false) {
  const g = cv.getContext('2d'); g.fillStyle = '#05030b'; g.fillRect(0, 0, cv.width, cv.height);
  if (!S || S.mode !== 'dungeon') { g.fillStyle = '#3b2d6b'; g.font = '14px monospace'; g.fillText('Town', 10, 20); return; }
  // small minimap: 13x13 window centred on the party; big map: whole level
  const span = big ? W : 13; const cs = cv.width / span;
  const ox = big ? 0 : S.x - (span >> 1), oy = big ? 0 : S.y - (span >> 1);
  const ex = new Set(S.explored[S.level]);
  const theme = '#' + getLevel(S.level).def.color.toString(16).padStart(6, '0'); const oreg = outReg();
  for (let sy = 0; sy < span; sy++) for (let sx = 0; sx < span; sx++) {
    const x = ox + sx, y = oy + sy; const X = sx * cs, Y = sy * cs;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (!ex.has(`${x},${y}`)) { g.strokeStyle = '#1a1430'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, cs - 1, cs - 1); continue; }
    const ch = G.tile(S, x, y);
    if (ch === '#' || ch === 'S') { g.fillStyle = oreg && inRegion(oreg, x, y) ? '#2f6a3a99' : theme + '66'; g.fillRect(X, Y, cs, cs); if (ch === 'S' && S.suspect?.[S.level]?.includes(`${x},${y}`)) { g.fillStyle = '#ffe27a'; g.font = `bold ${Math.round(cs * 0.8)}px sans-serif`; g.textAlign = 'center'; g.fillText('?', X + cs / 2, Y + cs * 0.8); g.textAlign = 'start'; } continue; }
    let col = MAPCOL[ch] || '#2a2448'; if (ch === 'B' && S.bossDead[S.level]) col = '#2a2448';
    if (oreg && ch === '.' && inRegion(oreg, x, y)) col = '#2f5a35'; // the open-air window reads green on the automap
    g.fillStyle = col; g.fillRect(X + 0.5, Y + 0.5, cs - 1, cs - 1);
  }
  g.textAlign = 'center'; g.font = `${Math.round(cs * 0.85)}px serif`; for (const p of S.pins?.[S.level] || []) { const X = (p.x - ox + 0.5) * cs, Y = (p.y - oy + 0.85) * cs; if (X > 0 && Y > 0 && X < cv.width && Y < cv.height) g.fillText(p.icon, X, Y); } g.textAlign = 'start';
  // Phase C: open story events glow gold on the map once their tile has been seen
  for (const e of G.PC.openEvents(S, getLevel(S.level))) {
    if (!ex.has(`${e.x},${e.y}`)) continue; const X = (e.x - ox + 0.5) * cs, Y = (e.y - oy + 0.5) * cs; if (X < 0 || Y < 0 || X > cv.width || Y > cv.height) continue;
    g.fillStyle = `rgba(255,215,122,${0.5 + 0.3 * Math.sin(performance.now() / 300)})`; g.beginPath(); g.arc(X, Y, cs * 0.5, 0, 7); g.fill();
    g.fillStyle = '#2a1a00'; g.textAlign = 'center'; g.font = `bold ${Math.round(cs * 0.8)}px sans-serif`; g.fillText('!', X, Y + cs * 0.3); g.textAlign = 'start';
  }
  // elites: pulsing red marker where they stand now, plus a faint dotted patrol line once their ground is known
  const tm = performance.now() / 1000;
  for (const e of G.liveElites(S)) {
    const [ex0, ey0] = G.elitePosNow(S, e); const seen = S.eliteSeen?.[`${S.level}:${e.id}`] || ex.has(`${ex0},${ey0}`); if (!seen) continue;
    if (e.kind === 'patrol') { g.fillStyle = '#ff5a3a55'; for (const [qx, qy] of e.path) g.fillRect((qx - ox + 0.4) * cs, (qy - oy + 0.4) * cs, cs * 0.2, cs * 0.2); }
    const X = (ex0 - ox + 0.5) * cs, Y = (ey0 - oy + 0.5) * cs; if (X < 0 || Y < 0 || X > cv.width || Y > cv.height) continue;
    g.fillStyle = `rgba(255,70,40,${0.55 + 0.3 * Math.sin(tm * 4)})`; g.beginPath(); g.arc(X, Y, cs * 0.55, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `${Math.round(cs * 0.8)}px serif`; g.fillText('☠', X, Y + cs * 0.3); g.textAlign = 'start';
  }
  const px = (S.x - ox + 0.5) * cs, py = (S.y - oy + 0.5) * cs; const [dx, dy] = DIRS[S.dir];
  g.fillStyle = '#6dffa8'; g.beginPath(); g.moveTo(px + dx * cs * 0.5, py + dy * cs * 0.5); g.lineTo(px - dy * cs * 0.4 - dx * cs * 0.3, py + dx * cs * 0.4 - dy * cs * 0.3); g.lineTo(px + dy * cs * 0.4 - dx * cs * 0.3, py - dx * cs * 0.4 - dy * cs * 0.3); g.fill();
  if (!big) { g.fillStyle = '#9a8fd0'; g.font = '11px monospace'; g.fillText(`${S.x},${S.y}`, 4, cv.height - 5); }
}

/* ---------- Controls ---------- */
function setControls(kind) {
  const el = $('#controls'); el.innerHTML = '';
  if (kind === 'dungeon') {
    const b = (l, f, cls = '', title = '') => el.append(h('button', { class: cls, title, onclick: () => { if (!busy && !combat && !msgRunning && modal.classList.contains('hidden')) f(); } }, l));
    b('↶', () => act(() => G.turn(S, -1)), '', 'Turn left (A)'); b('▲', () => act(() => G.move(S, 0)), '', 'Forward (W)'); b('↷', () => act(() => G.turn(S, 1)), '', 'Turn right (D)');
    b('◀', () => act(() => G.move(S, 3)), '', 'Strafe left (Q)'); b('▼', () => act(() => G.move(S, 2)), '', 'Back (S)'); b('▶', () => act(() => G.move(S, 1)), '', 'Strafe right (E)');
    b('🔍 Search', doSearch, 'act', 'Search (F)'); b('⛺ Camp', () => { healSel = null; showCamp('rest'); }, 'act', 'Camp (C)'); b('🗺 Map', showMap, 'act', 'Map (M)');
    b('📜 Sheet', () => showSheet(S.party[0]), 'act', 'Character sheet (I)'); b('🎒 Items', showInventory, 'act', 'Inventory (B)'); b('💾 Save', () => { autosave(); log('Game saved.', 'sys'); }, 'act', 'Save (P)');
  }
}
function act(f) { ambientMoveToken++; const ev = f(); R.setView(S.x, S.y, S.dir); if (ev.some?.((e) => !e.bump)) sfx('step'); handle(ev); if (S && !combat && S.steps % 8 === 0 && S.steps !== lastAutoStep) { lastAutoStep = S.steps; autosave(true); } }
let lastAutoStep = -1;
function doSearch() {
  const ev = G.search(S);
  if (G.lockAt(S)) ev.push({ prompt: 'lock' });
  handle(ev);
}
window.addEventListener('keydown', (e) => {
  if (menuOpen()) { if (e.key === 'Escape') { e.preventDefault(); menuBack(); } return; }
  if (!S) return;
  if (e.key === 'Escape' && !combat && modal.classList.contains('hidden')) { e.preventDefault(); openMenu(); return; }
  if (combat) return combatKey(e);
  if (e.key.toLowerCase() === 'j' && modal.classList.contains('hidden') && S.mode === 'dungeon' && !busy) { e.preventDefault(); showJournal(null, 'quests'); return; }
  if (!modal.classList.contains('hidden')) { if (e.key === 'Escape') { if (modal.dataset.closable) dismissModal(); else if (S.mode === 'town' && townSub) showTown(); } return; }
  if (S.mode !== 'dungeon' || busy || msgRunning) return;
  const k = e.key.toLowerCase();
  const map = { arrowup: () => G.move(S, 0), w: () => G.move(S, 0), arrowdown: () => G.move(S, 2), s: () => G.move(S, 2), arrowleft: () => G.turn(S, -1), a: () => G.turn(S, -1), arrowright: () => G.turn(S, 1), d: () => G.turn(S, 1), q: () => G.move(S, 3), e: () => G.move(S, 1) };
  if (map[k]) { e.preventDefault(); act(map[k]); return; }
  if (k === 'f' || k === ' ') { e.preventDefault(); doSearch(); }
  if (k === 'c') showCamp('rest'); if (k === 'm') showMap(); if (k === 'i') showSheet(S.party[0]); if (k === 'b') showInventory(); if (k === 'p') { autosave(); log('Game saved.', 'sys'); }
});
// Swipe controls on the 3D view
let touch0 = null;
$('#view').addEventListener('touchstart', (e) => { touch0 = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
$('#view').addEventListener('touchend', (e) => {
  if (!touch0 || !S || S.mode !== 'dungeon' || combat || busy || msgRunning || !modal.classList.contains('hidden')) return;
  const dx = e.changedTouches[0].clientX - touch0[0], dy = e.changedTouches[0].clientY - touch0[1]; touch0 = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  if (Math.abs(dx) > Math.abs(dy)) act(() => G.turn(S, dx < 0 ? 1 : -1)); else act(() => G.move(S, dy < 0 ? 0 : 2));
}, { passive: true });

/* ---------- Modal helpers ---------- */
function openModal(content, { closable = true, cls = '', title = null, tabs = null } = {}) {
  modal.className = cls; modal.innerHTML = ''; modal.dataset.closable = closable ? '1' : '';
  const p = h('div', { class: 'panel' }, content, h('div', { class: 'dlgout', 'aria-live': 'polite', hidden: true })); modal.append(p);
  if (closable) p.prepend(h('div', { class: 'navbar closebar' + (title ? ' titled' : '') }, title ? h('h2', {}, title) : null, btn('✕ Close', dismissModal, { class: 'small closebtn', 'aria-label': 'Close' }), tabs));
  return p;
}
function closeModal() { stopVoice(); modal.className = 'hidden'; modal.innerHTML = ''; }
// leaving the title screen removes the title art backdrop
new MutationObserver(() => { if (S) document.body.classList.remove('titlescreen'); }).observe(modal, { childList: true });
// Closing a dialog (✕ / Esc) must never strand the player: in town, fall back to the town screen they came from.
function dismissModal() { closeModal(); if (!S) showTitle(); else if (S.mode === 'town' && !combat) showTown(townSub); }

/* ---------- Title & creation ---------- */
async function showTitle() {
  S = null; townVisited = false; closeMenu(); updateMenuBtn(); setControls(null); R.setMode('combat'); refresh();
  R.clearMonsters(); document.body.classList.add('titlescreen');
  const has = [G.SAVE_KEY, ...SLOT_KEYS].some((k) => slotInfo(k));
  openModal([
    h('h1', { class: 'logo' }, 'BLACKSPIRE'),
    h('p', { class: 'hint tagline' }, 'Five moons. Five seals. One princess in the Dread Sovereign\'s tower. · A first-person dungeon crawl built on the D&D 5e SRD'),
    h('div', { class: 'menu' },
      btn('▶ New Game', showCreate, { class: 'primary', id: 'btn-new' }),
      has ? btn('⟲ Continue', () => continueLatest(), { id: 'btn-continue' }) : null,
      has ? btn('📂 Load Game', () => openMenu('load'), { id: 'btn-title-load' }) : null,
      btn('⇅ Import Save', () => openMenu('backup'), { id: 'btn-title-import' }),
      btn('⚙ Settings', () => { settingsTab = 'audio'; openMenu('settings'); }, { id: 'btn-title-settings' }),
      btn('? How to Play', showHelp),
      btn('© Credits & License', showCredits)),
  ], { closable: false, cls: 'transparent' });
}
function showHelp() {
  openModal([h('h2', {}, 'How to Play'), h('div', { html: `
  <p>Princess Elowen has been taken into the dungeons beneath <b>Blackspire</b>. Descend beneath Emberhollow, defeat each level's guardians, and stop Malthrax before the fifth seal breaks. Gorvax the Tyrant guards the <b>Dawnstone Amulet</b> in the deepest vault.</p>
  <table><tr><th>Move</th><td>W/↑ forward · S/↓ back · A/D or ←/→ turn · Q/E strafe · swipe on mobile</td></tr>
  <tr><th>Search</th><td>F / Space — find secret doors & traps, pick or force locks</td></tr>
  <tr><th>Camp</th><td>C — short/long rest, party talk, reorder, save/load</td></tr>
  <tr><th>Map / Sheet / Items</th><td>M / I / B</td></tr>
  <tr><th>Combat</th><td>Number keys pick menu entries; click monster tags to target. Each hero acts on their turn with a short cut-in; <b>🤖 Auto</b> lets the AI play every hero (you too) until you tap it again, and <b>⏩</b> changes battle speed (cut-ins follow it).</td></tr></table>
  <h3>Rows: front and back</h3>
  <p>Your party order is your formation. The <b>first two heroes are the front row</b> (⚔); everyone else is the <b>back row</b> (🏹). Only the front row can attack in melee. A back-row hero needs a <b>ranged weapon, a spell</b> or a <b>reach weapon</b> (glaive, halberd, pike, whip). Monsters aim at the front row about <b>9 times in 10</b>, but fliers and archers pick anyone. A downed front-row hero is replaced by the next hero in line.</p>
  <p>Change rows in <b>Camp → Formation</b> (or the Tavern): tap a hero, then tap a hero in the other row to swap them. In a fight, <b>Swap rows</b> costs a <b>bonus action</b>.</p>
  <h3>Conditions (hold an icon for details)</h3>
  <p>🤢 <b>Poisoned</b>: disadvantage on attacks · 🙇 <b>Prone</b>: melee hits it with advantage, ranged with disadvantage · 😱 <b>Frightened</b>: disadvantage on attacks · 🕸️ <b>Restrained</b>: disadvantage on attacks and Dex saves, attacks against it have advantage · ✊ <b>Grappled</b>: cannot flee · 🔒 <b>Paralyzed</b> and 💤 <b>Unconscious</b>: cannot act, melee hits are critical · 😵 <b>Rattled</b>: disadvantage on the next attack. Green-rimmed icons are good effects (🙏 Blessed, 🛡️ Dodging, 😡 Raging, 🌫️ Hidden…).</p>
  <h3>Weaknesses and resistances</h3>
  <p>Damage types have icons (🔥 fire, ❄️ cold, ⚡ lightning, 🔊 thunder, ☠️ poison, 🧪 acid, 💀 necrotic, ✨ radiant, 🧠 psychic, 💥 force, and 🔨 🗡️ ⚔️ for bludgeoning, piercing and slashing). A monster that is <b>weak</b> (<b>×2</b>) takes double damage, one that <b>resists</b> (<b>½</b>) takes half, and an <b>immune</b> one (<b>✕</b>) takes none. A <b>❔</b> on a monster means it still hides something. You <b>discover</b> a trait the first time you hit it with that damage type, or all at once with the <b>Study</b> bonus action, a Knowledge check (Arcana, Nature, Religion or History, by creature type) against a DC of 10 plus its challenge. What you learn is remembered for every future fight with that kind of monster.</p>
  <p>There is only one layer of defense: <b>Armor Class (AC)</b>. Attacks must roll at least a target's AC to hit; no extra armor or damage reduction on top.</p>
  <h3>Open sky</h3>
  <p>On <b>B3</b> part of the cavern roof has fallen in: the <b>Sunken Orchard</b>. It is the same grid — the same automap (shown <b>green</b>), secrets, patrols, events and fights — but with sky, trees, rocks and cliffs for walls, ruined arches and grass underfoot. Light <b>rain</b> or <b>mist</b> falls there, and the sky follows the time of day (<b>🌅 dawn · ☀️ day · 🌇 dusk · 🌙 night</b>); one day passes every 360 steps. Your torch matters less in daylight and more at night. Fights outdoors still happen in the arena.</p>
  <p>Companions can be AI- or player-controlled — tap the <b>AI/YOU</b> toggle on their card. Level up at the Training Grounds in town, or with Level Up in the Camp menu.</p>` })]);
}
function showCredits() {
  openModal([h('h2', {}, 'Credits'), h('div', { html: `<p>Rules content from the <b>System Reference Document 5.1</b> by Wizards of the Coast LLC, licensed under <a style="color:#22e6ff" href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">CC-BY-4.0</a>. Blackspire is unofficial Fan Content and is not affiliated with Wizards of the Coast.</p>
  <p>3D monster, chest and torch models by <b>Quaternius</b> (quaternius.com), CC0 1.0 — via the Easy Enemy, Animated Dinosaur, Ultimate Animated Animal, Platformer Game Kit, Cyberpunk Game Kit and Modular Dungeon packs.</p>
  <p>Spoken dialogue and battle sound effects by <a style="color:#22e6ff" href="https://elevenlabs.io" target="_blank" rel="noopener">elevenlabs.io</a>.</p>
  <p><b>Music</b> by Kevin MacLeod (<a style="color:#22e6ff" href="https://incompetech.com" target="_blank" rel="noopener">incompetech.com</a>), licensed under <a style="color:#22e6ff" href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>:</p>
  <ul style="text-align:left;font-size:0.92em;line-height:1.45;max-height:40vh;overflow:auto">
    <li>Title — <i>Darkest Child</i></li>
    <li>Town — <i>Midnight Tale</i></li>
    <li>B1 Rat-Warrens — <i>Spider Eyes</i></li>
    <li>B2 Drowned Grotto — <i>Water Prelude</i></li>
    <li>B3 Glimmerdeep — <i>Floating Cities</i></li>
    <li>B4 Ashforge — <i>Industrial Cinematic</i></li>
    <li>B5 The Blackspire — <i>Halls of the Undead</i></li>
    <li>Battle — <i>Death and Axes</i></li>
    <li>Boss — <i>Final Battle of the Dark Wizards</i></li>
    <li>Ending — <i>Despair and Triumph</i></li>
  </ul>
  <p>Ambience and sound effects are original WebAudio. Full license text in CREDITS.md.</p>
  <p>Built with three.js (MIT), Vite (MIT) and Capacitor (MIT). Game code MIT.</p>` })]);
}
function showCreate(asRecruit = false) {
  const recruit = asRecruit === true;
  let race = 'human', cls = 'fighter', base = assignByPriority('fighter'), name = recruit ? 'Recruit' : 'Ser Aldric', method = 'array', diff = 'normal', randomDun = false, pic = null, voicePack = recruit ? PACKS[1].id : DEFAULT_PACK;
  const draw = () => {
    const p = openModal([], { closable: true });
    const R_ = RACES[race], C = CLASSES[cls];
    const final = {}; for (const a of ABILITIES) final[a] = base[a] + (R_.bonus[a] || 0);
    p.append(h('h2', {}, recruit ? 'Create a New Recruit' : 'Create Your Adventurer'), recruit ? h('p', { class: 'hint' }, `Recruits join at level ${G.partyLevel(S)} (near your party). If the party is full they wait in the Tavern roster.`) : '',
      h('div', { class: 'cols' },
        h('div', {}, h('h3', {}, 'Name'), h('input', { id: 'cname', value: name, maxlength: 18, oninput: (e) => { name = e.target.value; } }),
          h('h3', {}, 'Portrait'), portraitGrid(pic, (i) => { pic = i; draw(); }),
          h('h3', {}, 'Voice'), voiceGrid(voicePack, (id) => { voicePack = id; draw(); }),
          h('h3', {}, 'Race'), h('select', { id: 'crace', onchange: (e) => { race = e.target.value; draw(); } }, Object.entries(RACES).map(([k, r]) => h('option', { value: k, selected: k === race }, r.name))),
          h('p', { class: 'hint' }, `+${Object.entries(R_.bonus).map(([a, v]) => `${v} ${a.toUpperCase()}`).join(', +')} · Speed ${R_.speed} · ${R_.traits.join(', ')}`),
          h('h3', {}, 'Class'), h('select', { id: 'ccls', onchange: (e) => { cls = e.target.value; base = method === 'array' ? assignByPriority(cls) : assignByPriority(cls, Object.values(base)); draw(); } }, Object.entries(CLASSES).map(([k, c]) => h('option', { value: k, selected: k === cls }, `${c.name} (${c.sub})`))),
          h('p', { class: 'hint' }, `Hit Die d${C.hitDie} · Saves ${C.saves.join('/').toUpperCase()} · Armor: ${C.armor.join(', ') || 'none'} · Features: ${C.features[1].join(', ')}`)),
        h('div', {}, h('h3', {}, 'Ability Scores (incl. racial bonuses)'),
          h('div', { class: 'abil' }, ABILITIES.map((a) => h('div', {}, h('small', {}, a.toUpperCase()), h('b', {}, final[a]), h('small', {}, fmtMod(mod(final[a])))))),
          h('div', { class: 'row', style: 'margin-top:8px' },
            btn('Standard Array', () => { method = 'array'; base = assignByPriority(cls, STANDARD_ARRAY); draw(); }),
            btn('🎲 Roll 4d6 (drop lowest)', () => { method = 'roll'; base = assignByPriority(cls, ABILITIES.map(() => roll4d6())); sfx('dice'); draw(); }, { id: 'btn-roll' })),
          h('p', { class: 'hint' }, 'Scores are placed into your class\'s key abilities automatically.'),
          recruit ? null : h('h3', {}, 'Difficulty'),
          recruit ? null : h('select', { id: 'cdiff', onchange: (e) => { diff = e.target.value; } }, Object.keys(DIFFICULTY).map((k) => h('option', { value: k, selected: k === diff }, DIFF_LABEL[k]))),
          recruit ? null : h('p', { class: 'hint' }, 'Changes monster HP and damage. You can change it any time in ☰ Menu → Settings.'),
          recruit ? null : h('label', { class: 'switch row', for: 'crandom' }, h('input', { type: 'checkbox', id: 'crandom', role: 'switch', checked: randomDun, onchange: (e) => { randomDun = e.target.checked; } }), h('span', { class: 'slider' }), h('b', {}, ' 🎲 Random dungeons')),
          recruit ? null : h('p', { class: 'hint' }, 'Off: the classic hand-tuned layouts. On: every floor is freshly generated for this game (saved with it), always with reachable stairs, keys, bosses and quest spots.'),
          recruit ? null : h('h3', {}, 'Your Companions'),
          ...(recruit ? [] : COMPANION_KEYS.map((k) => COMPANIONS[k])).map((c) => h('p', { class: 'hint' }, h('b', { style: `color:${c.color}` }, c.name + ' — '), c.blurb)))),
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, recruit ? btn('Recruit ▶', () => { const ev = G.createRecruit(S, { name, race, cls, base, portrait: pic, voicePack }); handle(ev); autosave(); spellStep(ev.char, 'create', null, () => { autosave(); showTown(townSub); }); }, { class: 'primary', id: 'btn-recruit-create' }) : btn('Begin Adventure ▶', () => {
        S = G.newGame({ name: (name || 'Hero').trim().slice(0, 18), race, cls, base, randomDungeons: randomDun, portrait: pic, voicePack }); S.difficulty = diff;
        log(`Welcome to Emberhollow, ${name}. Three oddballs have agreed to join you…`, 'sys');
        for (const c of S.party.filter((c) => c.companion)) say({ who: COMPANIONS[c.companion].short, color: COMPANIONS[c.companion].color, text: COMPANIONS[c.companion].lines.combatStart[0] });
        spellStep(G.heroOf(S), 'create', null, () => runPrologue());
      }, { class: 'primary', id: 'btn-begin' })));
  };
  draw();
}

/* ---------- Town ---------- */
let townSub = null; let townVisited = false;
const TOWN_TITLES = { tavern: '🍺 Tavern', temple: '⛪ Temple', shop: '⚒ Trading Post', train: '🎯 Training Grounds', edge: '🕳 Edge of Town' };
let tavernTab = 'party', shopTab = 'potions';
function showTown(sub = null) {
  townSub = sub; const arriving = S.mode !== 'town' || !townVisited; townVisited = true;
  S.mode = 'town'; combat = null; endCombatUI(); setControls(null); R.setMode('combat'); R.clearMonsters(); refresh();
  if (arriving) autosave(); // autosave on every town entry
  const back = (where) => btn('← Town', () => showTown(), { class: 'backbtn', 'data-back': where, 'aria-label': 'Back to Town Square', title: 'Back to Town Square' });
  // every location: a sticky bar (title, Back, optional tabs) over the page; locations without tabs keep a second Back under the content
  const P = (content, { tabs = null } = {}) => openModal([h('div', { class: 'navbar' }, h('h2', {}, sub ? TOWN_TITLES[sub] : 'Emberhollow'), sub ? back('top') : null, tabs), content, sub && !tabs ? h('div', { style: 'margin-top:10px' }, back('bottom')) : null], { closable: false, cls: 'transparent' });
  if (!sub) {
    // most-used first: the maze, then the places you visit, then story pages, then game (save/load) controls
    P(h('div', { class: 'townsq' },
      btn('🕳 Edge of Town — Enter the Maze', () => showTown('edge'), { id: 'btn-edge', class: 'primary bigtown' }),
      h('div', { class: 'menu grid2' },
        btn('🍺 The Boar & Spoon Tavern', () => { tavernTab = 'party'; showTown('tavern'); }, { id: 'btn-tavern' }),
        btn(S.flags?.freeInn ? '🛏 Inn (long rest, free)' : '🛏 Inn (long rest, 10 gp)', () => { handle(G.innRest(S)); say(banter(S.party, 'rest', {}, 1)); }),
        btn('⛪ Temple of Cant', () => showTown('temple')),
        btn('⚒ Fizzbang\'s Trading Post', () => { shopTab = 'potions'; showTown('shop'); }, { id: 'btn-shop' }),
        btn('🎯 Training Grounds', () => showTown('train'), { id: 'btn-train' }),
        btn('🗣 Town Folk (quests)', () => showTownFolk(), { id: 'btn-folk' }),
        btn('📖 Journal', () => showJournal(() => showTown(), 'quests'), { id: 'btn-journal' })),
      h('div', { class: 'menu row3' },
        btn('💾 Save', () => { autosave(); log('Game saved.', 'sys'); }, { id: 'btn-town-save', 'aria-label': 'Save Game' }),
        btn('📂 Load', () => loadGame(), { id: 'btn-town-load', 'aria-label': 'Load Game' }),
        btn('⏏ Title', () => { closeModal(); showTitle(); }, { id: 'btn-town-title', 'aria-label': 'Title Screen' }))));
    handle(G.Narr.townIntro(S, null)); handle(G.PC.townArrive(S)); // Phase C: a companion remark, and what the town remembers
    return;
  }
  if (sub === 'tavern') {
    // four short pages instead of one long scroll: your party / who is waiting / who is for hire / the bar
    const redraw = () => showTown('tavern');
    const tabs = [['party', '👥 Party'], ['roster', '📋 Roster', S.roster.length || null], ['hire', '🤝 Hire'], ['bar', '🗣 Bar', G.PC.pendingMoment(S) != null ? '!' : null]];
    if (!tabs.some((t) => t[0] === tavernTab)) tavernTab = 'party';
    const pages = {
      party: () => [partyOrderList(redraw), btn('🧠 Companion Tactics', () => showTactics(null, redraw), { id: 'btn-tavern-tactics', class: 'bigtab' })],
      roster: () => [h('h3', {}, `Waiting at the bar (party ${S.party.length}/4)`),
        S.roster.length ? h('div', { class: 'menu', id: 'roster' }, S.roster.map((c) => h('div', { class: 'row rosterrow' }, portrait(c), h('span', { style: 'flex:1' }, `${c.name} — L${c.level} ${CLASSES[c.cls].name}${c.dead ? ' (DEAD — raise at the Temple)' : ''}`),
          btn('Join party', () => { handle(G.rejoin(S, c)); autosave(); redraw(); }, { class: 'small', disabled: S.party.length >= 4 })))) : h('p', { class: 'hint' }, 'Nobody is waiting. Dismissed members stay here, so you can bring them back (or raise them at the Temple) later.')],
      hire: () => [btn('✍ Create a new recruit (full creator)', () => showCreate(true), { id: 'btn-new-recruit', class: 'bigtab' }),
        h('h3', {}, `Adventurers for hire (join at level ${G.partyLevel(S)})`),
        h('div', { class: 'menu', id: 'hire' }, G.availableCompanions(S).map((k) => { const C = COMPANIONS[k]; return h('div', { class: 'hirecard' }, Number.isInteger(C.portrait) ? h('img', { class: 'hirepic', src: portraitURL(C.portrait), alt: `${C.name} portrait` }) : null, h('p', {}, h('b', { style: `color:${C.color}` }, `${C.name} — ${RACES[C.race].name} ${CLASSES[C.cls].name}: `), C.blurb),
          btn(`Recruit ${C.short}${S.party.length >= 4 ? ' (to roster)' : ''}`, async () => { handle(G.recruitCompanion(S, k)); autosave(); if (k === 'liora') { G.PC.ensure(S); S.flags.lioraMet = true; await showDialogue(G.PC.lioraIntro(S), { closable: true }); } redraw(); }, { class: 'small', 'data-recruit': k })); }))],
      bar: () => [btn(G.PC.pendingMoment(S) != null ? '💬 Talk with Liora' : '🗣 Listen in', () => campTalk(redraw), { id: 'btn-listen', class: 'bigtab' }),
        h('h3', {}, 'Chatter at the bar'), ...S.party.filter((c) => c.companion).map((c) => h('p', {}, h('b', { style: `color:${COMPANIONS[c.companion].color}` }, c.name + ': '), COMPANIONS[c.companion].blurb))],
    };
    P(h('div', { class: 'tabpage', 'data-page': tavernTab }, pages[tavernTab]()), { tabs: tabBar(tabs, tavernTab, (id) => { tavernTab = id; redraw(); }) });
  } else if (sub === 'temple') {
    const need = (c) => (G.templeCost(c) ? 0 : 1); // those who need help first
    P([h('h3', {}, 'Temple of Cant — "Healing by donation (mandatory)"'), h('div', { class: 'menu' }, [...S.party, ...S.roster].map((c, i) => [c, i]).sort((x, y) => need(x[0]) - need(y[0]) || x[1] - y[1]).map(([c]) => { const cost = G.templeCost(c); return btn(`${c.name}: ${c.dead ? 'Raise Dead' : c.conditions.poisoned ? 'Cure poison' : c.hp < c.maxHp ? 'Heal wounds' : 'Healthy'} ${cost ? `(${cost} gp)` : ''}`, () => { handle(G.templeHeal(S, c)); showTown('temple'); }, { disabled: !cost }); }))]);
  } else if (sub === 'shop') {
    // short pages: potions / weapons / armor / sell & equip (the stock is over thirty items)
    const redraw = () => showTown('shop');
    const stock = (pred) => SHOP_STOCK.filter(pred);
    const kindOf = (k) => (k.startsWith('w:') ? 'weapons' : k.startsWith('a:') || k === 'shield' ? 'armor' : 'potions');
    const list = (kind) => h('div', { class: 'menu grid2 shopgrid' }, stock((k) => kindOf(k) === kind).map((k) => btn([h('b', { class: 'bt' }, G.nameOf(k)), h('small', { class: 'bs' }, `${G.priceOf(k)} gp`)], () => { handle(G.buy(S, k)); redraw(); }, { disabled: S.gold < G.priceOf(k), class: 'bigbtn shopitem', 'data-buy': k })));
    const tabs = [['potions', '🧪 Potions'], ['weapons', '⚔ Weapons'], ['armor', '🛡 Armor'], ['sell', '💰 Sell & Equip']];
    if (!tabs.some((t) => t[0] === shopTab)) shopTab = 'potions';
    const page = shopTab === 'sell' ? [h('h3', {}, 'Sell / Equip — selling pays half price'), inventoryList(redraw, true)] : [list(shopTab)];
    P([h('p', { class: 'goldline' }, `💰 You have ${S.gold} gp`), h('div', { class: 'tabpage', 'data-page': shopTab }, page)], { tabs: tabBar(tabs, shopTab, (id) => { shopTab = id; redraw(); }) });
  } else if (sub === 'train') {
    P([h('div', { class: 'menu trainlist' }, S.party.map((c) => h('div', { class: 'row trainrow' },
      btn(canLevelUp(c) ? `⬆ Train ${c.name} to level ${c.level + 1}` : `${c.name} — L${c.level} (${c.xp}/${xpForNext(c) === Infinity ? 'max' : xpForNext(c)} XP)`, () => trainWithSpells(c, () => showTown('train')), { disabled: !canLevelUp(c), class: canLevelUp(c) ? 'levelup trainmain' : 'trainmain' }),
      SC.preparedMax(c) ? btn('📖 Prepare', () => showSpellPicker(c, 'prepare', null, () => showTown('train')), { class: 'small', 'data-prepare': c.id }) : null,
      (c.companion || c.recruit) ? btn('Re-class', () => reclassMenu(c), { class: 'small' }) : null,
      btn('Sheet', () => showSheet(c), { class: 'small' })))),
      btn('✍ Create a new recruit', () => showCreate(true), { id: 'btn-train-recruit', class: 'bigtab' }),
      h('p', { class: 'hint' }, 'Re-class: retrain a companion or recruit into any of the 12 classes at the same level (50 gp per level).')]);
  } else if (sub === 'edge') {
    P([h('p', { class: 'hint' }, 'The maze entrance yawns before you. The dwarven mine lift can take you to any level you have already reached.'),
      h('div', { class: 'menu' }, btn('Descend the stairs to B1', () => enter(0), { class: 'primary', id: 'btn-enter' }),
        ...LEVEL_DEFS.map((_, l) => l).filter((l) => l > 0 && l <= S.maxDepth).map((l) => btn(`Mine lift to ${LEVEL_DEFS[l].name}`, () => enter(l))))]);
  }
  if (sub) handle(G.Narr.townIntro(S, sub));
  // the narration echo scrolls the panel to its foot: a location always opens at its top (title, Back, tabs)
  const pn = modal.querySelector('.panel'); if (pn) { pn.scrollTop = 0; requestAnimationFrame(() => { pn.scrollTop = 0; }); }
}
function enter(l) { closeModal(); const ev = G.enterDungeon(S, l); if (ev.some((e) => e.paywall)) { prompt('paywall', { then: () => enter(l) }); return; } handle(ev); startDungeon(); say(banter(S.party, 'stairs', {}, 1)); autosave(); }
async function startDungeon() {
  R.setMode('dungeon'); setControls('dungeon'); await rebuild(); R.setView(S.x, S.y, S.dir, true); refresh();
}
let lastBuiltLevel = -1;
async function rebuild() { if (!S || S.mode !== 'dungeon') return; await R.buildLevel(S, (x, y) => G.tile(S, x, y), getLevel(S.level).def, outReg()); lastBuiltLevel = S.level; syncWorld(); }
function partyOrderList(redraw) {
  return h('div', { class: 'menu partylist' }, formationBoard(redraw), S.party.map((c, i) => h('div', { class: 'row partyrow' }, portrait(c), h('span', { class: 'pname' }, h('b', {}, `${i + 1}. ${c.name}`), h('small', {}, ` ${CLASSES[c.cls].name} · ${i < 2 ? 'front' : 'back'} row`)),
    btn('▲', () => { if (i > 0) { [S.party[i - 1], S.party[i]] = [S.party[i], S.party[i - 1]]; redraw(); refresh(); } }, { class: 'small', disabled: i === 0, 'aria-label': `Move ${c.name} up` }),
    btn('▼', () => { if (i < S.party.length - 1) { [S.party[i + 1], S.party[i]] = [S.party[i], S.party[i + 1]]; redraw(); refresh(); } }, { class: 'small', disabled: i === S.party.length - 1, 'aria-label': `Move ${c.name} down` }),
    !G.isHero(c) ? btn(c.ai ? 'AI' : 'YOU', () => { c.ai = !c.ai; redraw(); refresh(); }, { class: 'small aitog ' + (c.ai ? 'on' : '') }) : null,
    !G.isHero(c) ? btn('Dismiss', () => { handle(G.dismiss(S, c)); autosave(); redraw(); }, { class: 'small dismiss', title: 'Send to the Tavern roster' }) : null)));
}

/* ---------- Prompts in the dungeon ---------- */
/** A branching story event: portrait + text + 2-3 choices (plus Not now, which keeps it for later); then a result card. */
function showEvent(card) {
  const sp = { img: card.portrait, icon: card.icon, name: card.who, color: card.color };
  const later = () => { G.deferEvent(S, card.id); closeModal(); refresh(); };
  sfx('chime');
  openModal([h('div', { class: 'evcard', 'data-event': card.id },
    h('h2', {}, card.title),
    h('div', { class: 'dlgrow' }, speakerPortrait(sp), h('div', { class: 'dlgtext' }, h('b', { style: `color:${card.color}` }, card.who), h('p', { class: 'lore' }, card.text))),
    h('div', { class: 'menu' }, ...card.choices.map((c) => btn(`${c.label}${c.check ? `  [${c.check}]` : ''}${c.note ? `  (${c.note})` : ''}`, () => { stopVoice(); heroSpeak(c.label); resolveEvent(card, c); }, { class: 'primary', 'data-choice': c.id })),
      btn('Not now (it will wait)', later, { id: 'ev-later', class: 'small' })))], { closable: false });
  playVoiceLine(card.text, 'narrator', { kind: 'dialog' });
}
function resolveEvent(card, c) {
  const r = G.chooseEvent(S, card.id, c.id); autosave();
  sfx(r.result.fx.some((f) => f.cls === 'bad') ? 'hurt' : 'victory');
  openModal([h('div', { class: 'evcard', 'data-event-result': card.id },
    h('h2', {}, card.title), r.result.roll ? h('p', { class: 'hint' }, r.result.roll) : null,
    h('p', { class: 'lore evres' }, r.result.text),
    h('div', { class: 'fxlist' }, r.result.fx.map((f) => h('div', { class: `fx ${f.cls}` }, f.t))),
    h('div', { class: 'menu' }, btn('Continue ▶', () => { closeModal(); handle(r.events); rebuild(); }, { class: 'primary', id: 'ev-continue' })))], { closable: false });
  playVoiceLine(r.result.text, 'narrator', { kind: 'dialog', queue: true, maxWait: 9000 }); // after the hero's spoken reply, if any
}
function prompt(kind, e = {}) {
  if (kind === 'tt') { runTT(e.scene, { poi: e.poi }); return; }
  if (kind === 'poi') {
    openModal([h('h2', {}, e.title), h('p', { class: 'lore' }, e.text), h('div', { class: 'menu' }, e.choices.map((c) => btn(c.label, () => {
      closeModal(); const ev = Story.choosePoi(S, e.poi, c.id, (sk, dc) => G.partyCheck(S, sk, dc));
      if (ev.consumed) G.setTile(S, S.x, S.y, '.'); handle(ev); rebuild();
    })))], { closable: false });
    playVoiceLine(e.text, 'narrator', { kind: 'dialog' });
    return;
  }
  if (kind === 'paywall') {
    const go = async () => { if (e.then) return e.then(); handle(G.goDown(S)); await startDungeon(); autosave(); };
    if (e.cliffhanger) playVoiceLine('Torchlight gutters on the stair below. Something vast breathes in the dark, and it says your names. Skarn was only the doorman.', 'narrator', { kind: 'dialog' });
    openModal([h('h2', {}, e.cliffhanger ? 'The Stairs Go Deeper…' : 'The Way Is Sealed'),
      h('p', { class: 'lore' }, e.cliffhanger ? 'Torchlight gutters on the stair below. Something vast breathes in the dark, and it says your names. Skarn was only the doorman.' : 'The deeper levels of the Blackspire are part of the full game.'),
      h('div', { class: 'paywall' }, h('h3', {}, ENT.PRODUCT.title), h('p', {}, ENT.PRODUCT.blurb), h('p', { class: 'price' }, `${ENT.PRODUCT.price} — no real purchase yet`)),
      h('div', { class: 'menu' },
        btn('🔓 Unlock (placeholder)', async () => { ENT.purchase(); closeModal(); log('Full game unlocked (placeholder purchase).', 'sys'); await go(); }, { id: 'btn-unlock', class: 'primary' }),
        btn('♻ Restore Purchases', async () => { if (ENT.restore()) { closeModal(); log('Purchases restored.', 'sys'); await go(); } else toast('No purchase found on this device'); }, { id: 'btn-restore' }),
        btn('Not now', closeModal, { id: 'btn-notnow' }))], { closable: false });
    return;
  }
  if (kind === 'event') { showEvent(e.event); return; }
  if (kind === 'chest') {
    openModal([h('h2', {}, 'A Treasure Chest'), h('p', { class: 'hint' }, 'It might be trapped. A rogue is best at inspecting and disarming.'),
      h('div', { class: 'menu' }, btn('🔎 Inspect (Investigation)', () => chestStep(G.inspectChest)), btn('🗝 Disarm (Thieves\' Tools)', () => chestStep(G.disarmChest)),
        btn('📦 Open it', () => chestStep(G.openChest), { class: 'primary' }), btn('Leave it', () => { chestNotes = []; closeModal(); }))]);
  } else if (kind === 'down') {
    openModal([h('h2', {}, 'Stairs Down'), h('div', { class: 'menu' }, btn('Descend ▼', async () => { closeModal(); handle(G.goDown(S)); await startDungeon(); autosave(); }, { class: 'primary' }), btn('Not yet', closeModal))]);
  } else if (kind === 'up') {
    openModal([h('h2', {}, S.level === 0 ? 'Stairs to Town' : 'Stairs Up'), h('div', { class: 'menu' }, btn(S.level === 0 ? 'Return to Emberhollow ▲' : 'Climb ▲', async () => { closeModal(); const ev = G.goUp(S); if (S.mode === 'town') { handle(ev); } else { handle(ev); await startDungeon(); autosave(); } }, { class: 'primary' }), btn('Stay', closeModal))]);
  } else if (kind === 'lock') {
    openModal([h('h2', {}, 'A Locked Door'), h('div', { class: 'menu' }, btn('🗝 Pick the lock', () => { closeModal(); handle(G.pickLock(S)); }), btn('💪 Force it (Athletics, noisy)', () => { closeModal(); handle(G.pickLock(S, true)); }), btn('Leave', closeModal))]);
  } else if (kind === 'altar') {
    if (!S.victory) { log('The amulet is sealed while the Tyrant lives.', 'dim'); return; }
    if (!S.flags.ending) { S.flags.ending = true; autosave(); playMusic('ending'); showDialogue(Story.endingScene(S)).then(() => prompt('altar')); return; }
    sfx('victory');
    playVoiceLine('The Blackspire is dark. Princess Elowen is home, and Emberhollow is free. Arise, Knight of the Dawn.', 'narrator', { kind: 'dialog' });
    playVoiceLine('Somewhere far below, a sixth seal stirs. And Malthrax\'s staff was never found…', 'narrator', { kind: 'dialog', queue: true, maxWait: 30000 });
    openModal([h('h1', {}, 'VICTORY!'), h('p', {}, 'The Blackspire is dark. Princess Elowen is home, and Emberhollow is free. Arise, Knight of the Dawn.'),
      h('p', { class: 'lore' }, 'Somewhere far below, a sixth seal stirs. And Malthrax\'s staff was never found…'),
      h('p', { class: 'hint' }, `Steps taken: ${S.steps} · Party levels: ${S.party.map((c) => c.level).join('/')}`),
      h('div', { class: 'menu' }, btn('Return to town as heroes', () => { S.mode = 'town'; closeModal(); showTown(); }), btn('Keep exploring', closeModal))]);
  }
}
document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'f' && S?.mode === 'dungeon' && G.lockAt(S) && modal.classList.contains('hidden')) { /* handled by search */ } });

/* ---------- Camp healing: caster → spell + slot level → target (or a potion → target) ---------- */
let healSel = null;
function campHealSection() {
  const hurtOnes = S.party.filter(G.hurt), sel = healSel || {};
  const casters = S.party.filter((c) => !c.dead && knownSpells(c).some((k) => G.CAMP_HEALS.includes(k)));
  const potions = S.inventory.filter((x) => x === 'potionHealing').length;
  const back = btn('← Back', () => { healSel = null; showCamp(); }, { class: 'small' });
  const done = (r) => { healSel = null; handle(r.ev); showCamp(); if (r.card) queueMessage(r.card); refresh(); autosave(); };
  const hp = (t) => t.hp <= 0 ? `DOWN 0/${t.maxHp}` : `HP ${t.hp}/${t.maxHp}`;
  if (sel.k || sel.potion) {
    const targets = sel.potion ? hurtOnes : G.campTargetsFor(S, sel.k);
    const what = sel.potion ? 'Potion of Healing' : `${SPELLS[sel.k].name} (level ${sel.lvl})`;
    if (!sel.potion && SPELLS[sel.k].target === 'allAllies') return h('div', { class: 'menu' }, h('p', { class: 'hint' }, `${sel.c.name}: ${what} heals the whole party.`), btn(`✨ Cast ${what}`, () => done(G.campHeal(S, sel.c, sel.k, sel.lvl)), { class: 'primary', 'data-heal-cast': '1' }), back);
    return h('div', { class: 'menu' }, h('p', { class: 'hint' }, `${sel.potion ? 'Give' : sel.c.name + ' casts'} ${what} on…`),
      ...targets.map((t) => btn(`${t.name} — ${hp(t)}`, () => done(sel.potion ? G.campPotion(S, t) : G.campHeal(S, sel.c, sel.k, sel.lvl, t)), { 'data-heal-target': t.id })),
      targets.length ? null : h('p', { class: 'hint' }, 'Nobody needs that.'), back);
  }
  if (sel.c) {
    const opts = G.campHealOptions(sel.c);
    return h('div', { class: 'menu' }, h('p', { class: 'hint' }, `${sel.c.name}: choose a spell and slot level (higher slots heal more).`),
      ...opts.flatMap((o) => o.levels.map((l) => { const need = G.campTargetsFor(S, o.k).length; return btn(`${o.s.name} · level ${l} slot${l > o.s.level ? ' (upcast)' : ''}${need ? '' : ' — nobody needs it'}`, () => { healSel = { ...sel, k: o.k, lvl: l }; showCamp(); }, { disabled: !need, 'data-heal-spell': `${o.k}:${l}` }); })), back);
  }
  const rows = [];
  if (!hurtOnes.length && !S.party.some((c) => !c.dead && ['poisoned', 'paralyzed', 'blinded'].some((k) => c.conditions[k]))) rows.push(h('p', { class: 'hint', id: 'heal-none' }, 'Nobody is hurt. Everyone is at full health.'));
  for (const c of casters) {
    const opts = G.campHealOptions(c), why = c.dead ? 'dead' : isDown(c) ? 'unconscious' : !opts.length ? 'no spell slots left' : !hurtOnes.length && !opts.some((o) => G.campTargetsFor(S, o.k).length) ? 'nobody is hurt' : '';
    rows.push(btn(`✨ ${c.name} casts…${why ? ` (${why})` : ''}`, () => { healSel = { c }; showCamp(); }, { disabled: !!why, 'data-heal-caster': c.id }));
  }
  if (!casters.length) rows.push(h('p', { class: 'hint' }, 'Nobody in the party knows a healing spell.'));
  rows.push(btn(`🧪 Use a Potion of Healing (${potions} left)${!potions ? ' — none left' : !hurtOnes.length ? ' — nobody is hurt' : ''}`, () => { healSel = { potion: true }; showCamp(); }, { disabled: !potions || !hurtOnes.length, 'data-heal-potion': '1' }));
  rows.push(h('p', { class: 'hint' }, 'Healing a downed ally (0 HP) gets them back up. The dead need the Temple.'));
  return h('div', { class: 'menu' }, ...rows);
}
/* ---------- Camp ---------- */
// Four short pages instead of one long scroll: Rest (the everyday actions + level-ups + save/load), Heal, Spells, Party.
let campTab = 'rest';
function showCamp(tab) {
  if (typeof tab === 'string') { campTab = tab; healSel = null; } else setTimeout(() => packBarkAny('camp'), 700); // opening camp: someone remarks (rate limited)
  const tabs = [['rest', '⛺ Rest'], ['heal', '✚ Heal', S.party.filter(G.hurt).length || null], ['spells', '📖 Spells'], ['party', '👥 Party']];
  const go = (id) => { healSel = null; showCamp(id); };
  const pages = {
    rest: () => {
      const ready = S.party.filter((c) => canLevelUp(c));
      return [
        ready.length ? h('div', { class: 'menu levelups' }, h('h3', { id: 'camp-levelup' }, '⬆ Level Up'), ready.map((c) => btn(`⬆ Level up ${c.name} to level ${c.level + 1}`, () => trainWithSpells(c, showCamp), { class: 'levelup', 'data-levelup': c.id }))) : null,
        h('div', { class: 'menu grid2 restgrid' },
          bigBtn('☕ Short Rest', '1 hr: hit dice, 2nd wind, arcane recovery', () => { closeModal(); handle(G.rest(S, 'short')); }, { id: 'btn-short-rest' }),
          bigBtn('🌙 Long Rest', '8 hrs, full recovery, risky', () => { closeModal(); handle(G.rest(S, 'long')); }, { id: 'btn-long-rest' }),
          bigBtn(G.PC.pendingMoment(S) != null ? '💬 Talk with Liora' : '🗣 Talk', G.PC.pendingMoment(S) != null ? 'she has something to say' : 'with your companions', () => campTalk(showCamp), { id: 'btn-talk' }),
          bigBtn('✨ Mage Armor', 'cast on the wizard', () => { const w = S.party.find((c) => c.cls === 'wizard' && !c.equip.armor && !c.dead && c.slots[0] > 0 && knownSpells(c).includes('mageArmor')); if (!w) { log('No wizard with a free slot and Mage Armor prepared needs it.', 'dim'); return; } w.slots[0]--; w.conditions.mageArmor = true; log(`${w.name} casts Mage Armor (AC ${armorClass(w)}).`, 'spell'); refresh(); }, { id: 'btn-mage-armor' })),
        h('div', { class: 'menu row3 saverow' }, btn('💾 Save', () => { autosave(); log('Game saved.', 'sys'); }, { id: 'btn-camp-save' }), btn('📂 Load', () => loadGame(), { id: 'btn-camp-load' }))];
    },
    heal: () => [h('div', { id: 'camp-heal' }, campHealSection())],
    spells: () => { const preps = S.party.filter((c) => !c.dead && SC.preparedMax(c)); return [h('div', { id: 'camp-prepare' }, preps.length
      ? h('div', { class: 'menu' }, preps.map((c) => btn(`📖 ${c.name} — ${SC.casterType(c.cls) === 'book' ? 'from spellbook' : 'from the ' + CLASSES[c.cls].name + ' list'} (${SC.preparedMax(c)} prepared)`, () => showSpellPicker(c, 'prepare', null, showCamp), { 'data-prepare': c.id })))
      : h('p', { class: 'hint' }, 'Nobody in the party prepares spells.'))]; },
    party: () => [btn('🧠 Companion Tactics', () => showTactics(null, showCamp), { id: 'btn-camp-tactics', class: 'bigtab' }), partyOrderList(showCamp)],
  };
  openModal(h('div', { class: 'tabpage', 'data-page': campTab }, pages[campTab]()), { title: '⛺ Camp', tabs: tabBar(tabs, campTab, go) });
}

/* ---------- Spell selection (SRD) ---------- */
function trainWithSpells(c, back) {
  const prev = SC.snapshot(c), lv = c.level; const ev = G.train(S, c); autosave(); if (c.level > lv) { sfx('levelup'); packBark(c, 'levelUp'); }
  const picks = c.level > lv && CLASSES[c.cls].caster && !c.ai && SC.hasChoices(c, 'levelup', prev);
  if (picks) { handle(ev); showSpellPicker(c, 'levelup', prev, () => { autosave(); back(); }); } else { back(); handle(ev); }
}
/** Player-controlled casters get the picker; AI companions keep their auto-picks. */
function spellStep(c, mode, prev, next) {
  if (!c || !CLASSES[c.cls].caster || (c.ai && mode !== 'prepare') || !SC.hasChoices(c, mode, prev)) { next(); return; }
  showSpellPicker(c, mode, prev, next);
}
function showSpellPicker(c, mode, prev, done) {
  const secs = SC.pickerSections(c, mode, prev);
  const rec = SC.recommendSections(c, SC.pickerSections(c, mode, prev), mode, prev);
  const recSet = new Set(rec.flatMap((s) => s.sel));
  if (mode === 'create') SC.recommendSections(c, secs, mode, prev);
  const title = { create: `Choose spells — ${c.name}`, levelup: `New spells — ${c.name} (level ${c.level})`, prepare: `Prepare spells — ${c.name}` }[mode];
  const help = { create: 'Pick your starting spells.', levelup: 'Pick new spells. Spells-known casters may also swap out one old spell.', prepare: 'Choose which spells are ready to cast. You can change this at camp or the Training Grounds.' }[mode];
  const draw = () => {
    const body = h('div', { class: 'spellpick' });
    for (const s of secs) {
      const pool = SC.sectionPool(c, secs, s), need = SC.sectionNeed(c, secs, s);
      s.sel = s.sel.filter((k) => pool.includes(k));
      const swapped = s.locked.filter((k) => !s.sel.includes(k)).length, ok = SC.sectionValid(c, secs, s);
      body.append(h('h3', { 'data-section': s.id }, `${s.title} `, h('span', { class: ok ? 'good' : 'bad', 'data-count': s.id }, `${s.sel.length}/${need}`),
        s.swaps && s.locked.length ? h('small', { class: 'dim' }, ` · swaps ${swapped}/${s.swaps}`) : null));
      const list = h('div', { class: 'spelllist' });
      for (const k of [...pool].sort((a, b) => SPELLS[a].level - SPELLS[b].level || SPELLS[a].name.localeCompare(SPELLS[b].name))) {
        const S_ = SPELLS[k], on = s.sel.includes(k), full = !on && s.sel.length >= need, lockedKeep = on && s.locked.includes(k) && swapped >= s.swaps;
        const b = btn(h('span', { class: 'sprow' },
          h('span', { class: 'spname' }, `${on ? '☑' : '☐'} ${S_.name}${recSet.has(k) ? ' ★' : ''}${s.locked.includes(k) ? ' ·known' : ''}`),
          h('small', { class: 'spmeta' }, `${S_.level ? 'Level ' + S_.level : 'Cantrip'} · ${SC.SCHOOL[k] || ''}${S_.conc ? ' · Conc.' : ''}`),
          h('small', { class: 'spdesc' }, S_.desc || '')), () => {
          if (on) s.sel = s.sel.filter((x) => x !== k); else if (!full) s.sel = [...s.sel, k];
          draw();
        }, { class: 'spellopt' + (on ? ' on' : ''), 'data-spell': `${s.id}:${k}`, 'aria-pressed': String(on), disabled: full || lockedKeep });
        list.append(b);
      }
      body.append(list);
    }
    const valid = secs.every((s) => SC.sectionValid(c, secs, s));
    openModal([h('h2', {}, title), h('p', { class: 'hint' }, help + ' ★ = recommended.'), body,
      h('div', { class: 'row spellbtns' },
        btn('★ Recommended', () => { SC.recommendSections(c, secs, mode, prev); draw(); }, { id: 'btn-spell-rec', class: 'small' }),
        btn('🎲 Auto-pick', () => { SC.autoPickSections(c, secs); draw(); }, { id: 'btn-spell-auto', class: 'small' }),
        mode === 'prepare' ? btn('Cancel', () => done(), { id: 'btn-spell-cancel', class: 'small' }) : null,
        btn('✓ Confirm', () => { SC.applySections(c, secs); log(`${c.name}: spells ${mode === 'prepare' ? 'prepared' : 'chosen'} — ${knownSpells(c).map((k) => SPELLS[k].name).join(', ')}.`, 'spell'); done(); }, { id: 'btn-spell-ok', class: 'primary', disabled: !valid }))], { closable: mode === 'prepare' });
  };
  draw();
}

/* ---------- Automap: tap a tile to walk there, drop pins & notes ---------- */
let mapMode = 'walk', mapIcon = G.Prog.PINS[0], mapNote = '';
function showMap() {
  const cv = h('canvas', { class: 'bigmap', id: 'bigmap', width: 420, height: 420 }); const goal = G.Prog.nextGoal(S);
  const sc = G.Prog.secretCount(S, S.level), el = G.liveElites(S);
  const pins = S.pins?.[S.level] || []; const note = h('input', { id: 'pin-note', class: 'pinnote', type: 'text', maxlength: '80', placeholder: 'Note for the pin (optional)', value: mapNote, oninput: (e) => { mapNote = e.target.value; } });
  const tileAt = (e) => { const r = cv.getBoundingClientRect(); return [Math.floor(((e.clientX - r.left) / r.width) * W), Math.floor(((e.clientY - r.top) / r.height) * H)]; };
  cv.addEventListener('click', (e) => {
    const [x, y] = tileAt(e); if (x < 0 || y < 0 || x >= W || y >= H) return;
    if (mapMode === 'pin') {
      if (!S.explored[S.level].includes(`${x},${y}`)) { toast('Pins go on explored tiles'); return; }
      const ex = G.Prog.pinAt(S, x, y); if (ex && ex.icon === mapIcon && ex.note === mapNote.trim()) G.Prog.removePin(S, x, y); else G.Prog.addPin(S, x, y, mapIcon, mapNote.trim());
      autosave(true); showMap(); return;
    }
    const path = G.Prog.findPath(S, x, y, (a, b) => G.tile(S, a, b));
    if (!path) { toast(x === S.x && y === S.y ? 'You are here' : 'No known route there'); return; }
    closeModal(); autoWalk(path);
  });
  openModal([h('h2', {}, getLevel(S.level).def.name),
    h('p', { class: 'goal', id: 'map-goal' }, `🎯 ${goal.text}`),
    h('p', { class: 'mapstats', id: 'map-secrets' }, `🔍 Secrets ${sc.found}/${sc.total}`, '  ·  ', `☠ Elites ${el.length} on this floor`, '  ·  ', h('span', { class: 'hint' }, '❓ = suspicious wall')),
    cv,
    h('div', { class: 'seg mapmode', role: 'radiogroup' }, btn('👣 Tap to walk', () => { mapMode = 'walk'; showMap(); }, { id: 'map-walk', class: mapMode === 'walk' ? 'on' : '' }), btn('📍 Pin & notes', () => { mapMode = 'pin'; showMap(); }, { id: 'map-pin', class: mapMode === 'pin' ? 'on' : '' })),
    mapMode === 'pin' ? h('div', { class: 'pinbar' }, h('div', { class: 'seg' }, G.Prog.PINS.map((p) => btn(p, () => { mapIcon = p; showMap(); }, { class: 'small ' + (p === mapIcon ? 'on' : ''), 'data-pin': p }))), note, h('p', { class: 'hint' }, 'Tap an explored tile to drop a pin (tap it again with the same icon and note to remove).')) : h('p', { class: 'hint' }, 'Tap any explored tile to auto-walk there. The walk stops for anything interesting. Gold: chests · Cyan: stairs down · Red: locked/boss · Purple: messages · Blue: fountain'),
    pins.length ? h('div', { class: 'pinlist' }, pins.map((p) => h('div', { class: 'row pinrow' }, h('span', { style: 'flex:1' }, `${p.icon} (${p.x},${p.y}) ${p.note || ''}`), btn('Go', () => { const path = G.Prog.findPath(S, p.x, p.y, (a, b) => G.tile(S, a, b)); if (path) { closeModal(); autoWalk(path); } else toast('No known route there'); }, { class: 'small' }), btn('✕', () => { G.Prog.removePin(S, p.x, p.y); autosave(true); showMap(); }, { class: 'small', 'aria-label': 'Remove pin' })))) : null]);
  drawMinimap(cv, true);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let walkTok = 0, walking = false;
async function autoWalk(path) {
  const tok = ++walkTok; walking = true;
  try {
    for (const [nx, ny] of path) {
      if (tok !== walkTok || !S || S.mode !== 'dungeon' || combat || busy || msgRunning || !modal.classList.contains('hidden')) break;
      const want = DIRS.findIndex(([dx, dy]) => S.x + dx === nx && S.y + dy === ny); if (want < 0) break;
      for (let g = 0; S.dir !== want && g < 3; g++) { act(() => G.turn(S, (want - S.dir + 4) % 4 === 3 ? -1 : 1)); await sleep(70); }
      const px = S.x, py = S.y; act(() => G.move(S, 0)); await sleep(140);
      if (S.x === px && S.y === py) break;
    }
  } finally { if (tok === walkTok) walking = false; }
}
for (const t of ['keydown', 'pointerdown']) window.addEventListener(t, () => { if (walking) walkTok++; }, true);
let toastT = null;
function toast(msg) { const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400); }
$('#minimap').addEventListener('click', (e) => {
  if (!S || S.mode !== 'dungeon' || combat || busy || msgRunning || !modal.classList.contains('hidden')) return;
  const r = e.currentTarget.getBoundingClientRect(); const x = S.x - 6 + Math.floor(((e.clientX - r.left) / r.width) * 13), y = S.y - 6 + Math.floor(((e.clientY - r.top) / r.height) * 13);
  if (x === S.x && y === S.y) { showMap(); return; }
  const path = G.Prog.findPath(S, x, y, (a, b) => G.tile(S, a, b)); if (!path) { toast('No known route there'); return; } autoWalk(path);
});
$('#minimap').title = 'Tap an explored tile to walk there · tap yourself for the full map';
$('#log').addEventListener('click', () => { if (document.body.classList.contains('incombat')) { document.body.classList.toggle('logopen'); requestAnimationFrame(() => { const l = $('#log'); l.scrollTop = l.scrollHeight; }); } }); // phone portrait: tap the short log strip to open or close it
$('#autobtn').addEventListener('pointerdown', (e) => { e.stopPropagation(); setAuto(!autoBattle); });
$('#speedbtn').addEventListener('click', cycleSpeed);

/* ---------- Easy fights: offer to auto-resolve ---------- */
const groupNames = (info) => info.groups.map((g) => `${g.count} ${MONSTERS[g.key].name}${g.count > 1 ? 's' : ''}`).join(', ');
function askTrivial(info) {
  return new Promise((res) => {
    openModal([h('h2', {}, 'Easy Pickings'), h('p', { class: 'lore' }, `${groupNames(info)} — hardly a threat to heroes of your strength.`),
      h('div', { class: 'menu' },
        btn('⚡ Auto-resolve', () => { closeModal(); res(true); }, { id: 'btn-autores', class: 'primary' }),
        btn('⚔ Fight it out', () => { closeModal(); res(false); }, { id: 'btn-fightit' }),
        btn('Always auto-resolve easy fights', () => { const st = loadSettings(); st.trivialFights = 'auto'; saveSettings(st); closeModal(); res(true); }, { id: 'btn-autoalways', class: 'small' }))], { closable: false });
  });
}
async function maybeAutoResolve(info) {
  if (info.town || !S || S.mode !== 'dungeon' || !G.isTrivial(S, info)) return false;
  const mode = loadSettings().trivialFights || 'ask'; if (mode === 'off') return false;
  let go = mode === 'auto'; if (!go) { busy = true; go = await askTrivial(info); busy = false; } if (!go) return false;
  lootBase = snapLoot(); const r = G.autoResolve(S, info); const ev = r.events; combatStarting = false;
  if (r.combat.state === 'won') { sfx('chime'); say(banter(S.party, 'victory', {}, 0.5)); const card = lootCard(ev, info); card.text = `⚡ Easy fight — ${groupNames(info)} fall before you.`; log(`${card.text} ${card.lines.join(' · ')}`, 'good'); queueMessage(card); }
  lootBase = null; renderParty(); handle(ev); autosave(); return true;
}

/* ---------- Inventory ---------- */
let invFilter = 'all';
const invKind = (k) => { const I = ITEMS[k]; return I?.kind || (k.startsWith('w:') ? 'weapon' : k.startsWith('a:') || k === 'shield' ? 'armor' : ''); };
const INV_GROUPS = { weapons: ['weapon'], armor: ['armor', 'helm', 'cloak', 'ring'], potions: ['potion'] };
function inventoryList(redraw, shop = false) {
  const inv = S.inventory;
  if (!inv.length) return h('p', { class: 'hint' }, 'Empty.');
  const group = (k) => { const kind = invKind(k); return Object.keys(INV_GROUPS).find((g) => INV_GROUPS[g].includes(kind)) || 'other'; };
  // a long pack gets filter chips (All / Weapons / Armor / Potions / Other) so it never becomes one endless list
  const counts = { all: inv.length }; for (const k of inv) counts[group(k)] = (counts[group(k)] || 0) + 1;
  const chips = inv.length > 8 ? [['all', 'All'], ['weapons', '⚔ Weapons'], ['armor', '🛡 Armor'], ['potions', '🧪 Potions'], ['other', 'Other']].filter(([g]) => counts[g]) : [];
  if (invFilter !== 'all' && !counts[invFilter]) invFilter = 'all';
  const filter = chips.length ? invFilter : 'all';
  return h('div', { class: 'menu' }, chips.length ? h('div', { class: 'seg invchips', role: 'tablist' }, chips.map(([g, l]) => btn(`${l} (${counts[g]})`, () => { invFilter = g; redraw(); }, { class: 'small ' + (filter === g ? 'on' : ''), 'data-inv': g, role: 'tab', 'aria-selected': String(filter === g) }))) : null, inv.map((k, i) => [k, i]).filter(([k]) => filter === 'all' || group(k) === filter).map(([k, i]) => {
    const I = ITEMS[k]; const kind = invKind(k);
    return h('div', { class: 'row' }, h('span', { style: 'flex:1;' + tierStyle(k), class: 'itemname tier-' + tierOf(k), info: () => itemInfo(k), tabindex: 0 }, G.nameOf(k)),
      kind === 'potion' ? h('select', { class: 'small', onchange: (e) => { const c = S.party[+e.target.value]; handle(G.usePotion(S, i, c)); redraw(); } }, h('option', {}, 'Use on…'), S.party.map((c, j) => h('option', { value: j }, c.name))) : null,
      ['weapon', 'armor', 'ring', 'cloak', 'helm'].includes(kind) ? h('select', { class: 'small', onchange: (e) => { const c = S.party[+e.target.value]; handle(G.equip(S, c, i)); redraw(); } }, h('option', {}, 'Equip on…'), S.party.map((c, j) => h('option', { value: j }, c.name))) : null,
      shop && kind !== 'key' ? btn(`Sell ${Math.floor(G.priceOf(k) / 2)}gp`, () => { handle(G.sell(S, i)); redraw(); }, { class: 'small' }) : null);
  }));
}
function showInventory() { const draw = () => openModal([h('h2', {}, `🎒 Party Inventory — ${S.gold} gp`), inventoryList(draw)]); draw(); }

/* ---------- Character sheet ---------- */
function showSheet(c) {
  if (!S) return;
  const C = CLASSES[c.cls], Rr = RACES[c.race];
  const w = weaponStats(c, 'weapon'), r = weaponStats(c, 'ranged');
  const feats = []; for (let l = 1; l <= c.level; l++) feats.push(...(C.features[l] || []));
  const spells = knownSpells(c);
  openModal([
    h('div', { class: 'tabs' }, S.party.map((p) => btn(p.name, () => showSheet(p), { class: p === c ? 'on small' : 'small' }))),
    h('div', { class: 'row sheethead' }, h('button', { class: 'sheetport', id: 'btn-portrait', title: 'Change portrait', onclick: () => showPortraitPicker(c, () => showSheet(c)) }, portrait(c, 'bigport'), h('small', {}, 'Change')),
      h('h2', {}, `${c.name} — Level ${c.level} ${Rr.name} ${C.name} (${C.sub})`)),
    canLevelUp(c) ? h('p', { class: 'lvlready sheetready' }, `⬆ Ready to level up to ${c.level + 1}! Make camp (Camp → Level Up) or visit the Training Grounds.`) : null,
    c.companion ? h('p', { class: 'hint' }, COMPANIONS[c.companion].blurb) : c.recruit ? h('p', { class: 'hint' }, 'A recruit you created at the Training Grounds.') : null,
    !G.isHero(c) ? btn(`🧠 Tactics: ${TACTIC_STYLES[tacticsOf(c).style].name}${c.ai ? '' : ' (when AI)'}`, () => showTactics(c, () => showSheet(c)), { class: 'small', id: 'btn-sheet-tactics' }) : null,
    h('div', { class: 'abil' }, ABILITIES.map((a) => h('div', { title: ABILITY_NAMES[a] }, h('small', {}, a.toUpperCase()), h('b', {}, c.scores[a]), h('small', {}, fmtMod(mod(c.scores[a])))))),
    h('div', { class: 'cols', style: 'margin-top:10px' },
      h('div', {}, h('table', {}, h('tbody', {},
        ...[['HP', `${Math.max(0, c.hp)} / ${c.maxHp}`], ['Armor Class', armorClass(c)], ['Proficiency', fmtMod(prof(c))], ['Initiative', fmtMod(mod(c.scores.dex))], ['Speed', `${speedOf(c)} ft${speedOf(c) < Rr.speed ? ' (heavy armor, Str too low)' : ''}`], ['Hit Dice', `${c.hitDice}d${C.hitDie} / ${c.level}`],
          ['XP', `${c.xp} / ${xpForNext(c) === Infinity ? 'MAX' : xpForNext(c)}`], ['Passive Perception', passive(c, 'perception')],
          ['Melee', w ? `${w.name} ${fmtMod(w.bonus)} · ${w.dmg}${fmtMod(w.dmgBonus)} ${w.type}${w.proficient ? '' : ' · not proficient'}${w.heavyDis ? ' · disadvantage (Small, heavy)' : ''}` : '—'], ['Ranged', r ? `${r.name} ${fmtMod(r.bonus)} · ${r.dmg}${fmtMod(r.dmgBonus)}${r.proficient ? '' : ' · not proficient'}${r.heavyDis ? ' · disadvantage (Small, heavy)' : ''}` : '—'],
          ['Armor', `${c.equip.armor ? ARMOR[c.equip.armor.base].name + (c.equip.armor.magic ? ' +' + c.equip.armor.magic : '') : c.conditions.mageArmor ? 'Mage Armor' : 'None'}${c.equip.shield ? ' + Shield' : ''}`],
          ['Magic', [c.equip.ring, c.equip.cloak, c.equip.helm].filter(Boolean).map((k) => ITEMS[k].name).join(', ') || '—'],
          ['Death Saves', `${c.deathSaves.s} ✓  ${c.deathSaves.f} ✗`],
          ...(C.caster ? [['Spell DC / Attack', `${spellDC(c)} / ${fmtMod(spellAttack(c))}`], ['Spell Slots', c.slots.map((n, i) => `L${i + 1}: ${n}/${c.maxSlots[i]}`).join('  ')]] : []),
          ['Conditions', Object.keys(c.conditions).join(', ') || 'none']].map(([k, v]) => h('tr', {}, h('th', {}, k), h('td', {}, String(v)))))),
        h('h3', {}, 'Saving Throws'), h('div', {}, ABILITIES.map((a) => h('span', { class: 'tag', style: C.saves.includes(a) ? 'border-color:#ffd34d' : '' }, `${a.toUpperCase()} ${fmtMod(saveMod(c, a))}`))),
        h('h3', {}, 'Features & Traits'), h('div', {}, [...feats, ...Rr.traits].map((f) => h('span', { class: 'tag' }, f))),
        c.res && Object.entries(c.res).some(([, v]) => v) ? h('p', { class: 'hint' }, 'Resources: ' + Object.entries(c.res).filter(([, v]) => v).map(([k, v]) => `${k} ×${v}`).join(', ')) : null),
      h('div', {}, h('h3', {}, 'Skills'), h('table', {}, h('tbody', {}, Object.keys(SKILLS).map((s) => h('tr', {}, h('td', {}, `${c.expertise.includes(s) ? '◆' : c.skills.includes(s) ? '●' : '○'} ${SKILL_LABEL(s)}`), h('td', { class: 'dim' }, SKILLS[s].toUpperCase()), h('td', {}, fmtMod(skillMod(c, s)))))))),
    ),
    spells.length ? h('div', {}, h('h3', {}, 'Spells'), ...[0, 1, 2, 3].map((l) => { const ls = spells.filter((k) => SPELLS[k].level === l); return ls.length ? h('div', {}, h('b', { class: 'dim' }, l === 0 ? 'Cantrips' : `Level ${l} (${c.slots[l - 1]}/${c.maxSlots[l - 1]} slots)`), ...ls.map((k) => h('div', { class: 'spell' }, `${SPELLS[k].name}${SPELLS[k].conc ? ' (C)' : ''}${SPELLS[k].bonus ? ' (bonus)' : ''}`, h('small', {}, SPELLS[k].desc)))) : null; })) : null,
    h('h3', {}, 'Condition reference'), h('div', { class: 'hint' }, Object.entries(CONDITIONS).map(([k, v]) => h('div', {}, `${k}: ${v}`))),
  ]);
}

/* ---------- Combat ---------- */
/** Auto: every hero (the player's own character too) acts on the AI for the rest of the fight, at the current battle speed. Tapping it again hands control back at the next player turn. */
function syncAutoBtn() { const b = document.getElementById('autobtn'); if (b) { b.classList.toggle('on', autoBattle); b.setAttribute('aria-pressed', autoBattle ? 'true' : 'false'); b.textContent = autoBattle ? '✅ Auto' : '🤖 Auto'; b.title = autoBattle ? 'Auto is ON: tap to take control again' : 'Auto is OFF: tap to let the AI play every hero'; } }
function setAuto(on) {
  on = !!on; if (autoBattle === on) { syncAutoBtn(); return; } autoBattle = on; syncAutoBtn();
  if (on && modal._options && modal._resolve && (modal._kind === 'main' || modal._kind === 'more')) modal._resolve({ id: 'auto' }); // the action menu is waiting for the player: let the AI take this turn
}
let skipping = false; // legacy flag, now always false: nothing is skipped (Auto plays every animation at the current battle speed)
const wait = (ms) => new Promise((r) => setTimeout(r, ms * speed().f));
function cycleSpeed() { const ks = Object.keys(BATTLE_SPEEDS); const cur = loadSettings().battleSpeed || 'pause'; setSpeed(ks[(ks.indexOf(cur) + 1) % ks.length]); syncFxSettings(); syncCombatChips(); }
function syncCombatChips() { const b = $('#speedbtn'); if (b) b.textContent = `⏩ ${speed().short}`; }
/* ---------- Action captions (large, centered narration of each action) ---------- */
let capTimer = null;
function showCaption(e, tapHint = false) {
  const el = $('#caption'); clearTimeout(capTimer);
  el.className = 'show ' + (e.tone || ''); el.innerHTML = '';
  capShownAt = performance.now(); el.append(h('div', { class: 'captxt' }, e.text), e.sub ? h('div', { class: 'capsub' }, e.sub) : '', tapHint ? h('div', { class: 'captap' }, '▶ Tap to continue') : '');
  clearTimeout(capDownTimer); capDownAt = 0; document.body.classList.add('capup'); if (R && !R.captionUp) { R.captionUp = true; R.fitArena?.(); } placeCaption(el); requestAnimationFrame(() => placeCaption(el)); setTimeout(() => el.classList.contains('show') && placeCaption(el), 350);
  if (!tapHint) capTimer = setTimeout(() => { el.classList.remove('show'); document.body.classList.remove('capcover'); captionDown(); placeBanter(); }, Math.max(2500, speed().hold * 2.5));
}
/** Put the caption in the band below the monsters and above anything covering the bottom of the view
 *  (combat menu, docked panels), shrinking the font a little only if a long caption would not otherwise fit. */
function placeCaption(el = $('#caption')) {
  const view = $('#view').getBoundingClientRect(); if (!view.height) return; const msg = el.classList.contains('msg');
  let top = view.top + view.height * 0.62, bottom = view.bottom - 6;
  const r = !msg && combat && R.monsterRect ? R.monsterRect() : null; if (r) top = view.top + (Math.max(0, r.bottom) / 100) * view.height;
  if (msg) { top = Math.max(view.top + 8, $('#hud').getBoundingClientRect().bottom + 4); const mb = $('#btn-menu')?.getBoundingClientRect(); if (mb && mb.width && mb.top < view.top + view.height / 3 && mb.right > view.left + view.width / 2) top = Math.max(top, mb.bottom + 4); } // clear of a top-right ☰ Menu
  for (const sel of ['#cmenu', '#modal.combat .panel', '#log', '#controls']) {
    const m = document.querySelector(sel); if (!m || !m.offsetParent) continue; const b = m.getBoundingClientRect();
    if (b.height && b.width && b.top < bottom && b.bottom > top && b.left < view.right && b.right > view.left) bottom = Math.min(bottom, b.top - 6);
  }
  top += 6; const avail = Math.max(40, bottom - top);
  el.style.top = `${top - view.top}px`; el.style.maxHeight = `${avail}px`;
  const tx = el.querySelector('.captxt'), sub = el.querySelector('.capsub'), loot = el.querySelector('.caploot'); if (tx) tx.style.fontSize = ''; if (sub) sub.style.fontSize = ''; if (loot) loot.style.fontSize = '';
  let fs = tx ? parseFloat(getComputedStyle(tx).fontSize) : 20;
  while (el.scrollHeight > el.clientHeight + 1 && fs > (loot ? 12 : el._refit || msg ? 15 : 16)) { fs -= 1; if (tx) tx.style.fontSize = `${fs}px`; if (sub) sub.style.fontSize = `${Math.max(14, fs - 3)}px`; if (loot) loot.style.fontSize = `${Math.max(12, fs - 4)}px`; }
  if (msg) { const free = bottom - top - el.offsetHeight; if (free > 0) el.style.top = `${top + free / 2 - view.top}px`; menuDodge(el); return; } // message card: centred in the free space
  // still too tall for the band: ask the 3D view to reserve more room (camera pulls back / shifts up) and place again
  if (el.scrollHeight > el.clientHeight + 1 && R.fitArena && !el._refit) { R.captionReservePx = Math.max(R.captionReservePx || 0, el.scrollHeight + (el.offsetHeight - el.clientHeight) + 18); R.fitArena(); el._refit = true; placeCaption(el); el._refit = false; return; }
  // the floating ☰ Menu button (docked bottom-left on landscape phones) hops to the top-left corner while a caption it would cover is up
  menuDodge(el);
}
function menuDodge(el) {
  document.body.classList.remove('capcover'); const mb = $('#btn-menu'), c = el.getBoundingClientRect(), b = mb ? mb.getBoundingClientRect() : null;
  if (b && b.width && b.top < c.bottom && b.bottom > c.top && b.left < c.right && b.right > c.left) document.body.classList.add('capcover');
  placeBanter();
}
document.fonts?.addEventListener?.('loadingdone', () => { const el = $('#caption'); if (el.classList.contains('show')) placeCaption(el); });
window.addEventListener('resize', () => { const el = $('#caption'); if (el.classList.contains('show')) requestAnimationFrame(() => placeCaption(el)); });
// the 3D view changes height in combat (e.g. the phone-portrait menu steps aside while a caption is up): re-place caption + bubbles
const replaceOverlays = () => { const el = $('#caption'); if (el.classList.contains('show') && !el._refit) placeCaption(el); else placeBanter(); };
function hideCaption() { stopVoice(); invalidateAmbientVoices(); clearTimeout(capTimer); const el = $('#caption'); el.className = ''; el.innerHTML = ''; document.body.classList.remove('capcover'); captionDown(); placeBanter(); }
/** The caption band (and, on phone portrait, the collapsed menu/log) is released a moment after the last caption, so
 *  back-to-back narration doesn't make the layout and camera pump between captions. */
let capDownTimer = null, capDownAt = 0, capShownAt = 0;
const capDownPending = () => performance.now() < capDownAt;
function captionDown(now = false) {
  clearTimeout(capDownTimer); capDownAt = now ? 0 : performance.now() + 900; const go = () => { capDownAt = 0; document.body.classList.remove('capup'); if (R?.captionUp) { R.captionUp = false; if (combat) R.fitArena?.(); } placeBanter(); };
  if (now) go(); else capDownTimer = setTimeout(go, 700);
}
const tapCatch = h('div', { id: 'tapcatch', class: 'hidden', 'aria-label': 'Tap to continue' }); document.body.append(tapCatch);
/** Eat the click (and touch-end/pointer-up) that follows a dismissing tap, so it can't open a sheet or press a button underneath. */
function eatNextClick() {
  const eat = (e) => { e.preventDefault(); e.stopPropagation(); };
  const types = ['click', 'pointerup', 'touchend', 'mouseup', 'dblclick'];
  for (const t of types) window.addEventListener(t, eat, { capture: true, passive: false });
  setTimeout(() => { for (const t of types) window.removeEventListener(t, eat, { capture: true }); }, 450);
}
let tapPending = null; // resolver of the caption currently waiting for a tap (pause mode)
function tapToContinue(alive = () => combat && speed().hold === 0, guard = 220) {
  return new Promise((resolve) => {
    tapCatch.className = ''; let done = false; const t0 = performance.now(), shown = capShownAt;
    const fin = (ev) => {
      if (done) return;
      if (ev && ev.type === 'keydown' && ![' ', 'Enter'].includes(ev.key)) return;
      if (ev && performance.now() - t0 < guard) return; // the 2nd half of a double tap must not skip the next caption unread
      if (ev && (ev.target === tapCatch || ev.type === 'keydown')) { ev.preventDefault(); ev.stopPropagation(); }
      if (ev && ev.type === 'pointerdown') eatNextClick(); // the tap that dismissed the caption must not also press what's under it
      done = true; if (tapPending === fin) { tapPending = null; tapCatch.className = 'hidden'; } // a newer waiter (e.g. the loot card) keeps its catcher
      tapCatch.removeEventListener('pointerdown', fin); window.removeEventListener('pointerdown', fin, true); window.removeEventListener('keydown', fin, true); clearInterval(iv);
      // iOS: resume inside the gesture that dismisses the last battle caption so endCombat's sting can start.
      try { unlockAudio(); unlockVoices(); const c = ac(); if (c && c.state !== 'running') c.resume(); } catch { /* ignore */ }
      if (capShownAt === shown) hideCaption(); // a tapped caption goes away (but never a newer card, e.g. the victory loot, that replaced it) (otherwise its stale "Tap to continue" would linger and keep the phone menu collapsed)
      resolve();
    };
    tapPending = fin;
    // any tap anywhere advances (also taps landing on the Menu button, a tip or a bubble), and Enter / Space
    tapCatch.addEventListener('pointerdown', fin); window.addEventListener('pointerdown', fin, true); window.addEventListener('keydown', fin, true);
    // never get stuck: the fight ended/was abandoned, the speed left Pause, or the caption we wait on is gone
    const iv = setInterval(() => { if (!alive() || !$('#caption').classList.contains('show')) fin(); }, 250);
  });
}

/* ---------- Ambient / area narration gating (no DM voice mid-battle) ---------- */
let ambientMoveToken = 0;
let combatStarting = false; // true from startCombat() entry until the Combat object exists (banner included)
function ambientToken() {
  return { move: ambientMoveToken, x: S?.x, y: S?.y, level: S?.level, mode: S?.mode };
}
function dialogueOpen() {
  return !!(modal && !modal.classList.contains('hidden') && modal.querySelector('.dialogue'));
}
function ambientVoiceAllowed() {
  return !combat && !combatStarting && !menuOpen() && !dialogueOpen();
}
/** Drop queued area/DM cards and cancel any in-flight narrator decode/play. */
function clearAmbientNarration() {
  ambientMoveToken++;
  invalidateAmbientVoices();
  for (let i = msgQueue.length - 1; i >= 0; i--) {
    const m = msgQueue[i];
    if (m.ambient || m.cls === 'lore' || m.dm) msgQueue.splice(i, 1);
  }
  // If a lore card is on screen (not loot), dismiss it so combat is not blocked behind it.
  const cap = $('#caption');
  if (cap?.classList.contains('show') && cap.classList.contains('msg') && !cap.classList.contains('loot')) {
    hideCaption();
    if (tapPending) { try { tapPending(); } catch { /* ignore */ } }
  }
}

/* ---------- Exploration message cards: clues, notes, wall writings, discoveries ---------- */
const msgQueue = []; let msgRunning = null; let pumpFinished = true;
// A pump that finishes before its first await (every card stale) must not leave msgRunning pointing at a spent promise: that froze walking.
function queueMessage(text, cls = 'lore') { msgQueue.push(typeof text === 'object' ? text : { text, cls }); if (!msgRunning) { const p = pumpMessages(); if (!pumpFinished) msgRunning = p; else return p; } return msgRunning; }
async function pumpMessages() {
  pumpFinished = false; document.body.classList.add('msgup');
  const pumpToken = ambientMoveToken;
  try {
    while (msgQueue.length) {
      // Combat / menu started — abandon remaining ambient cards (loot still allowed if somehow queued).
      if (combat && msgQueue.every((x) => x.ambient || x.cls === 'lore')) { msgQueue.length = 0; break; }
      const m = msgQueue.shift();
      if ((m.ambient || m.cls === 'lore') && (combat || menuOpen() || dialogueOpen() || (m.token && m.token.move !== ambientMoveToken))) {
        continue; // stale area description
      }
      const el = $('#caption'); clearTimeout(capTimer);
      el.className = `show msg ${m.cls === 'rare' ? 'rare tier-' + m.tier : m.cls === 'loot' ? 'loot crit' + (m.tier ? ' tier-' + m.tier : '') : m.cls === 'bad' ? 'bad' : m.cls === 'good' ? 'good' : 'lore'}`; el.innerHTML = ''; capShownAt = performance.now();
      el.append(h('div', { class: 'captxt' }, m.text), m.lines ? h('div', { class: 'caploot' }, m.lines.map((l, i) => { const lt = m.cls === 'rare' ? (i === 0 ? m.lineTiers[0] : null) : m.lineTiers?.[i]; return h('div', { class: lt ? 'tl tier-' + lt : '' }, l); })) : '', h('div', { class: 'captap' }, '▶ Tap to continue'));
      placeCaption(el); requestAnimationFrame(() => placeCaption(el)); setTimeout(() => el.classList.contains('show') && placeCaption(el), 400);
      if (m.cls === 'rare') { sfx('reveal_' + (m.rareSfx === 'common' ? 'uncommon' : m.rareSfx)); duckBed(0.3); playVoiceLine(m.text.replace('✨ ', ''), 'narrator', { kind: 'other' }); }
      else if (m.cls === 'loot') {
        if (m.tier && m.tier !== 'common') later_sfx('reveal_' + m.tier);
        playVoiceLine(m.text, 'narrator', { kind: 'other' });
        try { unlockAudio(); unlockVoices(); const c = ac(); if (c && c.state !== 'running') c.resume(); } catch { /* ignore */ }
        duckBed(0.15);
        playVictoryMusic();
      } else if (m.ambient || m.cls === 'lore') {
        const tok = m.token || ambientToken();
        if (currentVoice()?.kind === 'battle') stopVoice(); // a card the player advanced to is not held back by a passing companion remark
        playAmbientNarration(m.voice?.text || m.text, {
          token: tok,
          stillValid: (token) => ambientVoiceAllowed() && token?.move === ambientMoveToken
            && token?.x === S?.x && token?.y === S?.y && token?.level === S?.level,
        });
      } else {
        playVoiceLine(m.text, 'narrator', { kind: 'other' });
      }
      await tapToContinue(() => true, m.cls === 'loot' ? 1000 : m.cls === 'rare' ? 700 : 220); // a stray tap from the last fight can't skip the victory card unread
      stopVoice();
      if (m.ambient || m.cls === 'lore') invalidateAmbientVoices();
      if (combat && (m.ambient || m.cls === 'lore')) break;
      if (m.quip && !combat) say(m.quip); // a companion reacts once the card is read
    }
  } finally { msgRunning = null; pumpFinished = true; document.body.classList.remove('msgup'); }
}
/** Resolves once every queued message card has been read (combat waits for them). */
const later_sfx = (n) => setTimeout(() => sfx(n), 450);
const messagesDone = () => msgRunning || Promise.resolve();
/** Combat watchdog: whatever happens, the caption layer can never leave combat stalled. */
setInterval(() => {
  if (tapPending) return; const cap = $('#caption');
  if (cap.classList.contains('show') && cap.querySelector('.captap') && performance.now() - capShownAt > 2000) hideCaption(); // a tap-caption nobody is waiting on
  if (!cap.classList.contains('show') && document.body.classList.contains('capup') && !capDownPending()) captionDown(true); // menu/log left collapsed
  if (!tapCatch.classList.contains('hidden')) tapCatch.className = 'hidden'; // catcher left over without a waiter
  // battle watchdog: the player's menu is owed but missing, or the loop of a running fight died -> put it back
  if (combat && !combatStarting) {
    if (curMenu && !curMenu.cm.querySelector('.combatmenu') && !tapPending) { curMenu.draw(); }
    else if (!looping && combat.state === 'running' && !$('#encounter')) combatLoop();
  }
}, 1000);

/* ---------- Encounter banner: bold flash before the battle UI appears ---------- */
function encounterTitle(info) {
  if (info?.ambush) return 'Ambush!';
  if (info?.boss) {
    const def = S ? getLevel(S.level).def : null;
    if (def?.bossName && !info.phase2) return def.bossName;
    return 'A powerful foe appears!';
  }
  return 'Encounter!';
}
let encounterEl = null;
function showEncounterBanner(info, ms = 1200) {
  return new Promise((resolve) => {
    const view = $('#view'); if (!view) return resolve();
    encounterEl?.remove();
    const title = encounterTitle(info);
    const boss = !!info?.boss && title !== 'Encounter!';
    const el = h('div', { id: 'encounter', class: (boss ? 'boss ' : '') + (info?.ambush ? 'ambush ' : ''), role: 'alert', 'aria-live': 'assertive' },
      h('div', { class: 'enc-panel' }, h('div', { class: 'enc-title' }, title), h('div', { class: 'enc-rule' })));
    encounterEl = el; view.append(el);
    flashRed(true); sfx('alarm');
    let done = false;
    const fin = (ev) => {
      if (done) return;
      if (ev && ev.type === 'keydown' && ![' ', 'Enter', 'Escape'].includes(ev.key)) return;
      done = true; clearTimeout(tm);
      window.removeEventListener('pointerdown', fin, true); window.removeEventListener('keydown', fin, true);
      if (ev) { ev.preventDefault?.(); ev.stopPropagation?.(); if (ev.type === 'pointerdown') eatNextClick(); } // the skip tap must not press what is underneath
      el.classList.add('out');
      setTimeout(() => { el.remove(); if (encounterEl === el) encounterEl = null; }, ev ? 0 : 140);
      resolve();
    };
    const tm = setTimeout(() => fin(), ms);
    // a stray tap from the move that triggered the fight must not skip it unseen
    setTimeout(() => { if (!done) { window.addEventListener('pointerdown', fin, true); window.addEventListener('keydown', fin, true); } }, 150);
  });
}
async function startCombat(info) {
  if (combat || combatStarting) return;
  combatStarting = true;
  clearAmbientNarration(); // stop delayed DM/area voice and drop pending lore cards
  takeSuspendSnap(info); skipping = false; autoBattle = false; syncAutoBtn(); syncCombatChips();
  try {
    await messagesDone(); if (combat) { combatStarting = false; return; }
    clearAmbientNarration();
    if (await maybeAutoResolve(info)) { combatStarting = false; busy = false; suspendSnap = null; return; }
    busy = true;
    await showEncounterBanner(info);
    clearAmbientNarration();
  } catch (e) { combatStarting = false; busy = false; throw e; }
  closeModal(); busy = true;
  document.body.classList.add('incombat'); $('#cmenu').innerHTML = '<div class="who dim">Combat begins…</div>';
  const theme = getLevel(S.level).def.color;
  combatInfo = info; lootBase = snapLoot();
  combat = new Combat(S.party, info.groups, { inventory: S.inventory, boss: !!info.boss, canFlee: !info.boss && !info.town, difficulty: S.difficulty || 'normal', story: info.town ? {} : G.combatOpts(S, info), elite: info.elite || null, lore: S.lore });
  combatStarting = false;
  if (info.elite || info.boss) sfx('roar');
  R.setMode('combat');
  try { await R.showMonsters(combat.monsters, theme, rankIds()); } catch (e) { log('Could not draw the monsters: ' + (e && e.message || e), 'bad'); } // a failed model load must not leave the battle without its menu
  const names = {}; for (const m of combat.monsters) names[m.name] = (names[m.name] || 0) + 1;
  log(`⚔ ${Object.entries(names).map(([n, k]) => `${k} ${n}${k > 1 ? 's' : ''}`).join(', ')}!`, 'bad');
  if (combat.liveRanks().length > 1) log(`Ranks, front to back: ${combat.liveRanks().map((g, i) => `${i + 1}. ${g.name} ×${g.monsters.length}`).join(' · ')}. Melee reaches only the first ${RANKS_FRONT} groups.`, 'sys');
  say(banter(S.party, 'combatStart', {}, info.boss ? 1 : 0.7));
  busy = false;
  await flushCombat();
  combatLoop();
}
let looping = false, loopFor = null; // loopFor: the Combat the running loop belongs to
let loopGen = 0;
function abandonCombat() { hideTurnPortrait(true); hideFoePortrait(true); suspendSnap = null; skipping = false; loopGen++; looping = false; combat = null; autoBattle = false; syncAutoBtn(); endCombatUI(); hideCaption(); R.clearMonsters(); $('#targets').innerHTML = ''; }
async function combatLoop() {
  // A new fight can begin while the previous fight's loop is still unwinding inside endCombat (town/boss paths await the loot card or a
  // rebuild there): the stale `looping` flag used to make this call a no-op, so the new battle never got a turn and no menu appeared.
  if (!combat || (looping && loopFor === combat)) return; looping = true; loopFor = combat; const gen = ++loopGen;
  try {
    while (combat && combat.state === 'running' && gen === loopGen) {
      renderParty(); renderTargets();
      { const cur = combat.current(); if (cur && cur.side === 'party') { hideFoePortrait(true); showTurnPortrait(cur); } else hideTurnPortrait(); } // the hero's portrait appears when their turn starts and stays through the result
      if (combat.needsInput() && !autoBattle) { await playerTurn(); }
      else {
        const c = combat.current();
        if (c.side === 'party' && !c.ai) { combat.aiTurn(c); if (combat.current() === c && combat.state === 'running') combat.endTurn(); }
        else combat.autoTurn();
        await flushCombat();
      }
    }
    if (combat && gen === loopGen) await endCombat();
  } finally { if (gen === loopGen) looping = false; }
}
/* ---------- Phase D: hero cut-ins (portrait slides in, strike, hit flash). Honors battle speed, Reduce motion and Skip. ---------- */
let cutinStop = null, cutinBusy = false, cutinAbort = false; // cutinAbort: test hook, ends a running cut-in at once
function hideCutin() { const el = $('#turnport'), fl = $('#cutflash'); if (el) { el.classList.remove('strike', 'flash', 'melee', 'ranged', 'spell', 'heal'); el.style.removeProperty('--acc'); delete el.dataset.kind; const fx = el.querySelector('.tp-fx'); if (fx) fx.innerHTML = ''; } if (fl) fl.className = ''; }
/* The acting hero's painted portrait stays at the bottom of the arena for the whole turn (menu, strike, result) and slides away when the
   next actor's turn begins. Effects from playCutin play over it. Skip / 2x only shorten the effects; the portrait always shows. */
let turnWho = null, turnHideT = null;
function showTurnPortrait(c) {
  const el = $('#turnport'); if (!el || !c) return;
  clearTimeout(turnHideT); turnHideT = null;
  if (turnWho === c && el.classList.contains('in') && !el.classList.contains('out')) return;
  turnWho = c; el.className = ''; el.style.cssText = ''; el.dataset.who = c.name; delete el.dataset.kind;
  el.replaceChildren(h('div', { class: 'tp-port' }, portrait(c, 'tp-img'), h('div', { class: 'tp-fx' }), h('div', { class: 'tp-flash' }), h('div', { class: 'tp-name' }, h('b', {}, c.name), h('span', { class: 'tp-act' }, ''))));
  el.className = 'on'; void el.offsetWidth; el.classList.add('in'); placeBanter();
}
function hideTurnPortrait(now = false) {
  const el = $('#turnport'); turnWho = null; clearTimeout(turnHideT); turnHideT = null; if (!el) return;
  const clear = () => { el.className = ''; el.style.cssText = ''; el.replaceChildren(); delete el.dataset.who; delete el.dataset.kind; };
  if (now || !el.classList.contains('on') || reduceMotion()) return clear();
  el.classList.remove('in'); el.classList.add('out'); turnHideT = setTimeout(() => { turnHideT = null; if (!turnWho) clear(); }, 200);
}
const CUTIN_GLYPH = { melee: '⚔', ranged: '🏹', spell: '✦', heal: '✚' };
const CUTIN_NAMES = { shoot: 'Shot', throw: 'Throw', layOnHands: 'Lay on Hands', secondWind: 'Second Wind', preserveLife: 'Preserve Life', smite: 'Divine Smite', item: 'Potion', breath: 'Breath Weapon', frenzy: 'Frenzy', martialArts: 'Martial Arts', flurry: 'Flurry of Blows', strikeStaff: 'Staff Strike', breakCollar: 'Break the Collar' };
function cutinLabel(e) {
  if (e.spell) return SPELLS[e.spell]?.name || e.spell;
  if (e.id === 'attack') return WEAPONS[e.weapon]?.name || 'Unarmed strike';
  if (e.id === 'shoot') return WEAPONS[e.weapon]?.name || 'Shot';
  return CUTIN_NAMES[e.id] || 'Action';
}
async function playCutin(e) {
  if (!$('#turnport') || cutinBusy) return;
  if (turnWho !== e.who) showTurnPortrait(e.who); // normally already up since the turn began
  const el = $('#turnport'); const label = el.querySelector('.tp-act'); if (label) label.textContent = `${CUTIN_GLYPH[e.kind]} ${cutinLabel(e)}`;
  if (skipping) return; // Skip: no effects, the portrait stays
  const T = D.cutinTimes(speed().f, { skipping, reduce: reduceMotion() }); if (!T.total) return;
  cutinBusy = true; cutinAbort = false;
  const sleepC = (ms) => new Promise((r) => { if (ms <= 0 || cutinAbort) return r(); const t = setTimeout(r, ms); cutinStop = () => { clearTimeout(t); r(); }; });
  const sp = e.spell ? SPELLS[e.spell] : null; const col = sp?.type && DTYPE_CSS(sp.type);
  const fx = { melee: [h('i', { class: 'sl s1' }), h('i', { class: 'sl s2' })], ranged: [h('i', { class: 'trail' }), h('i', { class: 'arrow' })],
    spell: [h('i', { class: 'ring r1' }), h('i', { class: 'ring r2' }), ...[0, 1, 2, 3, 4, 5].map((i) => h('i', { class: 'spk', style: `--i:${i}` }))],
    heal: [h('i', { class: 'glow' }), ...[0, 1, 2, 3, 4].map((i) => h('i', { class: 'plus', style: `--i:${i}` }, '✚'))] }[e.kind];
  el.classList.remove('strike', 'flash', 'melee', 'ranged', 'spell', 'heal');
  el.style.setProperty('--sl', T.slide + 'ms'); el.style.setProperty('--st', T.strike + 'ms'); el.style.setProperty('--fl', T.flash + 'ms'); if (col) el.style.setProperty('--acc', col); else el.style.removeProperty('--acc');
  el.dataset.kind = e.kind; el.dataset.who = e.who.name;
  const box = el.querySelector('.tp-fx'); box.replaceChildren(...fx); el.classList.add(e.kind); void el.offsetWidth;
  try {
    await sleepC(Math.round(T.slide * 0.4)); if (skipping || cutinAbort) return;
    el.classList.add('strike');
    await sleepC(T.strike + (e.hold || 0)); if (skipping || cutinAbort) return; // hold: test hook only, freezes the strike phase for a screenshot
    el.classList.add('flash'); const fl = $('#cutflash'); fl.style.cssText = `--acc:${col || ''}`; fl.className = 'on ' + e.kind;
    await sleepC(T.flash); if (skipping || cutinAbort) return;
    await sleepC(Math.round(110 * Math.max(0.3, speed().f)));
  } finally { cutinStop = null; cutinBusy = false; hideCutin(); } // effects end; the portrait stays until the next turn
}
/* ---------- Monster attacks: the targeted hero's portrait takes the same bottom-left spot as the hero cut-in for the monster's strike,
   with a red flash + shake on a hit (and the damage), a dodge slide + 'Miss' on a miss. AoE hits show a compact row of the heroes hit.
   Speed and Skip shorten the animation only (the portrait still shows). ---------- */
let foeKey = '', foeHideT = null;
function hideFoePortrait(now = false) {
  const el = $('#foeport'); foeKey = ''; clearTimeout(foeHideT); foeHideT = null; if (!el) return;
  const clear = () => { el.className = ''; el.replaceChildren(); delete el.dataset.who; delete el.dataset.from; };
  if (now || !el.classList.contains('on') || reduceMotion()) return clear();
  el.classList.remove('in'); el.classList.add('out'); foeHideT = setTimeout(() => { foeHideT = null; if (!foeKey) clear(); }, 200);
}
function showFoePortrait(heroes, foe) {
  const el = $('#foeport'); if (!el || !heroes.length) return;
  const key = foe.id + ':' + heroes.map((c) => c.id).join(',');
  clearTimeout(foeHideT); foeHideT = null;
  if (key === foeKey && el.classList.contains('in') && !el.classList.contains('out')) return;
  hideTurnPortrait(true); foeKey = key; el.className = ''; el.dataset.from = foe.name; el.dataset.who = heroes.map((c) => c.name).join(',');
  el.replaceChildren(...heroes.map((c) => h('div', { class: 'fp-tile', 'data-id': c.id }, portrait(c, 'tp-img'), h('div', { class: 'fp-flash' }), h('div', { class: 'fp-num' }), h('div', { class: 'fp-name' }, h('b', {}, c.name), h('span', {}, heroes.length > 1 ? '' : `⚔ ${foe.name}`)))));
  el.className = 'on ' + (heroes.length > 1 ? 'row' : 'single'); void el.offsetWidth; el.classList.add('in'); placeBanter();
}
/** kind: 'hurt' (amt, crit) or 'dodge'. Does nothing unless this hero's tile is on screen for the current monster strike. */
function foeReact(c, kind, amt = 0, crit = false) {
  const el = $('#foeport'); const tile = el && foeKey ? [...el.querySelectorAll('.fp-tile')].find((t) => t.dataset.id === c.id) : null; if (!tile) return;
  const f = speed().f; const dur = skipping ? 0 : Math.round((kind === 'hurt' ? 420 : 520) * ANIM_SLOW * Math.max(0.4, f));
  tile.style.setProperty('--fd', dur + 'ms'); tile.classList.remove('hurt', 'dodge', 'crit'); if (dur) delete tile.dataset.static; else tile.dataset.static = '1'; void tile.offsetWidth;
  const num = tile.querySelector('.fp-num'); num.textContent = kind === 'hurt' ? (crit ? `CRIT ${amt}` : `-${amt}`) : 'Miss';
  tile.classList.add(kind); if (crit) tile.classList.add('crit');
}
/** Heroes a monster's strike lands on, read ahead from the event stream: the attack's own target, or everyone hurt by an AoE. */
function foeTargets(events, i) {
  const e = events[i], out = new Map(); if (e.tgt) out.set(e.tgt.id, e.tgt);
  let mult = false;
  for (let j = i + 1; j < events.length; j++) {
    const n = events[j]; if (n.type === 'monsterAttack' || n.type === 'partyAttack' || n.type === 'cutin') break;
    const who = n.type === 'partyHurt' ? n.who : (n.type === 'hit' || n.type === 'miss') && n.tgt?.side === 'party' && n.att === e.who ? n.tgt : null;
    if (who) { if (!out.has(who.id) && n.type === 'partyHurt' && out.size) mult = true; out.set(who.id, who); }
  }
  return mult || out.size > 1 ? [...out.values()] : [e.tgt].filter(Boolean);
}
async function flushCombat() {
  const { log: lines, events } = combat.drain();
  for (const l of lines) log(l.t, l.cls);
  syncFxSettings(); let pending = null; const wpn = new Map();
  const dmgSfx = (e, sp) => sfx(sp === 'magicMissile' ? 'ping' : SPELL_SFX[e.dtype] || (sp ? 'arcane' : 'hit'));
  const idx = (c) => Math.max(0, S.party.indexOf(c));
  const fxDur = () => skipping ? 40 : Math.round(420 * ANIM_SLOW * Math.max(0.4, speed().f)); // bolts / bursts / strikes ≈1.5x longer; scales with battle speed
  for (const e of events) {
    if (!combat || !S) return;
    if (e.type === 'caption') { pending = null; renderParty(); renderTargets(); const sp = speed(); showCaption(e, sp.hold === 0 && !skipping); if (skipping) await new Promise((r) => setTimeout(r, 120)); else if (sp.hold === 0) await tapToContinue(); else await new Promise((r) => setTimeout(r, sp.hold)); continue; }
    if (e.type === 'cutin') { pending = null; await playCutin(e); continue; }
    if (e.type === 'trait') { const d = D.dtype(e.dtype), k = D.TRAIT_KINDS[e.kind]; floater(e.who.id, `${d.icon} ${k.mark}`, false, e.dtype); renderTargets(); if (e.first) toast(`${d.icon} Discovered: ${e.who.name} ${k.word.toLowerCase()} ${d.name.toLowerCase()} (${k.mark})`); await wait(e.kind === 'immune' ? 220 : 140); continue; }
    if (e.type === 'rows') { renderParty(); continue; }
    if (e.type === 'advance') { try { await R.restageMonsters(combat.monsters.filter((m) => m.hp > 0 && !m.ally), rankIds(), skipping ? 60 : 650); } catch (_) { /* layout only */ } renderTargets(); continue; }
    if (e.type === 'wait') continue;
    if (e.type === 'study') { renderTargets(); sfx(e.ok ? 'chime' : 'miss'); if (e.ok) await wait(200); continue; }
    if (e.type === 'monsterAttack') { pending = null; if (e.tgt?.side === 'party') showFoePortrait(foeTargets(events, events.indexOf(e)), e.who); R.monsterAttack(e.who.id); sfx('swing'); await wait(560 * ANIM_SLOW); }
    else if (e.type === 'partyAttack') { pending = null; packBark(e.who, 'attack'); const k = weaponKind(e.weapon); wpn.set(e.who, k); sfx(k === 'bow' || k === 'crossbow' ? 'twang' : 'swing'); await wait((k === 'bow' || k === 'crossbow' ? 60 : 150) * ANIM_SLOW); }
    else if (e.type === 'hit' && e.tgt.side === 'monster') {
      const sp = pending && pending.who === e.att ? pending.spell : null;
      if (sp && SPELL_FX[sp]?.kind !== 'area') await R.spellCast(sp, e.tgt.id, idx(e.att), fxDur());
      const wk = !sp && e.att.side === 'party' ? wpn.get(e.att) : null;
      if (wk) await R.weaponStrike(wk, e.tgt.id, e.crit, fxDur() * 0.6, idx(e.att));
      R.monsterHit(e.tgt.id, e.crit, e.dtype || 'slashing', !sp && !wk); floater(e.tgt.id, e.dmg, e.crit, e.dtype); if (e.dmg > 0) sfx('mhurt');
      if (sp) dmgSfx(e, sp); else sfx(WEAPON_SFX[wk] && wk !== 'bow' && wk !== 'crossbow' ? WEAPON_SFX[wk] : e.dtype === 'bludgeoning' ? 'thud' : e.dtype === 'piercing' ? 'stab' : SPELL_SFX[e.dtype] || 'slash');
      if (e.crit) sfx('crit'); await wait((sp ? 160 : wk ? 200 : 260) * ANIM_SLOW + 90); // impact hold on the hit frame (sound already fired with the hit)
    }
    else if (e.type === 'miss') { if (e.att?.side === 'party') packBark(e.att, 'miss'); const sp = pending && pending.who === e.att ? pending.spell : null; if (sp && e.tgt.side === 'monster' && SPELL_FX[sp]?.kind !== 'area') await R.spellCast(sp, e.tgt.id, idx(e.att), fxDur()); if (e.tgt.side === 'monster') floater(e.tgt.id, 'Miss'); else { cardFloat(e.tgt, 'Miss'); foeReact(e.tgt, 'dodge'); } sfx('miss'); await wait(160 * ANIM_SLOW); }
    else if (e.type === 'partyHurt') { packBark(e.who, 'hit'); renderParty(); const el2 = document.getElementById('card-' + e.who.id); if (el2) { el2.classList.add('hurt'); } cardFloat(e.who, e.amt ?? e.dmg, e.crit, 'bad', e.dtype); R.partyHit(e.crit); flashRed(e.crit); foeReact(e.who, 'hurt', e.amt ?? e.dmg, e.crit); sfx('mhit'); if (e.crit) sfx('crit'); await wait(260 * ANIM_SLOW + 90); }
    else if (e.type === 'kill') { if (e.who.side === 'party') sfx('kill'); else { R.monsterDie(e.who.id); sfx('mdeath'); } say(banter(S.party, 'kill', { m: e.who.name, who: e.by }, 0.45)); await wait(300); }
    else if (e.type === 'crit') { if (e.att.side === 'party') packBark(e.att, 'crit'); if (e.att.side === 'party') say(banter(S.party, 'crit', { who: e.att }, 0.8)); else say(banter(S.party, 'enemyCrit', { who: e.tgt }, 0.8)); }
    else if (e.type === 'spell') {
      if (e.who.side === 'party') packBark(e.who, 'spell');
      const look = SPELL_FX[e.spell]; sfx(look?.kind === 'area' ? (/fire|burn|breath/.test(e.spell) ? 'fire' : /ice/.test(e.spell) ? 'cold' : 'boom') : e.spell === 'magicMissile' ? 'ping' : /fire|flame/i.test(e.spell) ? 'fire' : /frost|ice/i.test(e.spell) ? 'cold' : /lightning|shock/i.test(e.spell) ? 'zap' : /sacred|guiding|bless|smite/i.test(e.spell) ? 'radiant' : 'arcane');
      if (look?.kind === 'area' && e.who.side !== 'monster') { pending = { spell: e.spell, who: e.who }; await R.spellCast(e.spell, null, idx(e.who), fxDur()); }
      else if (look && e.who.side !== 'monster') pending = { spell: e.spell, who: e.who };
      else { pending = null; const col = { sleep: 0x80a0ff, spiritGuardians: 0xffe080, smite: 0xfff0a0, rage: 0xff3020, shield: 0x80c0ff }[e.spell] || 0x60ffb0; R.spellFx(col, null); await wait(300); }
    }
    else if (e.type === 'heal') { packBark(e.who, 'heal'); healFx(e.who); cardFloat(e.who, e.amt ? '+' + e.amt : '+', false, 'good'); sfx('heal'); }
    else if (e.type === 'down') { packBark(e.who, 'downed'); say(banter(S.party.filter((p) => p !== e.who), 'down', { p: e.who.name }, 0.9)); await wait(200); }
    else if (e.type === 'lowHp') { packBark(e.who, 'lowHp'); say(banter(S.party, 'lowHp', { who: e.who }, 0.35)); }
    renderParty(); renderTargets();
  }
}
function floater(id, v, crit, dtype) { const p = R.screenPos(id); if (!p) return; const miss = v === 'Miss'; const el = h('div', { class: 'floater' + (crit ? ' crit' : '') + (miss ? ' miss' : ''), 'data-dtype': dtype || '', style: `left:${p.x}%;top:${p.y}%;color:${miss ? '#bbb' : crit ? '' : DTYPE_CSS(dtype) || '#fff'}` }, ...(crit ? [h('small', {}, 'CRIT '), String(v)] : [String(v)])); $('#floaters').append(el); setTimeout(() => el.remove(), 1100); }
function cardFloat(c, v, crit, cls = 'bad', dtype = null) { const el = document.getElementById('card-' + c.id); if (!el) return; const f = h('div', { class: 'floater' + (crit ? ' crit' : '') + (v === 'Miss' ? ' miss' : ''), style: `left:70%;top:0;font-size:${crit ? 24 : 18}px;color:${cls === 'good' ? '#6dffa8' : v === 'Miss' ? '#bbb' : DTYPE_CSS(dtype) || '#ff5a6e'}` }, crit ? 'CRIT ' + v : String(v)); el.append(f); setTimeout(() => f.remove(), 1100); }
let targetPick = null;
let pickKind = null; // range kind of the target being chosen ('melee' | 'touch' | 'ranged'); foes beyond it are greyed out
const RANKS_FRONT = 2;
/** The living monster groups as arrays of monster ids, front to back (what the arena uses to stagger the ranks). */
const rankIds = () => combat.liveRanks().map((g) => g.monsters.map((m) => m.id));
const rankLabel = (m) => { const g = combat.groupOf(m); return g ? `G${g.rank + 1}` : ''; };
const reachable = (m) => !pickKind || !combat || combat.canTarget(combat.current(), m, pickKind);
let aimState = null; // multi-projectile aiming in progress: array of monsters, one per assigned dart/ray/beam
const aimCount = (m) => (aimState ? aimState.filter((x) => x === m).length : 0);
/** Name plates sit above each head; where neighbours' plates would pile onto each other, push the back ones up (or aside) so every plate stays readable. */
/** Keep the name plates from piling on each other: front plates keep their spot, the rest move up or sideways into free space; if it still cannot fit, every plate shrinks to a compact form. */
function declutterTags() {
  const host = $('#targets'); const tags = [...host.querySelectorAll('.mtag')]; if (tags.length < 2) return;
  const hr = host.getBoundingClientRect(); if (!hr.width) return;
  const hit = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  const run = (down) => {
    const items = tags.map((el) => { el.style.marginTop = el.style.marginLeft = ''; return { el, r: el.getBoundingClientRect() }; }).sort((a, b) => b.r.bottom - a.r.bottom || a.r.left - b.r.left); // front (lowest) first
    const placed = []; let ok = true;
    for (const sel of ['#btn-menu']) { const e = document.querySelector(sel); if (e && e.offsetParent) { const b = e.getBoundingClientRect(); if (b.width) placed.push({ left: b.left, right: b.right, top: b.top, bottom: b.bottom }); } } // plates keep clear of the Menu button
    for (const it of items) {
      const w = it.r.width, hgt = it.r.height; let best = null;
      const need = Math.max(0, Math.ceil((hr.top + 2 - it.r.top) / (hgt * 0.5))); // plates anchored above the view slide down just enough to get in
      for (let ky = down ? Math.min(-4, -need) : -need; ky <= 14; ky++) for (const kx of [0, 1, -1, 2, -2, 3, -3]) {
        const dx = kx * w * 0.55, dy = -ky * (hgt * 0.5);
        const b = { left: it.r.left + dx, right: it.r.right + dx, top: it.r.top + dy, bottom: it.r.bottom + dy };
        if (b.left < hr.left || b.right > hr.right || b.top < hr.top + 2) continue;
        if (placed.some((p) => hit(b, p))) continue;
        const cost = Math.abs(dx) * 0.8 + Math.abs(dy); if (!best || cost < best.cost) best = { dx, dy, cost, b };
      }
      if (!best) { ok = false; best = { dx: 0, dy: 0, b: { left: it.r.left, right: it.r.right, top: it.r.top, bottom: it.r.bottom } }; }
      if (best.dy) it.el.style.marginTop = `${best.dy}px`; if (best.dx) it.el.style.marginLeft = `${best.dx}px`; placed.push(best.b);
    }
    return ok;
  };
  for (const t of tags) t.classList.remove('dense', 'tiny');
  if (R.sprMode && tags.length >= (window.innerWidth <= 760 ? 3 : 4)) { // crowded painted-sprite fights: compact plates from the start (then without trait chips if they still collide) so they do not hide the smaller monsters
    for (const t of tags) t.classList.add('dense'); if (run(false) || run(true)) return;
    for (const t of tags) t.classList.add('tiny'); if (!run(false)) run(true); return; }
  if (run(false)) return;
  for (const t of tags) t.classList.add('dense');
  if (!run(false)) run(true);
}
function renderTargets() {
  const el = $('#targets'); el.innerHTML = ''; if (!combat || combat.state !== 'running') return;
  for (const m of combat.monsters) {
    if (m.hp <= 0 || m.ally) continue; const p = R.screenPos(m.id); if (!p) continue;
    const far = !!targetPick && !reachable(m);
    el.append(h('div', { class: `mtag ${targetPick && !far ? 'pick' : ''} ${far ? 'far' : ''} ${combat.current() === m ? 'sel' : ''}`, style: `left:${Math.min(86, Math.max(14, p.x))}%;top:${Math.max(8, p.y)}%`, onclick: () => { if (!targetPick) return; if (far) { toast(`${m.name}: out of reach`); return; } targetPick(m); }, info: () => monsterInfo(m) },
      h('div', {}, h('b', { class: 'rk' }, combat.liveRanks().length > 1 ? rankLabel(m) + ' ' : ''), m.name, aimCount(m) ? h('b', { class: 'aimn' }, ` ×${aimCount(m)}`) : ''), h('div', { class: 'bar' }, h('i', { style: `width:${m.hp / m.maxHp * 100}%` })), traitChips(m), condChips(m.conditions)));
  }
  declutterTags();
}
let curMenu = null; // the combat menu being waited on (so the watchdog can redraw it if it ever goes missing)
function chooseFrom(title, options, kind = '') {
  return new Promise((resolve) => {
    // combat menu docks into the bottom panel (in place of movement controls) so it never covers the log
    const cm = $('#cmenu'); if (modal.classList.contains('combat')) closeModal();
    if (!tapPending) { const cap = $('#caption'); if (cap.querySelector('.captap')) hideCaption(); captionDown(true); } // never ask with the menu collapsed
    document.body.classList.add('incombat');
    const done = (o) => { modal._options = null; modal._kind = ''; curMenu = null; cm.innerHTML = ''; cm.append(h('div', { class: 'who dim' }, '…')); resolve(o); };
    const draw = () => { cm.innerHTML = ''; cm.append(h('div', { class: 'panel' }, h('div', { class: 'who' }, title), h('div', { class: 'combatmenu' + (kind ? ' ' + kind : '') }, options.map((o, i) => btn(`${i + 1}. ${o.label}`, () => done(o), { disabled: o.disabled, class: (o.primary ? 'primary' : '') + (o.util ? ' util' : '') + (o.class ? ' ' + o.class : ''), info: o.info || null }))))); document.body.classList.add('incombat'); };
    draw(); curMenu = { draw, cm };
    cm.scrollTop = 0; requestAnimationFrame(() => { const l = $('#log'); l.scrollTop = l.scrollHeight; });
    modal._resolve = done; modal._options = options; modal._kind = kind;
  });
}
function endCombatUI() { document.body.classList.remove('logopen'); hideTurnPortrait(); hideFoePortrait(true); skipping = false; autoBattle = false; syncAutoBtn(); curMenu = null; captionDown(true); document.body.classList.remove('incombat'); $('#banter').style.top = ''; $('#banter').classList.remove('offband'); $('#cmenu').innerHTML = ''; modal._options = null; modal._kind = ''; }
function combatKey(e) {
  const n = parseInt(e.key, 10); if (!modal._options) return;
  if (n >= 1 && n <= modal._options.length && !modal._options[n - 1].disabled) { e.preventDefault(); modal._resolve(modal._options[n - 1]); }
  if (e.key === 'Escape') { const b = modal._options.find((o) => o.back); if (b) modal._resolve(b); }
}
async function reclassMenu(c) {
  const cost = 50 * c.level;
  const opts = Object.entries(CLASSES).filter(([k]) => k !== c.cls).map(([k, C]) => ({ label: `${C.name} — ${C.sub}`, k, disabled: S.gold < cost }));
  opts.push({ label: '← Back', back: true });
  const o = await chooseFrom(`Retrain ${c.name} (L${c.level} ${CLASSES[c.cls].name}) as… Cost ${cost} gp (you have ${S.gold}).`, opts);
  if (!o.back && S.gold >= cost) {
    const n = reclass(c, o.k); n.recruit = c.recruit;
    for (const list of [S.party, S.roster]) { const i = list.indexOf(c); if (i >= 0) list[i] = n; }
    S.gold -= cost; log(`${n.name} retrains as a ${CLASSES[o.k].name} (${CLASSES[o.k].sub}).`, 'good'); autosave();
  }
  showTown('train');
}
/** Multi-projectile spells (Magic Missile darts, Scorching Ray rays, Eldritch Blast beams): assign each dart/ray/beam to a foe, repeats allowed.
 *  Tap a monster tag (or its button) to send one more at it; "All on one" then a foe sends every remaining shot there; Undo / Clear; Cast needs all assigned. */
async function pickAims(c, key, n, range = 'ranged') {
  const noun = projectileNoun(key), nouns = noun + 's', title = SPELLS[key].name;
  const live = combat.legalTargets(c, range); if (!live.length) return null; const many = combat.liveRanks().length > 1;
  if (live.length === 1) return Array(n).fill(live[0]);
  pickKind = many ? range : null; aimState = []; let allOne = false;
  try {
    for (;;) {
      const left = n - aimState.length;
      const opts = [
        { id: 'cast', label: `Cast ▶ (${aimState.length}/${n})`, disabled: left > 0, primary: true, aim: true },
        { id: 'back', label: '← Back', back: true, aim: true },
        { id: 'one', label: allOne ? 'All on one: tap foe' : 'All on one', util: true, class: allOne ? 'on' : '', aim: true, info: () => ['All on one', `Tap "All on one", then a foe: every unassigned ${noun} goes to that foe.`] },
        { id: 'undo', label: 'Undo', util: true, disabled: !aimState.length, aim: true },
        { id: 'clear', label: 'Clear', util: true, disabled: !aimState.length, aim: true },
        ...live.map((m) => ({ id: 'mon', m, aim: true, info: () => monsterInfo(m), label: `${many ? rankLabel(m) + ' ' : ''}${m.name} (${m.hp}/${m.maxHp})${aimCount(m) ? ` ×${aimCount(m)}` : ''}${D.visibleConds(m.conditions).map((k) => ' ' + D.condInfo(k).icon).join('')}` })),
      ];
      let resolveTap; const tap = new Promise((r) => (resolveTap = r));
      targetPick = (m) => resolveTap({ id: 'mon', m }); renderTargets();
      const o = await Promise.race([chooseFrom(`${c.name}: ${title} — ${aimState.length}/${n} ${nouns} aimed. Tap foes to aim; the same foe can take several.`, opts, 'aim'), tap]);
      if (o.id === 'back') return null;
      if (o.id === 'cast') return aimState.slice();
      if (o.id === 'undo') aimState.pop();
      else if (o.id === 'clear') { aimState = []; allOne = false; }
      else if (o.id === 'one') allOne = !allOne;
      else if (o.id === 'mon' && left > 0) { if (allOne) { for (let i = 0; i < left; i++) aimState.push(o.m); allOne = false; } else aimState.push(o.m); }
    }
  } finally { aimState = null; targetPick = null; pickKind = null; renderTargets(); }
}
const REACH_WHY = 'Out of reach';
const condIcons = (m) => D.visibleConds(m.conditions).map((k) => ' ' + D.condInfo(k).icon).join('');
/** Pick a foe by GROUP (Wizardry style): one row per group with its count, unreachable groups greyed out. Tapping a monster in the arena targets that exact foe;
 *  tapping a group row hits its weakest reachable awake foe (for area spells: the whole group). opts: { range, area } */
async function pickTarget(kind, c, opts = {}) {
  if (kind === 'enemy') {
    const range = opts.range || 'ranged', area = !!opts.area;
    const live = combat.livingMonsters();
    if (live.length === 1) return live[0];
    const groups = combat.liveRanks(), many = groups.length > 1;
    const rows = groups.map((g) => {
      const ok = combat.legalTargets(c, range).some((m) => m.gid === g.gid);
      const hp = g.monsters.reduce((t, m) => t + m.hp, 0), mx = g.monsters.reduce((t, m) => t + m.maxHp, 0), n = g.monsters.length;
      const pick = ok ? ([...g.monsters].filter((m) => combat.canTarget(c, m, range)).sort((a, b) => (a.conditions.unconscious ? 1 : 0) - (b.conditions.unconscious ? 1 : 0) || a.hp - b.hp)[0]) : null;
      const names = g.mixed ? g.name : g.monsters[0].name;
      return { g, ok, m: pick, info: () => monsterInfo(g.monsters[0]), disabled: !ok, class: ok ? '' : 'far', label: `${many ? `G${g.rank + 1} ` : ''}${names}${n > 1 || many ? ` ×${n}` : ''} (${hp}/${mx})${condIcons(g.monsters[0])}${area && ok && n > 1 ? ' · all hit' : ''}${ok ? '' : ` · ${REACH_WHY}`}` };
    });
    const list = rows.filter((r) => r.ok || many);
    list.push({ label: '← Back', back: true });
    pickKind = many ? range : null;
    let resolveTap; const tap = new Promise((r) => (resolveTap = r));
    targetPick = (m) => resolveTap({ m }); renderTargets();
    try {
      const o = await Promise.race([chooseFrom(`${c.name}: choose ${many ? 'a group' : 'a target'} (or tap a monster)${area ? ' · area spell hits the whole group' : ''}`, list, many ? 'groups' : ''), tap]);
      return o.back ? null : o.m;
    } finally { targetPick = null; pickKind = null; renderTargets(); }
  }
  if (kind === 'rowmate') {
    const mine = combat.inFront(c);
    const opts = combat.conscious().filter((p) => p !== c && combat.inFront(p) !== mine).map((p) => ({ label: `${p.name} (${CLASSES[p.cls].name}, ${roleOf(p)}) — now ${mine ? 'back' : 'front'} ↔ ${mine ? 'front' : 'back'}`, p }));
    if (!opts.length) { toast('Nobody to swap with.'); return null; }
    opts.push({ label: '← Back', back: true });
    const o = await chooseFrom(`${c.name}: trade places with…`, opts); return o.back ? null : o.p;
  }
  if (kind === 'ally' || kind === 'downedAlly' || kind === 'deadAlly') {
    const opts = S.party.filter((p) => (kind === 'deadAlly' ? p.dead : kind === 'downedAlly' ? p.hp <= 0 && !p.dead : !p.dead)).map((p) => ({ label: `${p.name} (${Math.max(0, p.hp)}/${p.maxHp})`, p }));
    opts.push({ label: '← Back', back: true });
    const o = await chooseFrom(`${c.name}: choose an ally`, opts); return o.back ? null : o.p;
  }
  return true;
}
/** Less common actions live behind a "More" page so the main combat menu fits a phone screen without scrolling. */
const LESS_COMMON = new Set(['swap', 'study', 'item', 'dodge', 'flee']);
const SHORT_LABEL = { swap: 'Swap rows (bonus)', study: 'Study a foe (bonus)' };
const moreHint = (a) => ({ swap: 'Swap rows', study: 'Study', item: 'Items', dodge: 'Dodge', flee: 'Run' })[a.id] || a.label;
async function playerTurn() {
  const c = combat.current(); let page = 'main';
  while (combat && combat.state === 'running' && combat.current() === c && !combat.turn.done) {
    renderParty();
    const acts = combat.actionsFor(c).map((a) => ({ ...a, primary: a.id === 'attack' || a.id === 'shoot', util: a.id === 'end', ...(SHORT_LABEL[a.id] ? { label: SHORT_LABEL[a.id], info: () => [SHORT_LABEL[a.id], a.label] } : {}) }));
    const less = acts.filter((a) => LESS_COMMON.has(a.id)), core = acts.filter((a) => !LESS_COMMON.has(a.id) && a.id !== 'end'), end = acts.find((a) => a.id === 'end');
    const t = combat.turn; const title = `${c.name} · ${t.action ? 'Action' : ''}${t.action && t.bonus ? ' + ' : ''}${t.bonus ? 'Bonus' : ''} · HP ${c.hp}/${c.maxHp}`;
        let opts;
    if (page === 'more') {
      opts = [...less,
        { id: 'speed', label: `Battle speed: ${speed().short} ↻`, bonus: true, info: () => ['Battle speed', ...Object.values(BATTLE_SPEEDS).map((v) => v.label)] },
        { id: 'back', label: '← Back', back: true }];
    } else {
      opts = [...core];
      opts.push({ id: 'more', label: 'More… ▸', more: true, util: true, info: () => ['More actions', ...less.map(moreHint), 'Battle speed'] });
      if (end) opts.push(end);
    }
    const o = await chooseFrom(page === 'more' ? `${c.name}: more actions` : title, opts, page === 'more' ? 'more' : 'main');
    if (o.id === 'more') { page = 'more'; continue; }
    if (o.id === 'back') { page = 'main'; continue; }
    if (o.id === 'auto') { autoBattle = true; syncAutoBtn(); closeModal(); return; }
    if (o.id === 'speed') { const ks = Object.keys(BATTLE_SPEEDS); setSpeed(ks[(ks.indexOf(loadSettings().battleSpeed) + 1) % ks.length]); log(`Battle speed: ${speed().label}`, 'sys'); continue; }
    page = 'main';
    let args = {};
    if (o.target === 'enemy') { const m = await pickTarget('enemy', c, { range: o.range, area: o.area }); if (!m) continue; args.target = m; }
    if (o.target === 'ally' || o.target === 'rowmate') { const p = await pickTarget(o.target, c); if (!p) continue; args.target = p; }
    if (o.id === 'cast') {
      const list = combat.castable(c).map(({ k, s }) => ({ info: () => spellInfo(k), label: `${s.name}${s.level ? ` (L${s.level})` : ' (cantrip)'}${s.bonus ? ' [bonus]' : ''}${s.conc ? ' [conc]' : ''}`, k, s }));
      list.push({ label: '← Back', back: true });
      const sp = await chooseFrom(`${c.name}: cast which spell? Slots: ${c.slots.map((n, i) => `L${i + 1}:${n}`).join(' ')}`, list);
      if (sp.back) continue;
      let slot = sp.s.level;
      const higher = c.slots.map((n, i) => (i + 1 > sp.s.level && n > 0 ? i + 1 : 0)).filter(Boolean);
      if (sp.s.level > 0 && higher.length && !sp.s.cantrip) {
        const so = await chooseFrom(`Cast ${sp.s.name} at which level?`, [sp.s.level, ...higher].filter((l) => c.slots[l - 1] > 0).map((l) => ({ label: `Level ${l} slot (${c.slots[l - 1]} left)`, l })));
        slot = so.l;
      }
      const tk = sp.s.target; let target = null; let aims = null;
      const nP = projectileCount(c, sp.k, slot);
      if (nP > 1 && tk === 'enemy') { aims = await pickAims(c, sp.k, nP, combat.rangeKind('cast', sp.k)); if (!aims) continue; target = aims[0]; }
      else if (tk === 'enemy' || tk === 'someEnemies' || sp.s.area) { target = await pickTarget('enemy', c, { range: combat.rangeKind('cast', sp.k), area: !!sp.s.area }); if (!target) continue; }
      if (tk === 'ally' || tk === 'downedAlly' || tk === 'deadAlly') { target = await pickTarget(tk, c); if (!target) continue; }
      args = { spell: sp.k, slot, target, ...(aims ? { aims } : {}) };
    }
    if (o.id === 'item') {
      const pots = [...new Set(S.inventory.filter((k) => ITEMS[k]?.kind === 'potion'))].map((k) => ({ info: () => itemInfo(k), label: `${ITEMS[k].name} (×${S.inventory.filter((x) => x === k).length})`, k }));
      pots.push({ label: '← Back', back: true });
      const it = await chooseFrom('Use which item?', pots); if (it.back) continue;
      const tg = await pickTarget('ally', c); if (!tg) continue; args = { item: it.k, target: tg };
    }
    closeModal();
    combat.act(c, o.id, args);
    await flushCombat();
  }
  closeModal();
}
/* ---------- Chest loot card: same style as the victory card; inspect/disarm stay as the choice step ---------- */
let chestNotes = [];
const CHEST_LINES = ['The lid creaks open…', 'Hinges groan as the lid swings up…', 'Dust puffs out as the lid lifts…', 'The lock gives with a click…'];
function chestStep(fn) {
  const b = snapLoot();
  const ev = fn(S); const opened = ev.some((e) => e.sfx === 'chest');
  for (const e of ev) if (e.log && !opened) chestNotes.push(e.log.replace(/ \(\w+ \d+\)| \(\d+\)/g, ''));
  if (!opened) { handle(ev); return; }
  R.openChestAnim(S.x, S.y); closeModal(); handle(ev);
  const lines = [];
  for (const n of chestNotes) if (/trap|disarm/i.test(n)) lines.push(`🔎 ${n}`);
  for (const e of ev) if (e.log && e.cls === 'bad') lines.push(`☠ ${e.log}`);
  const gold = S.gold - b.gold; if (gold > 0) lines.push(`💰 +${gold} gold`);
  const left = [...b.inv], got = {}; for (const k of S.inventory) { const i = left.indexOf(k); if (i >= 0) left.splice(i, 1); else got[k] = (got[k] || 0) + 1; }
  for (const [k, n] of Object.entries(got)) lines.push(`${ITEMS[k]?.quest ? '📜' : '🎒'} ${n > 1 ? n + '× ' : ''}${ITEMS[k]?.name || k}`);
  for (const e of ev) if (e.log && e.cls === 'crit') lines.push(`📜 ${e.log}`);
  if (gold <= 0 && !Object.keys(got).length) lines.push('The chest is empty. Someone got here first.');
  chestNotes = [];
  queueMessage({ text: `📦 ${CHEST_LINES[Math.floor(Math.random() * CHEST_LINES.length)]}`, cls: 'loot', lines });
}
/* ---------- Victory loot card: XP, gold, items, quest and level-up notes, tap to dismiss ---------- */
let lootBase = null;
const snapLoot = () => ({ gold: S.gold, xp: new Map(S.party.map((c) => [c, c.xp])), ready: new Set(S.party.filter((c) => canLevelUp(c))), inv: [...S.inventory] });
const VICTORY_LINES = ['Victory!', 'The foe is vanquished!', 'Victory! The dust settles.', 'Victory — the way is clear.', 'Triumph! The party stands tall.'];
function lootCard(ev, info) {
  const b = lootBase || snapLoot(), lines = [];
  const gains = S.party.filter((c) => !c.dead).map((c) => c.xp - (b.xp.get(c) ?? c.xp)).filter((n) => n > 0);
  if (gains.length) lines.push(Math.min(...gains) === Math.max(...gains) ? `✦ +${gains[0]} XP each` : `✦ +${Math.min(...gains)}–${Math.max(...gains)} XP`);
  const gold = S.gold - b.gold; if (gold > 0) lines.push(`💰 +${gold} gold`);
  const left = [...b.inv], got = {}; for (const k of S.inventory) { const i = left.indexOf(k); if (i >= 0) left.splice(i, 1); else got[k] = (got[k] || 0) + 1; }
  const order = ['common', 'uncommon', 'rare', 'epic', 'legendary']; let best = 'common'; const lineTiers = {};
  for (const [k, n] of Object.entries(got)) { const t = tierOf(k); lineTiers[lines.length] = t; if (order.indexOf(t) > order.indexOf(best)) best = t; lines.push(`${t === 'common' ? '🎒' : '✨'} ${n > 1 ? n + '× ' : ''}${ITEMS[k]?.name || k}`); }
  for (const e of ev) if (e.log && !e.card && e.cls !== 'lore' && !/^Found /.test(e.log) && !e.combat && (e.cls === 'good' || e.cls === 'crit')) lines.push(`📜 ${e.log}`);
  for (const c of S.party) if (!c.dead && canLevelUp(c) && !b.ready.has(c)) lines.push(`⬆ ${c.name} is ready for level ${c.level + 1}!`);
  if (S.victory && info.boss) lines.push('👑 Gorvax the Tyrant falls! The Blackspire\'s lights go dark.');
  if (!lines.length) lines.push('Nothing of value this time.');
  const MAX = 8; if (lines.length > MAX) { const more = lines.length - (MAX - 1); lines.splice(MAX - 1, lines.length, `…and ${more} more — see the log.`); }
  return { text: `⚔ ${VICTORY_LINES[Math.floor(Math.random() * VICTORY_LINES.length)]}`, cls: 'loot', lines, lineTiers, tier: best === 'uncommon' ? null : best, elite: !!info.elite };
}
async function endCombat() {
  await flushCombat(); await wait(500);
  const st = combat.state; const info = combatInfo;
  if (st === 'won') { say(banter(S.party, 'victory', {}, 0.8)); setTimeout(() => packBarkAny('victory'), 1200); }
  const ev = G.afterCombat(S, combat, info);
  combat = null; autoBattle = false; $('#targets').innerHTML = ''; R.clearMonsters(); closeModal(); endCombatUI(); hideCaption();
  if (st === 'won') {
    // Fanfare via the voice WebAudio path (destination) — proven on Sean's iPhone. Duck bed separately.
    victoryUntil = Date.now() + 7000;
    const bed = S.mode === 'dungeon' ? (getLevel(S.level).def.music || 'dungeon0') : 'town';
    try { unlockAudio(); unlockVoices(); const c = ac(); if (c && c.state !== 'running') c.resume(); } catch { /* ignore */ }
    duckBed(0.15);
    setTimeout(() => duckBed(0.15), 200);
    setTimeout(() => duckBed(0.15), 600);
    playVictoryMusic(() => { victoryUntil = 0; syncAudio(); });
    setTimeout(() => playMusic(bed), 40);
    const card = lootCard(ev, info); log(`${card.text} ${card.lines.join(' · ')}`, 'good'); queueMessage(card);
  } lootBase = null;
  if (info.town) { handle(ev.filter((e) => !e.toTown)); if (st === 'lost') for (const c of S.party) if (!c.dead) c.hp = Math.max(1, c.hp); await messagesDone(); await afterPrologueFight(); return; }
  suspendSnap = null;
  if (st === 'lost') { handle(ev); return; }
  if (info.boss) await rebuild();
  if (!combat) R.setMode('dungeon'); // a fight that began during the rebuild keeps its arena on screen
  handle(ev);
  if (S.victory && info.boss) { log('Gorvax the Tyrant falls! The Blackspire\'s lights go dark. The altar beyond awaits.', 'crit'); playVoiceLine('Gorvax the Tyrant falls! The Blackspire\'s lights go dark.', 'narrator', { kind: 'dialog', queue: true, maxWait: 15000 }); }
  autosave();
}

/* ---------- Save/load ---------- */
function autosave(quiet = false) { if (!S || combat) return; try { S.savedAt = Date.now(); writeSave(G.SAVE_KEY, G.serialize(S)); } catch (e) { if (!quiet) log('Save failed: ' + e.message, 'bad'); } }
/** Suspend anywhere: when the app is hidden or closed, save now. Mid-fight the pre-fight snapshot is saved, flagged to resume that fight. */
let suspendSnap = null;
function suspendSave() { if (!S) return; if (combat) { if (suspendSnap) { try { writeSave(G.SAVE_KEY, suspendSnap); } catch { /* ignore */ } } return; } if (!busy) autosave(true); }
function takeSuspendSnap(info) { suspendSnap = null; if (!S || info.town) return; try { const snap = JSON.parse(G.serialize(S)); snap.savedAt = Date.now(); snap.resumeCombat = info; suspendSnap = JSON.stringify(snap); } catch { /* ignore */ } }
document.addEventListener('visibilitychange', () => { if (document.hidden) suspendSave(); });
window.addEventListener('pagehide', suspendSave);
async function loadGame(key = G.SAVE_KEY) {
  const got = readSave(key); if (!got) { log('No saved game.', 'bad'); return; }
  try { S = G.deserialize(got.raw); } catch { log('Save is corrupted and no backup could be read.', 'bad'); return; }
  if (got.recovered) log('⚠ That save was damaged — restored it from its automatic backup copy.', 'crit');
  abandonCombat(); closeModal(); closeMenu(); updateMenuBtn(); log('Game loaded.', 'sys');
  const resume = S.resumeCombat; delete S.resumeCombat;
  if (S.mode === 'dungeon' && G.Prog && ENT.isLevelLocked(S.level)) { S.mode = 'town'; S.level = 0; }
  if (S.mode === 'dungeon') await startDungeon(); else showTown();
  if (resume && S.mode === 'dungeon') { log('You pick up right where you left off — the fight resumes.', 'sys'); startCombat(resume); }
}



/* ---------- Boot ---------- */
async function boot() {
  log('Loading the 3D engine…', 'dim');
  const { Renderer, preloadAll, preloadSome } = await import('./render/scene.js'); // three.js lives in its own lazily-fetched chunk
  R = new Renderer($('#view')); R.onResize = () => { if (combat) { replaceOverlays(); renderTargets(); } else if ($('#caption').classList.contains('show')) replaceOverlays(); };
  window.__gw = { say, sfx, SFX_NAMES, applyAudioSettings, playCutin, flushCombat, showFoePortrait, foeReact, hideFoePortrait, endCutinPhase() { cutinAbort = true; cutinStop?.(); }, closeModal, renderCombatUI() { renderParty(); renderTargets(); }, showHelp,
    async playthrough(opts) { const { playthrough } = await import('./sim/playthrough.js'); const r = playthrough(opts); return { ...r, _state: G.serialize(r.state) }; },
    async loadState(str) { S = G.deserialize(str); closeModal(); if (S.mode === 'dungeon') await startDungeon(); else showTown(); refresh(); },
    outdoorInfo: () => ({ reg: outReg(), near: S ? outNear() : false, hour: S ? outHour() : null, tod: S ? todName(outHour()) : null, weather: R?.outdoor?.weather || null, state: R?.outState || null, counts: R?.outdoor?.counts || null }), look(p) { if (R) R.pitch = p; }, poiMap(lvl = 2) { const L = getLevel(lvl); const o = {}; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (L.tiles[y][x] === 'Q') o[poiIdAt(L, x, y)] = [x, y]; return o; }, setHour(h) { if (R?.outdoor) R.outdoor.forceHour = h; refresh(); }, setWeather(k) { R?.outdoor?.setWeather(k); refresh(); },
    showTactics, openMenu, knownSpells, showSpellPicker, audio: () => ({ track: currentTrack(), amb: currentAmbience() }), voice: () => ({ enabled: voicesEnabled(), vol: voiceVolume(), current: currentVoice(), misses: voiceMisses(), has: hasVoice, gen: voiceGeneration() }), invalidateAmbientVoices, clearAmbientNarration, playAmbientNarration, testVoice, testVictoryMusic, playVictorySting, playVictoryMusic, victoryStingState, victoryMusicState, lastVictoryAttempt, get state() { return S; }, get combat() { return combat; }, R, G, getLevel, refresh, showInventory, runTT, showJournal, startCombat, loadGame, autoWalk, showMap, toast, prompt, showCamp, showTown, say, caption: (e, tap = true) => showCaption(e, tap), hideCaption, queueMessage, messages: () => ({ queued: msgQueue.length, showing: !!msgRunning }), handle, showEncounterBanner, banter: (k) => say(banter(S.party, k, {}, 1)) };
  log('Loading monsters…', 'dim');
  await Promise.all([R.ready, preloadSome(['tyrannosaurus', 'giantSpider', 'giantWasp'])]); // just what the title screen shows
  preloadAll(); // everything else streams in the background (and loads on demand)
  const where = await initStorage([G.SAVE_KEY, ...SLOT_KEYS]);
  if (where === 'icloud') log('Saves sync with iCloud.', 'dim');
  if (!isNative() && 'serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').then((reg) => { try { reg.update(); } catch { /* ignore */ } }).catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) navigator.serviceWorker.getRegistration?.().then((r) => r?.update?.()).catch(() => {});
    });
  }
  // Decode victory through the voice loader after first gesture (unlock listeners already attached).
  for (const ev of ['pointerdown', 'touchend', 'keydown']) {
    window.addEventListener(ev, () => prefetchVictory(), { once: true, capture: true, passive: true });
  }
  if (new URLSearchParams(location.search).has('debug') || location.hash.includes('debug')) installAudioDebug();
  setAmbientVoiceGate(() => ambientVoiceAllowed());
  log('Blackspire ready. Press New Game!', 'sys');
  showTitle();
}
boot();

/* ---------- Main menu (☰ / Esc) ---------- */
const gmenu = h('div', { id: 'gmenu', class: 'hidden', role: 'dialog', 'aria-label': 'Main menu' });
const menuBtn = h('button', { id: 'btn-menu', class: 'hidden', 'aria-label': 'Main menu', title: 'Main menu (Esc)', onclick: () => (menuOpen() ? closeMenu() : openMenu()) }, '☰ Menu');
document.body.append(gmenu, menuBtn);
let menuView = 'main', settingsTab = 'audio';
function menuOpen() { return !gmenu.classList.contains('hidden'); }
function closeMenu() { gmenu.className = 'hidden'; gmenu.innerHTML = ''; }
function updateMenuBtn() { menuBtn.classList.toggle('hidden', !S); document.body.classList.toggle('ingame', !!S); }
function menuBack() { if (menuView === 'main' || !S) closeMenu(); else openMenu('main'); }
function latestKey() { let best = null, bt = -1; for (const k of [G.SAVE_KEY, ...SLOT_KEYS]) { const i = slotInfo(k); if (i && i.t > bt) { bt = i.t; best = k; } } return best; }
function continueLatest() { const k = latestKey(); if (k) loadGame(k); }
function slotLabel(k, i) { const inf = slotInfo(k); return `${i < 0 ? 'Autosave / Quick save' : 'Slot ' + (i + 1)}: ${inf ? inf.text : 'empty'}`; }
function saveTo(k) { S.savedAt = Date.now(); writeSave(k, G.serialize(S)); }
function confirmView(title, text, yesLabel, yes, back = 'main') {
  openMenu(null, [h('h2', {}, title), h('p', { class: 'warn' }, text),
    h('div', { class: 'menu' }, btn(yesLabel, yes, { class: 'primary', id: 'btn-confirm' }), btn('Cancel', () => (S ? openMenu(back) : closeMenu()), { id: 'btn-cancel' }))]);
}
function openMenu(view = 'main', custom = null) {
  invalidateAmbientVoices();
  menuView = custom ? 'confirm' : view;
  const inCombat = !!combat;
  const note = (t) => h('p', { class: 'hint' }, t);
  let body, barTabs = null;
  if (custom) body = custom;
  else if (view === 'main') {
    body = [h('h2', {}, '☰ Main Menu'),
      inCombat ? h('p', { class: 'warn' }, '⚔ You are in combat. Saving is disabled until the fight ends, so a save never puts you in the middle of a battle. You can still quit: progress since your last save will be lost.') : null,
      h('div', { class: 'menu' },
        btn('▶ Resume', closeMenu, { class: 'primary bigtown', id: 'menu-resume' }),
        h('div', { class: 'menu grid2' },
          btn('💾 Save Game…', () => openMenu('save'), { id: 'menu-save', disabled: inCombat }),
          btn('📂 Load Game…', () => openMenu('load'), { id: 'menu-load' }),
          btn('⚙ Settings', () => { settingsTab = 'audio'; openMenu('settings'); }, { id: 'menu-settings' }),
          btn('⇅ Export / Import', () => openMenu('backup'), { id: 'menu-backup' })),
        h('h3', {}, 'Leave the game'),
        h('div', { class: 'menu grid2' },
          btn('💾⏏ Save & Quit', () => openMenu('savequit'), { id: 'menu-savequit', disabled: inCombat }),
        btn('⏏ Quit without saving', () => confirmView('Quit without saving?', 'Progress since your last save will be lost.', '⏏ Quit without saving', () => { closeMenu(); closeModal(); abandonCombat(); showTitle(); }), { id: 'menu-quit' })))];
  } else if (view === 'save' || view === 'savequit') {
    const quit = view === 'savequit';
    body = [h('h2', {}, quit ? '💾 Save & Quit — choose a slot' : '💾 Save Game — choose a slot'),
      note('Saving overwrites the slot. The Save button and autosave use their own quick-save slot.'),
      h('div', { class: 'menu' }, SLOT_KEYS.map((k, i) => btn(slotLabel(k, i), () => confirmView(`Save to Slot ${i + 1}?`, slotInfo(k) ? `This overwrites: ${slotInfo(k).text}` : 'This slot is empty.', quit ? `💾 Save to Slot ${i + 1} and quit` : `💾 Save to Slot ${i + 1}`, () => {
        try { saveTo(k); } catch (e) { log('Save failed: ' + e.message, 'bad'); return; }
        log(`Game saved to Slot ${i + 1}.`, 'sys');
        if (quit) { closeMenu(); closeModal(); showTitle(); } else openMenu('main', [h('h2', {}, '✔ Saved'), h('p', {}, `Saved to Slot ${i + 1}.`), h('div', { class: 'menu' }, btn('▶ Resume', closeMenu, { class: 'primary', id: 'menu-resume' }), btn('← Main Menu', () => openMenu('main')))]);
      }, view), { class: 'slot', 'data-slot': i + 1 })))];
  } else if (view === 'load') {
    const keys = [[G.SAVE_KEY, -1], ...SLOT_KEYS.map((k, i) => [k, i])];
    body = [h('h2', {}, '📂 Load Game'), S ? note('Loading replaces the current game; progress since your last save will be lost.') : null,
      h('div', { class: 'menu' }, keys.map(([k, i]) => btn(slotLabel(k, i), () => (S ? confirmView('Load this save?', 'Progress since your last save will be lost.', '📂 Load', () => loadGame(k), 'load') : loadGame(k)), { class: 'slot', 'data-load': i + 1, disabled: !slotInfo(k) })))];
  } else if (view === 'settings') {
    const st = loadSettings();
    const slider = (key, label) => h('label', { class: 'slider' }, h('span', {}, label), h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(st[key] * 100), id: 'vol-' + key, 'aria-label': label + ' volume',
      oninput: (e) => { st[key] = +e.target.value / 100; e.target.nextSibling.textContent = e.target.value + '%'; applyAudioSettings(st); }, onchange: () => { saveSettings(st); if (key === 'sfx') sfx('hit'); } }), h('b', {}, Math.round(st[key] * 100) + '%'));
    const pages = {
      audio: () => [
        h('div', { class: 'menu grid2' },
          btn(`🔊 Sound: ${st.sound ? 'On' : 'Off (all muted)'}`, () => { st.sound = !st.sound; saveSettings(st); applyAudioSettings(st); openMenu('settings'); }, { id: 'set-sound' }),
          btn(`💥 Sound effects: ${st.sfxOn !== false ? 'On' : 'Off'}`, () => { st.sfxOn = st.sfxOn === false; saveSettings(st); applyAudioSettings(st); if (st.sfxOn) sfx('slash'); openMenu('settings'); }, { id: 'set-sfx' }),
          btn(`🗣 Voices: ${st.voices !== false ? 'On' : 'Off'}`, () => { st.voices = st.voices === false; saveSettings(st); applyAudioSettings(st); openMenu('settings'); }, { id: 'set-voices' }),
          btn('🗣 Test voice (Elowen)', () => { st.voices = true; if (!st.sound) { st.sound = true; } saveSettings(st); applyAudioSettings(st); testVoice(); }, { id: 'set-test-voice' })),
        slider('music', '🎵 Music'), slider('sfx', '💥 Effects volume'), slider('amb', '🌫 Ambience'), slider('voice', '🗣 Voice volume'),
        h('div', { class: 'menu' }, btn('🎺 Test victory music', () => { if (!st.sound) { st.sound = true; saveSettings(st); applyAudioSettings(st); } try { unlockAudio(); unlockVoices(); const c = ac(); if (c && c.state !== 'running') c.resume(); } catch { /* ignore */ } testVictoryMusic(); }, { id: 'set-test-victory' }))],
      game: () => [
        h('h3', {}, 'Battle speed'),
        h('div', { class: 'seg', role: 'radiogroup' }, Object.entries(BATTLE_SPEEDS).map(([k, v]) => btn(v.label, () => { setSpeed(k); openMenu('settings'); }, { class: (st.battleSpeed || 'pause') === k ? 'on' : '', 'data-speed': k, role: 'radio', 'aria-checked': String((st.battleSpeed || 'pause') === k) }))),
        h('p', { class: 'hint' }, 'Each action is described in large text in the middle of the screen. "Pause" waits for a tap after every action. In a fight, ⏩ cycles the speed and 🤖 Auto lets the AI play every hero until you tap it again.'),
        h('h3', {}, 'Easy fights'),
        h('div', { class: 'seg', role: 'radiogroup' }, [['ask', 'Ask me'], ['auto', 'Auto-resolve'], ['off', 'Always fight']].map(([k, l]) => btn(l, () => { st.trivialFights = k; saveSettings(st); openMenu('settings'); }, { class: (st.trivialFights || 'ask') === k ? 'on' : '', 'data-trivial': k, role: 'radio' }))),
        h('p', { class: 'hint' }, 'When the party is far stronger than the foes, you can resolve the fight instantly (it still pays XP and loot).'),
        S ? h('h3', {}, 'Difficulty') : null,
        S ? h('div', { class: 'seg', role: 'radiogroup' }, Object.keys(DIFFICULTY).map((k) => btn(DIFF_LABEL[k], () => { S.difficulty = k; if (combat) combat.setDifficulty?.(k); autosave(); log(`Difficulty: ${DIFF_LABEL[k]}.`, 'sys'); openMenu('settings'); }, { class: (S.difficulty || 'normal') === k ? 'on' : '', 'data-diff': k, role: 'radio', 'aria-checked': String((S.difficulty || 'normal') === k) }))) : null,
        S ? h('p', { class: 'hint' }, DIFF_HELP[S.difficulty || 'normal']) : null],
      more: () => [
        h('h3', {}, 'Storytelling'),
        h('div', { class: 'menu grid2' }, btn(`🕯 Area descriptions: ${st.areaDesc !== false ? 'On' : 'Off'}`, () => { st.areaDesc = st.areaDesc === false; saveSettings(st); openMenu('settings'); }, { id: 'set-areadesc' }),
          btn(`🌀 Reduce motion: ${reduceMotion() ? 'On' : 'Off'}`, () => { st.reduceMotion = !reduceMotion(); saveSettings(st); syncFxSettings(); openMenu('settings'); }, { id: 'set-reducemotion' })),
        h('p', { class: 'hint' }, 'A Dungeon Master reads out each new floor, room and town spot the first time you arrive. Off: they only go to the log.'),
        h('h3', {}, 'Help'),
        h('div', { class: 'menu' }, btn('💡 Show the tutorial tips again', () => { st.tutorialDone = false; saveSettings(st); closeMenu(); startTutorial(); }, { id: 'set-tutorial' })),
        h('h3', {}, 'Full game'),
        h('div', { class: 'menu grid2' }, btn('♻ Restore Purchases', () => { log(ENT.restore() ? 'Purchases restored.' : (ENT.paywallActive() ? 'No purchase found on this device.' : 'Nothing to restore — this build is fully unlocked.'), 'sys'); }, { id: 'set-restore' }),
          btn(`🧪 Dev: free-version paywall ${ENT.paywallActive() ? 'On' : 'Off'}`, () => { ENT.setPaywallDev(!ENT.paywallActive()); if (!ENT.paywallActive()) ENT.resetEntitlement(); openMenu('settings'); }, { id: 'set-paywall' })),
        h('p', { class: 'hint' }, 'The web build is unlocked. The paywall switch simulates the free version (B1 free, B2–B5 behind one unlock) for testing.')],
    };
    barTabs = tabBar([['audio', '🔊 Audio'], ['game', '⚔ Game'], ['more', '⚙ More']], settingsTab, (id) => { settingsTab = id; openMenu('settings'); });
    body = [h('h2', {}, '⚙ Settings'), h('div', { class: 'tabpage', 'data-page': settingsTab }, pages[settingsTab]())];
  } else if (view === 'backup') {
    const cur = S && !combat ? G.serialize({ ...S, savedAt: Date.now() }) : (readSave(latestKey() || G.SAVE_KEY) || {}).raw;
    const area = h('textarea', { id: 'import-code', rows: 4, placeholder: 'Paste a BS1: save code here…', spellcheck: 'false', autocapitalize: 'off' });
    const file = h('input', { type: 'file', accept: '.json,.txt,application/json,text/plain', id: 'import-file', class: 'hidden', onchange: async (e) => { const f = e.target.files[0]; if (f) doImport(await f.text()); } });
    body = [h('h2', {}, '⇅ Export / Import Saves'),
      note('Back up your game, or move it to another device: export a file or copy the save code, then import it there.'),
      h('h3', {}, 'Export'),
      cur ? h('div', { class: 'menu' },
        btn('⬇ Download save file (.json)', () => { const a = h('a', { href: URL.createObjectURL(new Blob([cur], { type: 'application/json' })), download: `blackspire-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); }, { id: 'btn-export-file' }),
        btn('📋 Copy save code', async () => { const code = exportCode(cur); $('#export-code').value = code; try { await navigator.clipboard.writeText(code); log('Save code copied.', 'sys'); } catch { $('#export-code').select(); } }, { id: 'btn-export-code' }),
        h('textarea', { id: 'export-code', rows: 3, readonly: true }, exportCode(cur))) : note(combat ? 'Finish the fight first — saves are never taken mid-combat.' : 'There is no save to export yet.'),
      h('h3', {}, 'Import'),
      note(S ? 'Importing replaces your current game (it is also kept in the autosave slot).' : 'The imported game goes into the autosave slot and loads.'),
      area, file,
      h('div', { class: 'menu' }, btn('⬆ Import from code', () => doImport(area.value), { id: 'btn-import-code' }), btn('📂 Import from file…', () => file.click(), { id: 'btn-import-file' }),
        )];
  }
  gmenu.className = ''; gmenu.innerHTML = '';
  // sticky bar: ← Back (sub-pages), ✕ Close, and the page tabs (Settings), so navigation never scrolls away
  const sub = !custom && view !== 'main';
  gmenu.append(h('div', { class: 'panel' }, h('div', { class: 'navbar closebar' + (sub ? ' withback' : '') }, sub ? btn('← Back', () => (S ? openMenu('main') : closeMenu()), { class: 'small menuback', id: 'menu-back' }) : null, btn('✕ Close', closeMenu, { class: 'small closebtn', id: 'menu-close' }), barTabs), body));
}
function doImport(text) {
  let raw; try { raw = importCode(text); } catch (e) { openMenu(null, [h('h2', {}, 'Import failed'), h('p', { class: 'warn' }, e.message), h('div', { class: 'menu' }, btn('← Back', () => openMenu('backup')))]); return; }
  const go = () => { const s2 = JSON.parse(raw); s2.savedAt = Date.now(); writeSave(G.SAVE_KEY, JSON.stringify(s2)); loadGame(G.SAVE_KEY).then(() => log('Save imported.', 'sys')); };
  if (S) confirmView('Import this save?', 'It replaces the current game. Progress since your last save will be lost.', '⬆ Import', go, 'backup'); else go();
}
const DIFF_LABEL = { story: '🌱 Story', normal: '⚔ Normal', hard: '💀 Hard' };
const DIFF_HELP = { story: 'Story: monsters have 70% HP and deal 60% damage.', normal: 'Normal: monsters as written in the SRD.', hard: 'Hard: monsters have 135% HP and deal 130% damage.' };

/* ---------- Audio: music + ambience follow the game ---------- */
let victoryUntil = 0;
function applyAudioSettings(st = loadSettings()) { setMuted(!st.sound); setSfxOn(st.sfxOn !== false); setVolumes({ music: st.music ?? 0.6, sfx: st.sfx ?? 0.8, amb: st.amb ?? 0.6 }); setVoicesEnabled(st.voices !== false && st.sound !== false); setVoiceVolume(st.voice ?? 0.85); }
function syncAudio() {
  const amb = !S ? null : S.mode === 'dungeon' ? (outNear() && !combat ? `outdoor:${outReg().weather}:${todName(outHour()).name === 'night' ? 'night' : 'day'}` : 'dungeon') : 'town';
  ambience(amb);
  if (victoryUntil > Date.now()) return;
  const track = !S ? 'title' : combat ? (combatInfo?.boss ? 'boss' : 'combat') : S.mode === 'dungeon' ? (getLevel(S.level).def.music || 'dungeon0') : 'town';
  playMusic(track);
}
applyAudioSettings();
for (const k of ['title', 'town', 'combat']) prefetchMusic(k);
setInterval(syncAudio, 1000);

/* ---------- Companion tactics ---------- */
function showTactics(only = null, back = null) {
  if (!S) return;
  const list = (only ? [only] : [...S.party, ...S.roster]).filter((c) => !G.isHero(c));
  const draw = () => openModal([h('h2', {}, '🧠 Companion Tactics'),
    h('p', { class: 'hint' }, 'How each AI-controlled companion fights. Player-controlled (YOU) companions ignore these until you switch them back to AI.'),
    list.length ? null : h('p', {}, 'No companions yet — recruit some at the Tavern.'),
    ...list.map((c) => { const t = c.tactics = { ...defaultTactics(), ...(c.tactics || {}) };
      const tog = (key, label) => h('label', { class: 'toggle' }, h('input', { type: 'checkbox', checked: t[key], 'data-tac': key, onchange: (e) => { t[key] = e.target.checked; autosave(); } }), h('span', {}, label));
      return h('div', { class: 'tactic', 'data-member': c.id },
        h('div', { class: 'row', style: 'justify-content:space-between' }, h('b', {}, `${c.name} · ${CLASSES[c.cls].name}`), h('span', { class: 'tag' }, c.ai ? 'AI' : 'YOU')),
        h('div', { class: 'seg' }, Object.entries(TACTIC_STYLES).map(([k, v]) => btn(v.name, () => { t.style = k; autosave(); draw(); }, { class: t.style === k ? 'on' : '', 'data-style': k, info: () => [v.name, v.desc] }))),
        h('p', { class: 'hint' }, TACTIC_STYLES[t.style].desc),
        h('div', { class: 'toggles' }, tog('spells', '✨ Use spell slots'), tog('potions', '🧪 Use potions'), tog('aoe', '🔥 Area spells')),
        h('label', { class: 'slider' }, h('span', {}, '❤ Heal allies below'), h('input', { type: 'range', min: 10, max: 90, step: 5, value: t.healAt, 'data-tac': 'healAt', 'aria-label': `${c.name} heal threshold`, oninput: (e) => { t.healAt = +e.target.value; e.target.nextSibling.textContent = t.healAt + '% HP'; }, onchange: () => autosave() }), h('b', {}, t.healAt + '% HP')));
    }), back ? h('div', { class: 'menu' }, btn('← Back', back, { class: 'menuback', id: 'tactics-back' })) : null]);
  draw();
}

/* ---------- Press-and-hold info popups (touch) / right-click (mouse) ---------- */
const infoPop = h('div', { id: 'infopop', class: 'hidden', role: 'tooltip' }); document.body.append(infoPop);
function findInfo(t) { for (let el = t; el && el !== document.body; el = el.parentElement) if (INFO.has(el)) return el; return null; }
function showInfo(el, x, y) {
  const lines = [].concat(INFO.get(el)() || []); if (!lines.length) return;
  infoPop.innerHTML = ''; infoPop.append(h('b', {}, lines[0]), ...lines.slice(1).map((l) => h('div', {}, l)), h('small', {}, 'Tap anywhere to close'));
  infoPop.className = ''; const r = infoPop.getBoundingClientRect();
  infoPop.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2)) + 'px';
  infoPop.style.top = Math.max(8, y - r.height - 24 < 8 ? Math.min(innerHeight - r.height - 8, y + 24) : y - r.height - 24) + 'px';
}
function hideInfo() { infoPop.className = 'hidden'; }
let holdT = null, holdXY = null, swallowClick = false;
document.addEventListener('pointerdown', (e) => {
  if (!infoPop.classList.contains('hidden')) { hideInfo(); swallowClick = true; return; }
  const el = findInfo(e.target); if (!el || e.button > 0) return; holdXY = [e.clientX, e.clientY];
  holdT = setTimeout(() => { holdT = null; swallowClick = true; showInfo(el, holdXY[0], holdXY[1]); if (navigator.vibrate) navigator.vibrate(10); }, 450);
}, true);
document.addEventListener('pointermove', (e) => { if (holdT && Math.hypot(e.clientX - holdXY[0], e.clientY - holdXY[1]) > 10) { clearTimeout(holdT); holdT = null; } }, true);
for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => { clearTimeout(holdT); holdT = null; }, true);
document.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener('contextmenu', (e) => { const el = findInfo(e.target); if (el) { e.preventDefault(); showInfo(el, e.clientX, e.clientY); } });
function memberInfo(c) {
  const t = tacticsOf(c);
  return [`${c.name} — L${c.level} ${RACES[c.race].name} ${CLASSES[c.cls].name}`, `HP ${Math.max(0, c.hp)}/${c.maxHp} · AC ${armorClass(c)} · XP ${c.xp}`,
    c.slots.length ? 'Spell slots ' + c.slots.map((n, l) => `L${l + 1}:${n}`).join(' ') : 'No spell slots',
    D.visibleConds(c.conditions).length ? 'Conditions: ' + D.visibleConds(c.conditions).map((k) => `${D.condInfo(k).icon} ${D.condInfo(k).name}`).join(', ') : 'No conditions',
    `${D.rowName(inFrontRow(c))} · ${roleOf(c)}`,
    G.isHero(c) ? 'Your hero' : `${c.ai ? 'AI' : 'Player'}-controlled · Tactics: ${TACTIC_STYLES[t.style].name}, heal below ${t.healAt}%`];
}
function monsterInfo(m) {
  const M = MONSTERS[m.key] || {};
  return [`${m.name}${M.cr != null ? ` (CR ${M.cr < 1 ? '1/' + Math.round(1 / M.cr) : M.cr})` : ''}`, `HP ${m.hp}/${m.maxHp} · AC ${m.ac ?? M.ac}`,
    ...(M.attacks || []).map((a) => `${a.name}: ${a.bonus != null ? fmtMod(a.bonus) + ' to hit, ' : ''}${a.dmg || ''} ${a.type || ''}`.trim()),
    D.knownTraits(m).length ? D.knownTraits(m).map((t) => `${D.dtype(t.type).icon} ${D.TRAIT_KINDS[t.kind].word} ${D.dtype(t.type).name} (${D.TRAIT_KINDS[t.kind].mark})`).join(' · ') : null,
    D.hiddenTraitCount(m) > 0 ? '❔ Weaknesses not yet discovered — hit it with different damage, or Study it (bonus action).' : null,
    D.visibleConds(m.conditions || {}).length ? 'Conditions: ' + D.visibleConds(m.conditions).map((k) => `${D.condInfo(k).icon} ${D.condInfo(k).name}`).join(', ') : null].filter(Boolean);
}
function spellInfo(k) { const s = SPELLS[k]; return s ? [`${s.name} — ${s.level ? 'Level ' + s.level : 'Cantrip'}${s.conc ? ' · Concentration' : ''}`, s.desc || ''] : []; }
function itemInfo(k) {
  const I = ITEMS[k]; const w = k.startsWith('w:') ? WEAPONS[k.slice(2)] : null; const a = k.startsWith('a:') ? ARMOR[k.slice(2)] : null;
  return [G.nameOf(k) + (tierOf(k) !== 'common' ? ` — ${TIER_LABEL[tierOf(k)]}` : ''), I?.heal ? `Heals ${I.heal} HP` : I?.cure ? `Cures ${I.cure}` : w ? `${w.dmg} ${w.type} · ${w.cat}${w.props?.length ? ' · ' + w.props.join(', ') : ''}` : a ? `AC ${a.base} (${a.type} armor)${a.str ? ' · needs Str ' + a.str : ''}${a.stealthDis ? ' · Stealth disadvantage' : ''}${a.metal ? ' · metal' : ''}` : k === 'shield' ? '+2 AC' : I?.desc || I?.kind || '', `Value ${G.priceOf(k)} gp`].filter(Boolean);
}

/* ---------- First-run tutorial ---------- */
const TIPS = [
  ['Welcome to Emberhollow!', 'Visit the Trading Post for gear, then head to the Edge of Town to enter the maze.'],
  ['Moving', 'Use the arrow pad (or swipe / WASD). Search with 🔎 to find secret doors and traps.'],
  ['Hold for info', 'Press and hold (or right-click) a party card, monster, item or spell to see its details.'],
  ['Your companions', 'Tap AI/YOU on a card to control a companion yourself. Set how AI companions fight under 🧠 Companion Tactics at camp or the Tavern.'],
  ['Saving', 'The game autosaves on stairs, after fights and in town. ☰ Menu has save slots, settings and export/import.'],
];
const tipEl = h('div', { id: 'tip', class: 'hidden', role: 'dialog', 'aria-label': 'Tutorial tip' }); document.body.append(tipEl);
function startTutorial() {
  const st = loadSettings(); if (st.tutorialDone) return;
  let i = 0;
  const end = () => { tipEl.className = 'hidden'; document.body.classList.remove('tipping'); const s2 = loadSettings(); s2.tutorialDone = true; saveSettings(s2); };
  const draw = () => { tipEl.className = ''; tipEl.innerHTML = ''; document.body.classList.add('tipping');
    tipEl.append(h('div', { class: 'tiphead' }, h('b', {}, `💡 ${TIPS[i][0]}`), h('small', {}, `${i + 1} / ${TIPS.length}`)), h('p', {}, TIPS[i][1]),
      h('div', { class: 'row' }, btn('Skip tips', end, { class: 'small', id: 'tip-skip' }), i < TIPS.length - 1 ? btn('Next ▶', () => { i++; draw(); }, { class: 'small primary', id: 'tip-next' }) : btn('Got it ✔', end, { class: 'small primary', id: 'tip-done' }))); };
  draw();
}

setInterval(updateMenuBtn, 500);
