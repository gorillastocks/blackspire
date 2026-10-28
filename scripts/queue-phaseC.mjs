// Regenerates the Phase C portion of src/voices/queue.json and src/voices/next-month.json from the game text.
// Every new spoken line is queued with a priority; voice.mjs records highest priority first as credits allow.
import { createHash } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { COMPANIONS } from '../src/game/companions.js';
import * as PC from '../src/game/phaseC.js';

const qPath = new URL('../src/voices/queue.json', import.meta.url), nPath = new URL('../src/voices/next-month.json', import.meta.url);
const queue = JSON.parse(readFileSync(qPath, 'utf8')); const cast = JSON.parse(readFileSync(new URL('../src/voices/cast.json', import.meta.url), 'utf8'));
const have = new Set(queue.map((q) => `${q.speaker}|${q.text}`));
const strip = (t) => t.replace(/^Liora: "(.*)"$/, '$1').replace(/\\"/g, '"');
const add = (speaker, text, priority, source) => {
  text = strip(text); if (/\{[pm]\}/.test(text) || text.length < 8) return; if (/^(She|Her) /.test(text)) return; // narration-in-dialogue and templated lines are not voiced
  const k = `${speaker}|${text}`; if (have.has(k)) return; have.add(k);
  queue.push({ id: `${speaker}-${createHash('sha1').update(text).digest('hex').slice(0, 12)}`, speaker, text, priority, source, chars: text.length });
};
const key = (c) => COMPANIONS[c].short.toLowerCase();
const L = COMPANIONS.liora;
for (const t of L.lines.recruit) add('liora', t, 10, 'phaseC:recruit');
PC.lioraIntro({}).lines.filter((l) => l.who === 'liora').forEach((l) => add('liora', l.text, 9, 'phaseC:intro'));
PC.MOMENTS.forEach((M, i) => { M.intro.forEach((t) => add('liora', t, 9 - (i > 2 ? 0 : 0), `phaseC:moment${i}`)); M.choices.forEach((c) => c.reply.forEach((t) => add('liora', t, 7, `phaseC:moment${i}.${c.id}`))); });
Object.values(PC.LIORA_ENDING).forEach((a) => a.forEach((t) => add('liora', t, 9, 'phaseC:ending')));
PC.THREAD.liora.forEach((a, i) => a.forEach((t) => add('liora', t, 8, `phaseC:thread${i}`)));
for (const [trig, a] of Object.entries(PC.REACT.liora)) a.forEach((t) => add('liora', t, 6, `phaseC:react.${trig}`));
for (const [k, a] of Object.entries(L.lines)) if (k !== 'recruit') a.forEach((t) => add('liora', t, 5, `phaseC:lines.${k}`));
L.camp?.forEach((t) => add('liora', t, 4, 'phaseC:camp'));
for (const c of Object.keys(PC.REACT)) if (c !== 'liora') {
  PC.THREAD[c].forEach((a, i) => a.forEach((t) => add(key(c), t, 3, `phaseC:thread${i}`)));
  for (const [trig, a] of Object.entries(PC.REACT[c])) a.forEach((t) => add(key(c), t, 2, `phaseC:react.${trig}`));
}
writeFileSync(qPath, JSON.stringify(queue, null, 2) + '\n');
const recorded = new Set(Object.keys(JSON.parse(readFileSync(new URL('../public/voice/manifest.json', import.meta.url), 'utf8')).clips));
const next = queue.filter((q) => q.source?.startsWith('phaseC') && !recorded.has(q.id)).sort((a, b) => b.priority - a.priority);
const withVoice = next.filter((q) => cast[q.speaker]);
writeFileSync(nPath, JSON.stringify({
  note: 'New Phase C lines still to record when the ElevenLabs free plan resets. Run: node scripts/voice.mjs --spare 500 (highest priority first). Speakers without a cast voice (zizzy, nettle) are skipped until they get one in cast.json.',
  lines: next.length, chars: next.reduce((a, q) => a + q.chars, 0), charsWithCastVoice: withVoice.reduce((a, q) => a + q.chars, 0), items: next,
}, null, 1) + '\n');
console.log('queue', queue.length, 'phaseC pending', next.length, next.reduce((a, q) => a + q.chars, 0), 'chars');
