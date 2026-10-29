/* Adds the voice-pack lines (src/voices/packs.js) to cast.json (vp_* speakers) and src/voices/queue.json. Idempotent.
   Then: node scripts/voice.mjs --spare 5000 --raw /tmp/rawP && node scripts/voice-normalize.mjs /tmp/rawP */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { PACKS, KINDS } from '../src/voices/packs.js';
const castP = new URL('../src/voices/cast.json', import.meta.url), qP = new URL('../src/voices/queue.json', import.meta.url);
const cast = JSON.parse(readFileSync(castP, 'utf8')); let queue = JSON.parse(readFileSync(qP, 'utf8'));
const items = Array.isArray(queue) ? queue : queue.lines || queue.queue;
for (const p of PACKS) if (p.voice) cast[p.cast] = { id: p.voice, name: `Voice pack: ${p.name}`, note: p.blurb, settings: { ...p.settings, use_speaker_boost: true } };
const have = new Set(items.map((i) => i.id));
let n = 0;
for (const p of PACKS) for (const k of KINDS) for (const text of p.lines[k]) {
  const id = `${p.cast}-${createHash('sha1').update(text).digest('hex').slice(0, 12)}`;
  if (have.has(id)) continue; have.add(id);
  items.push({ id, speaker: p.cast, text, priority: 50, source: `pack:${p.id}:${k}`, chars: text.length }); n++;
}
writeFileSync(castP, JSON.stringify(cast, null, 2) + '\n'); writeFileSync(qP, JSON.stringify(queue, null, 2) + '\n');
console.log(`queued ${n} pack lines`);
