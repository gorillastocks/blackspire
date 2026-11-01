/* Queues the hero's quoted story replies (HERO_LINES) for every non-default voice pack in src/voices/queue.json. Idempotent.
   Then: node scripts/voice.mjs --ids <the printed ids> --raw /tmp/rawH && node scripts/voice-normalize.mjs /tmp/rawH */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { PACKS, HERO_LINES } from '../src/voices/packs.js';
const qP = new URL('../src/voices/queue.json', import.meta.url);
const queue = JSON.parse(readFileSync(qP, 'utf8'));
const have = new Set(queue.map((i) => i.id)); const ids = [];
for (const p of PACKS) {
  if (!p.voice) continue; // the default Ser Aldric pack already has these clips
  for (const text of HERO_LINES) {
    const id = `${p.cast}-${createHash('sha1').update(text).digest('hex').slice(0, 12)}`;
    ids.push(id); if (have.has(id)) continue; have.add(id);
    queue.push({ id, speaker: p.cast, text, priority: 50, source: `hero:${p.id}`, chars: text.length });
  }
}
writeFileSync(qP, JSON.stringify(queue, null, 2) + '\n');
console.log(ids.join(','));
