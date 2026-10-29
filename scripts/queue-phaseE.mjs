// Queues every catalogued line that has no recorded clip yet (see scripts/voice-catalog.mjs). Highest priority records first:
// Liora and the party companions, then the hero, then story, bosses, town, lore, events, area narration, and monster-name variants last.
// Usage: node scripts/queue-phaseE.mjs && node scripts/voice.mjs --spare 5000 --raw /tmp/raw && node scripts/voice-normalize.mjs /tmp/raw
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { catalog } from './voice-catalog.mjs';
import { normVoiceText } from '../src/voices/norm.js';

const idx = JSON.parse(readFileSync(new URL('../src/voices/index.json', import.meta.url), 'utf8')).byText;
const cast = JSON.parse(readFileSync(new URL('../src/voices/cast.json', import.meta.url), 'utf8'));
const queue = [];
for (const r of catalog()) {
  // The Dungeon Master voice ('dm') re-voices text an older narrator clip may already cover, so only an exact dm clip counts as recorded.
  if (idx[`${r.speaker.toLowerCase()}|${normVoiceText(r.text)}`] || (r.speaker !== 'dm' && idx[normVoiceText(r.text)])) continue;
  if (!cast[r.speaker]) { console.warn('no cast voice for', r.speaker, r.text.slice(0, 40)); continue; }
  queue.push({ id: `${r.speaker}-${createHash('sha1').update(r.text).digest('hex').slice(0, 12)}`, speaker: r.speaker, text: r.text, priority: r.pri, source: `phaseE:${r.cat}:${r.src}`, chars: r.text.length });
}
writeFileSync(new URL('../src/voices/queue.json', import.meta.url), JSON.stringify(queue, null, 2) + '\n');
const byPri = {}; for (const q of queue) byPri[q.priority] = (byPri[q.priority] || 0) + q.chars;
console.log('queued', queue.length, 'lines,', queue.reduce((a, q) => a + q.chars, 0), 'chars; by priority', byPri);
