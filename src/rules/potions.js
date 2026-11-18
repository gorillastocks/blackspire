/** Healing-potion helpers shared by camp, inventory, and combat AI. */
import { ITEMS } from './data.js';
import { avg } from './dice.js';

/** HP potions the party can drink to heal. Antitoxin and Stone-to-Flesh stay special-purpose. */
export function isHealPotion(key) {
  const I = ITEMS[key];
  return !!(I && I.kind === 'potion' && I.heal && key !== 'potionStoneFlesh');
}

export function healPotionCount(inv) {
  return (inv || []).filter(isHealPotion).length;
}

/**
 * Pick a healing potion from inventory. Uses the weakest remaining one so
 * Greater (and any stronger) potions are saved until the smaller ones are gone.
 * missingHp is accepted so callers can pass the wound size; it does not change the pick.
 * Returns a key or null.
 */
export function pickHealPotion(inv, missingHp = Infinity) {
  void missingHp;
  const keys = [...new Set((inv || []).filter(isHealPotion))];
  if (!keys.length) return null;
  const scored = keys.map((k) => ({ k, avg: avg(ITEMS[k].heal) })).sort((a, b) => a.avg - b.avg || a.k.localeCompare(b.k));
  return scored[0].k;
}
