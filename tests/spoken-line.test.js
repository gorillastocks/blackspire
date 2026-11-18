import { describe, it, expect } from 'vitest';
import { interpolateSpoken } from '../src/voices/spoken-line.js';

describe('interpolateSpoken', () => {
  const tmpl = 'Farewell, {m}. You will have a stanza. A short one.';
  const has = (text) => text.includes('Blackspire Cultist') || text.includes('Dire Wolf') || text.endsWith('creature. You will have a stanza. A short one.');

  it('prefers the exact monster name when that line is voiced', () => {
    expect(interpolateSpoken(tmpl, { m: 'Blackspire Cultist' }, { hasVoice: has, speaker: 'Grumsh' }))
      .toBe('Farewell, Blackspire Cultist. You will have a stanza. A short one.');
  });

  it('falls back to the base monster type for an unvoiced elite title', () => {
    expect(interpolateSpoken(tmpl, { m: 'Fangmother', mBase: 'Dire Wolf' }, { hasVoice: has, speaker: 'Grumsh' }))
      .toBe('Farewell, Dire Wolf. You will have a stanza. A short one.');
  });

  it('falls back to creature when no named clip exists', () => {
    expect(interpolateSpoken(tmpl, { m: 'Unknown Horror' }, { hasVoice: has, speaker: 'Grumsh' }))
      .toBe('Farewell, creature. You will have a stanza. A short one.');
  });

  it('falls back to friend for an unvoiced custom party name when that clip exists', () => {
    const down = 'Rise, {p}. I am too sad to do this alone.';
    const hasP = (text) => text === 'Rise, friend. I am too sad to do this alone.' || text === 'Rise, Pip. I am too sad to do this alone.';
    expect(interpolateSpoken(down, { p: 'Sean' }, { hasVoice: hasP, speaker: 'Grumsh' }))
      .toBe('Rise, friend. I am too sad to do this alone.');
    expect(interpolateSpoken(down, { p: 'Pip' }, { hasVoice: hasP, speaker: 'Grumsh' }))
      .toBe('Rise, Pip. I am too sad to do this alone.');
  });
});
