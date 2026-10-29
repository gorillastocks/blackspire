#!/usr/bin/env node
/**
 * Loudness-match voice clips: two-pass ffmpeg loudnorm (default -19 LUFS, TP -2 dB, linear) from the raw MP3s in DIR
 * (written by `voice.mjs --raw DIR`) into public/voice as mp3 128k, then refreshes byte sizes in manifest + index.
 * Needs ffmpeg on PATH. Usage: node scripts/voice-normalize.mjs RAW_DIR [--lufs -19]
 */
import { execFileSync, spawnSync } from 'child_process';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2]; if (!dir) { console.error('usage: voice-normalize.mjs RAW_DIR [--lufs -19]'); process.exit(1); }
const I = process.argv.includes('--lufs') ? process.argv[process.argv.indexOf('--lufs') + 1] : '-19';
const outDir = join(root, 'public/voice'); const manPath = join(outDir, 'manifest.json'); const idxPath = join(root, 'src/voices/index.json');
const base = `loudnorm=I=${I}:TP=-2:LRA=9`;
const run = (a) => execFileSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
const errOf = (a) => String(spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...a], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr || '');
const man = JSON.parse(readFileSync(manPath, 'utf8'));
let n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.mp3'))) {
  const id = f.slice(0, -4), src = join(dir, f), dst = join(outDir, f);
  const txt = errOf(['-i', src, '-af', `${base}:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(txt.slice(txt.lastIndexOf('{'), txt.lastIndexOf('}') + 1));
  run(['-y', '-i', src, '-af', `${base}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`, '-ar', '44100', '-b:a', '128k', dst]);
  if (man.clips[id]) man.clips[id].bytes = statSync(dst).size;
  n++;
}
writeFileSync(manPath, JSON.stringify(man, null, 2));
const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
for (const [id, c] of Object.entries(man.clips)) if (idx.clips[id]) idx.clips[id].bytes = c.bytes;
writeFileSync(idxPath, JSON.stringify(idx, null, 2));
console.log(`normalised ${n} clips to ${I} LUFS`);
