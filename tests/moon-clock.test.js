import { describe, it, expect } from 'vitest';
import { setRng, seeded } from '../src/rules/dice.js';
import { newGame, innRest, rest } from '../src/game/game.js';
import * as Story from '../src/game/story.js';

const fresh = () => { setRng(seeded(7)); return newGame({ name: 'T', cls: 'fighter', race: 'human' }); };

describe('moon and seal clock after a long rest', () => {
  it('logs an unvoiced countdown after every camp or inn rest, and toasts it', () => {
    const s = fresh();
    const camp = rest(s, 'long');
    const clock = camp.filter((e) => /Long rests until next moonrise/.test(e.log || ''));
    expect(clock).toHaveLength(1);
    expect(clock[0].log).toBe('☾ Long rests until next moonrise: 2 · Seals broken: 0 of 5');
    expect(clock[0].toast).toBe(clock[0].log);
    expect(clock[0].voice).toBeUndefined();
    expect(clock[0].cls).toBe('dim');
    expect(s.rests).toBe(1);
    expect(s.moon).toBe(0);

    s.gold = 50;
    const inn = innRest(s);
    const innClock = inn.filter((e) => /Long rests until next moonrise/.test(e.log || ''));
    expect(innClock).toHaveLength(1);
    expect(innClock[0].log).toBe('☾ Long rests until next moonrise: 1 · Seals broken: 0 of 5');
    expect(innClock[0].voice).toBeUndefined();
    expect(s.rests).toBe(2);
  });

  it('keeps the existing voiced moonrise (and Malthrax) lines, then adds the unvoiced status', () => {
    const s = fresh();
    Story.onLongRest(s); Story.onLongRest(s);
    const ev = Story.onLongRest(s);
    expect(s.moon).toBe(1);
    expect(s.rests).toBe(3);
    expect(ev[0].log).toMatch(/The moon rises over Emberhollow/);
    expect(ev[0].voice).toEqual({ text: 'The moon rises over Emberhollow. A seal on the Blackspire cracks and breaks.', who: 'narrator' });
    expect(ev[1].log).toBe('☾ Long rests until next moonrise: 3 · Seals broken: 1 of 5');
    expect(ev[1].toast).toBe(ev[1].log);
    expect(ev[1].voice).toBeUndefined();
  });

  it('announces that Malthrax is empowered once all five seals are broken, and does not add new voice', () => {
    const s = fresh();
    let last;
    for (let i = 0; i < 15; i++) last = Story.onLongRest(s);
    expect(s.moon).toBe(5);
    expect(Story.empowered(s)).toBe(true);
    expect(last.some((e) => e.voice?.who === 'narrator')).toBe(true);
    expect(last.some((e) => e.voice?.text === 'Five moons, Emberhollow.')).toBe(true);
    const status = last.find((e) => e.toast);
    expect(status.log).toBe('☾ Malthrax is empowered. All 5 seals are broken.');
    expect(status.voice).toBeUndefined();
    const later = Story.onLongRest(s);
    expect(later.map((e) => e.log)).toEqual(['☾ Malthrax is empowered. All 5 seals are broken.']);
    expect(later[0].voice).toBeUndefined();
    expect(s.moon).toBe(5);
    expect(s.rests).toBe(16);
  });

  it('stops the clock once the campaign is over, including inn stays after victory', () => {
    const s = fresh();
    for (let i = 0; i < 4; i++) Story.onLongRest(s);
    expect(s.rests).toBe(4);
    s.victory = true;
    expect(Story.onLongRest(s)).toEqual([]);
    expect(s.rests).toBe(4);
    expect(s.moon).toBe(1);
    expect(s.flags.ended).toBe(true);
    s.gold = 50;
    const inn = innRest(s);
    expect(inn.some((e) => /moonrise|empowered|seals/i.test(e.log || ''))).toBe(false);
    expect(s.rests).toBe(4);
  });
});
