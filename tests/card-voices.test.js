import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { catalog } from '../scripts/voice-catalog.mjs';
import { eliteWarning } from '../src/game/game.js';
import { getLevel } from '../src/dungeon/levels.js';
import { eliteRoster } from '../src/dungeon/extras.js';
import { CHEST_LINES, VICTORY_LINES, RECAP_TITLE, rareFindText } from '../src/game/cardlines.js';
import { TIER_LABEL } from '../src/rules/data.js';
import { normVoiceText, spokenText } from '../src/voices/norm.js';

// The fixed read-aloud cards (chest, victory, rare find, delve recap, secret discoveries, elite warnings) are voiced in the narrator voice.
const index = JSON.parse(readFileSync(new URL('../src/voices/index.json', import.meta.url), 'utf8'));
const voiced = (shown) => index.byText[`narrator|${normVoiceText(shown)}`];
const clipExists = (f) => existsSync(new URL(`../public/${f}`, import.meta.url));

describe('card line voices', () => {
  it('chest, victory, rare-find and recap cards resolve as the shown text (emoji prefix included)', () => {
    for (const t of CHEST_LINES) expect(voiced(`📦 ${t}`), t).toBeTruthy();
    for (const t of VICTORY_LINES) expect(voiced(`⚔ ${t}`), t).toBeTruthy();
    for (const l of Object.values(TIER_LABEL)) { expect(voiced(`✨ ${rareFindText(l)}`), l).toBeTruthy(); expect(voiced(rareFindText(l))).toBe(voiced(`✨ ${rareFindText(l)}`)); }
    expect(voiced(`⛺ ${RECAP_TITLE}`)).toBeTruthy();
    expect(voiced('You lean on the wall and your hand passes straight through: an illusion! A hidden passage opens.')).toBeTruthy();
    expect(voiced('Your keen eyes notice a hidden door!')).toBeTruthy();
  });
  it('every elite warning (both variants) is voiced, and the spoken text has no emoji, shouting or dashes', () => {
    let n = 0;
    const all = [];
    for (let i = 0; i < 5; i++) { for (const [title] of eliteRoster(i)) for (const kind of ['guard', 'patrol']) all.push({ title, kind }); all.push(...getLevel(i).elites); }
    for (const e of all) for (const ahead of [true, false]) {
      const w = eliteWarning(e, ahead); n++;
      expect(w.log.startsWith('⚠ ELITE: ')).toBe(true); // the on-screen text is unchanged
      expect(w.voice.who).toBe('narrator'); expect(w.voice.text.startsWith(`Elite: ${e.title} `)).toBe(true);
      expect(w.voice.text).not.toMatch(/[\u2014\u2013]|\s-\s|--|ELITE|\p{Extended_Pictographic}/u);
      expect(spokenText(w.voice.text)).toBe(w.voice.text);
      const f = voiced(w.voice.text); expect(f, w.voice.text).toBeTruthy(); expect(clipExists(f)).toBe(true);
    }
    expect(n).toBeGreaterThanOrEqual(52);
  });
  it('the catalog enumerates every new card line and each is recorded on disk', () => {
    const rows = catalog().filter((r) => r.cat.startsWith('Cards and discoveries'));
    expect(rows.length).toBe(CHEST_LINES.length + VICTORY_LINES.length + 5 + 1 + 2 + 52);
    for (const r of rows) { expect(r.speaker).toBe('narrator'); expect(clipExists(voiced(r.text)), r.text).toBe(true); }
  });
});
