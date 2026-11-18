import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { catalog } from '../scripts/voice-catalog.mjs';
import { normVoiceText } from '../src/voices/norm.js';
import * as Story from '../src/game/story.js';
import * as G from '../src/game/game.js';
import * as PC from '../src/game/phaseC.js';
import { COMPANIONS } from '../src/game/companions.js';

const index = JSON.parse(readFileSync(new URL('../src/voices/index.json', import.meta.url), 'utf8'));
const hasVoice = (text, who = 'narrator') => {
  const n = normVoiceText(text);
  const sp = String(who || 'narrator').toLowerCase().replace(/\s+/g, '');
  return !!(index.byText[`${sp}|${n}`] || index.byText[n]);
};
const voiceOf = (e) => (e.voice === true ? { text: e.log, who: 'narrator' } : e.voice || null);

const SATCHEL = "Half-sunk in the grotto: a satchel stitched with the royal sun. Elowen's temple relics, still dry inside. Brother Osric will want this.";

function fresh() {
  const s = G.newGame({ name: 'Tester', race: 'human', cls: 'fighter' });
  s.party = [s.party[0], ...Object.keys(COMPANIONS).map((k) => ({
    companion: k, name: COMPANIONS[k].short, dead: false, hp: 10, maxHp: 10, conditions: {}, level: 1, id: k,
  }))];
  Story.initStory(s); PC.ensure(s); return s;
}

describe('narrative log voicing', () => {
  it("voices the grotto satchel find with the narrator, matching the log", () => {
    const ev = Story.visitPoi(fresh(), 'satchel');
    const e = ev.find((x) => x.log && /satchel stitched/.test(x.log));
    expect(e?.cls).toBe('good');
    expect(e?.voice).toBe(true);
    expect(e.log).toBe(SATCHEL);
    expect(hasVoice(SATCHEL, 'narrator')).toBe(true);
  });

  it('newly tagged story-prose logs resolve to a narrator clip', () => {
    const expected = [
      'You pick a softly glowing glowcap mushroom.',
      "Grumsh's ballad is complete! Inn rests now come with a feast (10 temp HP).",
      "Nettle knows the weak point of the Sovereign's staff: one clean strike will shatter it.",
      "Fizzwick's spellbook is whole. He can counterspell Malthrax once in the finale.",
      "Grumsh's ballad has the inn singing. Feast buff: 10 temporary HP each.",
      'The inn is now free for your party.',
      'Received a +2 Smith-Blessed Blade. The smiths will be at the vault for the finale.',
      'Brother Osric lifts the curse upon you.',
      "Received Elowen's Signet Ring and Captain Rowan's Writ. Your journal tracks quests.",
      'The Ashforge gate grinds open, and its guardians step out!',
      'Sister Vey rises from the black water, singing. "The princess passed this way. You will not."',
      'The cavern floor heaves. Mother Sporegrave unfurls, shriekers wailing around her!',
      'The pylon is wrapped in a quivering ochre jelly, and darkmantles drop from the crystals above!',
      'The captive smith\'s chain is held by a cult fanatic and a hell hound. "Kill the heroes!"',
      'Quest objective complete.',
    ];
    const miss = expected.filter((t) => !hasVoice(t, 'narrator'));
    expect(miss, `unvoiced narrative lines:\n${miss.join('\n')}`).toEqual([]);
  });

  it('catalogued POI and quest narration all have clips', () => {
    const rows = catalog().filter((r) => r.cat === 'POI and quest narration');
    expect(rows.length).toBeGreaterThan(20);
    const miss = rows.filter((r) => !hasVoice(r.text, r.speaker)).map((r) => `${r.speaker} [${r.src}] ${r.text}`);
    expect(miss).toEqual([]);
  });

  it('does not auto-voice mechanical reward lines', () => {
    const ev = Story.visitPoi(fresh(), 'glowcap');
    const xp = ev.find((x) => /XP each/.test(x.log || ''));
    if (xp) expect(xp.voice).toBeFalsy();
    const sys = ev.find((x) => x.cls === 'sys');
    if (sys) expect(sys.voice).toBeFalsy();
  });
});
