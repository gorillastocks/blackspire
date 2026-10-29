import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { catalog } from '../scripts/voice-catalog.mjs';
import { innRest, newGame } from '../src/game/game.js';
import { normVoiceText } from '../src/voices/norm.js';

// Every story / companion / NPC / narration / event line the game can speak has a recorded clip (UI text and the combat log are excluded from the catalog).
const index = JSON.parse(readFileSync(new URL('../src/voices/index.json', import.meta.url), 'utf8'));
describe('voice coverage', () => {
  const rows = catalog();
  it('catalogues the story text', () => expect(rows.length).toBeGreaterThan(1300));
  it('every catalogued line resolves to a clip', () => {
    const miss = rows.filter((r) => !(index.byText[`${r.speaker.toLowerCase()}|${normVoiceText(r.text)}`] || index.byText[normVoiceText(r.text)])).map((r) => `${r.speaker} [${r.cat}] ${r.text}`);
    expect(miss).toEqual([]);
  });
  it('every clip file in the index exists on disk', () => {
    const files = new Set(Object.values(index.byText));
    const gone = [...files].filter((f) => !existsSync(new URL(`../public/${f}`, import.meta.url)));
    expect(gone).toEqual([]);
  });
  it('the three critical boss lines are voiced as the speaker, not the narrator', () => {
    for (const [who, t] of [['malthrax', 'Five moons, Emberhollow.'], ['marga', 'On the house, love.'], ['malthrax', 'You think I came alone? WAKE, GORVAX!']]) expect(index.byText[`${who}|${normVoiceText(t)}`], t).toBeTruthy();
  });
  it('events that carry a voice field point at recorded clips', () => {
    const s = newGame({ name: 'Test' }); s.flags.freeInn = true; s.gold = 50;
    const ev = innRest(s).find((e) => e.voice);
    expect(ev?.voice.who).toBe('marga');
    expect(index.byText[`${ev.voice.who}|${normVoiceText(ev.voice.text)}`]).toBeTruthy();
  });
});
