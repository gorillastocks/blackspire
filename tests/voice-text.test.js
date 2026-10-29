import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

// ElevenLabs reads dashes between words badly, so no voiced line may contain an em dash, en dash, spaced hyphen or "--".
// Hyphenated compounds (Rat-Warrens, half-elf) are fine. Checks every recorded clip and anything still queued.
const DASH = /[\u2014\u2013\u2015]|\s-\s|--/;
const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

describe('voiced dialogue text', () => {
  const lines = [];
  for (const [id, c] of Object.entries(read('public/voice/manifest.json').clips)) lines.push({ id, text: c.text });
  for (const f of ['src/voices/queue.json', 'src/voices/next-month.json']) {
    if (!existsSync(new URL(`../${f}`, import.meta.url))) continue;
    const d = read(f); for (const x of (Array.isArray(d) ? d : d.items || [])) lines.push({ id: x.id, text: x.text });
  }
  it('has voiced lines to check', () => expect(lines.length).toBeGreaterThan(100));
  it('no dash between words in any voiced line', () => {
    const bad = lines.filter((l) => DASH.test(l.text)).map((l) => `${l.id}: ${l.text}`);
    expect(bad).toEqual([]);
  });
  it('no mojibake or truncated fragments in voiced lines', () => {
    const bad = lines.filter((l) => /[\u00e2\u0080\u0094\u00c3]/.test(l.text) || /^[a-z]{1,3}ll? /.test(l.text) && !/^(and|but|the|you|for) /.test(l.text)).map((l) => `${l.id}: ${l.text}`);
    expect(bad).toEqual([]);
  });
});
