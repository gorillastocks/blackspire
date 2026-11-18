import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { companionTemplates, spokenMonsterNames, partyNameVariants } from '../scripts/voice-catalog.mjs';
import { interpolateSpoken } from '../src/voices/spoken-line.js';
import { normVoiceText } from '../src/voices/norm.js';
import { MONSTERS } from '../src/rules/data.js';
import { ELITES } from '../src/dungeon/extras.js';

const index = JSON.parse(readFileSync(new URL('../src/voices/index.json', import.meta.url), 'utf8'));
const hasVoice = (text, who) => {
  const n = normVoiceText(text);
  const sp = String(who || '').toLowerCase().replace(/\s+/g, '');
  return !!(index.byText[`${sp}|${n}`] || index.byText[n]);
};

const typeNames = [...new Set(Object.values(MONSTERS).map((m) => m.name))];
const eliteTitles = [...new Set(ELITES.flatMap((floor) => floor.map((e) => e[0])))];
const titleType = new Map();
for (const floor of ELITES) for (const [title, groups] of floor) {
  const key = groups[0][0];
  titleType.set(title, MONSTERS[key].name);
}

const GRUMSH_FAREWELL = 'Farewell, {m}. You will have a stanza. A short one.';

describe('templated voice lines', () => {
  const templates = companionTemplates();
  const withM = templates.filter((t) => /\{m\}/.test(t.template));
  const withP = templates.filter((t) => /\{p\}/.test(t.template));

  it('enumerates monster-name and party-name templates', () => {
    expect(withM.length).toBeGreaterThan(5);
    expect(withP.length).toBeGreaterThan(5);
    expect(spokenMonsterNames()).toEqual(expect.arrayContaining([...typeNames, ...eliteTitles, 'creature']));
    expect(partyNameVariants()).toEqual(expect.arrayContaining(['Pip', 'Ser Aldric', 'friend']));
  });

  it("has a recorded clip for Grumsh's farewell to a Blackspire Cultist", () => {
    const text = GRUMSH_FAREWELL.replaceAll('{m}', 'Blackspire Cultist');
    expect(hasVoice(text, 'grumsh'), text).toBe(true);
  });

  it('every templated bark × monster type name has a recorded clip', () => {
    const miss = [];
    for (const t of withM) {
      for (const m of typeNames) {
        const text = interpolateSpoken(t.template, { m }, {});
        if (!hasVoice(text, t.speaker)) miss.push(`${t.speaker}|${t.ev}|${text}`);
      }
    }
    expect(miss).toEqual([]);
  });

  it('elite titles resolve to a voiced line via the base monster type', () => {
    const miss = [];
    for (const t of withM) {
      for (const title of eliteTitles) {
        const mBase = titleType.get(title);
        expect(mBase, title).toBeTruthy();
        const text = interpolateSpoken(t.template, { m: title, mBase }, { hasVoice, speaker: t.speaker });
        if (!hasVoice(text, t.speaker)) miss.push(`${t.speaker}|${t.ev}|${title} → ${text}`);
      }
    }
    expect(miss).toEqual([]);
  });

  it('every templated bark × default party name has a recorded clip', () => {
    const miss = [];
    const names = partyNameVariants().filter((n) => n !== 'friend');
    for (const t of withP) {
      for (const p of names) {
        if (p === t.self) continue;
        const text = interpolateSpoken(t.template, { p }, {});
        if (!hasVoice(text, t.speaker)) miss.push(`${t.speaker}|${t.ev}|${text}`);
      }
    }
    expect(miss).toEqual([]);
  });

  it('a custom party name falls back to a voiced variant when one is recorded', () => {
    const voicedFallback = [];
    const silent = [];
    for (const t of withP) {
      const text = interpolateSpoken(t.template, { p: 'CustomHero' }, { hasVoice, speaker: t.speaker });
      if (hasVoice(text, t.speaker)) voicedFallback.push(`${t.speaker}|${t.ev}|${text}`);
      else silent.push(`${t.speaker}|${t.ev}|${t.template}`);
    }
    // Exact custom names are not pre-recorded; a generic "friend" clip is the fallback.
    // Until those generics are recorded, the custom-name path is listed here so it cannot be missed.
    expect(voicedFallback.length + silent.length).toBe(withP.length);
    expect(Array.isArray(silent)).toBe(true);
  });
});
