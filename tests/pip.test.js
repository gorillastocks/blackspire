import { describe, it, expect } from 'vitest';
import * as G from '../src/game/game.js';
import { COMPANIONS } from '../src/game/companions.js';
import { TT_SCENES } from '../src/game/tabletop.js';
import { PIP_PORTRAIT, portraitURL, PORTRAIT_COUNT } from '../src/portraits.js';

describe('Pip is a woman', () => {
  it('has her own painted portrait, kept on recruit and applied to old saves', () => {
    expect(PIP_PORTRAIT).toBeGreaterThan(PORTRAIT_COUNT); expect(COMPANIONS.pip.portrait).toBe(PIP_PORTRAIT);
    expect(portraitURL(PIP_PORTRAIT)).toMatch(/p37\.webp$/);
    const s = G.newGame({ name: 'T', cls: 'fighter', race: 'human' }); G.recruitCompanion(s, 'pip');
    const pip = [...s.party, ...s.roster].find((c) => c.companion === 'pip'); expect(pip.portrait).toBe(PIP_PORTRAIT);
    pip.portrait = 14; // the old male portrait
    const back = G.deserialize(G.serialize(s)); expect([...back.party, ...back.roster].find((c) => c.companion === 'pip').portrait).toBe(PIP_PORTRAIT);
  });
  it('quest text and journal never call Pip he, him or his', () => {
    const src = JSON.stringify(TT_SCENES);
    for (const m of src.matchAll(/Pip[^.]{0,60}\.\s*(He|His)\b/g)) throw new Error('male pronoun for Pip: ' + m[0]);
    expect(src).toContain('She believes it'); expect(src).toContain('I told Pip to stop. She did not.');
    expect(/\blad\b|\bbrother\b/i.test(JSON.stringify(COMPANIONS.pip))).toBe(false);
  });
});
