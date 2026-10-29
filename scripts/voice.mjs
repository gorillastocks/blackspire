#!/usr/bin/env node
/**
 * Record Blackspire dialogue via ElevenLabs.
 * Usage: node scripts/voice.mjs [--only speaker] [--ids id1,id2] [--spare N] [--force] [--dry] [--raw DIR] [--skip a,b]
 * --raw DIR also keeps the un-normalised MP3s there; then run `node scripts/voice-normalize.mjs DIR` to loudness-match public/voice.
 * Per-speaker voice_settings can be set in cast.json ("settings"); mp3_44100_128 output, eleven_multilingual_v2.
 * Clips are recorded highest priority first. --spare keeps that many characters unspent (default 500).
 * Skips clips whose text+voice hash already matches the manifest.
 * Never prints the API key.
 */
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const cast = JSON.parse(readFileSync(join(root, 'src/voices/cast.json'), 'utf8'));
const queue = JSON.parse(readFileSync(join(root, 'src/voices/queue.json'), 'utf8'));
const outDir = join(root, 'public/voice');
const manifestPath = join(outDir, 'manifest.json');
mkdirSync(outDir, { recursive: true });

const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const force = args.includes('--force');
const dry = args.includes('--dry');
const ids = args.includes('--ids') ? new Set(args[args.indexOf('--ids') + 1].split(',')) : null;
const skip = args.includes('--skip') ? new Set(args[args.indexOf('--skip') + 1].split(',')) : new Set();
const rawDir = args.includes('--raw') ? args[args.indexOf('--raw') + 1] : null;
if (rawDir) mkdirSync(rawDir, { recursive: true });
const SPARE = args.includes('--spare') ? +args[args.indexOf('--spare') + 1] : 500;

const hash = (voiceId, text) => createHash('sha1').update(`${voiceId}|${text}`).digest('hex').slice(0, 16);

let manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { version: 1, clips: {} };

async function subscription() {
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
  if (!r.ok) throw new Error(`subscription ${r.status}`);
  return r.json();
}

const DEFAULT_SETTINGS = { stability: 0.4, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true };
async function tts(voiceId, text, settings) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
    }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`tts ${r.status}: ${err.slice(0, 200)}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

const sub = await subscription();
const remaining = (sub.character_limit || 0) - (sub.character_count || 0);
console.log(`ElevenLabs ${sub.tier || 'plan'}: ${remaining} chars remaining (leave ${SPARE} spare)`);
let budget = Math.max(0, remaining - SPARE);

const jobs = queue.map((L, i) => ({ L, i })).sort((a, b) => (b.L.priority || 0) - (a.L.priority || 0) || a.i - b.i).map((x) => x.L).filter((L) => {
  if (only && L.speaker !== only) return false;
  if (skip.has(L.speaker)) return false;
  if (ids && !ids.has(L.id)) return false;
  const v = cast[L.speaker];
  if (!v) { console.warn(`skip ${L.id}: no cast voice for ${L.speaker}`); return false; }
  const h = hash(v.id, L.text);
  const prev = manifest.clips[L.id];
  if (!force && prev && prev.hash === h && existsSync(join(outDir, `${L.id}.mp3`))) return false;
  return true;
});

let used = 0, done = 0, failed = 0;
for (const L of jobs) {
  const v = cast[L.speaker];
  if (L.chars > budget - used) { console.log(`budget stop before ${L.id} (need ${L.chars}, left ${budget - used})`); break; }
  if (dry) { console.log(`dry ${L.speaker}: ${L.chars} "${L.text.slice(0, 50)}…"`); used += L.chars; continue; }
  try {
    process.stdout.write(`rec ${L.speaker} ${L.chars}c ${L.id}… `);
    const buf = await tts(v.id, L.text, v.settings);
    if (rawDir) writeFileSync(join(rawDir, `${L.id}.mp3`), buf);
    writeFileSync(join(outDir, `${L.id}.mp3`), buf);
    manifest.clips[L.id] = {
      speaker: L.speaker, voice: v.id, text: L.text, chars: L.chars,
      hash: hash(v.id, L.text), file: `voice/${L.id}.mp3`, bytes: buf.length,
    };
    used += L.chars; done++;
    console.log(`${buf.length}b`);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (e) {
    failed++;
    console.log('FAIL', e.message);
    if (/quota|unusual_activity|too_many/i.test(e.message)) break;
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
// slim runtime index (same normalisation as src/voices/voice.js): "speaker|text" and "text" -> file
const norm = (t) => String(t || '').replace(/^Dungeon Master:\s*/i, '').replace(/^🕯\s*/, '').replace(/[—–]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/…/g, '...').replace(/\s+/g, ' ').trim().toLowerCase();
const byText = {}; const byHash = {};
for (const c of Object.values(manifest.clips)) {
  byText[`${c.speaker.toLowerCase()}|${norm(c.text)}`] = c.file; byText[norm(c.text)] = c.file;
  byHash[`${c.speaker}:${c.hash}`] = c.file; byHash[c.hash] = c.file;
}
writeFileSync(join(root, 'src/voices/index.json'), JSON.stringify({ clips: manifest.clips, byHash, byText }, null, 2));
console.log(`done: recorded ${done}, failed ${failed}, chars used this run ${used}, clips in manifest ${Object.keys(manifest.clips).length}`);
