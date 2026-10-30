// Turn-based combat engine implementing SRD 5.1 combat rules (condensed to a Wizardry-style party-vs-groups view).
import { MONSTERS, SPELLS, CR_XP, WEAPONS, ARMOR, ITEMS, CLASSES, TUNING } from './data.js';
import { roll, d20, die, pick, rand } from './dice.js';
import { narrateAttack, line as narr } from './narrate.js';
import {
  mod, abilityMod, saveMod, armorClass, weaponStats, spellDC, spellAttack, spellMod, sneakDice, cantripDice, attacksPerAction,
  critRange, prof, isDown, canAct, heal, hasTrait, skillMod, knownSpells, rageDamage, inspirationDie, unarmedStats, setCount, fxSum,
} from './character.js';
import { traitFor, applyTrait, traitsOf, dtype, TRAIT_KINDS, studySkill, studyDC, targetWeights, pickWeighted, cutinKindFor } from './phaseD.js';
const BPS = ['bludgeoning', 'piercing', 'slashing'];

let mid = 1;
const HEALER_CLASSES = ['cleric', 'druid', 'bard', 'paladin'];
export const DIFFICULTY = { story: { hp: 0.7, dmg: 0.6, label: 'Story' }, normal: { hp: 1, dmg: 1, label: 'Normal' }, hard: { hp: 1.35, dmg: 1.3, floorScale: [1, 0.1, 0.7, 0.55, 0.55], label: 'Hard' } };
// floors 2-5 carry extra tuning multipliers (TUNING.floorHp/floorDmg/foeHp/foeDmg/eliteFloorHp, tuned on Normal); Hard already multiplies everything by 1.35/1.3, so only `floorScale` of those extras is applied there (otherwise B2-B5 become unwinnable).
const tuneX = (d, x, floor) => 1 + ((x == null ? 1 : x) - 1) * (d.floorScale == null ? 1 : d.floorScale[floor == null ? 0 : floor]);
export const TACTIC_STYLES = {
  aggressive: { name: '⚔ Aggressive', desc: 'Always hits hardest: spends big spells freely and only heals in an emergency.' },
  balanced: { name: '⚖ Balanced', desc: 'Attacks, saves strong spells for tough fights, heals allies below the threshold.' },
  defensive: { name: '🛡 Defensive', desc: 'Protects itself: drinks potions or dodges when hurt, saves big spells for bosses.' },
  support: { name: '✚ Support / Healer', desc: 'Keeps the party alive first: heals and hands out potions before attacking.' },
};
export const AOE_SPELLS = ['fireball', 'lightningBolt', 'burningHands', 'thunderwave', 'sleep', 'spiritGuardians', 'massHealingWord', 'web'];
export const defaultTactics = () => ({ style: 'balanced', spells: true, potions: true, aoe: true, healAt: 40 });
export const tacticsOf = (c) => ({ ...defaultTactics(), ...(c.tactics || {}) });
export function makeMonster(key, idx = 0) {
  const T = MONSTERS[key];
  const hp = Math.max(1, roll(T.hp));
  return { id: 'm' + (mid++), key, name: T.name, side: 'monster', ac: T.ac, hp, maxHp: hp, conditions: {}, T, idx, specialReady: !!T.special };
}
const monsterSave = (m, ab) => mod(m.T.stats[ab]);

/** Wizardry-style ranks: at most MAX_GROUPS groups (one per monster type), melee brutes in front, archers/casters/shamans (T.ranged) in back.
 *  Within a role the tougher kind (higher CR) stands in front; ties keep the encounter's own order. Extra kinds beyond four join the last group. */
export const MAX_GROUPS = 4;
export const FRONT_GROUPS = 2; // party melee reaches this many living groups (a reach weapon adds one)
function buildRanks(monsters) {
  const byGid = new Map(); monsters.forEach((m) => { if (!byGid.has(m.gid)) byGid.set(m.gid, { gid: m.gid, key: m.key, name: m.T.name, ranged: !!m.T.ranged, cr: m.T.cr || 0, members: [] }); byGid.get(m.gid).members.push(m); });
  const gs = [...byGid.values()].sort((a, b) => (a.ranged ? 1 : 0) - (b.ranged ? 1 : 0) || (a.ranged ? a.cr - b.cr : b.cr - a.cr) || a.gid - b.gid);
  while (gs.length > MAX_GROUPS) { const x = gs.pop(), last = gs[gs.length - 1]; for (const m of x.members) { m.gid = last.gid; last.members.push(m); } last.mixed = true; last.name += ' & co.'; }
  return gs;
}

/** How many separately aimable darts / rays / beams a spell throws at the chosen slot level (0 = not a multi-projectile spell).
 *  Magic Missile: 3 darts +1 per slot above 1st. Scorching Ray: 3 rays +1 per slot above 2nd. Eldritch Blast: 1 beam, +1 at levels 5, 11 and 17. */
export function projectileCount(c, key, slot) {
  const S = SPELLS[key]; if (!S) return 0;
  const up = Math.max(0, (slot || S.level) - S.level);
  if (S.kind === 'auto' && S.darts) return S.darts + up;
  if (S.kind === 'rays' && S.rays) return S.rays + up;
  if (S.kind === 'beams') return 1 + (c.level >= 5 ? 1 : 0) + (c.level >= 11 ? 1 : 0) + (c.level >= 17 ? 1 : 0);
  return 0;
}
/** Rule-accurate noun for a projectile spell ("dart", "ray", "beam"). */
export const projectileNoun = (key) => ({ auto: 'dart', rays: 'ray', beams: 'beam' })[SPELLS[key]?.kind] || 'shot';

export class Combat {
  /** Change difficulty mid-fight: affects damage from now on (monster HP was set when the fight began). */
  setDifficulty(k) { this.diff = DIFFICULTY[k] || DIFFICULTY.normal; }
  constructor(party, groups, { inventory = [], canFlee = true, boss = false, difficulty = 'normal', story = null, elite = null, lore = null } = {}) {
    this.elite = elite; this.lore = lore || {};
    this.party = party; this.inventory = inventory; this.canFlee = canFlee; this.boss = boss; this.story = story || {};
    this.diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    // B2 boss for a party with nobody who can heal (no cleric, druid, bard or paladin standing): a fair path, a trimmed boss (TUNING.noHealerBoss)
    this.noHealerEase = boss && this.story.floor === 1 && !party.some((c) => !c.dead && HEALER_CLASSES.includes(c.cls)) ? TUNING.noHealerBoss : null;
    this.monsters = []; const gidOf = new Map();
    for (const g of groups) for (let i = 0; i < g.count; i++) { const m = makeMonster(g.key, this.monsters.length); if (!gidOf.has(g.key)) gidOf.set(g.key, gidOf.size); m.gid = gidOf.get(g.key); m.hp = m.maxHp = Math.max(1, Math.round(m.maxHp * this.diff.hp * (this.story.empowered && m.T.boss ? 1.25 : 1) * tuneX(this.diff, TUNING.bossHp[g.key], this.story.floor) * tuneX(this.diff, TUNING.floorHp[this.story.floor], this.story.floor) * (this.story.floor > 0 ? tuneX(this.diff, TUNING.foeHp[g.key], this.story.floor) : 1) * (this.noHealerEase ? this.noHealerEase.hp : 1) * (elite ? (this.monsters.length === 0 ? 1.7 : 1.25) * tuneX(this.diff, TUNING.eliteFloorHp[elite.floor], this.story.floor) : 1))); if (elite) { m.elite = true; if (this.monsters.length === 0) { m.ac += 1; if (elite.title) m.name = elite.title; } } this.monsters.push(m); }
    for (const m of this.monsters) { const l = this.lore[m.key]; m.known = { types: { ...(l?.types || {}) }, studied: !!l?.studied }; m.studyTried = new Set(); }
    this.groups = buildRanks(this.monsters); this.rankSig = this.liveRanks().map((g) => g.gid).join();
    this.log = []; this.events = []; this.round = 0; this.state = 'running'; this.turnIdx = -1; this.xp = 0; this.gold = 0;
    for (const c of party) { c.reaction = true; for (const k of ['dodging', 'hidden', 'raging', 'reckless', 'invisible', 'sacredWeapon']) delete c.conditions[k]; c.side = 'party'; if (c.tempHp == null) c.tempHp = 0; }
    // Initiative: d20 + Dex
    const all = [...party.filter((c) => !c.dead), ...this.monsters].map((who) => ({ who, init: d20() + (who.side === 'party' ? abilityMod(who, 'dex') + (this.story.initBonus || 0) : monsterSave(who, 'dex')) + rand() * 0.01 }));
    all.sort((a, b) => b.init - a.init);
    this.order = all.map((a) => a.who);
    this.say(`Initiative: ${all.map((a) => `${a.who.name} ${Math.floor(a.init)}`).join(', ')}`);
    this.storyStart();
    this.nextTurn();
  }
  say(t, cls = '') { this.log.push({ t, cls }); }
  emit(e) { this.events.push(e); }
  /** Big centered action caption for the UI (flavor text + short mechanical result). */
  caption(text, sub = '', tone = '') { this.emit({ type: 'caption', text, sub, tone }); }
  drain() { const l = this.log, e = this.events; this.log = []; this.events = []; return { log: l, events: e }; }
  livingMonsters() { return this.monsters.filter((m) => m.hp > 0 && !m.ally); }
  awakeMonsters() { return this.livingMonsters().filter((m) => !m.conditions.unconscious); }
  conscious() { return this.party.filter((c) => !isDown(c)); }
  /** Living monster groups in rank order, front first (a wiped group drops out, so the groups behind it move up). Each has .rank (0 = front). */
  liveRanks() { const out = []; for (const g of this.groups) { const live = g.members.filter((m) => m.hp > 0 && !m.ally); if (live.length) out.push({ gid: g.gid, key: g.key, name: g.name, ranged: g.ranged, mixed: !!g.mixed, monsters: live, rank: out.length }); } return out; }
  groupOf(m) { return this.liveRanks().find((g) => g.gid === m.gid) || null; }
  rankOf(m) { const g = this.groupOf(m); return g ? g.rank : -1; }
  /** How many groups a hero's attack of this kind reaches: ranged = all, melee = the first 2 living groups (+1 with a reach weapon), 'touch' (unarmed, melee spells) = the first 2. */
  reachOf(c, kind = 'melee') { return kind === 'ranged' ? Infinity : FRONT_GROUPS + (kind === 'melee' && this.hasReach(c) ? 1 : 0); }
  /** Which monsters this hero can hit with an attack of this kind: 'melee' (weapon, reach-aware), 'touch' (no reach) or 'ranged' (shots, spells, thrown). */
  legalTargets(c, kind = 'ranged') { const n = this.reachOf(c, kind); return this.liveRanks().filter((g) => g.rank < n).flatMap((g) => g.monsters); }
  canTarget(c, m, kind = 'ranged') { return !!m && m.hp > 0 && this.legalTargets(c, kind).includes(m); }
  /** The range kind of a party action id (spells: pass the spell key as `spell`). */
  rangeKind(id, spell = null) { if (id === 'cast') return SPELLS[spell]?.melee ? 'touch' : 'ranged'; if (['martialArts', 'flurry'].includes(id)) return 'touch'; if (['attack', 'smite', 'frenzy'].includes(id)) return 'melee'; return 'ranged'; }
  /** Melee monsters in the third and fourth rank can't strike (they wait to advance); ranged and caster monsters act from anywhere. */
  monsterActs(m) { return !!m.T.ranged || this.rankOf(m) < FRONT_GROUPS; }
  /** The group an area spell hits when nobody chose: the one with the most awake foes (ties: more total HP). */
  bestGroup(pred = () => true) { let best = null, bn = 0, bh = 0; for (const g of this.liveRanks()) { const a = g.monsters.filter((m) => !m.conditions.unconscious && pred(m)); const n = a.length, h = a.reduce((t, m) => t + m.hp, 0); if (n > bn || (n === bn && n && h > bh)) { best = g; bn = n; bh = h; } } return best; }
  /** After kills: when a group is wiped out the ones behind it step up. Logs it and tells the UI once. */
  syncRanks() {
    const gs = this.liveRanks(), sig = gs.map((g) => g.gid).join(); if (sig === this.rankSig) return; const was = this.rankSig; this.rankSig = sig;
    if (!gs.length || !was) return;
    const front = gs.slice(0, FRONT_GROUPS).map((g) => g.name).join(' and ');
    this.say(`The ranks close up. Front: ${front}.`, 'sys'); this.emit({ type: 'advance', ranks: gs.map((g) => ({ gid: g.gid, rank: g.rank })) });
  }
  frontRow() { return this.party.filter((c) => !isDown(c)).slice(0, 2); }
  inFront(c) { return this.frontRow().includes(c); }
  /** Can this hero hit a front-line enemy in melee? Front row, or a reach weapon (glaive, halberd, pike, whip). */
  hasReach(c) { return !!(c.equip?.weapon && WEAPONS[c.equip.weapon.base]?.props.includes('reach')); }
  canMelee(c) { return !!c.equip?.weapon && (this.inFront(c) || this.hasReach(c)); }
  /** Swap two living heroes between the front and back row (party order is the formation). */
  swapRows(a, b) {
    const i = this.party.indexOf(a), j = this.party.indexOf(b);
    if (i < 0 || j < 0 || i === j || isDown(a) || isDown(b)) return false;
    this.party[i] = b; this.party[j] = a; this.emit({ type: 'rows' });
    this.say(`${a.name} and ${b.name} trade places: ${a.name} is now in the ${this.inFront(a) ? 'front' : 'back'} row, ${b.name} in the ${this.inFront(b) ? 'front' : 'back'}.`, 'sys');
    return true;
  }
  /** Remember what the party has learned about a monster kind (saved with the game). */
  learn(m, type) {
    if (m.known.types[type]) return false;
    m.known.types[type] = true;
    const l = (this.lore[m.key] ||= { types: {}, studied: false }); l.types[type] = true; return true;
  }
  learnAll(m) {
    m.known.studied = true; for (const t of traitsOf(m.T)) m.known.types[t.type] = true;
    const l = (this.lore[m.key] ||= { types: {}, studied: false }); l.studied = true; for (const t of traitsOf(m.T)) l.types[t.type] = true;
  }
  current() { return this.order[this.turnIdx]; }
  needsInput() { const c = this.current(); return this.state === 'running' && c && c.side === 'party' && !c.ai && canAct(c) && this.turn && !this.turn.done; }

  checkEnd() {
    if (this.state !== 'running') return true;
    this.syncRanks();
    if (this.livingMonsters().length === 0) {
      this.state = 'won';
      const alive = this.party.filter((c) => !c.dead);
      const share = Math.floor(this.xp / Math.max(1, alive.length));
      let xpText = `Each survivor earns ${share} XP.`;
      if (this.story.xpAward) xpText = this.story.xpAward(share, alive).text; else for (const c of alive) c.xp += share;
      this.say(`Victory! ${xpText} Found ${this.gold} gold.`, 'good');
      this.emit({ type: 'victory' });
      this.endCleanup();
      return true;
    }
    if (this.conscious().length === 0) { this.state = 'lost'; this.say('The party has fallen...', 'bad'); this.emit({ type: 'defeat' }); this.endCleanup(); return true; }
    return false;
  }
  endCleanup() {
    for (const c of this.party) {
      for (const k of ['dodging', 'hidden', 'blessed', 'shieldOfFaith', 'shieldSpell', 'prone', 'restrained', 'grappled', 'spiritGuardians', 'paralyzed', 'raging', 'reckless', 'invisible', 'sacredWeapon', 'frightened', 'mocked']) delete c.conditions[k];
      c.concentration = null;
      // Downed but not dead characters are stabilized after battle by companions
      if (!c.dead && c.hp <= 0) { c.stable = true; }
    }
  }

  nextTurn() {
    if (this.checkEnd()) return;
    for (let guard = 0; guard < 100; guard++) {
      this.turnIdx++;
      if (this.turnIdx >= this.order.length) { this.turnIdx = 0; this.round++; this.say(`— Round ${this.round + 1} —`, 'dim'); this.storyRound(); if (this.checkEnd()) return; this.legendaryActions(); if (this.checkEnd()) return; }
      const c = this.current();
      if (!c) continue;
      if (c.side === 'monster' && c.hp <= 0) continue;
      if (c.side === 'party' && c.dead) continue;
      this.startOfTurn(c);
      if (this.checkEnd()) return;
      if (c.side === 'party' && c.hp <= 0) continue; // death save consumed the turn
      if (c.side === 'monster' && (c.hp <= 0 || c.conditions.unconscious)) continue;
      if (c.conditions.paralyzed) { this.endOfTurnSaves(c); continue; }
      this.turn = { action: 1, bonus: 1, sneakUsed: false, done: false };
      return;
    }
  }

  startOfTurn(c) {
    delete c.conditions.dodging; delete c.conditions.shieldSpell; delete c.conditions.reckless; c.reaction = true;
    if (c.conditions.prone && (c.side === 'monster' ? c.hp > 0 : c.hp > 0)) { delete c.conditions.prone; this.say(`${c.name} stands up.`, 'dim'); }
    if (c.side === 'monster') {
      // Spirit Guardians aura
      for (const p of this.party) if (p.conditions.spiritGuardians && !isDown(p) && c.hp > 0) {
        const dc = spellDC(p); const ok = d20() + monsterSave(c, 'wis') >= dc; let dmg = roll('3d8'); if (ok) dmg = Math.floor(dmg / 2);
        this.say(`Spirit guardians sear ${c.name} for ${dmg} radiant${ok ? ' (save)' : ''}.`, 'spell'); this.damage(c, dmg, 'radiant', p);
      }
      if (c.T.special && !c.specialReady && die(6) >= c.T.special.recharge) c.specialReady = true;
      if (c.conditions.restrained && c.hp > 0) { // use its action to break free
        if (d20() + monsterSave(c, 'str') >= c.conditions.restrained.dc) { delete c.conditions.restrained; this.say(`${c.name} tears free of the web.`); }
      }
      return;
    }
    if (c.hp <= 0 && !c.dead) {
      if (c.stable) return;
      const r = d20({ lucky: hasTrait(c, 'Lucky') });
      if (r === 20) { c.hp = 1; c.deathSaves = { s: 0, f: 0 }; delete c.conditions.unconscious; this.say(`${c.name} rolls a natural 20 on a death save and springs back up with 1 HP!`, 'good'); this.emit({ type: 'revive', who: c }); return; }
      if (r === 1) c.deathSaves.f += 2; else if (r >= 10) c.deathSaves.s++; else c.deathSaves.f++;
      this.say(`${c.name} death save: ${r} (${c.deathSaves.s}✓ ${c.deathSaves.f}✗)`, r >= 10 ? '' : 'bad');
      if (c.deathSaves.f >= 3) this.kill(c); else if (c.deathSaves.s >= 3) { c.stable = true; this.say(`${c.name} is stable.`); }
      return;
    }
    if (c.conditions.poisoned && c.conditions.poisoned.rounds) { if (--c.conditions.poisoned.rounds <= 0) delete c.conditions.poisoned; }
  }
  endOfTurnSaves(c) {
    if (c.conditions.frightened && c.side === 'monster' && d20() + monsterSave(c, 'wis') >= c.conditions.frightened.dc) { delete c.conditions.frightened; this.say(`${c.name} masters its fear.`, 'dim'); }
    if (c.conditions.paralyzed && c.side === 'monster') {
      if (d20() + monsterSave(c, 'wis') >= c.conditions.paralyzed.dc) { delete c.conditions.paralyzed; this.say(`${c.name} shakes off the paralysis.`); }
    }
  }
  endTurn() { if (this.turn) this.turn.done = true; const c = this.current(); if (c) this.endOfTurnSaves(c); this.nextTurn(); }

  kill(c) {
    c.dead = true; c.hp = 0; this.say(`${c.name} has DIED.`, 'bad'); this.emit({ type: 'death', who: c });
    this.dropConcentration(c);
  }

  /* ---------- Damage & concentration ---------- */
  damage(target, amt, type, src, { crit = false, attack = false } = {}) {
    if (src && src.side === 'monster' && target.side === 'party' && this.diff && amt > 0) { const dm = this.diff.dmg * (this.noHealerEase ? this.noHealerEase.dmg : 1) * tuneX(this.diff, TUNING.floorDmg[this.story.floor], this.story.floor) * (this.story.floor > 0 ? tuneX(this.diff, TUNING.foeDmg[src.key], this.story.floor) : 1); if (dm !== 1) amt = Math.max(1, Math.round(amt * dm)); }
    if (target.side === 'monster') {
      if (target.hp <= 0) return 0;
      const tk = traitFor(target.T, type);
      if (tk) {
        const first = this.learn(target, type); const D = dtype(type); const before = amt; amt = applyTrait(amt, tk);
        const ev = [...this.events].reverse().find((e) => e.type === 'hit' && e.tgt === target && !e.adj);
        if (ev) { ev.dmg = amt; ev.adj = true; ev.mod = tk; }
        this.emit({ type: 'trait', who: target, dtype: type, kind: tk, first });
        if (tk === 'immune') { this.say(`${target.name} is immune to ${D.name.toLowerCase()}! ${D.icon}`, 'dim'); return 0; }
        this.say(tk === 'vuln' ? `${D.icon} ${target.name} is weak to ${D.name.toLowerCase()}: ${before} becomes ${amt}!` : `${D.icon} ${target.name} resists ${D.name.toLowerCase()}: ${before} becomes ${amt}.`, tk === 'vuln' ? 'good' : 'dim');
      }
      target.hp -= amt; delete target.conditions.unconscious;
      this.emit({ type: 'hurt', who: target, amt, crit });
      if (target.hp <= 0) {
        target.hp = 0; this.say(`${target.name} is slain!`, 'good'); this.emit({ type: 'kill', who: target, by: src });
        if (src && src.side === 'party' && src.cls === 'warlock' && !isDown(src)) { const th = Math.max(1, abilityMod(src, 'cha') + src.level); if (th > (src.tempHp || 0)) { src.tempHp = th; this.say(`Dark One's Blessing: ${src.name} gains ${th} temporary HP.`, 'spell'); } }
        if (src && src.side === 'party' && !isDown(src)) { const hk = fxSum(src, 'healOnKill'); if (hk) { const got = heal(src, hk); if (got) { this.say(`${src.name}'s gear drinks the kill: +${got} HP.`, 'good'); this.emit({ type: 'heal', who: src }); } } }
        this.xp += CR_XP[target.T.cr] || 10; this.gold += Math.floor(roll('2d6') * (1 + target.T.cr * 4));
        for (const p of this.party) if (p.concentration && p.concentration.targets) p.concentration.targets = p.concentration.targets.filter((x) => x !== target.id);
      }
      return amt;
    }
    // Party member
    const R = target.race;
    const resist = (R === 'hillDwarf' && type === 'poison') || ((R === 'dragonborn' || R === 'tiefling') && type === 'fire') || (type === 'fire' && target.equip?.cloak && ITEMS[target.equip.cloak]?.resist === 'fire');
    if (resist || (target.conditions.raging && BPS.includes(type))) amt = Math.floor(amt / 2);
    if (target.dead) return 0;
    if (target.tempHp > 0 && target.hp > 0) { const ab = Math.min(target.tempHp, amt); target.tempHp -= ab; amt -= ab; if (ab) this.say(`${target.name}'s temporary HP absorbs ${ab}.`, 'dim'); if (amt <= 0) return 0; }
    if (target.hp <= 0) {
      if (amt >= target.maxHp) { this.kill(target); return amt; }
      target.deathSaves.f += crit ? 2 : 1; target.stable = false; this.say(`${target.name} takes damage while down! (${target.deathSaves.f}✗)`, 'bad');
      if (target.deathSaves.f >= 3) this.kill(target);
      return amt;
    }
    target.hp -= amt;
    this.emit({ type: 'partyHurt', who: target, amt, crit, dtype: type });
    if (target.hp <= 0) {
      const overflow = -target.hp; target.hp = 0;
      if (overflow >= target.maxHp) { this.say(`Massive damage!`, 'bad'); this.kill(target); return amt; }
      if (target.res.relentless) { target.res.relentless = 0; target.hp = 1; this.say(`${target.name}'s Relentless Endurance keeps them standing at 1 HP!`, 'good'); return amt; }
      target.conditions.unconscious = true; target.deathSaves = { s: 0, f: 0 }; target.stable = false;
      this.say(`${target.name} falls unconscious!`, 'bad'); this.emit({ type: 'down', who: target });
      this.dropConcentration(target);
    } else if (target.concentration) {
      const dc = Math.max(10, Math.floor(amt / 2));
      const r = d20() + saveMod(target, 'con') + (target.conditions.blessed ? roll('1d4') : 0);
      if (r < dc) { this.say(`${target.name} loses concentration (${r} vs DC ${dc}).`, 'bad'); this.dropConcentration(target); }
      else this.say(`${target.name} keeps concentration (${r} vs DC ${dc}).`, 'dim');
    }
    if (target.hp > 0 && target.hp < target.maxHp * 0.3) this.emit({ type: 'lowHp', who: target });
    return amt;
  }
  dropConcentration(c) {
    const conc = c.concentration; if (!conc) return; c.concentration = null;
    const all = [...this.party, ...this.monsters];
    for (const t of all) {
      for (const k of ['blessed', 'shieldOfFaith', 'spiritGuardians', 'restrained', 'paralyzed', 'marked', 'invisible', 'frightened']) if (t.conditions[k] && t.conditions[k].src === c.id) delete t.conditions[k];
    }
    this.say(`${SPELLS[conc.spell].name} ends.`, 'dim');
  }

  /* ---------- Saving throws ---------- */
  save(target, ab, dc) {
    if (target.side === 'monster') {
      if ((target.conditions.paralyzed || target.conditions.unconscious) && (ab === 'str' || ab === 'dex')) return false;
      const dis = ab === 'dex' && target.conditions.restrained;
      return d20({ dis }) + monsterSave(target, ab) >= dc;
    }
    if ((target.hp <= 0 || target.conditions.paralyzed) && (ab === 'str' || ab === 'dex')) return false;
    const adv = (ab === 'dex' && (target.conditions.dodging || (target.cls === 'barbarian' && target.level >= 2))) || (target.race === 'hillDwarf' && ab === 'con') || (target.race === 'rockGnome' && ['int', 'wis', 'cha'].includes(ab));
    const dis = ab === 'dex' && target.conditions.restrained;
    const aura = Math.max(0, ...this.party.filter((p) => p.cls === 'paladin' && p.level >= 6 && !isDown(p)).map((p) => Math.max(1, abilityMod(p, 'cha'))));
    const r = d20({ adv, dis, lucky: hasTrait(target, 'Lucky') }) + saveMod(target, ab) + (target.conditions.blessed ? roll('1d4') : 0) + aura;
    return r >= dc;
  }

  /* ---------- Attack resolution ---------- */
  advantageFor(att, tgt, { ranged }) {
    let adv = false, dis = false;
    if (att.conditions.poisoned || att.conditions.prone || att.conditions.restrained || att.conditions.frightened) dis = true;
    if (att.conditions.hidden || att.conditions.reckless || att.conditions.invisible) adv = true;
    if (att.conditions.mocked) dis = true;
    if (tgt.conditions.invisible) dis = true;
    if (tgt.conditions.reckless && !ranged) adv = true;
    if (tgt.conditions.prone) { if (ranged) dis = true; else adv = true; }
    if (tgt.conditions.restrained || tgt.conditions.paralyzed || tgt.conditions.unconscious || tgt.hp <= 0) adv = true;
    if (tgt.conditions.dodging) dis = true;
    if (tgt.conditions.guided) adv = true;
    if (att.side === 'monster' && att.T.pack && this.awakeMonsters().filter((m) => m !== att).length) adv = true;
    return { adv, dis };
  }
  /** Generic attack. Returns {hit, crit, dmg}. */
  attack(att, tgt, { bonus, dmg, type, ranged = false, spell = false, label, extraOnCrit = 0, sneak = 0, dmgBonus = 0, rider = null, extra = null, onHit = null, forceDis = false }) {
    const { adv, dis: dis0 } = this.advantageFor(att, tgt, { ranged }); const dis = dis0 || forceDis;
    delete att.conditions.hidden; delete att.conditions.mocked; if (tgt.conditions.guided) delete tgt.conditions.guided;
    const lucky = att.side === 'party' && hasTrait(att, 'Lucky');
    const nat = d20({ adv, dis, lucky });
    let bless = att.conditions.blessed ? roll('1d4') : 0;
    if (att.conditions.inspired) { bless += roll('1' + att.conditions.inspired.die); delete att.conditions.inspired; }
    if (att.conditions.sacredWeapon) bless += att.conditions.sacredWeapon.bonus;
    let total = nat + bonus + bless;
    let ac = tgt.side === 'party' ? armorClass(tgt) : tgt.ac;
    const critOn = att.side === 'party' && !spell ? critRange(att) : 20;
    let crit = nat >= critOn;
    if (!ranged && (tgt.conditions.paralyzed || tgt.conditions.unconscious || (tgt.side === 'party' && tgt.hp <= 0))) crit = nat !== 1 ? true : crit;
    let hit = nat !== 1 && (crit || total >= ac);
    // Cutting Words (College of Lore): a bard's reaction subtracts an inspiration die from a monster's attack
    if (hit && !crit && att.side === 'monster') { const bard = this.party.find((p) => p.cls === 'bard' && p.level >= 3 && p.res.inspiration > 0 && p.reaction && !isDown(p)); if (bard) { const cw = roll('1' + inspirationDie(bard)); if (total - cw < ac) { bard.res.inspiration--; bard.reaction = false; total -= cw; hit = false; this.say(`${bard.name}'s Cutting Words throw off ${att.name} (-${cw})!`, 'spell'); } } }
    const advTxt = adv && !dis ? ' (adv)' : dis && !adv ? ' (dis)' : '';
    // Shield reaction
    if (hit && !crit && tgt.side === 'party' && tgt.reaction && knownSpells(tgt).includes('shield') && tgt.slots[0] > 0 && (!tgt.ai || tacticsOf(tgt).spells) && total < ac + 5 && tgt.hp > 0) {
      tgt.slots[0]--; tgt.reaction = false; tgt.conditions.shieldSpell = true; hit = false;
      this.say(`${tgt.name} casts Shield! (+5 AC) The ${label} glances off.`, 'spell'); this.emit({ type: 'spell', who: tgt, spell: 'shield' });
    }
    if (!hit) { this.caption(narrateAttack({ att, tgt, label, type, hit: false, ranged, spell }), `Miss — ${total} vs AC ${ac}`, 'miss'); this.say(`${att.name}'s ${label} misses ${tgt.name}${advTxt}. [${nat}+${bonus}${bless ? '+' + bless : ''}=${total} vs AC ${ac}]`, 'dim'); this.emit({ type: 'miss', att, tgt, spell: spell || null }); return { hit: false, crit: false, dmg: 0 }; }
    let d = roll(dmg, { crit, extraDice: crit ? extraOnCrit : 0 }) + dmgBonus;
    let sneakTxt = '';
    if (sneak) { d += roll(`${sneak}d6`, { crit }); sneakTxt = ' +Sneak Attack'; }
    if (onHit) { const ex = onHit(crit); if (ex) { d += roll(ex.dmg, { crit }); sneakTxt += ` +${ex.label}`; } }
    if (crit) this.emit({ type: 'crit', att, tgt });
    // Uncanny Dodge
    if (tgt.side === 'party' && tgt.cls === 'rogue' && tgt.level >= 5 && tgt.reaction && tgt.hp > 0) { tgt.reaction = false; d = Math.floor(d / 2); sneakTxt += ' (Uncanny Dodge halves)'; }
    this.say(`${att.name}'s ${label} ${crit ? 'CRITS' : 'hits'} ${tgt.name}${advTxt} for ${d} ${type}${sneakTxt}. [${nat}+${bonus}${bless ? '+' + bless : ''}=${total}]`, crit ? 'crit' : att.side === 'party' ? 'hit' : 'bad');
    this.emit({ type: 'hit', att, tgt, dmg: d, crit, dtype: type, spell: spell || null });
    this.damage(tgt, d, type, att, { crit, attack: true });
    this.caption(narrateAttack({ att, tgt, label, type, hit: true, crit, ranged, spell, killed: tgt.side === 'monster' && tgt.hp <= 0, downed: tgt.side === 'party' && tgt.hp <= 0 }), `${d} ${type} damage${crit ? ' · CRITICAL' : ''}${sneakTxt ? ' · ' + sneakTxt.trim().replace(/^\+/, '') : ''}`, crit ? 'crit' : att.side === 'party' ? 'hit' : 'bad');
    if (extra && !tgt.dead) { const e = roll(extra.dmg); this.say(`…plus ${e} ${extra.type}.`); this.damage(tgt, e, extra.type, att); }
    if (rider && !tgt.dead && (tgt.hp > 0 || rider.dmg)) this.applyRider(att, tgt, rider);
    return { hit: true, crit, dmg: d };
  }
  applyRider(att, tgt, r) {
    if (r.dmg) {
      const ok = this.save(tgt, r.save, r.dc); let d = roll(r.dmg); if (ok) d = r.half ? Math.floor(d / 2) : 0;
      if (d > 0) { this.say(`${tgt.name} ${ok ? 'resists some of' : 'is wracked by'} the ${r.type}: ${d} damage.`, ok ? '' : 'bad'); this.damage(tgt, d, r.type, att); }
    } else if (r.cond && tgt.hp > 0) {
      if (!this.save(tgt, r.save, r.dc)) { tgt.conditions[r.cond] = r.cond === 'restrained' ? { dc: r.dc, src: att.id } : true; this.say(`${tgt.name} is ${r.cond}!`, 'bad'); this.emit({ type: 'cond', who: tgt, cond: r.cond }); }
    }
  }

  /* ---------- Party actions (used by UI and AI) ---------- */
  actionsFor(c) {
    const acts = [];
    if (!this.turn || this.current() !== c) return acts;
    const t = this.turn;
    if (t.action) {
      const front = this.inFront(c);
      if (this.canMelee(c)) acts.push({ id: 'attack', label: `Attack (${weaponStats(c, 'weapon').name})${front ? '' : ' · reach'}`, target: 'enemy', range: 'melee' });
      if (c.equip.ranged) acts.push({ id: 'shoot', label: `Shoot (${weaponStats(c, 'ranged').name})`, target: 'enemy', range: 'ranged' });
      if (!front && c.equip.weapon && WEAPONS[c.equip.weapon.base].props.includes('thrown')) acts.push({ id: 'throw', label: 'Throw ' + WEAPONS[c.equip.weapon.base].name, target: 'enemy', range: 'ranged' });
      if (knownSpells(c).length) acts.push({ id: 'cast', label: 'Cast Spell…' });
      if (c.res.channelDivinity && c.cls === 'cleric') acts.push({ id: 'preserveLife', label: 'Channel Divinity: Preserve Life' });
      if (this.canMelee(c) && c.cls === 'paladin' && c.level >= 2 && c.slots.some((n) => n > 0)) acts.push({ id: 'smite', label: 'Attack + Divine Smite', target: 'enemy', range: 'melee' });
      if (c.cls === 'paladin' && c.res.layOnHands > 0) acts.push({ id: 'layOnHands', label: `Lay on Hands (${c.res.layOnHands} HP left)`, target: 'ally' });
      if (c.cls === 'paladin' && c.res.sacredWeapon && !c.conditions.sacredWeapon) acts.push({ id: 'sacredWeapon', label: 'Channel Divinity: Sacred Weapon' });
      if (c.res.breath) acts.push({ id: 'breath', label: 'Breath Weapon (fire)', target: 'enemy', range: 'ranged', area: true });
      if (this.inventory.some((k) => ITEMS[k]?.kind === 'potion')) acts.push({ id: 'item', label: 'Use Item…' });
      if (c.conditions.restrained) acts.push({ id: 'escape', label: 'Break Free (Athletics)' });
      if (this.story.staff && !this.staffBroken && this.monsters.some((m) => m.key === 'malthrax' && m.hp > 0)) acts.push({ id: 'strikeStaff', label: `⚡ Strike Malthrax's Staff (AC ${this.story.staff.ac})` });
      if (this.story.collar && !this.collarBroken && front && this.monsters.some((m) => m.key === 'cindermaw' && m.hp > 0)) acts.push({ id: 'breakCollar', label: '⛓ Break Cindermaw\'s Collar (Athletics DC 15)' });
      acts.push({ id: 'dodge', label: 'Dodge' });
      if (this.canFlee && !this.boss) acts.push({ id: 'flee', label: 'Run Away!' });
    }
    if (t.bonus) {
      if (this.conscious().length > 1) acts.push({ id: 'swap', label: `Swap rows (bonus) — you are in the ${this.inFront(c) ? 'front' : 'back'} row`, bonus: true, target: 'rowmate' });
      if (this.studyTargets(c).length) acts.push({ id: 'study', label: `Study a foe (${studySkill(this.studyTargets(c)[0].T)[0].toUpperCase()}${studySkill(this.studyTargets(c)[0].T).slice(1)} check) — learn weaknesses (bonus)`, bonus: true, target: 'enemy' });
      if (c.res.secondWind && c.hp < c.maxHp) acts.push({ id: 'secondWind', label: 'Second Wind (bonus)', bonus: true });
      if (c.cls === 'barbarian' && c.res.rage > 0 && !c.conditions.raging) acts.push({ id: 'rage', label: `RAGE! (bonus, ${c.res.rage} left)`, bonus: true });
      if (c.cls === 'barbarian' && c.level >= 3 && c.conditions.raging && t.attacked && this.inFront(c)) acts.push({ id: 'frenzy', label: 'Frenzy: extra attack (bonus)', bonus: true, target: 'enemy', range: 'melee' });
      if (c.cls === 'monk' && t.attacked && this.inFront(c)) { acts.push({ id: 'martialArts', label: 'Martial Arts: unarmed strike (bonus)', bonus: true, target: 'enemy', range: 'touch' }); if (c.res.ki > 0) acts.push({ id: 'flurry', label: `Flurry of Blows (bonus, 1 ki of ${c.res.ki})`, bonus: true, target: 'enemy', range: 'touch' }); }
      if (c.cls === 'monk' && c.res.ki > 0 && !t.attacked) acts.push({ id: 'patientDefense', label: 'Patient Defense: Dodge (bonus, 1 ki)', bonus: true });
      if (c.cls === 'bard' && c.res.inspiration > 0) acts.push({ id: 'inspire', label: `Bardic Inspiration (bonus, ${c.res.inspiration} left)`, bonus: true, target: 'ally' });
      if (c.cls === 'rogue' && c.level >= 2 && !c.conditions.hidden) acts.push({ id: 'hide', label: 'Cunning Action: Hide (bonus)', bonus: true });
      if (c.cls === 'rogue' && c.level >= 3 && this.inventory.some((k) => ITEMS[k]?.kind === 'potion')) acts.push({ id: 'item', label: 'Fast Hands: Use Item (bonus)', bonus: true });
    }
    if (c.res.actionSurge && !t.action) acts.push({ id: 'actionSurge', label: 'Action Surge!', bonus: true });
    acts.push({ id: 'end', label: 'End Turn', bonus: true });
    return acts;
  }
  /** Living enemies this hero has not yet tried to Study and that still hide something. */
  studyTargets(c) { return this.livingMonsters().filter((m) => !m.known.studied && !m.studyTried.has(c.id) && traitsOf(m.T).length > 0); }
  /** Bonus action Knowledge check: Arcana, Nature, Religion or History by creature type. Success reveals every weakness and resistance. */
  study(c, m) {
    this.turn.bonus = 0;
    if (!m || m.hp <= 0 || m.known.studied) { this.say(`${c.name} has nothing more to learn.`, 'dim'); return false; }
    const skill = studySkill(m.T), dc = studyDC(m.T); m.studyTried.add(c.id);
    const nat = d20(); const total = nat + skillMod(c, skill); const ok = total >= dc;
    this.say(`${c.name} studies ${m.name} (${skill} check ${nat}+${total - nat}=${total} vs DC ${dc}).`, 'spell');
    if (ok) {
      this.learnAll(m); const ts = traitsOf(m.T);
      const txt = ts.length ? ts.map((t) => `${dtype(t.type).icon} ${TRAIT_KINDS[t.kind].word.toLowerCase()} ${dtype(t.type).name.toLowerCase()}`).join(', ') : 'no special weaknesses';
      this.say(`${c.name} remembers: ${m.name} — ${txt}.`, 'good');
      this.caption(`${c.name} recalls the lore on ${m.name}.`, txt, 'spell');
    } else { this.say(`${c.name} can't recall anything useful about ${m.name}.`, 'dim'); this.caption(`${c.name} squints at ${m.name}, but the lore escapes them.`, `${skill[0].toUpperCase()}${skill.slice(1)} ${total} vs DC ${dc} — try someone else`, 'miss'); }
    this.emit({ type: 'study', who: c, tgt: m, ok });
    return ok;
  }
  castable(c, onlyBonus = false) {
    return knownSpells(c).map((k) => ({ k, s: SPELLS[k] })).filter(({ s }) => s.kind !== 'reaction' && !s.outOfCombat && s.target !== 'none' && (s.level === 0 || c.slots.slice(s.level - 1).some((n) => n > 0)) && (s.bonus ? this.turn?.bonus : this.turn?.action) && (!onlyBonus || s.bonus));
  }
  lowestSlot(c, lvl) { for (let l = lvl; l <= c.slots.length; l++) if (c.slots[l - 1] > 0) return l; return 0; }

  /** Perform an action for the current party member. opts: {target, targets, spell, slot, item} */
  act(c, id, opts = {}) {
    const t = this.turn; if (!t || this.state !== 'running') return;
    const kind = this.rangeKind(id, opts.spell);
    const enemy = () => { let tg = opts.target; if (!tg || tg.hp <= 0 || !this.canTarget(c, tg, kind)) tg = this.pickEnemy(c, kind); return tg; };
    if (['attack', 'smite', 'frenzy', 'martialArts', 'flurry'].includes(id) && !(id === 'attack' || id === 'smite' ? this.canMelee(c) : this.inFront(c))) { this.say(`${c.name} is in the back row and can't reach the enemy with a melee attack (use a ranged attack, a spell, a reach weapon, or swap rows).`, 'bad'); return; }
    // Ranks: melee only reaches the first two living groups (three with a reach weapon). A chosen foe beyond that is refused, nothing spent.
    if (['attack', 'smite', 'frenzy', 'martialArts', 'flurry', 'shoot', 'throw'].includes(id) || (id === 'cast' && SPELLS[opts.spell]?.melee)) {
      const tg = opts.target; if (tg && tg.side === 'monster' && tg.hp > 0 && !this.canTarget(c, tg, kind)) { this.say(`${tg.name} is out of reach: ${c.name} can't hit a foe that far back in melee (shoot it, cast a spell, use a reach weapon, or wipe out the groups in front).`, 'bad'); return; }
    }
    if (id === 'swap') { const o = opts.target; if (o && this.swapRows(c, o)) { t.bonus = 0; this.caption(`${c.name} and ${o.name} trade places.`, `${c.name} now in the ${this.inFront(c) ? 'front' : 'back'} row`, ''); } return; }
    if (id === 'study') { this.study(c, opts.target && opts.target.hp > 0 ? opts.target : this.studyTargets(c)[0]); return; }
    { const ck = cutinKindFor(id, id === 'cast' ? SPELLS[opts.spell] : id === 'item' ? ITEMS[opts.item] : null); if (ck) this.emit({ type: 'cutin', who: c, kind: ck, id, spell: id === 'cast' ? opts.spell : null, weapon: id === 'shoot' ? c.equip.ranged?.base : c.equip.weapon?.base }); }
    switch (id) {
      case 'attack': case 'shoot': case 'throw': case 'smite': {
        t.action = 0; t.attacked = true;
        const slot = id === 'shoot' ? 'ranged' : 'weapon';
        if (c.cls === 'barbarian' && c.level >= 2 && id !== 'shoot' && (c.conditions.raging || opts.reckless)) c.conditions.reckless = true;
        for (let i = 0; i < attacksPerAction(c); i++) {
          const tg = enemy(); if (!tg) break;
          const w = weaponStats(c, slot); const ranged = id === 'shoot' || id === 'throw';
          let sneak = 0;
          if (c.cls === 'rogue' && !t.sneakUsed && (w.finesse || w.ranged)) {
            const { adv, dis: dis0 } = this.advantageFor(c, tg, { ranged }); const dis = dis0 || w.heavyDis;
            const allyEngaged = this.frontRow().some((p) => p !== c);
            if ((adv && !dis) || (allyEngaged && !dis)) sneak = sneakDice(c);
          }
          this.emit({ type: 'partyAttack', who: c, tgt: tg, weapon: c.equip[slot]?.base || 'unarmed', ranged });
          const res = this.weaponHit(c, tg, w, { ranged, sneak, smite: id === 'smite' || opts.smite });
          if (res.hit && sneak) t.sneakUsed = true;
          if (this.checkEnd()) return;
        }
        break;
      }
      case 'cast': { this.castSpell(c, opts.spell, opts); break; }
      case 'rage': { t.bonus = 0; c.res.rage--; c.conditions.raging = true; this.say(`${c.name} flies into a RAGE!`, 'crit'); this.caption(`${c.name} throws back their head and ROARS, eyes blazing with fury!`, `Rage: +${rageDamage(c)} melee damage, resist weapon damage`, 'crit'); this.emit({ type: 'spell', who: c, spell: 'rage' }); break; }
      case 'frenzy': case 'martialArts': case 'flurry': {
        t.bonus = 0; const n = id === 'flurry' ? 2 : 1; if (id === 'flurry') c.res.ki--;
        for (let i = 0; i < n; i++) {
          const tg = enemy(); if (!tg) break;
          const w = id === 'frenzy' ? weaponStats(c, 'weapon') : unarmedStats(c);
          this.emit({ type: 'partyAttack', who: c, tgt: tg, weapon: id === 'frenzy' ? c.equip.weapon?.base || 'unarmed' : 'unarmed', ranged: false });
          const r = this.weaponHit(c, tg, w, { ranged: false });
          if (r.hit && id === 'flurry' && c.level >= 3 && tg.hp > 0 && !this.save(tg, 'dex', 8 + prof(c) + abilityMod(c, 'wis'))) { tg.conditions.prone = true; this.say(`Open Hand Technique: ${tg.name} is knocked prone!`, 'spell'); }
          if (this.checkEnd()) return;
        }
        break;
      }
      case 'patientDefense': t.bonus = 0; c.res.ki--; c.conditions.dodging = true; this.say(`${c.name} uses Patient Defense.`); this.caption(`${c.name} flows into a calm, untouchable stance.`, 'Patient Defense: Dodge', ''); break;
      case 'inspire': {
        t.bonus = 0; c.res.inspiration--;
        const ally = opts.target && opts.target.side === 'party' && opts.target !== c && !isDown(opts.target) ? opts.target : this.frontRow().find((p) => p !== c) || this.conscious().find((p) => p !== c) || c;
        ally.conditions.inspired = { die: inspirationDie(c) }; this.say(`${c.name} inspires ${ally.name} (+1${inspirationDie(c)}).`, 'spell');
        this.caption(`${c.name} strikes a rousing chord — ${ally.name} stands taller!`, `Bardic Inspiration: +1${inspirationDie(c)} on the next attack`, 'spell'); break;
      }
      case 'layOnHands': {
        t.action = 0; const p = opts.target && opts.target.side === 'party' && !opts.target.dead ? opts.target : this.mostHurt();
        const amt = Math.min(c.res.layOnHands, Math.max(1, p.maxHp - Math.max(0, p.hp))); c.res.layOnHands -= amt; const h = heal(p, amt);
        this.say(`${c.name} lays hands on ${p.name}: +${h} HP.`, 'good'); this.caption(`Golden light flows from ${c.name}'s palms into ${p.name}.`, `Lay on Hands: +${h} HP`, 'good'); this.emit({ type: 'heal', who: p }); break;
      }
      case 'sacredWeapon': { t.action = 0; c.res.sacredWeapon = 0; const b = Math.max(1, abilityMod(c, 'cha')); c.conditions.sacredWeapon = { bonus: b }; this.say(`${c.name}'s weapon blazes with holy light (+${b} to hit).`, 'spell'); this.caption(`${c.name} raises their blade, and it bursts into sacred radiance!`, `Sacred Weapon: +${b} to attack rolls`, 'spell'); break; }
      case 'dodge': t.action = 0; c.conditions.dodging = true; this.say(`${c.name} takes the Dodge action.`); this.caption(`${c.name} raises their guard, ready to dodge.`, 'Dodge: attacks against have disadvantage', ''); break;
      case 'strikeStaff': t.action = 0; this.strikeStaff(c); break;
      case 'breakCollar': t.action = 0; this.breakCollar(c); break;
      case 'escape': {
        t.action = 0; const r = d20() + Math.max(skillMod(c, 'athletics'), skillMod(c, 'acrobatics'));
        if (r >= (c.conditions.restrained?.dc || 12)) { delete c.conditions.restrained; this.say(`${c.name} breaks free! (${r})`); } else this.say(`${c.name} struggles in vain. (${r})`);
        break;
      }
      case 'flee': {
        t.action = 0;
        if (this.party.some((p) => p.conditions.grappled && !isDown(p))) { this.say(`Someone is grappled — the party can't escape!`, 'bad'); break; }
        const r = d20() + abilityMod(c, 'dex'); const dc = 10 + Math.max(...this.awakeMonsters().map((m) => monsterSave(m, 'dex')), 0);
        if (r >= dc) { this.state = 'fled'; this.say(`The party flees! (${r} vs ${dc})`, 'good'); this.emit({ type: 'fled' }); this.endCleanup(); return; }
        this.say(`${c.name} fails to find an escape route. (${r} vs ${dc})`, 'bad'); break;
      }
      case 'secondWind': { t.bonus = 0; c.res.secondWind = 0; const h = heal(c, roll('1d10') + c.level); this.say(`${c.name} catches a Second Wind: +${h} HP.`, 'good'); this.caption(`${c.name} grits their teeth and finds a second wind!`, `+${h} HP`, 'good'); this.emit({ type: 'heal', who: c }); break; }
      case 'actionSurge': { c.res.actionSurge = 0; t.action = 1; this.say(`${c.name} uses ACTION SURGE!`, 'crit'); this.caption(`${c.name} roars and surges forward — ACTION SURGE!`, 'An extra action', 'crit'); break; }
      case 'hide': {
        t.bonus = 0; const r = d20({ dis: !!(c.equip.armor && ARMOR[c.equip.armor.base]?.stealthDis) }) + skillMod(c, 'stealth');
        const pp = Math.max(...this.awakeMonsters().map((m) => 10 + monsterSave(m, 'wis')), 0);
        if (r >= pp) { c.conditions.hidden = true; this.say(`${c.name} slips into the shadows (Stealth ${r} vs ${pp}).`); } else this.say(`${c.name} fails to hide (Stealth ${r} vs ${pp}).`, 'dim');
        break;
      }
      case 'item': {
        if (t.action) t.action = 0; else t.bonus = 0;
        const key = opts.item || this.inventory.find((k) => ITEMS[k]?.kind === 'potion');
        const tgt = opts.target || c; const i = this.inventory.indexOf(key); if (i < 0) break; this.inventory.splice(i, 1);
        const I = ITEMS[key];
        if (I.heal) { const h = heal(tgt, roll(I.heal)); this.say(`${c.name} uses ${I.name} on ${tgt.name}: +${h} HP.`, 'good'); this.caption(tgt === c ? `${c.name} gulps down a ${I.name}.` : `${c.name} tips a ${I.name} into ${tgt.name}'s mouth.`, `+${h} HP`, 'good'); this.emit({ type: 'heal', who: tgt }); }
        if (I.cure) { delete tgt.conditions[I.cure]; this.say(`${tgt.name} is cured of being ${I.cure}.`, 'good'); }
        break;
      }
      case 'preserveLife': {
        t.action = 0; c.res.channelDivinity--; let pool = 5 * c.level;
        const hurt = this.party.filter((p) => !p.dead).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        for (const p of hurt) { const cap = Math.floor(p.maxHp / 2) - Math.max(0, p.hp); if (cap <= 0 || pool <= 0) continue; const h = heal(p, Math.min(cap, pool)); pool -= h; if (h) this.say(`Preserve Life restores ${h} HP to ${p.name}.`, 'good'); }
        this.emit({ type: 'heal', who: c }); break;
      }
      case 'breath': {
        t.action = 0; c.res.breath = 0; const dc = 8 + abilityMod(c, 'con') + prof(c); const dice = c.level >= 6 ? '3d6' : '2d6';
        this.emit({ type: 'spell', who: c, spell: 'breath' });
        this.caption(`${c.name} draws a deep breath and exhales a torrent of dragonfire!`, 'Breath Weapon', 'spell');
        const bg = opts.target && opts.target.hp > 0 ? this.groupOf(opts.target) : this.liveRanks()[0];
        for (const m of bg ? bg.monsters : []) { let dmg = roll(dice); const ok = this.save(m, 'dex', dc); if (ok) dmg = Math.floor(dmg / 2); this.say(`${c.name}'s fiery breath scorches ${m.name}: ${dmg}${ok ? ' (save)' : ''}.`, 'spell'); this.damage(m, dmg, 'fire', c); }
        break;
      }
      case 'end': t.done = true; break;
    }
    if (this.checkEnd()) return;
    if (t.done || (!t.action && !t.bonus && !c.res.actionSurge) || (!t.action && !this.actionsFor(c).some((a) => a.bonus && a.id !== 'end') && !this.castable(c, true).length)) this.endTurn();
  }

  /** A party weapon attack with all class riders: Rage, marks, Colossus Slayer, Divine Strike, Divine Smite, Brutal Critical. */
  weaponHit(c, tg, w, { ranged = false, sneak = 0, smite = false } = {}) {
    const t = this.turn || {};
    const rage = c.conditions.raging && !ranged ? rageDamage(c) : 0;
    const onHit = (crit) => {
      const parts = [], labels = [];
      if (tg.conditions.marked && tg.conditions.marked.src === c.id) { parts.push('1d6'); labels.push(SPELLS[tg.conditions.marked.spell]?.name || 'Mark'); }
      if (c.cls === 'ranger' && c.level >= 3 && !t.colossus && tg.hp < tg.maxHp) { t.colossus = true; parts.push('1d8'); labels.push('Colossus Slayer'); }
      if (c.cls === 'cleric' && c.level >= 8 && !t.divineStrike) { t.divineStrike = true; parts.push('1d8'); labels.push('Divine Strike'); }
      if (c.cls === 'paladin' && !ranged && c.level >= 2 && (smite || (c.ai && this.wantsSmite(c, tg, crit)))) {
        const l = this.lowestSlot(c, 1); if (l) { c.slots[l - 1]--; const n = Math.min(5, 1 + l + (tg.T && ['undead', 'fiend'].includes(tg.T.type) ? 1 : 0)); parts.push(`${n}d8`); labels.push('Divine Smite'); this.emit({ type: 'spell', who: c, spell: 'smite' }); }
      }
      if (setCount(c) >= 5) { parts.push('1d6'); labels.push('Dawn Regalia'); }
      if (!parts.length) return null;
      const dice = {}; for (const p of parts) { const [n, f] = p.split('d'); dice[f] = (dice[f] || 0) + +n; }
      return { dmg: Object.entries(dice).map(([f, n]) => `${n}d${f}`).join('+'), label: labels.join(' +') };
    };
    const brutal = (c.cls === 'barbarian' && c.level >= 9 && !ranged ? 1 : 0) + (c.race === 'halfOrc' && !ranged ? 1 : 0);
    return this.attack(c, tg, { bonus: w.bonus, dmg: w.dmg, dmgBonus: w.dmgBonus + rage, type: w.type, ranged, label: w.name, sneak, extraOnCrit: brutal, onHit, extra: w.elem || null, forceDis: !!w.heavyDis });
  }
  wantsSmite(c, tg, crit) { const big = this.boss || tg.T?.boss || tg.hp > 25; return crit || (big && c.slots.some((n) => n > 0) && (tacticsOf(c).spells !== false)); }

  castSpell(c, key, { target, targets, slot, aims: aims0, autoAim = false } = {}) {
    const S = SPELLS[key]; const t = this.turn;
    if (S.bonus) t.bonus = 0; else t.action = 0;
    let lvl = 0;
    if (S.level > 0) { lvl = slot && c.slots[slot - 1] > 0 ? slot : this.lowestSlot(c, S.level); if (!lvl) { this.say(`${c.name} has no slots left!`, 'bad'); return; } c.slots[lvl - 1]--; }
    const up = Math.max(0, lvl - S.level);
    const dc = spellDC(c), atk = spellAttack(c), sm = spellMod(c);
    this.say(`${c.name} casts ${S.name}${lvl > S.level ? ` (level ${lvl})` : ''}!`, 'spell');
    this.emit({ type: 'spell', who: c, spell: key, level: lvl });
    if (S.conc) { if (c.concentration) this.dropConcentration(c); c.concentration = { spell: key, targets: [] }; }
    const dmgExpr = (base) => { if (!base) return null; let e = base; const p = /^(\d+)d(\d+)/.exec(base); if (p) { let n = +p[1]; if (S.cantrip) n *= cantripDice(c); if (S.perLevel) n += up * +/^(\d+)/.exec(S.perLevel)[1]; e = `${n}d${p[2]}${base.slice(p[0].length)}`; } return e; };
    // Sorcerer: Empowered Spell (reroll damage, keep the higher) and Elemental Affinity (+Cha to fire)
    let empower = c.cls === 'sorcerer' && c.level >= 3 && lvl >= 1 && c.res.sorcery > 0 && S.dmg;
    if (empower) { c.res.sorcery--; this.say(`${c.name} empowers the spell (sorcery points left: ${c.res.sorcery}).`, 'dim'); }
    const affinity = c.cls === 'sorcerer' && c.level >= 6 && S.type === 'fire' ? Math.max(0, sm) : 0;
    const rollD = (e) => (empower ? Math.max(roll(e), roll(e)) : roll(e));
    const enemies = this.livingMonsters();
    const rk = S.melee ? 'touch' : 'ranged'; // spell range: melee-touch spells only reach the front groups, everything else any group
    const legalNow = (m) => !!m && m.hp > 0 && m.side === 'monster' && this.canTarget(c, m, rk);
    const pickT = () => (legalNow(target) ? target : this.pickEnemy(c, rk));
    // Area spells (S.area: Fireball, Burning Hands, ...) hit every living monster in ONE group: the group of the chosen foe, or (AI / auto-aim) the fullest group.
    const areaMembers = (pred) => { const g = legalNow(target) && !autoAim ? this.groupOf(target) : this.bestGroup(pred) || this.groupOf(this.pickEnemy(c, rk) || {}); return g ? g.monsters : []; };
    // Multi-projectile spells (Magic Missile darts, Scorching Ray rays, Eldritch Blast beams): every dart/ray/beam has its own target.
    // opts.aims = one monster (or monster id) per projectile, repeats allowed. No aims → everything at `target` (legacy), or — for the AI / auto-battle
    // (autoAim) or with no target — adaptive focus fire on the weakest awake foe. A target that is already dead when its projectile fires is replaced the same way.
    const nProj = projectileCount(c, key, lvl);
    let aims = null; // null entries = "pick the weakest awake foe at the moment this projectile fires" (focus fire that adapts to kills and misses)
    if (nProj) {
      const given = (Array.isArray(aims0) ? aims0 : []).map((a) => (typeof a === 'string' || typeof a === 'number' ? this.monsters.find((m) => m.id === a) : a)).filter((m) => m && m.side === 'monster' && legalNow(m));
      if (given.length) { aims = given.slice(0, nProj); while (aims.length < nProj) aims.push(null); }
      else if (legalNow(target) && !autoAim) aims = Array(nProj).fill(target);
    }
    let shot = 0; const pickA = () => { const a = aims ? aims[shot++] : null; return legalNow(a) ? a : this.pickEnemy(c, rk); };
    const tally = (list) => { const m = new Map(); for (const t of list) m.set(t.name, (m.get(t.name) || 0) + 1); return [...m].map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join(', '); };
    if (aims && new Set(aims).size > 1) this.say(`${nProj} ${projectileNoun(key)}s: ${tally(aims.filter(Boolean))}${aims.includes(null) ? ' + the rest at the weakest foe' : ''}.`, 'dim');
    switch (S.kind) {
      case 'attack': {
        const tg = pickT(); if (!tg) break;
        const r = this.attack(c, tg, { bonus: atk, dmg: dmgExpr(S.dmg), dmgBonus: (S.addMod ? sm : 0) + affinity, type: S.type, ranged: !S.melee, spell: true, label: S.name });
        if (r.hit && S.rider === 'guided' && tg.hp > 0) tg.conditions.guided = true;
        break;
      }
      case 'beams': { for (let i = 0; i < nProj; i++) { const tg = pickA(); if (!tg) break; this.attack(c, tg, { bonus: atk, dmg: S.dmg, dmgBonus: c.level >= 2 ? Math.max(0, sm) : 0, type: S.type, ranged: true, spell: true, label: S.name }); } break; }
      case 'mark': {
        const tg = pickT(); if (!tg) break; if (c.concentration) c.concentration.targets = [tg.id];
        for (const m of this.monsters) if (m.conditions.marked?.src === c.id) delete m.conditions.marked;
        tg.conditions.marked = { src: c.id, spell: key }; this.say(`${tg.name} is marked by ${S.name}.`, 'spell');
        this.caption(key === 'hex' ? `${c.name} whispers a curse, and shadows cling to ${tg.name}.` : `${c.name} fixes ${tg.name} with a hunter's stare.`, `${S.name}: +1d6 on every hit`, 'spell'); break;
      }
      case 'rays': { for (let i = 0; i < nProj; i++) { const tg = pickA(); if (!tg) break; this.attack(c, tg, { bonus: atk, dmg: S.dmg, type: S.type, ranged: true, spell: true, label: 'Scorching Ray' }); } break; }
      case 'auto': {
        const n = nProj;
        let tot = 0; const hitN = new Set(); let slain = 0;
        for (let i = 0; i < n; i++) { const tg = pickA(); if (!tg) break; const d = roll(S.dmg); this.say(`A glowing dart strikes ${tg.name} for ${d}.`, 'spell'); this.emit({ type: 'hit', att: c, tgt: tg, dmg: d, dtype: S.type, spell: key }); this.damage(tg, d, S.type, c); tot += d; hitN.add(tg.name); if (tg.hp <= 0) slain++; }
        this.caption(narr(S.type, { a: c.name, t: [...hitN].join(' and ') || 'the foe', w: S.name }), `${n} darts · ${tot} ${S.type} damage${slain ? ` · ${slain} slain` : ''}`, 'spell');
        break;
      }
      case 'save': {
        let tgs = S.area ? (targets || areaMembers()) : S.target === 'enemy' ? [pickT()] : S.target === 'allEnemies' ? enemies : (targets || this.pickGroup(legalNow(target) ? target : this.pickEnemy(c, rk), S.maxTargets));
        tgs = tgs.filter(Boolean); let tot = 0, saved = 0, slain = 0, held = 0;
        for (const m of tgs) {
          if (m.hp <= 0) continue;
          if (S.humanoidOnly && m.T.type !== 'humanoid') { this.say(`${m.name} is not a humanoid — no effect.`, 'dim'); continue; }
          const ok = this.save(m, S.save, dc);
          if (ok) saved++;
          if (S.dmg) { let d = rollD(dmgExpr(S.dmg)) + affinity; if (ok) d = S.half ? Math.floor(d / 2) : 0; if (S.cond && !ok && m.hp > d) { m.conditions[S.cond] = { dc, src: c.id }; held++; } this.say(`${m.name} ${ok ? 'saves' : 'fails'}: ${d} ${S.type}.`, 'spell'); if (d) { this.emit({ type: 'hit', att: c, tgt: m, dmg: d, dtype: S.type, spell: key }); this.damage(m, d, S.type, c); tot += d; if (m.hp <= 0) slain++; } }
          else if (S.cond && !ok) { m.conditions[S.cond] = { dc, src: c.id }; held++; this.say(`${m.name} is ${S.cond}!`, 'spell'); }
          else if (S.cond) this.say(`${m.name} resists.`, 'dim');
        }
        if (tgs.length) {
          const who = tgs.length > 1 ? `${tgs.length} foes` : tgs[0].name;
          if (S.dmg) this.caption(narr(S.type, { a: c.name, t: who, w: S.name }), `${S.name}: ${tot} ${S.type} damage${saved ? ` · ${saved} saved` : ''}${slain ? ` · ${slain} slain` : ''}`, 'spell');
          else this.caption(`${c.name}'s ${S.name} lashes out at ${who}!`, held ? `${held} ${S.cond}` : 'Resisted!', held ? 'spell' : 'miss');
        }
        break;
      }
      case 'sleep': {
        let pool = roll(`${5 + 2 * up}d8`); this.say(`Sleep affects up to ${pool} HP of creatures.`, 'spell');
        let zz = 0;
        const zone = areaMembers((m) => !m.T.construct);
        for (const m of zone.filter((m) => !m.conditions.unconscious && !m.T.construct).sort((a, b) => a.hp - b.hp)) { if (m.hp > pool) break; pool -= m.hp; m.conditions.unconscious = true; zz++; this.say(`${m.name} falls asleep!`, 'spell'); }
        this.caption(`${c.name} scatters a glittering sand of dreams…`, zz ? `${zz} ${zz > 1 ? 'foes fall' : 'foe falls'} asleep` : 'Nobody nods off!', zz ? 'spell' : 'miss');
        break;
      }
      case 'heal': {
        const tgs = S.target === 'allAllies' ? this.party.filter((p) => !p.dead).slice(0, 6) : [target || this.mostHurt()]; const healed = [];
        for (const p of tgs) {
          if (!p || p.dead) continue;
          let amt = roll(S.perLevel && up ? `${1 + up}${S.heal.slice(1)}` : S.heal) + (S.addMod ? sm : 0);
          if (c.cls === 'cleric') amt += 2 + lvl; // Disciple of Life
          const h = heal(p, amt); this.say(`${p.name} is healed for ${h}.`, 'good'); this.emit({ type: 'heal', who: p }); healed.push([p.name, h]);
        }
        if (healed.length) this.caption(narr('heal', { t: healed.length > 1 ? 'the party' : healed[0][0] }), `${S.name}: ${healed.map(([n, h]) => `${n} +${h}`).join(', ')} HP`, 'good');
        if (c.cls === 'cleric' && c.level >= 6 && tgs.some((p) => p !== c)) { const h = heal(c, 2 + lvl); if (h) this.say(`Blessed Healer: ${c.name} regains ${h}.`, 'good'); }
        break;
      }
      case 'buff': {
        if (S.buff !== 'mageArmor') this.caption(`${c.name} invokes ${S.name}!`, S.desc.split('.')[0], 'spell');
        if (S.buff === 'blessed') { const tgs = this.party.filter((p) => !isDown(p)).slice(0, 3); for (const p of tgs) p.conditions.blessed = { src: c.id }; this.say(`${tgs.map((p) => p.name).join(', ')} feel blessed.`, 'spell'); }
        if (S.buff === 'shieldOfFaith') { const p = target && target.side === 'party' ? target : this.frontRow()[0] || c; p.conditions.shieldOfFaith = { src: c.id }; this.say(`A shimmering field surrounds ${p.name} (+2 AC).`, 'spell'); }
        if (S.buff === 'spiritGuardians') { c.conditions.spiritGuardians = { src: c.id }; this.say(`Spectral guardians whirl around ${c.name}!`, 'spell'); }
        if (S.buff === 'aid') { for (const p of this.party.filter((p) => !p.dead).slice(0, 3)) if (!p.conditions.aid) { p.conditions.aid = true; p.maxHp += 5; heal(p, 5); } this.say(`Aid bolsters the party (+5 max HP).`, 'spell'); }
        if (S.buff === 'mageArmor') { const p = target || c; p.conditions.mageArmor = true; }
        if (S.buff === 'invisible') { const p = target && target.side === 'party' && !isDown(target) ? target : this.frontRow()[0] || c; p.conditions.invisible = { src: c.id }; this.say(`${p.name} vanishes from sight!`, 'spell'); }
        break;
      }
      case 'util': {
        if (key === 'spareTheDying') { const p = target && target.hp <= 0 && !target.dead ? target : this.party.find((p) => p.hp <= 0 && !p.dead); if (p) { p.stable = true; this.say(`${p.name} is stabilized.`, 'good'); } }
        if (key === 'lesserRestoration') { const p = target || this.party.find((p) => p.conditions.poisoned) || c; for (const k of S.cure) delete p.conditions[k]; this.say(`${p.name} is restored.`, 'good'); }
        if (key === 'revivify') { const p = target && target.dead ? target : this.party.find((p) => p.dead); if (p) { p.dead = false; p.hp = 1; p.deathSaves = { s: 0, f: 0 }; delete p.conditions.unconscious; this.say(`${p.name} gasps back to life!`, 'good'); this.emit({ type: 'revive', who: p }); } }
        break;
      }
    }
  }
  /** The weakest awake foe this hero can legally hit (kind: 'melee' | 'touch' | 'ranged'); with no hero, the weakest awake foe anywhere. */
  pickEnemy(c = null, kind = 'ranged') { const pool = c ? this.legalTargets(c, kind) : this.livingMonsters(); const a = pool.filter((m) => !m.conditions.unconscious); const l = a.length ? a : pool; return [...l].sort((x, y) => x.hp - y.hp)[0]; }
  /** First foe plus up to n-1 more for multi-target (not area) spells: its own group first, then the ranks behind it, front to back. */
  pickGroup(first, n) { const l = this.liveRanks().flatMap((g) => g.monsters); const out = first && first.hp > 0 ? [first] : []; const same = first ? l.filter((m) => m.gid === first.gid) : []; for (const m of [...same, ...l]) if (out.length < n && !out.includes(m)) out.push(m); return out; }
  mostHurt() { return this.party.filter((p) => !p.dead).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; }

  /* ---------- AI ---------- */
  /** Run the current combatant's turn automatically (monsters, AI companions). */
  autoTurn() {
    const c = this.current(); if (!c || this.state !== 'running') return;
    if (c.side === 'monster') this.monsterTurn(c); else { this.aiTurn(c); this.aiBonusAfter(c); }
    if (this.state === 'running' && this.current() === c && !this.turn.done) this.endTurn();
  }
  monsterSpecial(m) {
    const S = m.T.special; const dcAdd = this.story.empowered && m.T.boss ? 1 : 0;
    if (S.kind === 'gaze') {
      const tg = pick(this.conscious());
      const mirror = this.party.find((p) => !isDown(p) && p.equip?.shield === 'sunshardAegis');
      if (mirror) {
        const d = roll('4d6'); this.say(`${m.name} fixes its petrifying gaze — but ${mirror.name} raises the Sunshard Aegis! The gaze reflects back: ${d} damage and ${m.name} stiffens into stone!`, 'good');
        this.caption(`${mirror.name} turns the Sunshard Aegis like a mirror!`, `${m.name} is caught in its own gaze`, 'good'); this.damage(m, d, 'force', mirror);
        if (m.hp > 0) m.conditions.paralyzed = { dc: 13 }; return;
      }
      this.emit({ type: 'monsterAttack', who: m, tgt: tg });
      if (this.save(tg, S.save, S.dc + dcAdd)) { this.say(`${tg.name} averts their eyes from ${m.name}'s gaze.`, 'dim'); this.caption(`${m.name}'s eyes flash — ${tg.name} looks away in time!`, 'Saved', 'miss'); }
      else { tg.conditions.restrained = { dc: 14, src: m.id, stone: true }; this.say(`${tg.name} begins turning to stone (restrained)! A Potion of Stone-to-Flesh or Athletics DC 14 breaks it.`, 'bad'); this.caption(`${m.name}'s gaze turns ${tg.name}'s legs to stone!`, 'Petrifying', 'bad'); this.emit({ type: 'cond', who: tg, cond: 'restrained' }); }
      return;
    }
    if (S.kind === 'blast') {
      if (m.key === 'malthrax' && this.story.counter && !this.countered) {
        const fz = this.party.find((p) => p.companion === 'fizzwick' && !isDown(p));
        if (fz) { this.countered = true; this.say(`${fz.name}: "COUNTERSPELL! Page forty-two!" Malthrax's ${S.name} fizzles out.`, 'good'); this.caption(`${fz.name} counterspells Malthrax!`, `${S.name} fizzles`, 'good'); return; }
      }
      const targets = S.single ? [pick(this.conscious())] : this.conscious();
      this.say(`${m.name} ${S.text || 'uses ' + S.name}${S.single ? ' ' + targets[0].name : ''}!`, 'bad'); this.caption(`${m.name} ${S.text || 'uses ' + S.name}${S.single ? ' ' + targets[0].name : ''}!`, S.name, 'bad');
      this.emit({ type: 'monsterAttack', who: m, tgt: targets[0] });
      for (const tg of targets) {
        if (!tg || isDown(tg)) continue; const ok = this.save(tg, S.save, S.dc + dcAdd); let d = roll(S.dmg); if (ok) d = S.half ? Math.floor(d / 2) : 0;
        if (d > 0) { this.say(`${tg.name} ${ok ? 'partly resists' : 'takes the full blast'}: ${d} ${S.type}.`, ok ? '' : 'bad'); this.damage(tg, d, S.type, m); }
        else this.say(`${tg.name} shrugs it off.`, 'dim');
        if (!ok && S.cond && tg.hp > 0) tg.conditions[S.cond] = S.cond === 'poisoned' ? { rounds: 2 } : true;
        if (this.checkEnd()) return;
      }
    }
  }
  /** Story set-pieces at the start of a fight. */
  storyStart() {
    const st = this.story; if (!st) return;
    const live = () => this.party.filter((p) => !isDown(p));
    if (st.bless) { for (const p of live()) p.conditions.blessed = true; this.say(st.bless + ' (the party is Blessed)', 'spell'); }
    if (st.warhorn) { for (const p of live()) p.conditions.blessed = true; const g = this.monsters[0]; if (g) g.conditions.frightened = { dc: 15 }; this.say('You sound the Warden\'s Warhorn! Emberhollow\'s bells answer from far above. The party is Blessed and Gorvax recoils, frightened.', 'crit'); this.caption('You sound the Warden\'s Warhorn!', 'Party Blessed · Gorvax frightened', 'good'); }
    if (st.crystals) { const g = this.monsters[0]; if (g) { const d = roll(`${st.crystals * 2}d10`); this.say(`The dawn-light from ${st.crystals} shattered crystal pylon${st.crystals > 1 ? 's' : ''} erupts from the floor, searing Gorvax for ${d} radiant!`, 'good'); this.damage(g, d, 'radiant', null); } }
    if (st.smiths) { const g = this.monsters[0]; if (g) { g.conditions.restrained = { dc: 18 }; this.say('Dobbin\'s smiths burst in and throw forge-chains over Gorvax — the Tyrant is restrained!', 'good'); } }
    if (st.staff) { this.staffHits = 0; this.say(`Malthrax's staff crackles — it anchors Elowen's chains. Strike the staff (AC ${st.staff.ac}) to free her!`, 'sys'); }
    if (st.collar) this.say('Cindermaw strains against a spiked iron collar. Brakk holds the chain. A strong hand could break it.', 'sys');
    if (st.elowen) { this.guest = true; this.say('Princess Elowen stands with you, hands glowing with dawn-light.', 'good'); }
  }
  storyRound() {
    if (this.guest) { const p = this.party.filter((x) => !x.dead).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (p && p.hp < p.maxHp) { const h = heal(p, roll('2d8+4')); this.say(`Elowen calls down the dawn on ${p.name}: +${h} HP.`, 'good'); this.emit({ type: 'heal', who: p, amt: h }); } }
    if (this.story.guards) { const m = this.pickEnemy(); if (m) { const d = roll('1d8+2'); this.say(`A town guard from Rowan's patrol stabs ${m.name} for ${d}.`, 'good'); this.damage(m, d, 'piercing', null); } }
  }
  /** Legendary-style actions (SRD spirit): at the top of each round the floor bosses named in TUNING.legendary make that many extra basic attacks. B2-B5 only. */
  legendaryActions() {
    if (!(this.story.floor > 0)) return;
    for (const m of this.livingMonsters()) {
      const n = TUNING.legendary[m.key] || 0; if (!n || m.conditions.unconscious || m.conditions.paralyzed || !this.monsterActs(m)) continue;
      for (let i = 0; i < n; i++) {
        const live = this.conscious(); if (!live.length) return;
        const tg = pickWeighted(targetWeights(this.frontRow(), live, m.T), rand()); const A = m.T.attacks[0];
        this.say(`${m.name} lashes out again (legendary action)!`, 'bad'); this.emit({ type: 'monsterAttack', who: m, tgt: tg });
        this.attack(m, tg, { bonus: A.bonus + (TUNING.floorAtk[this.story.floor] || 0), dmg: A.dmg, type: A.type, label: A.name.toLowerCase(), rider: A.rider, extra: A.extra });
        if (this.checkEnd()) return;
      }
    }
  }
  strikeStaff(c) {
    const st = this.story.staff; const w = c.equip.weapon && this.inFront(c) ? weaponStats(c, 'weapon') : c.equip.ranged ? weaponStats(c, 'ranged') : null;
    const bonus = w ? w.bonus : spellAttack(c); const r = d20() + bonus;
    this.emit({ type: 'attack', who: c, tgt: this.monsters.find((m) => m.key === 'malthrax') });
    if (r >= st.ac) { this.staffHits = (this.staffHits || 0) + 1; this.say(`${c.name} strikes the Sovereign's staff! (${r} vs AC ${st.ac}) ${this.staffHits}/${st.hitsNeeded}`, 'good'); }
    else { this.say(`${c.name} swings at the staff and misses. (${r} vs AC ${st.ac})`, 'dim'); this.caption(`${c.name} lunges for the staff — Malthrax jerks it away!`, 'Miss', 'miss'); return; }
    if (this.staffHits >= st.hitsNeeded) {
      this.staffBroken = true; this.guest = true; const mx = this.monsters.find((m) => m.key === 'malthrax'); if (mx) { mx.ac -= 3; mx.conditions.prone = true; }
      this.say('CRACK! The staff shatters. Elowen\'s chains fall away — "About time!" She joins you as a healer. Malthrax staggers (AC −3).', 'crit');
      this.caption(`${c.name} shatters the Sovereign's staff!`, 'Elowen is free!', 'crit');
    } else this.caption(`${c.name} strikes the staff — it cracks!`, `${this.staffHits}/${st.hitsNeeded}`, 'good');
  }
  breakCollar(c) {
    const cm = this.monsters.find((m) => m.key === 'cindermaw' && m.hp > 0); if (!cm) return;
    const r = d20() + Math.max(skillMod(c, 'athletics'), skillMod(c, 'sleightOfHand'));
    if (r >= 15) { cm.ally = true; this.collarBroken = true; this.say(`${c.name} wrenches Cindermaw's collar apart! (${r}) The chimera roars — and turns on Brakk.`, 'crit'); this.caption(`${c.name} breaks Cindermaw's collar!`, 'The chimera turns on Brakk', 'crit'); }
    else { this.say(`${c.name} heaves at the collar but it holds. (${r} vs 15)`, 'dim'); this.caption(`${c.name} grabs for the collar — it holds!`, `${r} vs DC 15`, 'miss'); }
  }
  monsterTurn(m) {
    const T = m.T; this.turn.action = 0;
    if (m.ally) { // a freed monster turns on its old master
      const foe = this.livingMonsters().sort((a, b) => (b.T.lieutenant ? 1 : 0) - (a.T.lieutenant ? 1 : 0))[0]; if (!foe) return;
      for (const A of T.attacks.slice(0, 2)) { if (foe.hp <= 0) break; const d = roll(A.dmg); this.say(`${m.name} savages ${foe.name} with its ${A.name.toLowerCase()} for ${d}!`, 'good'); this.damage(foe, d, A.type, m); }
      this.caption(`${m.name} turns on ${foe.name}!`, 'Freed from the collar', 'good'); this.checkEnd(); return;
    }
    if (T.shriek) { const tg = pick(this.conscious()); if (tg) { tg.conditions.mocked = true; this.say(`${m.name} SHRIEKS! ${tg.name} is rattled (disadvantage on the next attack).`, 'bad'); this.caption(`${m.name} lets out a piercing shriek!`, `${tg.name} rattled`, 'bad'); } return; }
    if (!this.monsterActs(m)) { // Wizardry ranks: a melee monster in the 3rd or 4th group can't reach anyone and waits to advance (logged once per group per round)
      const k = m.gid + ':' + this.round; if (!(this.waitSaid ||= new Set()).has(k)) { this.waitSaid.add(k); this.say(`${m.name} waits behind the line, unable to reach anyone.`, 'dim'); }
      this.emit({ type: 'wait', who: m }); return;
    }
    const targets = this.conscious(); if (!targets.length) return;
    if (T.special && T.special.kind && m.specialReady && rand() < 0.6 && !(m.key === 'malthrax' && this.staffBroken && rand() < 0.5)) { m.specialReady = false; this.monsterSpecial(m); return; }
    const front = this.frontRow();
    const choose = () => { const live = this.conscious(); return pickWeighted(targetWeights(this.frontRow(), live, T), rand()); };
    if (T.special && m.specialReady && rand() < 0.6) {
      m.specialReady = false; const tg = choose();
      this.emit({ type: 'monsterAttack', who: m, tgt: tg });
      const nat = d20(); if (nat + T.special.bonus >= armorClass(tg)) { tg.conditions.restrained = { dc: T.special.escapeDc, src: m.id }; this.say(`${m.name} hurls sticky webbing — ${tg.name} is restrained!`, 'bad'); this.caption(`${m.name} sprays a net of sticky silk over ${tg.name}!`, `${tg.name} is restrained`, 'bad'); }
      else { this.say(`${m.name}'s web misses ${tg.name}.`, 'dim'); this.caption(`${m.name} spits webbing — ${tg.name} dives clear!`, 'Miss', 'miss'); }
      return;
    }
    const n = T.multi || T.attacks.length;
    for (let i = 0; i < n; i++) {
      const A = T.attacks[i % T.attacks.length]; const tg = choose(); if (!tg) return;
      this.emit({ type: 'monsterAttack', who: m, tgt: tg });
      const r = this.attack(m, tg, { bonus: A.bonus + (TUNING.floorAtk[this.story.floor] || 0), dmg: A.dmg, type: A.type, label: A.name.toLowerCase(), rider: A.rider, extra: A.extra });
      if (r.hit && A.grapple && tg.hp > 0) { tg.conditions.grappled = { src: m.id }; }
      if (this.checkEnd()) return;
    }
    void front;
  }
  aiTurn(c) {
    const t = this.turn; const enemies = this.awakeMonsters(); const all = this.livingMonsters();
    const T = tacticsOf(c); const thr = Math.min(95, Math.max(5, T.healAt)) / 100;
    const style = T.style;
    let hard = this.boss || all.reduce((s, m) => s + m.hp, 0) > 30 + c.level * 8;
    if (style === 'aggressive') hard = true; else if (style === 'defensive') hard = this.boss;
    const downed = this.party.filter((p) => p.hp <= 0 && !p.dead);
    const hurt = this.party.filter((p) => !isDown(p) && p.hp < p.maxHp * thr);
    const potion = T.potions ? this.inventory.find((k) => ITEMS[k]?.kind === 'potion') : null;
    const can = (k) => (T.spells || SPELLS[k].level === 0) && (T.aoe || !AOE_SPELLS.includes(k)) && this.castable(c).some((x) => x.k === k);
    // Area spells hit one whole group, so what counts is the fullest group, not the total head count
    const bgrp = this.bestGroup(), gn = bgrp ? bgrp.monsters.filter((m) => !m.conditions.unconscious).length : 0; const aoe2 = gn >= 2, aoe3 = enemies.length >= 3 && gn >= 2;
    this.lastAi = { who: c.id, style };
    const go = (id, o) => { if (this.state === 'running' && this.current() === c) this.act(c, id, o); };
    const cast = (k, o = {}) => go('cast', { spell: k, autoAim: true, ...o });
    if (c.conditions.restrained?.stone && this.inventory.includes('potionStoneFlesh')) return go('item', { item: 'potionStoneFlesh', target: c });
    if (t.action && this.story.staff && !this.staffBroken && this.monsters.some((m) => m.key === 'malthrax' && m.hp > 0) && rand() < (this.inFront(c) ? 0.6 : 0.35)) return go('strikeStaff');
    if (t.action && this.story.collar && !this.collarBroken && this.inFront(c) && this.monsters.some((m) => m.key === 'cindermaw' && m.hp > 0) && rand() < 0.5) return go('breakCollar');
    // Bonus actions first
    if (c.cls === 'fighter' && c.res.secondWind && c.hp < c.maxHp * 0.45) go('secondWind');
    if (c.cls === 'barbarian' && c.res.rage > 0 && !c.conditions.raging && t.bonus && (hard || c.res.rage > 2) && this.inFront(c)) go('rage');
    if (c.cls === 'bard' && c.res.inspiration > 0 && t.bonus && hard && !downed.length && !this.frontRow().some((p) => p !== c && p.conditions.inspired)) go('inspire');
    if ((c.cls === 'ranger' || c.cls === 'warlock') && t.bonus && !c.concentration && hard && T.spells) { const mk = c.cls === 'ranger' ? 'huntersMark' : 'hex'; if (can(mk)) cast(mk, { target: this.livingMonsters().sort((a, b) => b.hp - a.hp)[0] }); }
    if (['cleric', 'bard', 'druid'].includes(c.cls)) {
      if (downed.length && can('healingWord')) cast('healingWord', { target: downed[0] });
      else if (hurt.length >= 3 && can('massHealingWord')) cast('massHealingWord');
      else if (hurt.length && can('healingWord') && (style === 'support' || (style !== 'aggressive' && rand() < 0.6))) cast('healingWord', { target: hurt[0] });
    }
    if (c.cls === 'rogue' && c.level >= 2 && t.bonus) go('hide');
    if (this.state !== 'running' || this.current() !== c) return;
    // Main action
    // Defensive: badly hurt and nobody else to save them → drink a potion or dodge
    if (style === 'defensive' && c.hp < c.maxHp * Math.max(thr, 0.35)) { if (potion) return go('item', { item: potion, target: c }); if (!this.boss) return go('dodge'); }
    // Support: patch up allies first (potions on others if there is no healing spell)
    if (style === 'support' && potion && t.action) { const ally = this.party.filter((p) => !p.dead && p.hp < p.maxHp * thr).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]; if (ally && !(c.cls === 'cleric' && (can('cureWounds') || can('healingWord')))) return go('item', { item: potion, target: ally }); }
    // Phase D: a melee hero stuck in the back row trades places with an AI caster up front; casters and scholars Study the toughest foe early
    if (t.bonus && t.action && c.ai && !this.inFront(c) && c.equip.weapon && !c.equip.ranged && !this.hasReach(c) && ['fighter', 'barbarian', 'paladin', 'monk', 'rogue'].includes(c.cls)) {
      const sq = this.frontRow().find((p) => p !== c && p.ai && ['wizard', 'sorcerer', 'warlock', 'bard', 'druid'].includes(p.cls));
      if (sq) this.act(c, 'swap', { target: sq });
    }
    if (t.bonus && this.round <= 2 && ['wizard', 'cleric', 'druid', 'bard', 'ranger', 'sorcerer', 'warlock'].includes(c.cls) && this.state === 'running' && this.current() === c) {
      const st = this.studyTargets(c).sort((x, y) => y.maxHp - x.maxHp)[0];
      if (st && skillMod(c, studySkill(st.T)) >= 3 && rand() < 0.6) go('study', { target: st });
    }
    if (c.cls === 'fighter' && c.res.actionSurge && hard) { if (this.inFront(c)) go('attack', { target: this.pickEnemy(c, 'melee') }); else go('shoot', { target: this.pickEnemy(c) }); if (this.current() === c && this.state === 'running') go('actionSurge'); }
    if (this.state !== 'running' || this.current() !== c || !t.action) return;
    const front = this.inFront(c);
    if (c.cls === 'cleric') {
      const stillDown = this.party.filter((p) => p.hp <= 0 && !p.dead);
      const dead = this.party.find((p) => p.dead);
      if (dead && can('revivify')) return cast('revivify', { target: dead });
      if (stillDown.length && can('cureWounds')) return cast('cureWounds', { target: stillDown[0] });
      const veryHurt = style === 'aggressive' ? [] : this.party.filter((p) => !isDown(p) && p.hp < p.maxHp * (style === 'support' ? thr : Math.min(thr, 0.35 * thr / 0.4)));
      if (veryHurt.length >= 2 && c.res.channelDivinity) return go('preserveLife');
      if (veryHurt.length && can('cureWounds')) return cast('cureWounds', { target: veryHurt[0] });
      if (!c.concentration && hard && enemies.length >= 2 && can('spiritGuardians') && front) return cast('spiritGuardians');
      if (!c.concentration && hard && can('bless')) return cast('bless');
      if (this.boss && can('guidingBolt') && c.slots[0] > 1) return cast('guidingBolt');
    }
    if (c.cls === 'wizard') {
      const sg = this.bestGroup((m) => !m.T.construct), sleepable = sg ? sg.monsters.filter((m) => !m.conditions.unconscious && !m.T.construct) : [];
      if (aoe3 && can('fireball')) return cast('fireball');
      if (aoe2 && can('lightningBolt') && hard) return cast('lightningBolt');
      if (sleepable.length >= 2 && can('sleep') && sleepable.reduce((s, m) => s + m.hp, 0) <= 18 + 9 * (c.slots[1] ? 1 : 0) && c.level <= 4) return cast('sleep');
      if (hard && can('scorchingRay')) return cast('scorchingRay');
      if (aoe3 && can('burningHands') && hard) return cast('burningHands');
      if (hard && can('magicMissile') && c.slots[0] > 1) return cast('magicMissile', { target: this.pickEnemy(c) });
    }
    const veryHurt2 = style === 'aggressive' ? [] : this.party.filter((p) => !isDown(p) && p.hp < p.maxHp * Math.min(thr, 0.35));
    const stillDown2 = this.party.filter((p) => p.hp <= 0 && !p.dead); const bossT = this.livingMonsters().find((m) => m.T.boss) || this.livingMonsters().sort((a, b) => b.hp - a.hp)[0];
    if (c.cls === 'paladin') {
      if (stillDown2.length && c.res.layOnHands > 0) return go('layOnHands', { target: stillDown2[0] });
      if (veryHurt2.length && c.res.layOnHands >= 8) return go('layOnHands', { target: veryHurt2[0] });
      if (stillDown2.length && can('cureWounds')) return cast('cureWounds', { target: stillDown2[0] });
      if (hard && c.res.sacredWeapon && front && !c.conditions.sacredWeapon && enemies.length > 1) return go('sacredWeapon');
      if (hard && !c.concentration && can('bless') && enemies.length > 2) return cast('bless');
    }
    if (c.cls === 'bard' || c.cls === 'druid') {
      if (hurt.length >= 3 && can('massCureWounds')) return cast('massCureWounds');
      if (stillDown2.length && can('cureWounds')) return cast('cureWounds', { target: stillDown2[0] });
      if (veryHurt2.length && can('cureWounds')) return cast('cureWounds', { target: veryHurt2[0] });
    }
    if (hard && ['bard', 'druid', 'sorcerer', 'warlock', 'ranger', 'wizard', 'cleric'].includes(c.cls)) {
      const plan = {
        bard: [['holdMonster', this.boss], ['fear', aoe3 && !c.concentration], ['shatter', aoe2], ['holdPerson', bossT && bossT.T.type === 'humanoid' && !c.concentration], ['dissonantWhispers', true]],
        druid: [['insectPlague', aoe3], ['iceStorm', aoe3], ['blight', this.boss], ['callLightning', enemies.length >= 2], ['moonbeam', true], ['entangle', aoe2 && !c.concentration]],
        sorcerer: [['coneOfCold', aoe3], ['holdMonster', this.boss && !c.concentration], ['fireball', aoe3], ['blight', this.boss], ['iceStorm', aoe3], ['lightningBolt', aoe2], ['shatter', aoe2], ['scorchingRay', true], ['magicMissile', c.slots[0] > 1]],
        warlock: [['holdMonster', this.boss && !c.concentration], ['fireball', aoe3], ['blight', this.boss], ['shatter', aoe2], ['scorchingRay', c.level < 5]],
        ranger: [['conjureBarrage', aoe3]],
        wizard: [['coneOfCold', aoe3], ['holdMonster', this.boss && !c.concentration], ['blight', this.boss], ['iceStorm', aoe3]],
        cleric: [['flameStrike', enemies.length >= 2], ['guardianOfFaith', enemies.length >= 2]],
      }[c.cls];
      for (const [k, ok] of plan) if (ok && can(k)) return cast(k, { target: k === 'holdMonster' || k === 'blight' ? bossT : this.pickEnemy(c) });
    }
    if (potion && c.hp < c.maxHp * thr * 0.62 && !this.party.some((p) => ['cleric', 'druid', 'bard', 'paladin'].includes(p.cls) && canAct(p) && p !== c)) return go('item', { item: potion, target: c });
    if (c.conditions.restrained && rand() < 0.5) return go('escape');
    const BLASTERS = { wizard: 'fireBolt', sorcerer: 'fireBolt', warlock: 'eldritchBlast', druid: 'produceFlame', bard: 'viciousMockery' };
    if (front && c.equip.weapon && !['wizard', 'sorcerer', 'warlock', 'druid'].includes(c.cls)) return go('attack', { target: this.pickEnemy(c, 'melee') });
    if (BLASTERS[c.cls]) return cast(can(BLASTERS[c.cls]) ? BLASTERS[c.cls] : 'rayOfFrost', { target: this.pickEnemy(c) });
    if (style === 'defensive' && !front && !c.equip.ranged && c.cls !== 'cleric') return go('dodge');
    if (c.cls === 'cleric' && !front) return cast('sacredFlame', { target: this.pickEnemy(c) });
    if (c.equip.ranged) return go('shoot', { target: this.pickEnemy(c) });
    if (c.equip.weapon) return go(front ? 'attack' : 'dodge', { target: this.pickEnemy(c, 'melee') });
    return go('dodge');
  }
  /** Bonus actions that only make sense after attacking (Martial Arts, Flurry, Frenzy). */
  aiBonusAfter(c) {
    if (this.state !== 'running' || this.current() !== c || !this.turn || !this.turn.bonus) return;
    const ids = this.actionsFor(c).map((a) => a.id); const hard = this.boss || this.livingMonsters().reduce((s, m) => s + m.hp, 0) > 30 + c.level * 8;
    const go = (id) => this.act(c, id, { target: this.pickEnemy(c, this.rangeKind(id)) });
    if (ids.includes('flurry') && (hard || c.res.ki > c.level / 2)) return go('flurry');
    if (ids.includes('martialArts')) return go('martialArts');
    if (ids.includes('frenzy')) return go('frenzy');
  }
  /** Run until player input is needed or combat ends (used by the simulator and tests). */
  runAuto(maxSteps = 2000) {
    for (let i = 0; i < maxSteps && this.state === 'running'; i++) {
      const c = this.current(); if (!c) break;
      if (c.side === 'party' && !c.ai) { this.aiTurn(c); this.aiBonusAfter(c); if (this.current() === c && this.state === 'running') this.endTurn(); }
      else this.autoTurn();
    }
    return this.state;
  }
}
