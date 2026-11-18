import { describe, it, expect } from 'vitest';
import { setRng, seeded } from '../src/rules/dice.js';
import { newGame, innRest, rest } from '../src/game/game.js';
import * as Story from '../src/game/story.js';
import { applyFx } from '../src/game/tabletop.js';

const fresh = (diff) => {
  setRng(seeded(7));
  const s = newGame({ name: 'T', cls: 'fighter', race: 'human' });
  if (diff) s.difficulty = diff;
  return s;
};

describe('moon and seal clock after a long rest', () => {
  it('defaults to Normal (5 rests per moon), including unknown difficulties', () => {
    expect(Story.restsPerMoon(fresh())).toBe(5);
    expect(Story.restsPerMoon(fresh('normal'))).toBe(5);
    expect(Story.restsPerMoon(fresh('story'))).toBe(5);
    expect(Story.restsPerMoon(fresh('hard'))).toBe(3);
    const odd = fresh('nightmare');
    expect(Story.restsPerMoon(odd)).toBe(5);
  });

  it('logs an unvoiced countdown after every camp or inn rest, and toasts it', () => {
    const s = fresh('normal');
    const camp = rest(s, 'long');
    const clock = camp.filter((e) => /Long rests until next moonrise/.test(e.log || ''));
    expect(clock).toHaveLength(1);
    expect(clock[0].log).toBe('☾ Long rests until next moonrise: 4 · Seals broken: 0 of 5');
    expect(clock[0].toast).toBe(clock[0].log);
    expect(clock[0].voice).toBeUndefined();
    expect(clock[0].cls).toBe('dim');
    expect(s.rests).toBe(1);
    expect(s.moon).toBe(0);

    s.gold = 50;
    const inn = innRest(s);
    const innClock = inn.filter((e) => /Long rests until next moonrise/.test(e.log || ''));
    expect(innClock).toHaveLength(1);
    expect(innClock[0].log).toBe('☾ Long rests until next moonrise: 3 · Seals broken: 0 of 5');
    expect(innClock[0].voice).toBeUndefined();
    expect(s.rests).toBe(2);
  });

  it('keeps the existing voiced moonrise (and Malthrax) lines, then adds the unvoiced status', () => {
    const s = fresh('normal');
    for (let i = 0; i < 4; i++) Story.onLongRest(s);
    const ev = Story.onLongRest(s);
    expect(s.moon).toBe(1);
    expect(s.rests).toBe(5);
    expect(ev[0].log).toMatch(/The moon rises over Emberhollow/);
    expect(ev[0].voice).toEqual({ text: 'The moon rises over Emberhollow. A seal on the Blackspire cracks and breaks.', who: 'narrator' });
    expect(ev[1].log).toBe('☾ Long rests until next moonrise: 5 · Seals broken: 1 of 5');
    expect(ev[1].toast).toBe(ev[1].log);
    expect(ev[1].voice).toBeUndefined();
  });

  it('on Hard, a moon still rises every 3 long rests, and announces empowerment at 15', () => {
    const s = fresh('hard');
    Story.onLongRest(s); Story.onLongRest(s);
    const ev = Story.onLongRest(s);
    expect(s.moon).toBe(1);
    expect(ev[0].voice?.who).toBe('narrator');
    expect(ev[1].log).toBe('☾ Long rests until next moonrise: 3 · Seals broken: 1 of 5');
    let last;
    for (let i = 0; i < 12; i++) last = Story.onLongRest(s);
    expect(s.moon).toBe(5);
    expect(Story.empowered(s)).toBe(true);
    expect(last.some((e) => e.voice?.text === 'Five moons, Emberhollow.')).toBe(true);
    expect(last.find((e) => e.toast).log).toBe('☾ Malthrax is empowered. All 5 seals are broken.');
  });

  it('on Normal, 15 rests is only moon 3; empowerment takes 25', () => {
    const s = fresh('normal');
    for (let i = 0; i < 15; i++) Story.onLongRest(s);
    expect(s.moon).toBe(3);
    expect(Story.empowered(s)).toBe(false);
    for (let i = 0; i < 10; i++) Story.onLongRest(s);
    expect(s.moon).toBe(5);
    expect(Story.empowered(s)).toBe(true);
  });

  it('uses the live difficulty: switching Mid-campaign does not skip or double a moon, and keeps the existing moon count', () => {
    const s = fresh('hard');
    Story.onLongRest(s); Story.onLongRest(s);
    expect(s.moon).toBe(0);
    expect(Story.restsUntilMoonrise(s)).toBe(1);
    s.difficulty = 'normal';
    expect(Story.restsUntilMoonrise(s)).toBe(3); // 2 since last moon, need 5
    Story.onLongRest(s); Story.onLongRest(s);
    expect(s.moon).toBe(0);
    const ev = Story.onLongRest(s);
    expect(s.moon).toBe(1);
    expect(s.rests).toBe(5);
    expect(ev.filter((e) => e.voice?.who === 'narrator')).toHaveLength(1);

    // After 4 more rests on Normal, flip to Hard: already past Hard's 3, so the next rest raises exactly one moon.
    for (let i = 0; i < 4; i++) Story.onLongRest(s);
    expect(s.moon).toBe(1);
    s.difficulty = 'hard';
    expect(Story.restsUntilMoonrise(s)).toBe(1);
    const ev2 = Story.onLongRest(s);
    expect(s.moon).toBe(2);
    expect(ev2.filter((e) => /The moon rises/.test(e.log || ''))).toHaveLength(1);
    expect(s.rests).toBe(10);
  });

  it('old saves keep their moon count: last moonrise is inferred as every 3 rests', () => {
    const s = fresh('normal');
    s.moon = 2; s.rests = 7; // last moon was at rest 6 under the old clock
    expect(s.restsAtLastMoon).toBeUndefined();
    expect(Story.restsUntilMoonrise(s)).toBe(4);
    for (let i = 0; i < 3; i++) Story.onLongRest(s);
    expect(s.moon).toBe(2);
    Story.onLongRest(s);
    expect(s.moon).toBe(3);
    expect(s.rests).toBe(11);
    expect(s.restsAtLastMoon).toBe(11);
  });

  it('a story seal that cracks outside a rest resets the interval, so the next rest does not double a moon', () => {
    const s = fresh('hard');
    Story.onLongRest(s); Story.onLongRest(s);
    applyFx(s, { moon: 1 });
    expect(s.moon).toBe(1);
    expect(s.restsAtLastMoon).toBe(2);
    const ev = Story.onLongRest(s);
    expect(s.moon).toBe(1);
    expect(ev.some((e) => /The moon rises/.test(e.log || ''))).toBe(false);
    Story.onLongRest(s); Story.onLongRest(s);
    expect(s.moon).toBe(2);
  });

  it('stops the clock once the campaign is over, including inn stays after victory', () => {
    const s = fresh('normal');
    for (let i = 0; i < 4; i++) Story.onLongRest(s);
    expect(s.rests).toBe(4);
    s.victory = true;
    expect(Story.onLongRest(s)).toEqual([]);
    expect(s.rests).toBe(4);
    expect(s.moon).toBe(0);
    expect(s.flags.ended).toBe(true);
    s.gold = 50;
    const inn = innRest(s);
    expect(inn.some((e) => /moonrise|empowered|seals/i.test(e.log || ''))).toBe(false);
    expect(s.rests).toBe(4);
  });

  it('quests tab hint includes the live countdown and rate', () => {
    const s = fresh('normal');
    Story.onLongRest(s);
    expect(Story.questsClockHint(s)).toBe('Moon 1 of 5 · Seals broken: 0/5 · 4 long rests until next moonrise (5 per moon)');
    s.difficulty = 'hard'; s.moon = 5; s.rests = 15; s.restsAtLastMoon = 15;
    expect(Story.questsClockHint(s)).toMatch(/Malthrax is EMPOWERED/);
  });
});
