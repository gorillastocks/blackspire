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
  it('strips any leading emoji or symbol marker so recorded bare text matches', () => {
    for (const [shown, bare] of [['📦 The lid creaks open…', 'The lid creaks open…'], ['⚔ Victory!', 'Victory!'], ['✨ Rare find!', 'Rare find!'], ['⛺ Delve recap', 'Delve recap'], ['⚠ Beware.', 'Beware.'], ['✦ +5 XP each', '+5 XP each'], ['⬆\uFE0F Level up.', 'Level up.'], ['👑 The end.', 'The end.']]) {
      expect(spokenText(shown)).toBe(bare); expect(normVoiceText(shown)).toBe(normVoiceText(bare));
    }
  });
  it('leaves letters, digits, quotes and leading ellipses alone', () => {
    for (const t of ['…and more', '"Run," she said.', '3 gold', 'Elite: The Pale Hound waits.']) expect(spokenText(t)).toBe(t);
  });
});
