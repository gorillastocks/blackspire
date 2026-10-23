// All-AI balance simulation: a full party plays through every level's encounters and bosses.
import { newGame, randomEncounter, afterCombat } from '../game/game.js';
import { Combat } from '../rules/combat.js';
import { LEVEL_DEFS } from '../dungeon/levels.js';
import { longRest, shortRest, canLevelUp, levelUp } from '../rules/character.js';
import { setRng, seeded } from '../rules/dice.js';

export function simulateRun(seed, { heroCls = 'fighter', encountersPerLevel = [16, 18, 16], restEvery = 4 } = {}) {
  setRng(seeded(seed));
  const s = newGame({ name: 'Sim', cls: heroCls, race: 'human' });
  s.party.forEach((c) => { c.ai = true; });
  const stats = { seed, fights: 0, wins: 0, losses: 0, bossAttempts: [0, 0, 0], levels: [], deaths: 0, rounds: 0 };
  const town = () => { for (const c of s.party) { if (c.dead) { c.dead = false; c.hp = 1; stats.deaths++; } while (canLevelUp(c)) levelUp(c); longRest(c); } };
  for (let L = 0; L < LEVEL_DEFS.length; L++) {
    s.level = L; s.mode = 'dungeon';
    for (let i = 0; i < encountersPerLevel[L]; i++) {
      const cb = new Combat(s.party, randomEncounter(s), { inventory: s.inventory });
      cb.runAuto(); stats.fights++; stats.rounds += cb.round + 1;
      if (cb.state === 'won') stats.wins++; else stats.losses++;
      afterCombat(s, cb, {});
      if (cb.state === 'lost') { town(); continue; }
      if ((i + 1) % 2 === 0) for (const c of s.party) shortRest(c);
      if ((i + 1) % restEvery === 0) town();
    }
    town();
    let beat = false;
    for (let a = 0; a < 4 && !beat; a++) {
      stats.bossAttempts[L]++;
      const def = LEVEL_DEFS[L];
      const cb = new Combat(s.party, def.boss.map((g) => ({ key: g.key, count: g.count[0] })), { inventory: s.inventory, boss: true, canFlee: false });
      cb.runAuto(); stats.rounds += cb.round + 1;
      beat = cb.state === 'won';
      afterCombat(s, cb, { boss: true }); town();
    }
    stats.levels.push(s.party.map((c) => c.level).join('/'));
    if (!beat) { stats.result = `stuck on L${L + 1}`; setRng(null); return stats; }
  }
  stats.result = 'victory'; setRng(null);
  return stats;
}
