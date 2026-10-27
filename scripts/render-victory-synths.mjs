/**
 * Offline-render victory synth variants A–E to /workspace/voices/victory-X.mp3
 * using Chromium OfflineAudioContext so the audio matches in-game WebAudio.
 */
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = '/workspace/voices';
mkdirSync(outDir, { recursive: true });

const synthSrc = readFileSync(join(root, 'src/victory-synth.js'), 'utf8')
  // strip ESM export so we can eval in page
  .replace(/^export /gm, '')
  .replace(/export \{[^}]+\}/g, '');

const browser = await chromium.launch();
const page = await browser.newPage();

const results = await page.evaluate(async ({ synthSrc }) => {
  // eslint-disable-next-line no-new-func
  const mod = new Function(`${synthSrc}\nreturn { VICTORY_VARIANTS, scheduleVictorySynth, BUILDERS: typeof BUILDERS !== 'undefined' ? BUILDERS : null };`)();
  // BUILDERS is not exported — re-run schedule only
  const ids = Object.keys(mod.VICTORY_VARIANTS);
  const out = {};
  for (const id of ids) {
    const sampleRate = 44100;
    const seconds = 2.2;
    const oac = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
    mod.scheduleVictorySynth(oac, oac.destination, id, 0);
    const rendered = await oac.startRendering();
    const ch0 = rendered.getChannelData(0);
    const ch1 = rendered.getChannelData(1);
    // Interleave Float32 → Int16 PCM
    const n = rendered.length;
    const pcm = new Int16Array(n * 2);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      peak = Math.max(peak, Math.abs(ch0[i]), Math.abs(ch1[i]));
    }
    const norm = peak > 0.001 ? (0.89 / peak) : 1; // leave headroom ~-1 dB
    for (let i = 0; i < n; i++) {
      let l = Math.max(-1, Math.min(1, ch0[i] * norm));
      let r = Math.max(-1, Math.min(1, ch1[i] * norm));
      pcm[i * 2] = (l * 32767) | 0;
      pcm[i * 2 + 1] = (r * 32767) | 0;
    }
    out[id] = { pcm: Array.from(pcm), sampleRate, frames: n, peak, blurb: mod.VICTORY_VARIANTS[id].blurb, label: mod.VICTORY_VARIANTS[id].label };
  }
  return out;
}, { synthSrc });

function writeWav(path, pcmInt16, sampleRate) {
  const dataSize = pcmInt16.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(2, 22); // stereo
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2 * 2, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < pcmInt16.length; i++) buf.writeInt16LE(pcmInt16[i], 44 + i * 2);
  writeFileSync(path, buf);
}

const catalog = [];
for (const id of Object.keys(results).sort()) {
  const r = results[id];
  const wav = join(outDir, `victory-${id}.wav`);
  const mp3 = join(outDir, `victory-${id}.mp3`);
  writeWav(wav, Int16Array.from(r.pcm), r.sampleRate);
  const ff = spawnSync('ffmpeg', ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '192k', '-ar', '44100', mp3], { encoding: 'utf8' });
  if (ff.status !== 0) {
    console.error(ff.stderr);
    process.exit(1);
  }
  catalog.push({ id, label: r.label, blurb: r.blurb, path: mp3, peak: r.peak });
  console.log(`OK ${id} ${mp3} peak=${r.peak.toFixed(3)} — ${r.label}: ${r.blurb}`);
}
writeFileSync(join(outDir, 'victory-variants.json'), JSON.stringify(catalog, null, 2));
await browser.close();
