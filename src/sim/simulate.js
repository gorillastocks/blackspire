// All-AI balance simulation: a full party plays through every level's encounters, bosses and the two-phase finale.
import { newGame, randomEncounter, afterCombat, equip, combatOpts } from '../game/game.js';
import { Combat } from '../rules/combat.js';
import { LEVEL_DEFS } from '../dungeon/levels.js';
import { ITEMS } from '../rules/data.js';
import { longRest, shortRest, canLevelUp, levelUp, canWearArmor } from '../rules/character.js';
import { setRng, seeded } from '../rules/dice.js';

const groupsOf = (gs) => gs.map((g) => ({ key: g.key, count: g.count[0] }));
// Hand each Dawn Regalia piece to the party member who can use it best (front-liners first).
function equipRegalia(s) {
  for (let i = s.inventory.length - 1; i >= 0; i--) {
    const k = s.inventory[i]; if (!ITEMS[k]?.set) continue;
    for (const c of s.party) { const before = s.inventory.length; equip(s, c, i); if (s.inventory.length !== before || s.inventory[i] !== k) break; }
  }
}
export function simulateRun(seed, { heroCls = 'fighter', encountersPerLevel = [12, 14, 14, 14, 12], restEvery = 4, difficulty = 'normal' } = {}) {
  setRng(seeded(seed));
  const s = newGame({ name: 'Sim', cls: heroCls, race: 'human' });
  s.flags.prologue = true;
  s.party.forEach((c) => { c.ai = true; });
  const stats = { seed, fights: 0, wins: 0, losses: 0, bossAttempts: LEVEL_DEFS.map(() => 0), levels: [], deaths: 0, rounds: 0 };
  const town = () => { for (const c of s.party) { if (c.dead) { c.dead = false; c.hp = 1; stats.deaths++; } while (canLevelUp(c)) levelUp(c); longRest(c); } equipRegalia(s); };
  const fight = (info) => {
    const cb = new Combat(s.party, info.groups, { inventory: s.inventory, boss: !!info.boss, canFlee: !info.boss, difficulty, story: combatOpts(s, info), lore: s.lore });
    cb.runAuto(); stats.rounds += cb.round + 1;
    const ev = afterCombat(s, cb, info); return { cb, ev };
  };
  for (let L = 0; L < LEVEL_DEFS.length; L++) {
    s.level = L; s.mode = 'dungeon'; s.maxDepth = Math.max(s.maxDepth, L);
    for (let i = 0; i < encountersPerLevel[L]; i++) {
      const { cb } = fight({ groups: randomEncounter(s) }); stats.fights++;
      if (cb.state === 'won') stats.wins++; else stats.losses++;
      if (cb.state === 'lost') { town(); continue; }
      if ((i + 1) % 2 === 0) for (const c of s.party) shortRest(c);
      if ((i + 1) % restEvery === 0) town();
    }
    town();
    const def = LEVEL_DEFS[L];
    let beat = false;
    for (let a = 0; a < 4 && !beat; a++) {
      stats.bossAttempts[L]++;
      let { cb, ev } = fight(s.flags.boss4p1 && def.phase2 ? { groups: groupsOf(def.phase2), boss: true, phase2: true } : { groups: groupsOf(def.boss), boss: true });
      const next = ev.find((e) => e.combat);
      if (cb.state === 'won' && next) ({ cb } = fight(next.combat)); // phase 2 straight away, no rest
      beat = cb.state === 'won' && s.bossDead[L];
      town();
    }
    stats.levels.push(s.party.map((c) => c.level).join('/'));
    if (!beat) { stats.result = `stuck on L${L + 1}`; setRng(null); return stats; }
  }
  stats.result = s.victory ? 'victory' : 'no-victory'; setRng(null);
  return stats;
}
