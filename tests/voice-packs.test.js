import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PACKS, KINDS, DEFAULT_PACK, packById, packOf, packLine, createBarkLimiter, barkPlayOpts, takeBestBarks, packSpeaker, HERO_LINES, heroSpeakerFor, RATES, HERO_RATES } from '../src/voices/packs.js';
import { newGame, createRecruit } from '../src/game/game.js';
import { normVoiceText } from '../src/voices/norm.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const DASH = /[\u2014\u2013\u2015]|\s-\s|--/;
const WANT = { attack: 3, hit: 2, miss: 1, crit: 1, spell: 1, heal: 1, levelUp: 1, victory: 1, downed: 1, camp: 1, lowHp: 1, select: 1 };

describe('voice packs', () => {
  it('has the default hero pack plus ten medieval packs', () => {
    expect(PACKS).toHaveLength(11);
    expect(PACKS[0].id).toBe(DEFAULT_PACK);
    expect(PACKS.slice(1).map((p) => p.id)).toEqual(['gruffWarrior', 'youngHeroine', 'wiseElder', 'slyRogue', 'nobleKnight', 'fierceShieldmaiden', 'cheerfulBard', 'dourDwarf', 'mysticSorceress', 'boomingBarbarian']);
  });
  it('every pack has about 15 short reaction lines of every kind, with no dashes between words', () => {
    for (const p of PACKS) {
      for (const k of KINDS) { expect(p.lines[k], `${p.id}.${k}`).toHaveLength(WANT[k]); for (const t of p.lines[k]) { expect(DASH.test(t), `${p.id}: ${t}`).toBe(false); expect(t.length).toBeLessThanOrEqual(45); } }
      expect(KINDS.reduce((n, k) => n + p.lines[k].length, 0)).toBe(15);
    }
  });
  it('the ten packs use ten distinct ElevenLabs voices that are not part of the story cast', () => {
    const cast = read('src/voices/cast.json'); const storyIds = new Set(Object.entries(cast).filter(([k]) => !k.startsWith('vp_')).map(([, v]) => v.id));
    const ids = PACKS.slice(1).map((p) => p.voice);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) expect(storyIds.has(id), id).toBe(false);
    for (const p of PACKS) expect(cast[packSpeaker(p)]?.id, p.id).toBeTruthy();
  });
  it('no pack line repeats across packs (so a clip is found by text alone too)', () => {
    const all = PACKS.flatMap((p) => KINDS.flatMap((k) => p.lines[k].map(normVoiceText)));
    expect(new Set(all).size).toBe(all.length);
  });
  it('every pack line is recorded and wired into the runtime index', () => {
    const idx = read('src/voices/index.json').byText;
    const miss = PACKS.flatMap((p) => KINDS.flatMap((k) => p.lines[k].filter((t) => !idx[`${packSpeaker(p).toLowerCase()}|${normVoiceText(t)}`]).map((t) => `${p.id}: ${t}`)));
    expect(miss).toEqual([]);
  });
  it('the choice is saved on the character; the default hero uses Ser Aldric and companions have no pack', () => {
    const s = newGame({ name: 'Mara', cls: 'fighter', voicePack: 'slyRogue' });
    const hero = s.party.find((c) => !c.companion);
    expect(hero.voicePack).toBe('slyRogue'); expect(packOf(hero).id).toBe('slyRogue');
    expect(newGame({ name: 'Ser Aldric' }).party.find((c) => !c.companion).voicePack).toBe(DEFAULT_PACK);
    expect(newGame({ name: 'X', voicePack: 'nonsense' }).party.find((c) => !c.companion).voicePack).toBe(DEFAULT_PACK);
    expect(packOf(s.party.find((c) => c.companion))).toBeNull();
    expect(packOf({ name: 'Old save hero' }).id).toBe(DEFAULT_PACK); // saves from before packs
    const ev = createRecruit(s, { name: 'Bryn', race: 'human', cls: 'rogue', voicePack: 'dourDwarf' });
    expect(ev.char.voicePack).toBe('dourDwarf');
    expect(JSON.parse(JSON.stringify(ev.char)).voicePack).toBe('dourDwarf'); // survives a save
  });
  it('packLine picks a line of that kind and avoids repeating the last one', () => {
    const p = packById('gruffWarrior');
    for (let i = 0; i < 30; i++) { const a = packLine(p, 'attack', 'Take that!'); expect(p.lines.attack).toContain(a); expect(a).not.toBe('Take that!'); }
    expect(packLine(p, 'nope')).toBeNull();
  });
});

describe('the hero speaks story replies in their own voice pack', () => {
  const idx = read('src/voices/index.json').byText;
  it('HERO_LINES are exactly the quoted hero replies used by the story and are dash free', () => {
    const src = ['src/game/story.js', 'src/game/phaseC_text.js'].map((f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n').replace(/\\'/g, "'");
    expect(HERO_LINES).toHaveLength(7);
    for (const t of HERO_LINES) { expect(src.includes(t), t).toBe(true); expect(DASH.test(t), t).toBe(false); }
  });
  it('every pack (default and the ten others) has a clip for every hero reply', () => {
    const miss = PACKS.flatMap((p) => HERO_LINES.filter((t) => !idx[`${packSpeaker(p).toLowerCase()}|${normVoiceText(t)}`]).map((t) => `${p.id}: ${t}`));
    expect(miss).toEqual([]);
  });
  it('the default hero clips and the text only lookup are still Ser Aldric', () => {
    for (const t of HERO_LINES) expect(idx[normVoiceText(t)], t).toBe(idx[`seraldric|${normVoiceText(t)}`]);
  });
  it('picks the hero pack, and falls back to Ser Aldric when the pack has no clip', () => {
    const has = (t, who) => who === 'vp_slyrogue' && t === HERO_LINES[0];
    expect(heroSpeakerFor(packById('slyRogue'), HERO_LINES[0], has)).toBe('vp_slyrogue');
    expect(heroSpeakerFor(packById('slyRogue'), HERO_LINES[1], has)).toBe('serAldric');
    expect(heroSpeakerFor(null, HERO_LINES[0], has)).toBe('serAldric');
    expect(heroSpeakerFor(packById(DEFAULT_PACK), HERO_LINES[0], () => true)).toBe('serAldric');
  });
});

describe('voice pack bark limiter (no spam)', () => {
  it('spaces reactions out per character and globally', () => {
    const L = createBarkLimiter({ rnd: () => 0 });
    expect(L.allow(0, 'a', 'attack')).toBe(true);
    expect(L.allow(1000, 'b', 'attack')).toBe(false);   // anyone: global gap
    expect(L.allow(4000, 'a', 'attack')).toBe(false);   // same character: per character gap
    expect(L.allow(4000, 'b', 'attack')).toBe(true);
    expect(L.allow(9500, 'a', 'attack')).toBe(true);
  });
  it('does not drop a bark just because another voice is busy (it will queue and expire if stale)', () => {
    const L = createBarkLimiter({ rnd: () => 0 });
    expect(L.allow(0, 'a', 'crit', true)).toBe(true);
    expect(L.allow(0, 'a', 'downed', true)).toBe(true);
    expect(L.allow(100, 'a', 'levelUp', true)).toBe(true);
  });
  it('hero combat barks are allowed more often than a recruit\'s, especially crits', () => {
    expect(HERO_RATES.attack).toBeGreaterThan(RATES.attack);
    expect(HERO_RATES.hit).toBeGreaterThan(RATES.hit);
    expect(HERO_RATES.spell).toBeGreaterThan(RATES.spell);
    expect(HERO_RATES.crit).toBe(1);
    expect(HERO_RATES.lowHp).toBe(1);
    const L = createBarkLimiter({ perChar: 0, global: 0, rnd: () => 0.5 }); // 0.5 fails recruit attack (0.22) and passes hero (0.55)
    expect(L.allow(0, 'recruit', 'attack', { hero: false })).toBe(false);
    expect(L.allow(0, 'hero', 'attack', { hero: true })).toBe(true);
    const C = createBarkLimiter({ perChar: 9000, global: 3500, rnd: () => 0 });
    expect(C.allow(0, 'hero', 'attack', { hero: true })).toBe(true);
    expect(C.allow(100, 'hero', 'crit', { hero: true })).toBe(true); // hero crit is not blocked by the per-character gap
  });
  it('when attack and crit pile up on one swing, only the crit is kept', () => {
    const hero = { id: 'h', name: 'Aldric' };
    const pip = { id: 'p', name: 'Pip' };
    expect(takeBestBarks([
      { c: hero, kind: 'attack' },
      { c: hero, kind: 'crit' },
      { c: pip, kind: 'attack' },
    ]).map((b) => `${b.c.name}:${b.kind}`)).toEqual(['Aldric:crit', 'Pip:attack']);
  });
  it('combat barks queue with a short maxWait; downed starts immediately', () => {
    expect(barkPlayOpts('attack', { hero: true })).toEqual({ kind: 'battle', queue: true, maxWait: 6000, combatBark: true });
    expect(barkPlayOpts('hit', { hero: false }).ifIdle).toBeUndefined();
    expect(barkPlayOpts('hit', { hero: false }).queue).toBe(true);
    expect(barkPlayOpts('downed', { hero: true })).toEqual({ kind: 'battle' });
    expect(barkPlayOpts('levelUp')).toEqual({ kind: 'battle' });
  });
  it('plain attacks speak only now and then', () => {
    let n = 0; const L = createBarkLimiter({ perChar: 0, global: 0, rnd: () => (n++ % 10) / 10 });
    const said = Array.from({ length: 20 }, (_, i) => L.allow(i * 10000, 'a', 'attack')).filter(Boolean).length;
    expect(said).toBeGreaterThan(0); expect(said).toBeLessThan(10);
  });
  it('low HP and downed lines are not repeated within 20 seconds', () => {
    const L = createBarkLimiter({ rnd: () => 0 });
    expect(L.allow(0, 'a', 'lowHp')).toBe(true);
    expect(L.allow(12000, 'a', 'lowHp')).toBe(false);
    expect(L.allow(21000, 'a', 'lowHp')).toBe(true);
  });
});
