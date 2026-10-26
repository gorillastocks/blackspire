import { PORTRAITS, portraitURL, randomPortrait } from './portraits.js';
import './style.css';
import * as G from './game/game.js';
import { SLOT_KEYS, slotInfo, loadSettings, saveSettings, BATTLE_SPEEDS } from './menu.js';
import { getLevel, DIRS, DIR_NAMES, W, H, LEVEL_DEFS } from './dungeon/levels.js';
import { Combat, TACTIC_STYLES, defaultTactics, tacticsOf, DIFFICULTY } from './rules/combat.js';
import { RACES, CLASSES, SKILLS, SKILL_LABEL, SPELLS, ITEMS, ABILITIES, ABILITY_NAMES, CONDITIONS, SHOP_STOCK, MONSTERS, STANDARD_ARRAY, WEAPONS, ARMOR } from './rules/data.js';
import { createCharacter, assignByPriority, roll4d6, mod, fmtMod, armorClass, weaponStats, skillMod, saveMod, spellDC, spellAttack, prof, knownSpells, xpForNext, canLevelUp, isDown, passive, reclass } from './rules/character.js';
import * as SC from './rules/spellcasting.js';
import { SPELL_FX, TYPE_COLOR, weaponKind } from './render/fx.js';
import { COMPANIONS, COMPANION_KEYS, banter } from './game/companions.js';
import { sfx, setMuted, setSfxOn, WEAPON_SFX, SPELL_SFX, SFX_NAMES } from './sfx.js';
import { play as playMusic, ambience, setVolumes, currentTrack, currentAmbience } from './audio.js';
import { writeSave, readSave, initStorage, exportCode, importCode, isNative } from './storage.js';
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

let S = null; // game state
let R = null; // renderer
let combat = null; let combatInfo = null; let busy = false; let autoBattle = false;
const speed = () => BATTLE_SPEEDS[loadSettings().battleSpeed] || BATTLE_SPEEDS.pause;
function setSpeed(k) { const st = loadSettings(); st.battleSpeed = k; st.battleSpeedSet = true; saveSettings(st); }
const modal = $('#modal');
const Story = G.Story;

/* ---------- Story dialogue (portraits, line-by-line, choices) ---------- */
function showDialogue(scene, { closable = false } = {}) {
  return new Promise((resolve) => {
    const lines = scene.lines || []; let i = 0;
    const draw = () => {
      const ln = lines[Math.min(i, lines.length - 1)] || { who: 'narrator', text: '' }; const sp = Story.speaker(ln.who); const last = i >= lines.length - 1;
      openModal([h('div', { class: 'dialogue' },
        scene.title ? h('h2', {}, scene.title) : null,
        h('div', { class: 'dlgrow' }, h('span', { class: 'dlgportrait', style: `border-color:${sp.color}` }, sp.icon || (sp.name || '?')[0]),
          h('div', { class: 'dlgtext' }, sp.name ? h('b', { style: `color:${sp.color}` }, sp.name) : null, h('p', { class: ln.who === 'narrator' ? 'lore' : '' }, ln.text))),
        h('div', { class: 'hint' }, `${Math.min(i + 1, lines.length)} / ${lines.length}`),
        h('div', { class: 'menu' }, last
          ? (scene.choices?.length ? scene.choices : [{ id: 'ok', label: 'Continue ▶' }]).map((c) => btn(c.label, () => { closeModal(); resolve(c.id); }, { class: 'primary', 'data-choice': c.id, id: 'dlg-next' }))
          : [btn('Next ▶', () => { i++; draw(); }, { class: 'primary', id: 'dlg-next' }), btn('Skip ⏭', () => { i = lines.length - 1; draw(); }, { class: 'small', id: 'dlg-skip' })]))], { closable });
    };
    draw();
  });
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
function showJournal(back) {
  const qs = Story.questList(S);
  openModal([h('div', { class: 'navbar' }, h('h2', {}, '📖 Journal'), btn('Close', () => (back ? back() : closeModal()), { id: 'btn-journal-close' })),
    h('p', { class: 'hint' }, `Moon ${Math.min(5, (S.moon | 0) + 1)} of 5 · Seals broken: ${Story.sealsBroken(S)}/5${Story.empowered(S) ? ' · ⚠ Malthrax is EMPOWERED' : ''}`),
    h('h3', {}, 'Quests'), h('div', { class: 'menu' }, qs.map((q) => h('p', {}, h('b', {}, `${q.status === 'done' ? '✔' : q.status === 'ready' ? '❗' : '•'} ${q.title || q.id}`), q.progress ? ` (${q.progress})` : '', q.desc ? h('br') : null, q.desc ? h('span', { class: 'hint' }, q.desc) : null))),
    h('h3', {}, `Elowen's notes (${(S.notes || []).length}/10)`), ...(S.notes || []).map((n) => h('p', { class: 'lore' }, typeof n === 'string' ? n : Story.NOTES[n - 1] || '')),
    h('h3', {}, 'Entries'), ...(S.journal || []).slice().reverse().map((j) => h('p', { class: 'hint' }, j))], { closable: true });
}
function showTownFolk() {
  openModal([h('h2', {}, 'Emberhollow Folk'), h('div', { class: 'menu' }, Story.TOWNFOLK.map((k) => { const sp = Story.speaker(k);
    return btn(`${sp.icon} ${sp.name} — ${Story.townfolkStatus(S, k)}`, async () => { const r = Story.talkTo(S, k); handle(r.out); autosave(); await showDialogue({ lines: r.scene.lines }, { closable: true }); showTownFolk(); }, { 'data-npc': k }); })),
    btn('← Back', () => showTown(), { class: 'backbtn' })], { closable: false, cls: 'transparent' });
}

/* ---------- Log & banter ---------- */
function log(t, cls = '') {
  const el = $('#log'); el.append(h('div', { class: cls }, t)); while (el.children.length > 200) el.firstChild.remove(); el.scrollTop = el.scrollHeight;
  // while a dialog is open the log is underneath it, so also echo the message inside the dialog itself
  const out = !modal.classList.contains('hidden') && modal.querySelector('.dlgout');
  if (out) { out.hidden = false; out.append(h('div', { class: cls }, t)); while (out.children.length > 8) out.firstChild.remove(); out.scrollTop = out.scrollHeight; out.scrollIntoView({ block: "nearest" }); }
}
function say(b) {
  if (!b) return; const el = h('div', { class: 'bubble' }, h('b', { style: `color:${b.color}` }, b.who + ':'), b.text);
  $('#banter').append(el); log(`${b.who}: "${b.text}"`, 'lore'); setTimeout(() => el.remove(), 4200);
  while ($('#banter').children.length > 2) $('#banter').firstChild.remove();
  placeBanter();
}
/** In combat, companion speech bubbles go in the free band under the monsters (and under any caption), or above the
 *  monsters if that band is full; if neither fits they stay hidden (the line is in the log anyway). Never over a monster. */
function placeBanter() {
  const bn = $('#banter'); bn.classList.remove('offband'); bn.style.top = '';
  if (!combat || !R?.monsterRect || !bn.children.length) return;
  const view = $('#view').getBoundingClientRect(), r = R.monsterRect(); if (!r || !view.height) return;
  const hb = bn.offsetHeight; let bottom = view.bottom - 6;
  for (const sel of ['#cmenu', '#modal.combat .panel']) { const m = document.querySelector(sel); if (!m || !m.offsetParent) continue; const b = m.getBoundingClientRect(); if (b.height && b.top < bottom && b.bottom > view.top) bottom = Math.min(bottom, b.top - 6); }
  const cap = $('#caption'), cr = cap.classList.contains('show') ? cap.getBoundingClientRect() : null;
  let top = view.top + (r.bottom / 100) * view.height + 6; if (cr && cr.height) top = Math.max(top, cr.bottom + 6);
  if (top + hb <= bottom) { bn.style.top = `${top - view.top}px`; return; }
  const above = view.top + (r.top / 100) * view.height - 6 - hb, hud = $('#hud').getBoundingClientRect();
  if (above >= Math.max(view.top + 4, hud.bottom + 2)) { bn.style.top = `${above - view.top}px`; return; }
  bn.classList.add('offband');
}
function handle(events) {
  for (const e of events || []) {
    if (e.dm) { log(e.log, e.cls); if (loadSettings().areaDesc !== false && !combat) queueMessage({ text: e.log, cls: 'lore', quip: e.quip }); else if (e.quip) say(e.quip); } // Dungeon Master read-aloud
    else if (e.log) { log(e.log, e.cls); if (!combat && S?.mode === 'dungeon' && (e.card || e.cls === 'lore')) queueMessage(e.log, e.cls); } if (e.banter) say(e.banter); if (e.bump) { R.bump(); sfx('bump'); } if (e.shake) { R.shake(); flashRed(); sfx('hurt'); }
    if (e.sfx) sfx(e.sfx);
    if (e.reveal || e.sfx === 'door' || e.sfx === 'chest') rebuild();
    if (e.toTown) { autosave(); showTown(); return; }
    if (e.combat) { startCombat(e.combat); return; }
    if (e.prompt) { if (msgRunning) messagesDone().then(() => S && !combat && prompt(e.prompt, e)); else prompt(e.prompt, e); } // read the card first
  }
  refresh();
}
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
function portraitGrid(sel, onPick, { random = true } = {}) {
  return h('div', { class: 'pgrid', id: 'pgrid', role: 'listbox', 'aria-label': 'Choose a portrait' },
    random ? h('button', { class: `pick prand ${sel === null ? 'on' : ''}`, id: 'pick-random', title: 'Random portrait', onclick: () => onPick(null) }, '🎲') : null,
    PORTRAITS.map((p) => h('button', { class: `pick ${sel === p.id ? 'on' : ''}`, 'data-pid': p.id, title: `${RACES[p.race].name} ${CLASSES[p.cls].name}`, onclick: () => onPick(p.id) }, h('img', { src: portraitURL(p.id), alt: '' }))));
}
function showPortraitPicker(c, back) {
  openModal([h('h2', {}, `Portrait — ${c.name}`), portraitGrid(c.portrait, (i) => { c.portrait = i === null ? randomPortrait(c.race, c.cls) : i; autosave(); refresh(); back(); }),
    h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px' }, btn('Cancel', back))], { closable: true });
}
function renderParty() {
  const el = $('#party'); el.innerHTML = '';
  if (!S) return;
  const cur = combat && combat.state === 'running' ? combat.current() : null;
  S.party.forEach((c, i) => {
    const pct = Math.max(0, c.hp) / c.maxHp * 100;
    const conds = Object.keys(c.conditions).filter((k) => !['mageArmor', 'aid'].includes(k));
    const card = h('div', { class: `card ${cur === c ? 'active' : ''} ${c.dead ? 'dead' : c.hp <= 0 ? 'down' : ''}`, id: 'card-' + c.id, onclick: () => showSheet(c), info: () => memberInfo(c) },
      h('div', { class: 'nm' }, h('span', { class: 'nmw' }, portrait(c, 'cport'), h('span', { class: 'cnm', title: c.name }, `${i < 2 ? '⚔' : '🏹'} ${c.name}`), canLevelUp(c) ? h('span', { class: 'lvchip', title: 'Ready to level up! Make camp or visit the Training Grounds', 'aria-label': 'Ready to level up' }, '⬆') : null),
        !G.isHero(c) ? h('button', { class: `aitog small ${c.ai ? 'on' : ''}`, title: 'Toggle AI / player control', onclick: (e) => { e.stopPropagation(); c.ai = !c.ai; log(`${c.name} is now ${c.ai ? 'AI-controlled' : 'player-controlled'}.`, 'sys'); refresh(); if (combat) combatLoop(); } }, c.ai ? 'AI' : 'YOU') : h('span', { class: 'tag' }, 'YOU')),
      h('div', { class: 'sub' }, `L${c.level} ${RACES[c.race].name} ${CLASSES[c.cls].name} · AC ${armorClass(c)}`),
      h('div', { class: `bar hp ${pct < 30 ? 'low' : ''}` }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'row', style: 'justify-content:space-between;font-size:11px' }, h('span', {}, c.dead ? 'DEAD' : c.hp <= 0 ? `DOWN ${c.deathSaves.s}✓${c.deathSaves.f}✗` : `HP ${c.hp}/${c.maxHp}`),
        c.slots.length ? h('span', { class: 'slots' }, 'Slots ' + c.slots.map((n, l) => `${l + 1}:${n}`).join(' ')) : null),
      conds.length ? h('div', { class: 'conds' }, conds.join(', ')) : null,
      null);
    el.append(card);
  });
}
function checkReady() {
  if (!S) return;
  for (const c of G.newlyReady(S)) { log(`⬆ ${c.name} is ready to level up! Make camp or visit the Training Grounds.`, 'crit'); say({ who: c.name, color: '#ffd34d', text: 'Ready to level up! Make camp or visit the Training Grounds.' }); }
}
function refresh() { checkReady(); renderParty(); drawMinimap($('#minimap')); renderHud(); syncAudio(); }
function renderHud() {
  const el = $('#hud'); if (!S) { el.innerHTML = ''; return; }
  if (S.mode === 'dungeon') el.innerHTML = `<span>${getLevel(S.level).def.name}</span><span>⌖ ${S.x},${S.y} · ${DIR_NAMES[S.dir]} · ${S.gold} gp</span>`;
  else el.innerHTML = `<span>Emberhollow</span><span>${S.gold} gp · 🥄 ${S.spoons}</span>`;
}

/* ---------- Minimap ---------- */
const MAPCOL = { Q: '#ffd77a', '#': null, '.': '#2a2448', D: '#c08040', d: '#6b4a2a', L: '#ff3050', '<': '#80a0ff', '>': '#40ffd0', C: '#ffc040', o: '#665522', T: '#2a2448', t: '#ff3030', K: '#ffd040', E: '#2a2448', B: '#ff2040', M: '#b060ff', F: '#30a0ff', f: '#203040', A: '#ffd040', S: null };
function drawMinimap(cv, big = false) {
  const g = cv.getContext('2d'); g.fillStyle = '#05030b'; g.fillRect(0, 0, cv.width, cv.height);
  if (!S || S.mode !== 'dungeon') { g.fillStyle = '#3b2d6b'; g.font = '14px monospace'; g.fillText('Town', 10, 20); return; }
  // small minimap: 13x13 window centred on the party; big map: whole level
  const span = big ? W : 13; const cs = cv.width / span;
  const ox = big ? 0 : S.x - (span >> 1), oy = big ? 0 : S.y - (span >> 1);
  const ex = new Set(S.explored[S.level]);
  const theme = '#' + getLevel(S.level).def.color.toString(16).padStart(6, '0');
  for (let sy = 0; sy < span; sy++) for (let sx = 0; sx < span; sx++) {
    const x = ox + sx, y = oy + sy; const X = sx * cs, Y = sy * cs;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (!ex.has(`${x},${y}`)) { g.strokeStyle = '#1a1430'; g.lineWidth = 1; g.strokeRect(X + 0.5, Y + 0.5, cs - 1, cs - 1); continue; }
    const ch = G.tile(S, x, y);
    if (ch === '#' || ch === 'S') { g.fillStyle = theme + '66'; g.fillRect(X, Y, cs, cs); continue; }
    let col = MAPCOL[ch] || '#2a2448'; if (ch === 'B' && S.bossDead[S.level]) col = '#2a2448';
    g.fillStyle = col; g.fillRect(X + 0.5, Y + 0.5, cs - 1, cs - 1);
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
    b('🔍 Search', doSearch, 'act', 'Search (F)'); b('⛺ Camp', () => { healSel = null; showCamp(); }, 'act', 'Camp (C)'); b('🗺 Map', showMap, 'act', 'Map (M)');
    b('📜 Sheet', () => showSheet(S.party[0]), 'act', 'Character sheet (I)'); b('🎒 Items', showInventory, 'act', 'Inventory (B)'); b('💾 Save', () => { autosave(); log('Game saved.', 'sys'); }, 'act', 'Save (P)');
  }
}
function act(f) { const ev = f(); R.setView(S.x, S.y, S.dir); if (ev.some?.((e) => !e.bump)) sfx('step'); handle(ev); }
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
  if (e.key.toLowerCase() === 'j' && modal.classList.contains('hidden') && S.mode === 'dungeon' && !busy) { e.preventDefault(); showJournal(); return; }
  if (!modal.classList.contains('hidden')) { if (e.key === 'Escape') { if (modal.dataset.closable) dismissModal(); else if (S.mode === 'town' && townSub) showTown(); } return; }
  if (S.mode !== 'dungeon' || busy || msgRunning) return;
  const k = e.key.toLowerCase();
  const map = { arrowup: () => G.move(S, 0), w: () => G.move(S, 0), arrowdown: () => G.move(S, 2), s: () => G.move(S, 2), arrowleft: () => G.turn(S, -1), a: () => G.turn(S, -1), arrowright: () => G.turn(S, 1), d: () => G.turn(S, 1), q: () => G.move(S, 3), e: () => G.move(S, 1) };
  if (map[k]) { e.preventDefault(); act(map[k]); return; }
  if (k === 'f' || k === ' ') { e.preventDefault(); doSearch(); }
  if (k === 'c') showCamp(); if (k === 'm') showMap(); if (k === 'i') showSheet(S.party[0]); if (k === 'b') showInventory(); if (k === 'p') { autosave(); log('Game saved.', 'sys'); }
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
function openModal(content, { closable = true, cls = '' } = {}) {
  modal.className = cls; modal.innerHTML = ''; modal.dataset.closable = closable ? '1' : '';
  const p = h('div', { class: 'panel' }, content, h('div', { class: 'dlgout', 'aria-live': 'polite', hidden: true })); modal.append(p);
  if (closable) p.prepend(h('div', { class: 'navbar closebar' }, btn('✕ Close', dismissModal, { class: 'small closebtn', 'aria-label': 'Close' })));
  return p;
}
function closeModal() { modal.className = 'hidden'; modal.innerHTML = ''; }
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
      btn('⚙ Settings', () => openMenu('settings'), { id: 'btn-title-settings' }),
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
  <tr><th>Combat</th><td>Number keys pick menu entries; click monster tags to target. Front two party slots fight in melee; back row uses ranged weapons and spells.</td></tr></table>
  <p>Companions can be AI- or player-controlled — tap the <b>AI/YOU</b> toggle on their card. Level up at the Training Grounds in town, or with Level Up in the Camp menu.</p>` })]);
}
function showCredits() {
  openModal([h('h2', {}, 'Credits'), h('div', { html: `<p>Rules content from the <b>System Reference Document 5.1</b> by Wizards of the Coast LLC, licensed under <a style="color:#22e6ff" href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">CC-BY-4.0</a>. Blackspire is unofficial Fan Content and is not affiliated with Wizards of the Coast.</p>
  <p>3D monster, chest and torch models by <b>Quaternius</b> (quaternius.com), CC0 1.0 — via the Easy Enemy, Animated Dinosaur, Ultimate Animated Animal, Platformer Game Kit, Cyberpunk Game Kit and Modular Dungeon packs.</p>
  <p>Music, ambience and sound effects are original, generated live in your browser with WebAudio — no third-party audio.</p>
  <p>Built with three.js (MIT), Vite (MIT) and Capacitor (MIT). Game code MIT.</p>` })]);
}
function showCreate(asRecruit = false) {
  const recruit = asRecruit === true;
  let race = 'human', cls = 'fighter', base = assignByPriority('fighter'), name = recruit ? 'Recruit' : 'Ser Aldric', method = 'array', diff = 'normal', randomDun = false, pic = null;
  const draw = () => {
    const p = openModal([], { closable: true });
    const R_ = RACES[race], C = CLASSES[cls];
    const final = {}; for (const a of ABILITIES) final[a] = base[a] + (R_.bonus[a] || 0);
    p.append(h('h2', {}, recruit ? 'Create a New Recruit' : 'Create Your Adventurer'), recruit ? h('p', { class: 'hint' }, `Recruits join at level ${G.partyLevel(S)} (near your party). If the party is full they wait in the Tavern roster.`) : '',
      h('div', { class: 'cols' },
        h('div', {}, h('h3', {}, 'Name'), h('input', { id: 'cname', value: name, maxlength: 18, oninput: (e) => { name = e.target.value; } }),
          h('h3', {}, 'Portrait'), portraitGrid(pic, (i) => { pic = i; draw(); }),
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
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, recruit ? btn('Recruit ▶', () => { const ev = G.createRecruit(S, { name, race, cls, base, portrait: pic }); handle(ev); autosave(); spellStep(ev.char, 'create', null, () => { autosave(); showTown(townSub); }); }, { class: 'primary', id: 'btn-recruit-create' }) : btn('Begin Adventure ▶', () => {
        S = G.newGame({ name: (name || 'Hero').trim().slice(0, 18), race, cls, base, randomDungeons: randomDun, portrait: pic }); S.difficulty = diff;
        log(`Welcome to Emberhollow, ${name}. Three oddballs have agreed to join you…`, 'sys');
        for (const c of S.party.filter((c) => c.companion)) say({ who: COMPANIONS[c.companion].short, color: COMPANIONS[c.companion].color, text: COMPANIONS[c.companion].lines.combatStart[0] });
        spellStep(G.heroOf(S), 'create', null, () => runPrologue());
      }, { class: 'primary', id: 'btn-begin' })));
  };
  draw();
}

/* ---------- Town ---------- */
let townSub = null; let townVisited = false;
function showTown(sub = null) {
  townSub = sub; const arriving = S.mode !== 'town' || !townVisited; townVisited = true;
  S.mode = 'town'; combat = null; endCombatUI(); setControls(null); R.setMode('combat'); R.clearMonsters(); refresh();
  if (arriving) autosave(); // autosave on every town entry
  const back = (where) => btn('← Back to Town Square', () => showTown(), { class: 'backbtn', 'data-back': where });
  const P = (content) => openModal([h('div', { class: 'navbar' }, h('h2', {}, sub ? `Emberhollow · ${{ tavern: 'Tavern', temple: 'Temple', shop: 'Trading Post', train: 'Training Grounds', edge: 'Edge of Town' }[sub]}` : 'Emberhollow'), sub ? back('top') : null), content, sub ? h('div', { style: 'margin-top:10px' }, back('bottom')) : null], { closable: false, cls: 'transparent' });
  if (!sub) {
    P(h('div', { class: 'menu grid' },
      btn('🍺 The Boar & Spoon Tavern', () => showTown('tavern'), { id: 'btn-tavern' }),
      btn(S.flags?.freeInn ? '🛏 Inn (long rest, free)' : '🛏 Inn (long rest, 10 gp)', () => { handle(G.innRest(S)); say(banter(S.party, 'rest', {}, 1)); }),
      btn('⛪ Temple of Cant', () => showTown('temple')),
      btn('⚒ Fizzbang\'s Trading Post', () => showTown('shop'), { id: 'btn-shop' }),
      btn('🎯 Training Grounds', () => showTown('train'), { id: 'btn-train' }),
      btn('🗣 Town Folk (quests)', () => showTownFolk(), { id: 'btn-folk' }),
      btn('📖 Journal', () => showJournal(() => showTown()), { id: 'btn-journal' }),
      btn('🕳 Edge of Town — Enter the Maze', () => showTown('edge'), { id: 'btn-edge', class: 'primary' }),
      btn('💾 Save Game', () => { autosave(); log('Game saved.', 'sys'); }),
      btn('📂 Load Game', () => loadGame()),
      btn('⏏ Title Screen', () => { closeModal(); showTitle(); })));
    handle(G.Narr.townIntro(S, null));
    return;
  }
  if (sub === 'tavern') {
    P([h('h3', {}, 'The Boar & Spoon — your party'), partyOrderList(() => showTown('tavern')), btn('🧠 Companion Tactics', () => showTactics(null, () => showTown('tavern')), { id: 'btn-tavern-tactics', class: 'small' }),
      h('h3', {}, 'Chatter at the bar'), ...S.party.filter((c) => c.companion).map((c) => h('p', {}, h('b', { style: `color:${COMPANIONS[c.companion].color}` }, c.name + ': '), COMPANIONS[c.companion].blurb)),
      btn('🗣 Listen in', () => log(G.campDialogue(S), 'lore')),
      h('h3', {}, `Roster — waiting at the bar (party ${S.party.length}/4)`),
      S.roster.length ? h('div', { class: 'menu', id: 'roster' }, S.roster.map((c) => h('div', { class: 'row' }, portrait(c), h('span', { style: 'flex:1' }, `${c.name} — L${c.level} ${CLASSES[c.cls].name}${c.dead ? ' (DEAD — raise at the Temple)' : ''}`),
        btn('Join party', () => { handle(G.rejoin(S, c)); autosave(); showTown('tavern'); }, { class: 'small', disabled: S.party.length >= 4 })))) : h('p', { class: 'hint' }, 'Nobody is waiting. Dismissed members stay here, so you can bring them back (or raise them at the Temple) later.'),
      h('h3', {}, `Adventurers for hire (join at level ${G.partyLevel(S)})`),
      h('div', { class: 'menu', id: 'hire' }, G.availableCompanions(S).map((k) => { const C = COMPANIONS[k]; return h('div', { class: 'hirecard' }, h('p', {}, h('b', { style: `color:${C.color}` }, `${C.name} — ${RACES[C.race].name} ${CLASSES[C.cls].name}: `), C.blurb),
        btn(`Recruit ${C.short}${S.party.length >= 4 ? ' (to roster)' : ''}`, () => { handle(G.recruitCompanion(S, k)); autosave(); showTown('tavern'); }, { class: 'small', 'data-recruit': k })); })),
      btn('✍ Create a new recruit (full creator)', () => showCreate(true), { id: 'btn-new-recruit' })]);
  } else if (sub === 'temple') {
    P([h('h3', {}, 'Temple of Cant — "Healing by donation (mandatory)"'), h('div', { class: 'menu' }, [...S.party, ...S.roster].map((c) => { const cost = G.templeCost(c); return btn(`${c.name}: ${c.dead ? 'Raise Dead' : c.conditions.poisoned ? 'Cure poison' : c.hp < c.maxHp ? 'Heal wounds' : 'Healthy'} ${cost ? `(${cost} gp)` : ''}`, () => { handle(G.templeHeal(S, c)); showTown('temple'); }, { disabled: !cost }); }))]);
  } else if (sub === 'shop') {
    const p = P([]); const body = h('div');
    body.append(h('h3', {}, `Fizzbang's Trading Post — you have ${S.gold} gp`), h('div', { class: 'cols' },
      h('div', {}, h('h3', {}, 'Buy'), h('div', { class: 'menu' }, SHOP_STOCK.map((k) => btn(`${G.nameOf(k)} — ${G.priceOf(k)} gp`, () => { handle(G.buy(S, k)); showTown('shop'); }, { disabled: S.gold < G.priceOf(k), class: 'small' })))),
      h('div', {}, h('h3', {}, 'Sell / Equip'), inventoryList(() => showTown('shop'), true))));
    p.insertBefore(body, p.lastChild);
  } else if (sub === 'train') {
    P([h('h3', {}, 'Training Grounds'), h('div', { class: 'menu' }, S.party.map((c) => h('div', { class: 'row' },
      btn(canLevelUp(c) ? `⬆ Train ${c.name} to level ${c.level + 1}` : `${c.name} — L${c.level} (${c.xp}/${xpForNext(c) === Infinity ? 'max' : xpForNext(c)} XP)`, () => trainWithSpells(c, () => showTown('train')), { disabled: !canLevelUp(c) }),
      SC.preparedMax(c) ? btn('📖 Prepare', () => showSpellPicker(c, 'prepare', null, () => showTown('train')), { class: 'small', 'data-prepare': c.id }) : null,
      (c.companion || c.recruit) ? btn('Re-class', () => reclassMenu(c), { class: 'small' }) : null,
      btn('Sheet', () => showSheet(c), { class: 'small' })))),
      h('p', { class: 'hint' }, 'Re-class: retrain a companion or recruit into any of the 12 classes at the same level (50 gp per level).'),
      btn('✍ Create a new recruit', () => showCreate(true), { id: 'btn-train-recruit' })]);
  } else if (sub === 'edge') {
    P([h('h3', {}, 'Edge of Town'), h('p', { class: 'hint' }, 'The maze entrance yawns before you. The dwarven mine lift can take you to any level you have already reached.'),
      h('div', { class: 'menu' }, btn('Descend the stairs to B1', () => enter(0), { class: 'primary', id: 'btn-enter' }),
        ...LEVEL_DEFS.map((_, l) => l).filter((l) => l > 0 && l <= S.maxDepth).map((l) => btn(`Mine lift to ${LEVEL_DEFS[l].name}`, () => enter(l))))]);
  }
  if (sub) handle(G.Narr.townIntro(S, sub));
}
function enter(l) { closeModal(); handle(G.enterDungeon(S, l)); startDungeon(); say(banter(S.party, 'stairs', {}, 1)); autosave(); }
async function startDungeon() {
  R.setMode('dungeon'); setControls('dungeon'); await rebuild(); R.setView(S.x, S.y, S.dir, true); refresh();
}
let lastBuiltLevel = -1;
async function rebuild() { if (!S || S.mode !== 'dungeon') return; await R.buildLevel(S, (x, y) => G.tile(S, x, y), getLevel(S.level).def); lastBuiltLevel = S.level; }
function partyOrderList(redraw) {
  return h('div', { class: 'menu' }, S.party.map((c, i) => h('div', { class: 'row' }, portrait(c), h('span', { style: 'flex:1' }, `${i + 1}. ${c.name} (${CLASSES[c.cls].name}) ${i < 2 ? '— front row' : '— back row'}`),
    btn('▲', () => { if (i > 0) { [S.party[i - 1], S.party[i]] = [S.party[i], S.party[i - 1]]; redraw(); refresh(); } }, { class: 'small', disabled: i === 0 }),
    btn('▼', () => { if (i < S.party.length - 1) { [S.party[i + 1], S.party[i]] = [S.party[i], S.party[i + 1]]; redraw(); refresh(); } }, { class: 'small', disabled: i === S.party.length - 1 }),
    !G.isHero(c) ? btn(c.ai ? 'AI' : 'YOU', () => { c.ai = !c.ai; redraw(); refresh(); }, { class: 'small aitog ' + (c.ai ? 'on' : '') }) : null,
    !G.isHero(c) ? btn('Dismiss', () => { handle(G.dismiss(S, c)); autosave(); redraw(); }, { class: 'small dismiss', title: 'Send to the Tavern roster' }) : null)));
}

/* ---------- Prompts in the dungeon ---------- */
function prompt(kind, e = {}) {
  if (kind === 'poi') {
    openModal([h('h2', {}, e.title), h('p', { class: 'lore' }, e.text), h('div', { class: 'menu' }, e.choices.map((c) => btn(c.label, () => {
      closeModal(); const ev = Story.choosePoi(S, e.poi, c.id, (sk, dc) => G.partyCheck(S, sk, dc));
      if (ev.consumed) G.setTile(S, S.x, S.y, '.'); handle(ev); rebuild();
    })))], { closable: false });
    return;
  }
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
    if (!S.flags.ending) { S.flags.ending = true; autosave(); showDialogue(Story.endingScene(S)).then(() => prompt('altar')); return; }
    sfx('victory');
    openModal([h('h1', {}, 'VICTORY!'), h('p', {}, 'The Blackspire is dark. Princess Elowen is home, and Emberhollow is free. Arise, Knight of the Dawn.'),
      h('p', { class: 'lore' }, 'Somewhere far below, a sixth seal stirs. And Malthrax\'s staff was never found…'),
      h('p', { class: 'hint' }, `Steps taken: ${S.steps} · Spoons: ${S.spoons} · Party levels: ${S.party.map((c) => c.level).join('/')}`),
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
function showCamp() {
  const p = openModal([h('h2', {}, '⛺ Camp'), h('div', { class: 'menu grid' },
    btn('☕ Short Rest (1 hr: hit dice, 2nd wind, arcane recovery)', () => { closeModal(); handle(G.rest(S, 'short')); }),
    btn('🌙 Long Rest (8 hrs, full recovery, risky)', () => { closeModal(); handle(G.rest(S, 'long')); }),
    btn('🗣 Talk with companions', () => { log(G.campDialogue(S), 'lore'); }, { id: 'btn-talk' }),
    btn('✨ Cast Mage Armor on wizard', () => { const w = S.party.find((c) => c.cls === 'wizard' && !c.equip.armor && !c.dead && c.slots[0] > 0 && knownSpells(c).includes('mageArmor')); if (!w) { log('No wizard with a free slot and Mage Armor prepared needs it.', 'dim'); return; } w.slots[0]--; w.conditions.mageArmor = true; log(`${w.name} casts Mage Armor (AC ${armorClass(w)}).`, 'spell'); refresh(); }),
    btn('🧠 Companion Tactics', () => showTactics(null, showCamp), { id: 'btn-camp-tactics' }),
    btn('💾 Save', () => { autosave(); log('Game saved.', 'sys'); }), btn('📂 Load', () => loadGame())),
  h('h3', { id: 'camp-levelup' }, '⬆ Level Up'),
  (() => { const ready = S.party.filter((c) => canLevelUp(c)); return ready.length
    ? h('div', { class: 'menu' }, ready.map((c) => btn(`⬆ Level up ${c.name} to level ${c.level + 1}`, () => trainWithSpells(c, showCamp), { class: 'levelup', 'data-levelup': c.id })))
    : h('p', { class: 'hint' }, 'Nobody has enough XP to level up yet.'); })(),
  h('h3', { id: 'camp-heal' }, '✚ Heal'), campHealSection(),
  h('h3', { id: 'camp-prepare' }, '📖 Prepare spells'),
  (() => { const preps = S.party.filter((c) => !c.dead && SC.preparedMax(c)); return preps.length
    ? h('div', { class: 'menu' }, preps.map((c) => btn(`📖 ${c.name} — ${SC.casterType(c.cls) === 'book' ? 'from spellbook' : 'from the ' + CLASSES[c.cls].name + ' list'} (${SC.preparedMax(c)} prepared)`, () => showSpellPicker(c, 'prepare', null, showCamp), { 'data-prepare': c.id })))
    : h('p', { class: 'hint' }, 'Nobody in the party prepares spells.'); })(),
  h('h3', {}, 'Marching order'), partyOrderList(showCamp)]);
  void p;
}

/* ---------- Spell selection (SRD) ---------- */
function trainWithSpells(c, back) {
  const prev = SC.snapshot(c), lv = c.level; const ev = G.train(S, c); autosave();
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

/* ---------- Map ---------- */
function showMap() { const cv = h('canvas', { class: 'bigmap', width: 420, height: 420 }); openModal([h('h2', {}, getLevel(S.level).def.name), cv, h('p', { class: 'hint' }, 'Gold: chests · Cyan: stairs down · Red: locked/boss · Purple: messages · Blue: fountain')]); drawMinimap(cv, true); }

/* ---------- Inventory ---------- */
function inventoryList(redraw, shop = false) {
  const inv = S.inventory;
  if (!inv.length) return h('p', { class: 'hint' }, 'Empty.');
  return h('div', { class: 'menu' }, inv.map((k, i) => {
    const I = ITEMS[k]; const kind = I?.kind || (k.startsWith('w:') ? 'weapon' : k.startsWith('a:') || k === 'shield' ? 'armor' : '');
    return h('div', { class: 'row' }, h('span', { style: 'flex:1', class: 'itemname', info: () => itemInfo(k), tabindex: 0 }, G.nameOf(k)),
      kind === 'potion' ? h('select', { class: 'small', onchange: (e) => { const c = S.party[+e.target.value]; handle(G.usePotion(S, i, c)); redraw(); } }, h('option', {}, 'Use on…'), S.party.map((c, j) => h('option', { value: j }, c.name))) : null,
      ['weapon', 'armor', 'ring', 'cloak'].includes(kind) ? h('select', { class: 'small', onchange: (e) => { const c = S.party[+e.target.value]; handle(G.equip(S, c, i)); redraw(); } }, h('option', {}, 'Equip on…'), S.party.map((c, j) => h('option', { value: j }, c.name))) : null,
      shop && kind !== 'key' ? btn(`Sell ${Math.floor(G.priceOf(k) / 2)}gp`, () => { handle(G.sell(S, i)); redraw(); }, { class: 'small' }) : null);
  }));
}
function showInventory() { const draw = () => openModal([h('h2', {}, `🎒 Party Inventory — ${S.gold} gp · 🥄 ${S.spoons}`), inventoryList(draw)]); draw(); }

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
        ...[['HP', `${Math.max(0, c.hp)} / ${c.maxHp}`], ['Armor Class', armorClass(c)], ['Proficiency', fmtMod(prof(c))], ['Initiative', fmtMod(mod(c.scores.dex))], ['Speed', `${Rr.speed} ft`], ['Hit Dice', `${c.hitDice}d${C.hitDie} / ${c.level}`],
          ['XP', `${c.xp} / ${xpForNext(c) === Infinity ? 'MAX' : xpForNext(c)}`], ['Passive Perception', passive(c, 'perception')],
          ['Melee', w ? `${w.name} ${fmtMod(w.bonus)} · ${w.dmg}${fmtMod(w.dmgBonus)} ${w.type}` : '—'], ['Ranged', r ? `${r.name} ${fmtMod(r.bonus)} · ${r.dmg}${fmtMod(r.dmgBonus)}` : '—'],
          ['Armor', `${c.equip.armor ? ARMOR[c.equip.armor.base].name + (c.equip.armor.magic ? ' +' + c.equip.armor.magic : '') : c.conditions.mageArmor ? 'Mage Armor' : 'None'}${c.equip.shield ? ' + Shield' : ''}`],
          ['Magic', [c.equip.ring, c.equip.cloak].filter(Boolean).map((k) => ITEMS[k].name).join(', ') || '—'],
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms * speed().f));
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
function hideCaption() { clearTimeout(capTimer); const el = $('#caption'); el.className = ''; el.innerHTML = ''; document.body.classList.remove('capcover'); captionDown(); placeBanter(); }
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
/* ---------- Exploration message cards: clues, notes, wall writings, discoveries ---------- */
const msgQueue = []; let msgRunning = null;
function queueMessage(text, cls = 'lore') { msgQueue.push(typeof text === 'object' ? text : { text, cls }); if (!msgRunning) msgRunning = pumpMessages(); return msgRunning; }
async function pumpMessages() {
  document.body.classList.add('msgup');
  try {
    while (msgQueue.length) {
      const m = msgQueue.shift(); const el = $('#caption'); clearTimeout(capTimer);
      el.className = `show msg ${m.cls === 'loot' ? 'loot crit' : m.cls === 'bad' ? 'bad' : m.cls === 'good' ? 'good' : 'lore'}`; el.innerHTML = ''; capShownAt = performance.now();
      el.append(h('div', { class: 'captxt' }, m.text), m.lines ? h('div', { class: 'caploot' }, m.lines.map((l) => h('div', {}, l))) : '', h('div', { class: 'captap' }, '▶ Tap to continue'));
      placeCaption(el); requestAnimationFrame(() => placeCaption(el)); setTimeout(() => el.classList.contains('show') && placeCaption(el), 400);
      await tapToContinue(() => true, m.cls === 'loot' ? 1000 : 220); // a stray tap from the last fight can't skip the victory card unread
      if (m.quip) say(m.quip); // a companion reacts once the card is read
    }
  } finally { msgRunning = null; document.body.classList.remove('msgup'); }
}
/** Resolves once every queued message card has been read (combat waits for them). */
const messagesDone = () => msgRunning || Promise.resolve();
/** Combat watchdog: whatever happens, the caption layer can never leave combat stalled. */
setInterval(() => {
  if (tapPending) return; const cap = $('#caption');
  if (cap.classList.contains('show') && cap.querySelector('.captap') && performance.now() - capShownAt > 2000) hideCaption(); // a tap-caption nobody is waiting on
  if (!cap.classList.contains('show') && document.body.classList.contains('capup') && !capDownPending()) captionDown(true); // menu/log left collapsed
  if (!tapCatch.classList.contains('hidden')) tapCatch.className = 'hidden'; // catcher left over without a waiter
}, 1000);
async function startCombat(info) {
  if (combat) return; await messagesDone(); if (combat) return;
  closeModal(); busy = true;
  document.body.classList.add('incombat'); $('#cmenu').innerHTML = '<div class="who dim">Combat begins…</div>';
  const theme = getLevel(S.level).def.color;
  combatInfo = info; lootBase = snapLoot();
  combat = new Combat(S.party, info.groups, { inventory: S.inventory, boss: !!info.boss, canFlee: !info.boss && !info.town, difficulty: S.difficulty || 'normal', story: info.town ? {} : G.combatOpts(S, info) });
  R.setMode('combat'); sfx('encounter');
  await R.showMonsters(combat.monsters, theme);
  const names = {}; for (const m of combat.monsters) names[m.name] = (names[m.name] || 0) + 1;
  log(`⚔ ${Object.entries(names).map(([n, k]) => `${k} ${n}${k > 1 ? 's' : ''}`).join(', ')}!`, 'bad');
  say(banter(S.party, 'combatStart', {}, info.boss ? 1 : 0.7));
  busy = false;
  await flushCombat();
  combatLoop();
}
let looping = false;
let loopGen = 0;
function abandonCombat() { loopGen++; looping = false; combat = null; autoBattle = false; endCombatUI(); hideCaption(); R.clearMonsters(); $('#targets').innerHTML = ''; }
async function combatLoop() {
  if (looping || !combat) return; looping = true; const gen = loopGen;
  try {
    while (combat && combat.state === 'running' && gen === loopGen) {
      renderParty(); renderTargets();
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
async function flushCombat() {
  const { log: lines, events } = combat.drain();
  for (const l of lines) log(l.t, l.cls);
  syncFxSettings(); let pending = null; const wpn = new Map();
  const dmgSfx = (e, sp) => sfx(sp === 'magicMissile' ? 'ping' : SPELL_SFX[e.dtype] || (sp ? 'arcane' : 'hit'));
  const idx = (c) => Math.max(0, S.party.indexOf(c));
  const fxDur = () => Math.round(420 * Math.max(0.4, speed().f));
  for (const e of events) {
    if (!combat || !S) return;
    if (e.type === 'caption') { pending = null; renderParty(); renderTargets(); const sp = speed(); showCaption(e, sp.hold === 0); if (sp.hold === 0) await tapToContinue(); else await new Promise((r) => setTimeout(r, sp.hold)); continue; }
    if (e.type === 'monsterAttack') { pending = null; R.monsterAttack(e.who.id); sfx('swing'); await wait(380); }
    else if (e.type === 'partyAttack') { pending = null; const k = weaponKind(e.weapon); wpn.set(e.who, k); sfx(k === 'bow' || k === 'crossbow' ? 'twang' : 'swing'); await wait(k === 'bow' || k === 'crossbow' ? 60 : 150); }
    else if (e.type === 'hit' && e.tgt.side === 'monster') {
      const sp = pending && pending.who === e.att ? pending.spell : null;
      if (sp && SPELL_FX[sp]?.kind !== 'area') await R.spellCast(sp, e.tgt.id, idx(e.att), fxDur());
      const wk = !sp && e.att.side === 'party' ? wpn.get(e.att) : null;
      if (wk) await R.weaponStrike(wk, e.tgt.id, e.crit, fxDur() * 0.6, idx(e.att));
      R.monsterHit(e.tgt.id, e.crit, e.dtype || 'slashing', !sp && !wk); floater(e.tgt.id, e.dmg, e.crit, e.dtype);
      if (sp) dmgSfx(e, sp); else sfx(WEAPON_SFX[wk] && wk !== 'bow' && wk !== 'crossbow' ? WEAPON_SFX[wk] : e.dtype === 'bludgeoning' ? 'thud' : e.dtype === 'piercing' ? 'stab' : SPELL_SFX[e.dtype] || 'slash');
      if (e.crit) sfx('crit'); await wait(sp ? 160 : wk ? 200 : 260);
    }
    else if (e.type === 'miss') { const sp = pending && pending.who === e.att ? pending.spell : null; if (sp && e.tgt.side === 'monster' && SPELL_FX[sp]?.kind !== 'area') await R.spellCast(sp, e.tgt.id, idx(e.att), fxDur()); if (e.tgt.side === 'monster') floater(e.tgt.id, 'Miss'); else cardFloat(e.tgt, 'Miss'); sfx('miss'); await wait(160); }
    else if (e.type === 'partyHurt') { renderParty(); const el2 = document.getElementById('card-' + e.who.id); if (el2) { el2.classList.add('hurt'); } cardFloat(e.who, e.amt ?? e.dmg, e.crit, 'bad', e.dtype); R.partyHit(e.crit); flashRed(e.crit); sfx('mhit'); if (e.crit) sfx('crit'); await wait(260); }
    else if (e.type === 'kill') { if (e.who.side === 'party') sfx('kill'); else { R.monsterDie(e.who.id); sfx('mdeath'); } say(banter(S.party, 'kill', { m: e.who.name, who: e.by }, 0.45)); await wait(300); }
    else if (e.type === 'crit') { if (e.att.side === 'party') say(banter(S.party, 'crit', { who: e.att }, 0.8)); else say(banter(S.party, 'enemyCrit', { who: e.tgt }, 0.8)); }
    else if (e.type === 'spell') {
      const look = SPELL_FX[e.spell]; sfx(look?.kind === 'area' ? (/fire|burn|breath/.test(e.spell) ? 'fire' : /ice/.test(e.spell) ? 'cold' : 'boom') : e.spell === 'magicMissile' ? 'ping' : /fire|flame/i.test(e.spell) ? 'fire' : /frost|ice/i.test(e.spell) ? 'cold' : /lightning|shock/i.test(e.spell) ? 'zap' : /sacred|guiding|bless|smite/i.test(e.spell) ? 'radiant' : 'arcane');
      if (look?.kind === 'area' && e.who.side !== 'monster') { pending = { spell: e.spell, who: e.who }; await R.spellCast(e.spell, null, idx(e.who), fxDur()); }
      else if (look && e.who.side !== 'monster') pending = { spell: e.spell, who: e.who };
      else { pending = null; const col = { sleep: 0x80a0ff, spiritGuardians: 0xffe080, smite: 0xfff0a0, rage: 0xff3020, shield: 0x80c0ff }[e.spell] || 0x60ffb0; R.spellFx(col, null); await wait(300); }
    }
    else if (e.type === 'heal') { healFx(e.who); cardFloat(e.who, e.amt ? '+' + e.amt : '+', false, 'good'); sfx('chime'); }
    else if (e.type === 'down') { say(banter(S.party.filter((p) => p !== e.who), 'down', { p: e.who.name }, 0.9)); await wait(200); }
    else if (e.type === 'lowHp') say(banter(S.party, 'lowHp', { who: e.who }, 0.35));
    renderParty(); renderTargets();
  }
}
function floater(id, v, crit, dtype) { const p = R.screenPos(id); if (!p) return; const miss = v === 'Miss'; const el = h('div', { class: 'floater' + (crit ? ' crit' : '') + (miss ? ' miss' : ''), 'data-dtype': dtype || '', style: `left:${p.x}%;top:${p.y}%;color:${miss ? '#bbb' : crit ? '' : DTYPE_CSS(dtype) || '#fff'}` }, ...(crit ? [h('small', {}, 'CRIT '), String(v)] : [String(v)])); $('#floaters').append(el); setTimeout(() => el.remove(), 1100); }
function cardFloat(c, v, crit, cls = 'bad', dtype = null) { const el = document.getElementById('card-' + c.id); if (!el) return; const f = h('div', { class: 'floater' + (crit ? ' crit' : '') + (v === 'Miss' ? ' miss' : ''), style: `left:70%;top:0;font-size:${crit ? 24 : 18}px;color:${cls === 'good' ? '#6dffa8' : v === 'Miss' ? '#bbb' : DTYPE_CSS(dtype) || '#ff5a6e'}` }, crit ? 'CRIT ' + v : String(v)); el.append(f); setTimeout(() => f.remove(), 1100); }
let targetPick = null;
function renderTargets() {
  const el = $('#targets'); el.innerHTML = ''; if (!combat || combat.state !== 'running') return;
  for (const m of combat.monsters) {
    if (m.hp <= 0) continue; const p = R.screenPos(m.id); if (!p) continue;
    const conds = Object.keys(m.conditions);
    el.append(h('div', { class: `mtag ${targetPick ? 'pick' : ''} ${combat.current() === m ? 'sel' : ''}`, style: `left:${Math.min(86, Math.max(14, p.x))}%;top:${Math.max(8, p.y)}%`, onclick: () => targetPick && targetPick(m), info: () => monsterInfo(m) },
      h('div', {}, m.name), h('div', { class: 'bar' }, h('i', { style: `width:${m.hp / m.maxHp * 100}%` })), conds.length ? h('div', { class: 'conds' }, conds.join(',')) : null));
  }
}
function chooseFrom(title, options) {
  return new Promise((resolve) => {
    // combat menu docks into the bottom panel (in place of movement controls) so it never covers the log
    const cm = $('#cmenu'); if (modal.classList.contains('combat')) closeModal();
    if (!tapPending) { const cap = $('#caption'); if (cap.querySelector('.captap')) hideCaption(); captionDown(true); } // never ask with the menu collapsed
    document.body.classList.add('incombat');
    const done = (o) => { modal._options = null; cm.innerHTML = ''; cm.append(h('div', { class: 'who dim' }, '…')); resolve(o); };
    cm.innerHTML = ''; cm.append(h('div', { class: 'panel' }, h('div', { class: 'who' }, title), h('div', { class: 'combatmenu' }, options.map((o, i) => btn(`${i + 1}. ${o.label}`, () => done(o), { disabled: o.disabled, class: o.primary ? 'primary' : '', info: o.info || null })))));
    cm.scrollTop = 0; requestAnimationFrame(() => { const l = $('#log'); l.scrollTop = l.scrollHeight; });
    modal._resolve = done; modal._options = options;
  });
}
function endCombatUI() { captionDown(true); document.body.classList.remove('incombat'); $('#banter').style.top = ''; $('#banter').classList.remove('offband'); $('#cmenu').innerHTML = ''; modal._options = null; }
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
async function pickTarget(kind, c) {
  if (kind === 'enemy') {
    const live = combat.livingMonsters();
    if (live.length === 1) return live[0];
    const opts = live.map((m) => ({ info: () => monsterInfo(m), label: `${m.name} (${m.hp}/${m.maxHp})${Object.keys(m.conditions).length ? ' [' + Object.keys(m.conditions).join(',') + ']' : ''}`, m }));
    opts.push({ label: '← Back', back: true });
    let resolveTap; const tap = new Promise((r) => (resolveTap = r));
    targetPick = (m) => resolveTap({ m }); renderTargets();
    const o = await Promise.race([chooseFrom(`${c.name}: choose a target (or tap a monster)`, opts), tap]);
    targetPick = null; renderTargets();
    return o.back ? null : o.m;
  }
  if (kind === 'ally' || kind === 'downedAlly' || kind === 'deadAlly') {
    const opts = S.party.filter((p) => (kind === 'deadAlly' ? p.dead : kind === 'downedAlly' ? p.hp <= 0 && !p.dead : !p.dead)).map((p) => ({ label: `${p.name} (${Math.max(0, p.hp)}/${p.maxHp})`, p }));
    opts.push({ label: '← Back', back: true });
    const o = await chooseFrom(`${c.name}: choose an ally`, opts); return o.back ? null : o.p;
  }
  return true;
}
async function playerTurn() {
  const c = combat.current();
  while (combat && combat.state === 'running' && combat.current() === c && !combat.turn.done) {
    renderParty();
    const acts = combat.actionsFor(c);
    const opts = acts.map((a) => ({ ...a, primary: a.id === 'attack' || a.id === 'shoot' }));
    opts.push({ id: 'auto', label: '🤖 Auto-battle (all AI)', bonus: true });
    opts.push({ id: 'speed', label: `Battle speed: ${speed().short} ↻`, bonus: true, info: () => ['Battle speed', ...Object.values(BATTLE_SPEEDS).map((v) => v.label)] });
    const t = combat.turn;
    const o = await chooseFrom(`${c.name}'s turn — ${t.action ? 'Action' : ''}${t.action && t.bonus ? ' + ' : ''}${t.bonus ? 'Bonus action' : ''} available · HP ${c.hp}/${c.maxHp}`, opts);
    if (o.id === 'auto') { autoBattle = true; closeModal(); return; }
    if (o.id === 'speed') { const ks = Object.keys(BATTLE_SPEEDS); setSpeed(ks[(ks.indexOf(loadSettings().battleSpeed) + 1) % ks.length]); log(`Battle speed: ${speed().label}`, 'sys'); continue; }
    let args = {};
    if (o.target === 'enemy') { const m = await pickTarget('enemy', c); if (!m) continue; args.target = m; }
    if (o.target === 'ally') { const p = await pickTarget('ally', c); if (!p) continue; args.target = p; }
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
      const tk = sp.s.target; let target = null;
      if (tk === 'enemy' || tk === 'someEnemies') { target = await pickTarget('enemy', c); if (!target) continue; }
      if (tk === 'ally' || tk === 'downedAlly' || tk === 'deadAlly') { target = await pickTarget(tk, c); if (!target) continue; }
      args = { spell: sp.k, slot, target };
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
  for (const [k, n] of Object.entries(got)) lines.push(`${ITEMS[k]?.spoon || ITEMS[k]?.quest ? '📜' : '🎒'} ${n > 1 ? n + '× ' : ''}${ITEMS[k]?.name || k}`);
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
  for (const [k, n] of Object.entries(got)) lines.push(`🎒 ${n > 1 ? n + '× ' : ''}${ITEMS[k]?.name || k}`);
  for (const e of ev) if (e.log && !e.card && e.cls !== 'lore' && !/^Found /.test(e.log) && !e.combat && (e.cls === 'good' || e.cls === 'crit')) lines.push(`📜 ${e.log}`);
  for (const c of S.party) if (!c.dead && canLevelUp(c) && !b.ready.has(c)) lines.push(`⬆ ${c.name} is ready for level ${c.level + 1}!`);
  if (S.victory && info.boss) lines.push('👑 Gorvax the Tyrant falls! The Blackspire\'s lights go dark.');
  if (!lines.length) lines.push('Nothing of value this time.');
  const MAX = 8; if (lines.length > MAX) { const more = lines.length - (MAX - 1); lines.splice(MAX - 1, lines.length, `…and ${more} more — see the log.`); }
  return { text: `⚔ ${VICTORY_LINES[Math.floor(Math.random() * VICTORY_LINES.length)]}`, cls: 'loot', lines };
}
async function endCombat() {
  await flushCombat(); await wait(500);
  const st = combat.state; const info = combatInfo;
  if (st === 'won') { victoryUntil = Date.now() + 9000; playMusic('victory', true, () => { victoryUntil = 0; syncAudio(); }); say(banter(S.party, 'victory', {}, 0.8)); }
  const ev = G.afterCombat(S, combat, info);
  combat = null; autoBattle = false; $('#targets').innerHTML = ''; R.clearMonsters(); closeModal(); endCombatUI(); hideCaption();
  if (st === 'won') { const card = lootCard(ev, info); log(`${card.text} ${card.lines.join(' · ')}`, 'good'); queueMessage(card); } lootBase = null;
  if (info.town) { handle(ev.filter((e) => !e.toTown)); if (st === 'lost') for (const c of S.party) if (!c.dead) c.hp = Math.max(1, c.hp); await messagesDone(); await afterPrologueFight(); return; }
  if (st === 'lost') { handle(ev); return; }
  if (info.boss) await rebuild();
  if (!combat) R.setMode('dungeon'); // a fight that began during the rebuild keeps its arena on screen
  handle(ev);
  if (S.victory && info.boss) log('Gorvax the Tyrant falls! The Blackspire\'s lights go dark. The altar beyond awaits.', 'crit');
  autosave();
}

/* ---------- Save/load ---------- */
function autosave() { if (!S || combat) return; try { S.savedAt = Date.now(); writeSave(G.SAVE_KEY, G.serialize(S)); } catch (e) { log('Save failed: ' + e.message, 'bad'); } }
async function loadGame(key = G.SAVE_KEY) {
  const got = readSave(key); if (!got) { log('No saved game.', 'bad'); return; }
  try { S = G.deserialize(got.raw); } catch { log('Save is corrupted and no backup could be read.', 'bad'); return; }
  if (got.recovered) log('⚠ That save was damaged — restored it from its automatic backup copy.', 'crit');
  abandonCombat(); closeModal(); closeMenu(); updateMenuBtn(); log('Game loaded.', 'sys');
  if (S.mode === 'dungeon') await startDungeon(); else showTown();
}

/* ---------- Boot ---------- */
async function boot() {
  log('Loading the 3D engine…', 'dim');
  const { Renderer, preloadAll, preloadSome } = await import('./render/scene.js'); // three.js lives in its own lazily-fetched chunk
  R = new Renderer($('#view')); R.onResize = () => { if (combat) { replaceOverlays(); renderTargets(); } else if ($('#caption').classList.contains('show')) replaceOverlays(); };
  window.__gw = { sfx, SFX_NAMES, applyAudioSettings,
    async playthrough(opts) { const { playthrough } = await import('./sim/playthrough.js'); const r = playthrough(opts); return { ...r, _state: G.serialize(r.state) }; },
    async loadState(str) { S = G.deserialize(str); closeModal(); if (S.mode === 'dungeon') await startDungeon(); else showTown(); refresh(); },
    showTactics, openMenu, knownSpells, showSpellPicker, audio: () => ({ track: currentTrack(), amb: currentAmbience() }), get state() { return S; }, get combat() { return combat; }, R, G, startCombat, prompt, showCamp, showTown, say, caption: (e, tap = true) => showCaption(e, tap), hideCaption, queueMessage, messages: () => ({ queued: msgQueue.length, showing: !!msgRunning }), handle, banter: (k) => say(banter(S.party, k, {}, 1)) };
  log('Loading monsters…', 'dim');
  await Promise.all([R.ready, preloadSome(['tyrannosaurus', 'giantSpider', 'giantWasp'])]); // just what the title screen shows
  preloadAll(); // everything else streams in the background (and loads on demand)
  const where = await initStorage([G.SAVE_KEY, ...SLOT_KEYS]);
  if (where === 'icloud') log('Saves sync with iCloud.', 'dim');
  if (!isNative() && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  log('Blackspire ready. Press New Game!', 'sys');
  showTitle();
}
boot();

/* ---------- Main menu (☰ / Esc) ---------- */
const gmenu = h('div', { id: 'gmenu', class: 'hidden', role: 'dialog', 'aria-label': 'Main menu' });
const menuBtn = h('button', { id: 'btn-menu', class: 'hidden', 'aria-label': 'Main menu', title: 'Main menu (Esc)', onclick: () => (menuOpen() ? closeMenu() : openMenu()) }, '☰ Menu');
document.body.append(gmenu, menuBtn);
let menuView = 'main';
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
  menuView = custom ? 'confirm' : view;
  const inCombat = !!combat;
  const note = (t) => h('p', { class: 'hint' }, t);
  let body;
  if (custom) body = custom;
  else if (view === 'main') {
    body = [h('h2', {}, '☰ Main Menu'),
      inCombat ? h('p', { class: 'warn' }, '⚔ You are in combat. Saving is disabled until the fight ends, so a save never puts you in the middle of a battle. You can still quit: progress since your last save will be lost.') : null,
      h('div', { class: 'menu' },
        btn('▶ Resume', closeMenu, { class: 'primary', id: 'menu-resume' }),
        btn('💾 Save Game…', () => openMenu('save'), { id: 'menu-save', disabled: inCombat }),
        btn('📂 Load Game…', () => openMenu('load'), { id: 'menu-load' }),
        btn('⚙ Settings', () => openMenu('settings'), { id: 'menu-settings' }),
        btn('⇅ Export / Import Saves', () => openMenu('backup'), { id: 'menu-backup' }),
        btn('💾⏏ Save & Quit to Title', () => openMenu('savequit'), { id: 'menu-savequit', disabled: inCombat }),
        btn('⏏ Quit to Title without saving', () => confirmView('Quit without saving?', 'Progress since your last save will be lost.', '⏏ Quit without saving', () => { closeMenu(); closeModal(); abandonCombat(); showTitle(); }), { id: 'menu-quit' }))];
  } else if (view === 'save' || view === 'savequit') {
    const quit = view === 'savequit';
    body = [h('h2', {}, quit ? '💾 Save & Quit — choose a slot' : '💾 Save Game — choose a slot'),
      note('Saving overwrites the slot. The Save button and autosave use their own quick-save slot.'),
      h('div', { class: 'menu' }, SLOT_KEYS.map((k, i) => btn(slotLabel(k, i), () => confirmView(`Save to Slot ${i + 1}?`, slotInfo(k) ? `This overwrites: ${slotInfo(k).text}` : 'This slot is empty.', quit ? `💾 Save to Slot ${i + 1} and quit` : `💾 Save to Slot ${i + 1}`, () => {
        try { saveTo(k); } catch (e) { log('Save failed: ' + e.message, 'bad'); return; }
        log(`Game saved to Slot ${i + 1}.`, 'sys');
        if (quit) { closeMenu(); closeModal(); showTitle(); } else openMenu('main', [h('h2', {}, '✔ Saved'), h('p', {}, `Saved to Slot ${i + 1}.`), h('div', { class: 'menu' }, btn('▶ Resume', closeMenu, { class: 'primary', id: 'menu-resume' }), btn('← Main Menu', () => openMenu('main')))]);
      }, view), { class: 'slot', 'data-slot': i + 1 })),
        btn('← Back', () => openMenu('main'), { class: 'menuback' }))];
  } else if (view === 'load') {
    const keys = [[G.SAVE_KEY, -1], ...SLOT_KEYS.map((k, i) => [k, i])];
    body = [h('h2', {}, '📂 Load Game'), S ? note('Loading replaces the current game; progress since your last save will be lost.') : null,
      h('div', { class: 'menu' }, keys.map(([k, i]) => btn(slotLabel(k, i), () => (S ? confirmView('Load this save?', 'Progress since your last save will be lost.', '📂 Load', () => loadGame(k), 'load') : loadGame(k)), { class: 'slot', 'data-load': i + 1, disabled: !slotInfo(k) })),
        btn('← Back', () => (S ? openMenu('main') : closeMenu()), { class: 'menuback' }))];
  } else if (view === 'settings') {
    const st = loadSettings();
    const slider = (key, label) => h('label', { class: 'slider' }, h('span', {}, label), h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(st[key] * 100), id: 'vol-' + key, 'aria-label': label + ' volume',
      oninput: (e) => { st[key] = +e.target.value / 100; e.target.nextSibling.textContent = e.target.value + '%'; applyAudioSettings(st); }, onchange: () => { saveSettings(st); if (key === 'sfx') sfx('hit'); } }), h('b', {}, Math.round(st[key] * 100) + '%'));
    body = [h('h2', {}, '⚙ Settings'),
      h('h3', {}, 'Audio'),
      h('div', { class: 'menu' }, btn(`🔊 Sound: ${st.sound ? 'On' : 'Off (all muted)'}`, () => { st.sound = !st.sound; saveSettings(st); applyAudioSettings(st); openMenu('settings'); }, { id: 'set-sound' })),
      h('div', { class: 'menu' }, btn(`💥 Sound effects: ${st.sfxOn !== false ? 'On' : 'Off'}`, () => { st.sfxOn = st.sfxOn === false; saveSettings(st); applyAudioSettings(st); if (st.sfxOn) sfx('slash'); openMenu('settings'); }, { id: 'set-sfx' })),
      slider('music', '🎵 Music'), slider('sfx', '💥 Sound effects volume'), slider('amb', '🌫 Ambience'),
      h('h3', {}, 'Battle speed'),
      h('div', { class: 'seg', role: 'radiogroup' }, Object.entries(BATTLE_SPEEDS).map(([k, v]) => btn(v.label, () => { setSpeed(k); openMenu('settings'); }, { class: (st.battleSpeed || 'pause') === k ? 'on' : '', 'data-speed': k, role: 'radio', 'aria-checked': String((st.battleSpeed || 'pause') === k) }))),
      h('p', { class: 'hint' }, 'Each action is described in large text in the middle of the screen. "Pause" waits for a tap after every action.'),
      S ? h('h3', {}, 'Difficulty') : null,
      S ? h('div', { class: 'seg', role: 'radiogroup' }, Object.keys(DIFFICULTY).map((k) => btn(DIFF_LABEL[k], () => { S.difficulty = k; if (combat) combat.setDifficulty?.(k); autosave(); log(`Difficulty: ${DIFF_LABEL[k]}.`, 'sys'); openMenu('settings'); }, { class: (S.difficulty || 'normal') === k ? 'on' : '', 'data-diff': k, role: 'radio', 'aria-checked': String((S.difficulty || 'normal') === k) }))) : null,
      S ? h('p', { class: 'hint' }, DIFF_HELP[S.difficulty || 'normal']) : null,
      h('h3', {}, 'Storytelling'),
      h('div', { class: 'menu' }, btn(`🕯 Area descriptions: ${st.areaDesc !== false ? 'On' : 'Off'}`, () => { st.areaDesc = st.areaDesc === false; saveSettings(st); openMenu('settings'); }, { id: 'set-areadesc' }),
        btn(`🌀 Reduce motion: ${reduceMotion() ? 'On' : 'Off'}`, () => { st.reduceMotion = !reduceMotion(); saveSettings(st); syncFxSettings(); openMenu('settings'); }, { id: 'set-reducemotion' })),
      h('p', { class: 'hint' }, 'A Dungeon Master reads out each new floor, room and town spot the first time you arrive. Off: they only go to the log.'),
      h('h3', {}, 'Help'),
      h('div', { class: 'menu' }, btn('💡 Show the tutorial tips again', () => { st.tutorialDone = false; saveSettings(st); closeMenu(); startTutorial(); }, { id: 'set-tutorial' }),
        btn('← Back', () => openMenu('main'), { class: 'menuback' }))];
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
        btn('← Back', () => (S ? openMenu('main') : closeMenu()), { class: 'menuback' }))];
  }
  gmenu.className = ''; gmenu.innerHTML = '';
  gmenu.append(h('div', { class: 'panel' }, h('div', { class: 'navbar closebar' }, btn('✕ Close', closeMenu, { class: 'small closebtn', id: 'menu-close' })), body));
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
function applyAudioSettings(st = loadSettings()) { setMuted(!st.sound); setSfxOn(st.sfxOn !== false); setVolumes({ music: st.music, sfx: st.sfx, amb: st.amb }); }
function syncAudio() {
  const amb = !S ? null : S.mode === 'dungeon' ? 'dungeon' : 'town';
  ambience(amb);
  if (victoryUntil > Date.now()) return;
  const track = !S ? 'title' : combat ? (combatInfo?.boss ? 'boss' : 'combat') : S.mode === 'dungeon' ? (getLevel(S.level).def.music || 'dungeon0') : 'town';
  playMusic(track);
}
applyAudioSettings();
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
    Object.keys(c.conditions).length ? 'Conditions: ' + Object.keys(c.conditions).join(', ') : 'No conditions',
    G.isHero(c) ? 'Your hero' : `${c.ai ? 'AI' : 'Player'}-controlled · Tactics: ${TACTIC_STYLES[t.style].name}, heal below ${t.healAt}%`];
}
function monsterInfo(m) {
  const M = MONSTERS[m.key] || {};
  return [`${m.name}${M.cr != null ? ` (CR ${M.cr < 1 ? '1/' + Math.round(1 / M.cr) : M.cr})` : ''}`, `HP ${m.hp}/${m.maxHp} · AC ${m.ac ?? M.ac}`,
    ...(M.attacks || []).map((a) => `${a.name}: ${a.bonus != null ? fmtMod(a.bonus) + ' to hit, ' : ''}${a.dmg || ''} ${a.type || ''}`.trim()),
    Object.keys(m.conditions || {}).length ? 'Conditions: ' + Object.keys(m.conditions).join(', ') : null].filter(Boolean);
}
function spellInfo(k) { const s = SPELLS[k]; return s ? [`${s.name} — ${s.level ? 'Level ' + s.level : 'Cantrip'}${s.conc ? ' · Concentration' : ''}`, s.desc || ''] : []; }
function itemInfo(k) {
  const I = ITEMS[k]; const w = k.startsWith('w:') ? WEAPONS[k.slice(2)] : null; const a = k.startsWith('a:') ? ARMOR[k.slice(2)] : null;
  return [G.nameOf(k), I?.heal ? `Heals ${I.heal} HP` : I?.cure ? `Cures ${I.cure}` : w ? `${w.dmg} ${w.type} · ${w.cat}${w.props?.length ? ' · ' + w.props.join(', ') : ''}` : a ? `AC ${a.base} (${a.type} armor)` : k === 'shield' ? '+2 AC' : I?.desc || I?.kind || '', `Value ${G.priceOf(k)} gp`].filter(Boolean);
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
