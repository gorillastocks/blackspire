import { describe, it, expect } from 'vitest';
import { spokenText, normVoiceText } from '../src/voices/norm.js';

describe('spoken text normalisation', () => {
  it('turns dashes into commas and strips card prefixes', () => {
    expect(spokenText('🕯 The door — heavy, old — is shut.')).toBe('The door, heavy, old, is shut.');
    expect(spokenText('📜 Wait - what?')).toBe('Wait, what?');
    expect(spokenText('Dungeon Master: Stand back.')).toBe('Stand back.');
  });
  it('keeps hyphenated words and matches display text to the recorded text', () => {
    expect(spokenText('A half-elf in the Rat-Warrens.')).toBe('A half-elf in the Rat-Warrens.');
    expect(normVoiceText('Hold on… “now”')).toBe(normVoiceText('Hold on... "now"'));
    expect(normVoiceText('She waits — and listens.')).toBe(normVoiceText('She waits, and listens.'));
  });
});
