import './style.css';
import * as G from './game/game.js';
import { getLevel, DIRS, DIR_NAMES, W, H, LEVEL_DEFS } from './dungeon/levels.js';
import { Combat } from './rules/combat.js';
import { RACES, CLASSES, SKILLS, SKILL_LABEL, SPELLS, ITEMS, ABILITIES, ABILITY_NAMES, CONDITIONS, SHOP_STOCK, MONSTERS, STANDARD_ARRAY, WEAPONS, ARMOR } from './rules/data.js';
import { createCharacter, assignByPriority, roll4d6, mod, fmtMod, armorClass, weaponStats, skillMod, saveMod, spellDC, spellAttack, prof, knownSpells, xpForNext, canLevelUp, isDown, passive } from './rules/character.js';
import { COMPANIONS, banter } from './game/companions.js';
import { sfx } from './sfx.js';

const $ = (s) => document.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) { if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (v !== false && v != null) e.setAttribute(k, v); }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
  return e;
};
const btn = (label, onclick, attrs = {}) => h('button', { onclick: (e) => { sfx('click'); onclick(e); }, ...attrs }, label);

let S = null; // game state
let R = null; // renderer
let combat = null; let combatInfo = null; let busy = false; let autoBattle = false; let fast = false;
const modal = $('#modal');

/* ---------- Log & banter ---------- */
function log(t, cls = '') { const el = $('#log'); el.append(h('div', { class: cls }, t)); while (el.children.length > 200) el.firstChild.remove(); el.scrollTop = el.scrollHeight; }
function say(b) {
  if (!b) return; const el = h('div', { class: 'bubble' }, h('b', { style: `color:${b.color}` }, b.who + ':'), b.text);
  $('#banter').append(el); log(`${b.who}: "${b.text}"`, 'lore'); setTimeout(() => el.remove(), 4200);
  while ($('#banter').children.length > 2) $('#banter').firstChild.remove();
}
function handle(events) {
  for (const e of events || []) {
    if (e.log) log(e.log, e.cls); if (e.banter) say(e.banter); if (e.bump) { R.bump(); sfx('bump'); } if (e.shake) { R.shake(); flashRed(); sfx('hurt'); }
    if (e.sfx) sfx(e.sfx);
    if (e.reveal || e.sfx === 'door' || e.sfx === 'chest') rebuild();
    if (e.toTown) { autosave(); showTown(); return; }
    if (e.combat) { startCombat(e.combat); return; }
    if (e.prompt) prompt(e.prompt);
  }
  refresh();
}
function flashRed() { const f = $('#flash'); f.style.opacity = 1; setTimeout(() => (f.style.opacity = 0), 250); }

/* ---------- Party panel ---------- */
function portrait(c) {
  const col = c.companion ? COMPANIONS[c.companion].color : '#6dffa8';
  return h('span', { class: 'portrait', style: `background:${col}` }, c.name[0]);
}
function renderParty() {
  const el = $('#party'); el.innerHTML = '';
  if (!S) return;
  const cur = combat && combat.state === 'running' ? combat.current() : null;
  S.party.forEach((c, i) => {
    const pct = Math.max(0, c.hp) / c.maxHp * 100;
    const conds = Object.keys(c.conditions).filter((k) => !['mageArmor', 'aid'].includes(k));
    const card = h('div', { class: `card ${cur === c ? 'active' : ''} ${c.dead ? 'dead' : c.hp <= 0 ? 'down' : ''}`, id: 'card-' + c.id, onclick: () => showSheet(c) },
      h('div', { class: 'nm' }, h('span', {}, `${i < 2 ? '⚔' : '🏹'} ${c.name}`),
        c.companion ? h('button', { class: `aitog small ${c.ai ? 'on' : ''}`, title: 'Toggle AI / player control', onclick: (e) => { e.stopPropagation(); c.ai = !c.ai; log(`${c.name} is now ${c.ai ? 'AI-controlled' : 'player-controlled'}.`, 'sys'); refresh(); if (combat) combatLoop(); } }, c.ai ? 'AI' : 'YOU') : h('span', { class: 'tag' }, 'YOU')),
      h('div', { class: 'sub' }, `L${c.level} ${RACES[c.race].name} ${CLASSES[c.cls].name} · AC ${armorClass(c)}`),
      h('div', { class: `bar hp ${pct < 30 ? 'low' : ''}` }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'row', style: 'justify-content:space-between;font-size:11px' }, h('span', {}, c.dead ? 'DEAD' : c.hp <= 0 ? `DOWN ${c.deathSaves.s}✓${c.deathSaves.f}✗` : `HP ${c.hp}/${c.maxHp}`),
        c.slots.length ? h('span', { class: 'slots' }, 'Slots ' + c.slots.map((n, l) => `${l + 1}:${n}`).join(' ')) : null),
      conds.length ? h('div', { class: 'conds' }, conds.join(', ')) : null);
    el.append(card);
  });
}
function refresh() { renderParty(); drawMinimap($('#minimap')); renderHud(); }
function renderHud() {
  const el = $('#hud'); if (!S) { el.innerHTML = ''; return; }
  if (S.mode === 'dungeon') el.innerHTML = `<span>${getLevel(S.level).def.name}</span><span>⌖ ${S.x},${S.y} · ${DIR_NAMES[S.dir]} · ${S.gold} gp</span>`;
  else el.innerHTML = `<span>Grokhaven</span><span>${S.gold} gp · 🥄 ${S.spoons}</span>`;
}

/* ---------- Minimap ---------- */
const MAPCOL = { '#': null, '.': '#2a2448', D: '#c08040', d: '#6b4a2a', L: '#ff3050', '<': '#80a0ff', '>': '#40ffd0', C: '#ffc040', o: '#665522', T: '#2a2448', t: '#ff3030', K: '#ffd040', E: '#2a2448', B: '#ff2040', M: '#b060ff', F: '#30a0ff', f: '#203040', A: '#ffd040', S: null };
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
    const b = (l, f, cls = '', title = '') => el.append(h('button', { class: cls, title, onclick: () => { if (!busy && !combat && modal.classList.contains('hidden')) f(); } }, l));
    b('↶', () => act(() => G.turn(S, -1)), '', 'Turn left (A)'); b('▲', () => act(() => G.move(S, 0)), '', 'Forward (W)'); b('↷', () => act(() => G.turn(S, 1)), '', 'Turn right (D)');
    b('◀', () => act(() => G.move(S, 3)), '', 'Strafe left (Q)'); b('▼', () => act(() => G.move(S, 2)), '', 'Back (S)'); b('▶', () => act(() => G.move(S, 1)), '', 'Strafe right (E)');
    b('🔍 Search', doSearch, 'act', 'Search (F)'); b('⛺ Camp', showCamp, 'act', 'Camp (C)'); b('🗺 Map', showMap, 'act', 'Map (M)');
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
  if (!S) return;
  if (combat) return combatKey(e);
  if (!modal.classList.contains('hidden')) { if (e.key === 'Escape') { if (modal.dataset.closable) dismissModal(); else if (S.mode === 'town' && townSub) showTown(); } return; }
  if (S.mode !== 'dungeon' || busy) return;
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
  if (!touch0 || !S || S.mode !== 'dungeon' || combat || busy || !modal.classList.contains('hidden')) return;
  const dx = e.changedTouches[0].clientX - touch0[0], dy = e.changedTouches[0].clientY - touch0[1]; touch0 = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
  if (Math.abs(dx) > Math.abs(dy)) act(() => G.turn(S, dx < 0 ? 1 : -1)); else act(() => G.move(S, dy < 0 ? 0 : 2));
}, { passive: true });

/* ---------- Modal helpers ---------- */
function openModal(content, { closable = true, cls = '' } = {}) {
  modal.className = cls; modal.innerHTML = ''; modal.dataset.closable = closable ? '1' : '';
  const p = h('div', { class: 'panel' }, content); modal.append(p);
  if (closable) p.prepend(h('div', { class: 'navbar closebar' }, btn('✕ Close', dismissModal, { class: 'small closebtn', 'aria-label': 'Close' })));
  return p;
}
function closeModal() { modal.className = 'hidden'; modal.innerHTML = ''; }
// Closing a dialog (✕ / Esc) must never strand the player: in town, fall back to the town screen they came from.
function dismissModal() { closeModal(); if (!S) showTitle(); else if (S.mode === 'town' && !combat) showTown(townSub); }

/* ---------- Title & creation ---------- */
async function showTitle() {
  S = null; setControls(null); R.setMode('combat'); refresh();
  R.showMonsters([{ id: 't1', key: 'tyrannosaurus' }, { id: 't2', key: 'giantSpider' }, { id: 't3', key: 'giantWasp' }], 0xff3df0);
  const has = !!localStorage.getItem(G.SAVE_KEY);
  openModal([
    h('h1', {}, 'GROKWIZARD'),
    h('p', { class: 'hint' }, 'Proving Grounds of the Thunder-Lizard · a first-person dungeon crawl in the spirit of 1981, built on the D&D 5e SRD'),
    h('div', { class: 'menu' },
      btn('▶ New Game', showCreate, { class: 'primary', id: 'btn-new' }),
      has ? btn('⟲ Continue', () => loadGame()) : null,
      btn('? How to Play', showHelp),
      btn('© Credits & License', showCredits)),
  ], { closable: false, cls: 'transparent' });
}
function showHelp() {
  openModal([h('h2', {}, 'How to Play'), h('div', { html: `
  <p>Descend through three levels beneath Grokhaven, defeat each level's guardian, and claim the <b>Amulet of Grok</b> from the Tyrant Lizard on B3.</p>
  <table><tr><th>Move</th><td>W/↑ forward · S/↓ back · A/D or ←/→ turn · Q/E strafe · swipe on mobile</td></tr>
  <tr><th>Search</th><td>F / Space — find secret doors & traps, pick or force locks</td></tr>
  <tr><th>Camp</th><td>C — short/long rest, party talk, reorder, save/load</td></tr>
  <tr><th>Map / Sheet / Items</th><td>M / I / B</td></tr>
  <tr><th>Combat</th><td>Number keys pick menu entries; click monster tags to target. Front two party slots fight in melee; back row uses ranged weapons and spells.</td></tr></table>
  <p>Companions can be AI- or player-controlled — tap the <b>AI/YOU</b> toggle on their card. Level up at the Training Grounds in town.</p>` })]);
}
function showCredits() {
  openModal([h('h2', {}, 'Credits'), h('div', { html: `<p>Rules content from the <b>System Reference Document 5.1</b> by Wizards of the Coast LLC, licensed under <a style="color:#22e6ff" href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">CC-BY-4.0</a>. GrokWizard is unofficial Fan Content and is not affiliated with Wizards of the Coast.</p>
  <p>3D monster, chest and torch models by <b>Quaternius</b> (quaternius.com), CC0 1.0 — via the Easy Enemy, Animated Dinosaur, Ultimate Animated Animal, Platformer Game Kit, Cyberpunk Game Kit and Modular Dungeon packs.</p>
  <p>Built with three.js (MIT) and Vite (MIT). Game code MIT.</p>` })]);
}
function showCreate() {
  let race = 'human', cls = 'fighter', base = assignByPriority('fighter'), name = 'Ser Grokalot', method = 'array';
  const draw = () => {
    const p = openModal([], { closable: true });
    const R_ = RACES[race], C = CLASSES[cls];
    const final = {}; for (const a of ABILITIES) final[a] = base[a] + (R_.bonus[a] || 0);
    p.append(h('h2', {}, 'Create Your Adventurer'),
      h('div', { class: 'cols' },
        h('div', {}, h('h3', {}, 'Name'), h('input', { id: 'cname', value: name, maxlength: 18, oninput: (e) => { name = e.target.value; } }),
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
          h('h3', {}, 'Your Companions'),
          ...Object.values(COMPANIONS).map((c) => h('p', { class: 'hint' }, h('b', { style: `color:${c.color}` }, c.name + ' — '), c.blurb)))),
      h('div', { class: 'row', style: 'margin-top:12px;justify-content:flex-end' }, btn('Begin Adventure ▶', () => {
        S = G.newGame({ name: (name || 'Hero').trim().slice(0, 18), race, cls, base });
        log(`Welcome to Grokhaven, ${name}. Three oddballs have agreed to join you…`, 'sys');
        for (const c of S.party.filter((c) => c.companion)) say({ who: COMPANIONS[c.companion].short, color: COMPANIONS[c.companion].color, text: COMPANIONS[c.companion].lines.combatStart[0] });
        showTown();
      }, { class: 'primary', id: 'btn-begin' })));
  };
  draw();
}

/* ---------- Town ---------- */
let townSub = null;
function showTown(sub = null) {
  townSub = sub;
  S.mode = 'town'; combat = null; endCombatUI(); setControls(null); R.setMode('combat'); R.clearMonsters(); refresh();
  const back = (where) => btn('← Back to Town Square', () => showTown(), { class: 'backbtn', 'data-back': where });
  const P = (content) => openModal([h('div', { class: 'navbar' }, h('h2', {}, sub ? `Grokhaven · ${{ tavern: 'Tavern', temple: 'Temple', shop: 'Trading Post', train: 'Training Grounds', edge: 'Edge of Town' }[sub]}` : 'Grokhaven'), sub ? back('top') : null), content, sub ? h('div', { style: 'margin-top:10px' }, back('bottom')) : null], { closable: false, cls: 'transparent' });
  if (!sub) {
    P(h('div', { class: 'menu grid' },
      btn('🍺 The Boar & Spoon Tavern', () => showTown('tavern'), { id: 'btn-tavern' }),
      btn('🛏 Inn (long rest, 10 gp)', () => { handle(G.innRest(S)); say(banter(S.party, 'rest', {}, 1)); }),
      btn('⛪ Temple of Cant', () => showTown('temple')),
      btn('⚒ Fizzbang\'s Trading Post', () => showTown('shop'), { id: 'btn-shop' }),
      btn('🎯 Training Grounds', () => showTown('train'), { id: 'btn-train' }),
      btn('🕳 Edge of Town — Enter the Maze', () => showTown('edge'), { id: 'btn-edge', class: 'primary' }),
      btn('💾 Save Game', () => { autosave(); log('Game saved.', 'sys'); }),
      btn('📂 Load Game', () => loadGame()),
      btn('⏏ Title Screen', () => { closeModal(); showTitle(); })));
    return;
  }
  if (sub === 'tavern') {
    P([h('h3', {}, 'The Boar & Spoon — your party'), partyOrderList(() => showTown('tavern')),
      h('h3', {}, 'Chatter at the bar'), ...S.party.filter((c) => c.companion).map((c) => h('p', {}, h('b', { style: `color:${COMPANIONS[c.companion].color}` }, c.name + ': '), COMPANIONS[c.companion].blurb)),
      btn('🗣 Listen in', () => log(G.campDialogue(S), 'lore'))]);
  } else if (sub === 'temple') {
    P([h('h3', {}, 'Temple of Cant — "Healing by donation (mandatory)"'), h('div', { class: 'menu' }, S.party.map((c) => { const cost = G.templeCost(c); return btn(`${c.name}: ${c.dead ? 'Raise Dead' : c.conditions.poisoned ? 'Cure poison' : c.hp < c.maxHp ? 'Heal wounds' : 'Healthy'} ${cost ? `(${cost} gp)` : ''}`, () => { handle(G.templeHeal(S, c)); showTown('temple'); }, { disabled: !cost }); }))]);
  } else if (sub === 'shop') {
    const p = P([]); const body = h('div');
    body.append(h('h3', {}, `Fizzbang's Trading Post — you have ${S.gold} gp`), h('div', { class: 'cols' },
      h('div', {}, h('h3', {}, 'Buy'), h('div', { class: 'menu' }, SHOP_STOCK.map((k) => btn(`${G.nameOf(k)} — ${G.priceOf(k)} gp`, () => { handle(G.buy(S, k)); showTown('shop'); }, { disabled: S.gold < G.priceOf(k), class: 'small' })))),
      h('div', {}, h('h3', {}, 'Sell / Equip'), inventoryList(() => showTown('shop'), true))));
    p.insertBefore(body, p.lastChild);
  } else if (sub === 'train') {
    P([h('h3', {}, 'Training Grounds'), h('div', { class: 'menu' }, S.party.map((c) => h('div', { class: 'row' },
      btn(canLevelUp(c) ? `⬆ Train ${c.name} to level ${c.level + 1}` : `${c.name} — L${c.level} (${c.xp}/${xpForNext(c) === Infinity ? 'max' : xpForNext(c)} XP)`, () => { handle(G.train(S, c)); showTown('train'); }, { disabled: !canLevelUp(c) }),
      btn('Sheet', () => showSheet(c), { class: 'small' }))))]);
  } else if (sub === 'edge') {
    P([h('h3', {}, 'Edge of Town'), h('p', { class: 'hint' }, 'The maze entrance yawns before you. The dwarven mine lift can take you to any level you have already reached.'),
      h('div', { class: 'menu' }, btn('Descend the stairs to B1', () => enter(0), { class: 'primary', id: 'btn-enter' }),
        ...[1, 2].filter((l) => l <= S.maxDepth).map((l) => btn(`Mine lift to ${LEVEL_DEFS[l].name}`, () => enter(l))))]);
  }
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
    btn('▼', () => { if (i < 3) { [S.party[i + 1], S.party[i]] = [S.party[i], S.party[i + 1]]; redraw(); refresh(); } }, { class: 'small', disabled: i === 3 }),
    c.companion ? btn(c.ai ? 'AI' : 'YOU', () => { c.ai = !c.ai; redraw(); refresh(); }, { class: 'small aitog ' + (c.ai ? 'on' : '') }) : null)));
}

/* ---------- Prompts in the dungeon ---------- */
function prompt(kind) {
  if (kind === 'chest') {
    openModal([h('h2', {}, 'A Treasure Chest'), h('p', { class: 'hint' }, 'It might be trapped. A rogue is best at inspecting and disarming.'),
      h('div', { class: 'menu' }, btn('🔎 Inspect (Investigation)', () => handle(G.inspectChest(S))), btn('🗝 Disarm (Thieves\' Tools)', () => handle(G.disarmChest(S))),
        btn('📦 Open it', () => { R.openChestAnim(S.x, S.y); closeModal(); handle(G.openChest(S)); }, { class: 'primary' }), btn('Leave it', closeModal))]);
  } else if (kind === 'down') {
    openModal([h('h2', {}, 'Stairs Down'), h('div', { class: 'menu' }, btn('Descend ▼', async () => { closeModal(); handle(G.goDown(S)); await startDungeon(); autosave(); }, { class: 'primary' }), btn('Not yet', closeModal))]);
  } else if (kind === 'up') {
    openModal([h('h2', {}, S.level === 0 ? 'Stairs to Town' : 'Stairs Up'), h('div', { class: 'menu' }, btn(S.level === 0 ? 'Return to Grokhaven ▲' : 'Climb ▲', async () => { closeModal(); const ev = G.goUp(S); if (S.mode === 'town') { handle(ev); } else { handle(ev); await startDungeon(); } }, { class: 'primary' }), btn('Stay', closeModal))]);
  } else if (kind === 'lock') {
    openModal([h('h2', {}, 'A Locked Door'), h('div', { class: 'menu' }, btn('🗝 Pick the lock', () => { closeModal(); handle(G.pickLock(S)); }), btn('💪 Force it (Athletics, noisy)', () => { closeModal(); handle(G.pickLock(S, true)); }), btn('Leave', closeModal))]);
  } else if (kind === 'altar') {
    if (!S.victory) { log('The amulet is sealed while the Tyrant lives.', 'dim'); return; }
    sfx('victory');
    openModal([h('h1', {}, 'VICTORY!'), h('p', {}, `You lift the Amulet of Grok from its pedestal. It whispers the answer to everything, then asks if you've tried turning it off and on again.`),
      h('p', { class: 'lore' }, 'Brambur: "I\'m so sorry, Mr. Rex." · Fizzwick: "Fizzwick will be writing a book. You are in a footnote." · Pip: "Does the amulet come with a spoon? …It IS a spoon? IT\'S A SPOON!"'),
      h('p', { class: 'hint' }, `Steps taken: ${S.steps} · Spoons: ${S.spoons} · Party levels: ${S.party.map((c) => c.level).join('/')}`),
      h('div', { class: 'menu' }, btn('Return to town as heroes', () => { S.mode = 'town'; closeModal(); showTown(); }), btn('Keep exploring', closeModal))]);
  }
}
document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'f' && S?.mode === 'dungeon' && G.lockAt(S) && modal.classList.contains('hidden')) { /* handled by search */ } });

/* ---------- Camp ---------- */
function showCamp() {
  const p = openModal([h('h2', {}, '⛺ Camp'), h('div', { class: 'menu grid' },
    btn('☕ Short Rest (1 hr: hit dice, 2nd wind, arcane recovery)', () => { closeModal(); handle(G.rest(S, 'short')); }),
    btn('🌙 Long Rest (8 hrs, full recovery, risky)', () => { closeModal(); handle(G.rest(S, 'long')); }),
    btn('🗣 Talk with companions', () => { log(G.campDialogue(S), 'lore'); }, { id: 'btn-talk' }),
    btn('✨ Cast Mage Armor on wizard', () => { const w = S.party.find((c) => c.cls === 'wizard' && !c.equip.armor && !c.dead && c.slots[0] > 0); if (!w) { log('No wizard with a free slot needs Mage Armor.', 'dim'); return; } w.slots[0]--; w.conditions.mageArmor = true; log(`${w.name} casts Mage Armor (AC ${armorClass(w)}).`, 'spell'); refresh(); }),
    btn('💊 Cleric: Lesser Restoration on poisoned', () => { const c = S.party.find((c) => c.cls === 'cleric' && !isDown(c) && c.slots[1] > 0); const t = S.party.find((x) => x.conditions.poisoned); if (!c || !t) { log('Nobody to cure, or no 2nd-level slot.', 'dim'); return; } c.slots[1]--; delete t.conditions.poisoned; log(`${c.name} cures ${t.name}.`, 'good'); refresh(); }),
    btn('💾 Save', () => { autosave(); log('Game saved.', 'sys'); }), btn('📂 Load', () => loadGame())),
  h('h3', {}, 'Marching order'), partyOrderList(showCamp)]);
  void p;
}

/* ---------- Map ---------- */
function showMap() { const cv = h('canvas', { class: 'bigmap', width: 420, height: 420 }); openModal([h('h2', {}, getLevel(S.level).def.name), cv, h('p', { class: 'hint' }, 'Gold: chests · Cyan: stairs down · Red: locked/boss · Purple: messages · Blue: fountain')]); drawMinimap(cv, true); }

/* ---------- Inventory ---------- */
function inventoryList(redraw, shop = false) {
  const inv = S.inventory;
  if (!inv.length) return h('p', { class: 'hint' }, 'Empty.');
  return h('div', { class: 'menu' }, inv.map((k, i) => {
    const I = ITEMS[k]; const kind = I?.kind || (k.startsWith('w:') ? 'weapon' : k.startsWith('a:') || k === 'shield' ? 'armor' : '');
    return h('div', { class: 'row' }, h('span', { style: 'flex:1' }, G.nameOf(k)),
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
    h('h2', {}, `${c.name} — Level ${c.level} ${Rr.name} ${C.name} (${C.sub})`),
    c.companion ? h('p', { class: 'hint' }, COMPANIONS[c.companion].blurb) : null,
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
const wait = (ms) => new Promise((r) => setTimeout(r, fast ? ms / 3 : ms));
async function startCombat(info) {
  if (combat) return;
  closeModal(); busy = true;
  document.body.classList.add('incombat'); $('#cmenu').innerHTML = '<div class="who dim">Combat begins…</div>';
  const theme = getLevel(S.level).def.color;
  combatInfo = info;
  combat = new Combat(S.party, info.groups, { inventory: S.inventory, boss: !!info.boss, canFlee: !info.boss });
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
async function combatLoop() {
  if (looping || !combat) return; looping = true;
  try {
    while (combat && combat.state === 'running') {
      renderParty(); renderTargets();
      if (combat.needsInput() && !autoBattle) { await playerTurn(); }
      else {
        const c = combat.current();
        if (c.side === 'party' && !c.ai) { combat.aiTurn(c); if (combat.current() === c && combat.state === 'running') combat.endTurn(); }
        else combat.autoTurn();
        await flushCombat();
      }
    }
    if (combat) await endCombat();
  } finally { looping = false; }
}
async function flushCombat() {
  const { log: lines, events } = combat.drain();
  for (const l of lines) log(l.t, l.cls);
  for (const e of events) {
    if (e.type === 'monsterAttack') { R.monsterAttack(e.who.id); sfx('swing'); await wait(380); }
    else if (e.type === 'partyAttack') { sfx('swing'); await wait(150); }
    else if (e.type === 'hit' && e.tgt.side === 'monster') { R.monsterHit(e.tgt.id, e.crit); floater(e.tgt.id, e.dmg, e.crit); sfx(e.crit ? 'crit' : 'hit'); await wait(260); }
    else if (e.type === 'miss') { if (e.tgt.side === 'monster') floater(e.tgt.id, 'miss'); else cardFloat(e.tgt, 'miss'); await wait(160); }
    else if (e.type === 'partyHurt') { const el = document.getElementById('card-' + e.who.id); renderParty(); const el2 = document.getElementById('card-' + e.who.id); if (el2) { el2.classList.add('hurt'); } cardFloat(e.who, e.dmg, e.crit); flashRed(); sfx('hurt'); void el; await wait(260); }
    else if (e.type === 'kill') { R.monsterDie(e.who.id); sfx('kill'); say(banter(S.party, 'kill', { m: e.who.name, who: e.by }, 0.45)); await wait(300); }
    else if (e.type === 'crit') { if (e.att.side === 'party') say(banter(S.party, 'crit', { who: e.att }, 0.8)); else say(banter(S.party, 'enemyCrit', { who: e.tgt }, 0.8)); }
    else if (e.type === 'spell') { const col = { fireball: 0xff6020, burningHands: 0xff8030, fireBolt: 0xff5020, magicMissile: 0xa060ff, sleep: 0x80a0ff, sacredFlame: 0xfff080, guidingBolt: 0xfff0a0, scorchingRay: 0xff4020, lightningBolt: 0x80d0ff, rayOfFrost: 0x80f0ff, thunderwave: 0x60a0ff, spiritGuardians: 0xffe080, breath: 0xff4000 }[e.spell] || 0x60ffb0; R.spellFx(col, null); sfx('spell'); await wait(300); }
    else if (e.type === 'heal') { cardFloat(e.who, '+', false, 'good'); sfx('heal'); }
    else if (e.type === 'down') { say(banter(S.party.filter((p) => p !== e.who), 'down', { p: e.who.name }, 0.9)); await wait(200); }
    else if (e.type === 'lowHp') say(banter(S.party, 'lowHp', { who: e.who }, 0.35));
    renderParty(); renderTargets();
  }
}
function floater(id, v, crit) { const p = R.screenPos(id); if (!p) return; const el = h('div', { class: 'floater' + (crit ? ' crit' : ''), style: `left:${p.x}%;top:${p.y}%;color:${v === 'miss' ? '#aaa' : crit ? '' : '#fff'}` }, String(v)); $('#floaters').append(el); setTimeout(() => el.remove(), 1100); }
function cardFloat(c, v, crit, cls = 'bad') { const el = document.getElementById('card-' + c.id); if (!el) return; const f = h('div', { class: 'floater', style: `left:70%;top:0;font-size:18px;color:${cls === 'good' ? '#6dffa8' : v === 'miss' ? '#aaa' : '#ff5a6e'}` }, String(v)); el.append(f); setTimeout(() => f.remove(), 1100); }
let targetPick = null;
function renderTargets() {
  const el = $('#targets'); el.innerHTML = ''; if (!combat || combat.state !== 'running') return;
  for (const m of combat.monsters) {
    if (m.hp <= 0) continue; const p = R.screenPos(m.id); if (!p) continue;
    const conds = Object.keys(m.conditions);
    el.append(h('div', { class: `mtag ${targetPick ? 'pick' : ''} ${combat.current() === m ? 'sel' : ''}`, style: `left:${p.x}%;top:${Math.max(8, p.y)}%`, onclick: () => targetPick && targetPick(m) },
      h('div', {}, m.name), h('div', { class: 'bar' }, h('i', { style: `width:${m.hp / m.maxHp * 100}%` })), conds.length ? h('div', { class: 'conds' }, conds.join(',')) : null));
  }
}
function chooseFrom(title, options) {
  return new Promise((resolve) => {
    // combat menu docks into the bottom panel (in place of movement controls) so it never covers the log
    const cm = $('#cmenu'); if (modal.classList.contains('combat')) closeModal();
    document.body.classList.add('incombat');
    const done = (o) => { modal._options = null; cm.innerHTML = ''; cm.append(h('div', { class: 'who dim' }, '…')); resolve(o); };
    cm.innerHTML = ''; cm.append(h('div', { class: 'panel' }, h('div', { class: 'who' }, title), h('div', { class: 'combatmenu' }, options.map((o, i) => btn(`${i + 1}. ${o.label}`, () => done(o), { disabled: o.disabled, class: o.primary ? 'primary' : '' })))));
    cm.scrollTop = 0; requestAnimationFrame(() => { const l = $('#log'); l.scrollTop = l.scrollHeight; });
    modal._resolve = done; modal._options = options;
  });
}
function endCombatUI() { document.body.classList.remove('incombat'); $('#cmenu').innerHTML = ''; modal._options = null; }
function combatKey(e) {
  const n = parseInt(e.key, 10); if (!modal._options) return;
  if (n >= 1 && n <= modal._options.length && !modal._options[n - 1].disabled) { e.preventDefault(); modal._resolve(modal._options[n - 1]); }
  if (e.key === 'Escape') { const b = modal._options.find((o) => o.back); if (b) modal._resolve(b); }
}
async function pickTarget(kind, c) {
  if (kind === 'enemy') {
    const live = combat.livingMonsters();
    if (live.length === 1) return live[0];
    const opts = live.map((m) => ({ label: `${m.name} (${m.hp}/${m.maxHp})${Object.keys(m.conditions).length ? ' [' + Object.keys(m.conditions).join(',') + ']' : ''}`, m }));
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
    opts.push({ id: 'fast', label: fast ? '🐢 Normal speed' : '⏩ Fast animations', bonus: true });
    const t = combat.turn;
    const o = await chooseFrom(`${c.name}'s turn — ${t.action ? 'Action' : ''}${t.action && t.bonus ? ' + ' : ''}${t.bonus ? 'Bonus action' : ''} available · HP ${c.hp}/${c.maxHp}`, opts);
    if (o.id === 'auto') { autoBattle = true; closeModal(); return; }
    if (o.id === 'fast') { fast = !fast; continue; }
    let args = {};
    if (o.target === 'enemy') { const m = await pickTarget('enemy', c); if (!m) continue; args.target = m; }
    if (o.id === 'cast') {
      const list = combat.castable(c).map(({ k, s }) => ({ label: `${s.name}${s.level ? ` (L${s.level})` : ' (cantrip)'}${s.bonus ? ' [bonus]' : ''}${s.conc ? ' [conc]' : ''}`, k, s }));
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
      const pots = [...new Set(S.inventory.filter((k) => ITEMS[k]?.kind === 'potion'))].map((k) => ({ label: `${ITEMS[k].name} (×${S.inventory.filter((x) => x === k).length})`, k }));
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
async function endCombat() {
  await flushCombat(); await wait(500);
  const st = combat.state; const info = combatInfo;
  if (st === 'won') { sfx('victory'); say(banter(S.party, 'victory', {}, 0.8)); }
  const ev = G.afterCombat(S, combat, info);
  combat = null; autoBattle = false; $('#targets').innerHTML = ''; R.clearMonsters(); closeModal(); endCombatUI();
  if (st === 'lost') { handle(ev); return; }
  R.setMode('dungeon');
  if (info.boss) await rebuild();
  handle(ev);
  if (S.victory && info.boss) log('The Tyrant Lizard falls! The Amulet of Grok awaits on its altar beyond.', 'crit');
  autosave();
}

/* ---------- Save/load ---------- */
function autosave() { if (!S) return; try { localStorage.setItem(G.SAVE_KEY, G.serialize(S)); } catch (e) { log('Save failed: ' + e.message, 'bad'); } }
async function loadGame() {
  const raw = localStorage.getItem(G.SAVE_KEY); if (!raw) { log('No saved game.', 'bad'); return; }
  try { S = G.deserialize(raw); } catch { log('Save is corrupted.', 'bad'); return; }
  combat = null; endCombatUI(); closeModal(); log('Game loaded.', 'sys');
  if (S.mode === 'dungeon') await startDungeon(); else showTown();
}

/* ---------- Boot ---------- */
async function boot() {
  log('Loading the 3D engine…', 'dim');
  const { Renderer, preloadAll, preloadSome } = await import('./render/scene.js'); // three.js lives in its own lazily-fetched chunk
  R = new Renderer($('#view'));
  window.__gw = { get state() { return S; }, get combat() { return combat; }, R, G, startCombat };
  log('Loading monsters…', 'dim');
  await Promise.all([R.ready, preloadSome(['tyrannosaurus', 'giantSpider', 'giantWasp'])]); // just what the title screen shows
  preloadAll(); // everything else streams in the background (and loads on demand)
  log('GrokWizard ready. Press New Game!', 'sys');
  showTitle();
}
boot();
