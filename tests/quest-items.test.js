import { describe, it, expect } from 'vitest';
import { ITEMS } from '../src/rules/data.js';
import { newGame, sell, canSell, isQuestItem, formatGold, buy, priceOf } from '../src/game/game.js';

const fresh = () => newGame({ name: 'T', cls: 'fighter', race: 'human' });
const QUEST_KEYS = Object.keys(ITEMS).filter((k) => ITEMS[k].kind === 'key' || ITEMS[k].kind === 'quest');

describe('quest and key items cannot be sold', () => {
  it('marks every key and quest item, and only those cost 0', () => {
    expect(QUEST_KEYS.sort()).toEqual(['dawnstoneAmulet', 'key1', 'key2', 'key3', 'key4', 'key5', 'royalWrit', 'signetRing', 'warhorn']);
    for (const k of QUEST_KEYS) {
      expect(isQuestItem(k), k).toBe(true);
      expect(canSell(k), k).toBe(false);
      expect(ITEMS[k].cost, k).toBe(0);
    }
    for (const k of Object.keys(ITEMS)) {
      if (ITEMS[k].cost === 0) expect(isQuestItem(k), k).toBe(true);
      else expect(isQuestItem(k), k).toBe(false);
    }
    expect(isQuestItem('tinCup')).toBe(false);
    expect(isQuestItem('potionHealing')).toBe(false);
    expect(canSell('tinCup')).toBe(true);
  });

  it('sell() leaves quest items and keys in the pack and does not add gold', () => {
    const s = fresh();
    const pack = ['signetRing', 'royalWrit', 'warhorn', 'dawnstoneAmulet', 'key1', 'tinCup'];
    s.inventory = pack.slice();
    const gold = s.gold;
    for (const k of pack.slice(0, 5)) {
      expect(sell(s, s.inventory.indexOf(k))).toEqual([]);
    }
    expect(s.inventory).toEqual(pack);
    expect(s.gold).toBe(gold);
  });

  it('sell() still sells junk and potions for half price', () => {
    const s = fresh(); s.inventory = ['tinCup', 'potionHealing']; s.gold = 10;
    const ev = sell(s, 0);
    expect(ev[0].log).toMatch(/Dented Tin Cup/);
    expect(s.inventory).toEqual(['potionHealing']);
    expect(s.gold).toBe(10 + Math.floor(priceOf('tinCup') / 2));
    sell(s, 0);
    expect(s.inventory).toEqual([]);
    expect(s.gold).toBe(10 + Math.floor(priceOf('tinCup') / 2) + Math.floor(priceOf('potionHealing') / 2));
  });

  it('formats party gold with grouping', () => {
    expect(formatGold(1234)).toBe('1,234');
    expect(formatGold(0)).toBe('0');
    expect(formatGold(50)).toBe('50');
  });

  it('buying still spends gold as before', () => {
    const s = fresh(); s.gold = 60;
    buy(s, 'potionHealing');
    expect(s.gold).toBe(10);
    expect(s.inventory).toContain('potionHealing');
  });
});
