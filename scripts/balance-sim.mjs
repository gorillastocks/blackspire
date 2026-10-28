#!/usr/bin/env node
// Balance sim CLI.  node scripts/balance-sim.mjs [--runs 100] [--label before] [--out scripts/balance-results] [--no-grind] [--difficulty normal] [--seed0 1] [--comps standard,rush]
// Runs `runs` seeded campaigns for each party (standard 4-hero, no healer, with Liora), spread over worker threads,
// (--tune '<json>' overrides TUNING in src/rules/data.js for an experiment without editing it)
// and writes <out>/<label>.json (aggregates + run summaries) and <out>/<label>.md (the per-floor report).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
if (!isMainThread) {
  const { simulateCampaign } = await import('../src/sim/balance.js');
  const { TUNING } = await import('../src/rules/data.js');
  if (workerData.tune) for (const [k, v] of Object.entries(workerData.tune)) { if (Array.isArray(v)) TUNING[k].splice(0, 5, ...v); else Object.assign(TUNING[k], v); }
  const out = workerData.jobs.map(({ seed, comp }) => { try { return simulateCampaign(seed, { comp, ...workerData.opts }); } catch (e) { return { seed, comp, error: String(e && e.stack || e), floors: [], fights: [], steps: 0, wipes: 0, result: 'error' }; } });
  parentPort.postMessage(out);
} else {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
  const runs = +arg('runs', 100), label = String(arg('label', 'run')), outDir = resolve(here, '..', String(arg('out', 'scripts/balance-results')));
  const opts = { grind: !process.argv.includes('--no-grind'), difficulty: String(arg('difficulty', 'normal')) };
  const seed0 = +arg('seed0', 1);
  const tune = arg('tune', null) ? JSON.parse(String(arg('tune'))) : null; // experiment: --tune '{"bossHp":{"glasshide":1.5},"eliteFloorHp":[1,1,1.2,1.3,1.4]}'
  const { COMPOSITIONS: ALL_COMPS, summarize, renderMarkdown } = await import('../src/sim/balance.js');
  const COMPOSITIONS = arg('comps', null) ? String(arg('comps')).split(',') : ALL_COMPS; // --comps standard,liora : only those parties
  const jobs = []; for (const comp of COMPOSITIONS) for (let i = 0; i < runs; i++) jobs.push({ seed: seed0 + i, comp });
  const nw = Math.max(1, Math.min(cpus().length, 8)); const shards = Array.from({ length: nw }, () => []); jobs.forEach((j, i) => shards[i % nw].push(j));
  const t0 = Date.now();
  const results = (await Promise.all(shards.map((jobs) => new Promise((res, rej) => { const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs, opts, tune } }); w.on('message', res); w.on('error', rej); })))).flat();
  const errs = results.filter((r) => r.error); if (errs.length) console.error(`${errs.length} runs crashed, first:\n${errs[0].error}`);
  const good = results.filter((r) => !r.error);
  const sum = summarize(good);
  const meta = `${good.length} seeded campaigns (${runs} per party × ${COMPOSITIONS.join(' / ')}), difficulty ${opts.difficulty}, grinding ${opts.grind ? 'on' : 'off'}${tune ? `, tuning override ${JSON.stringify(tune)}` : ''}, seeds ${seed0}…${seed0 + runs - 1}. Expected levels (arrive / boss): see EXPECTED_ARRIVAL / EXPECTED_BOSS in src/sim/balance.js. Took ${((Date.now() - t0) / 1000).toFixed(0)}s.`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${label}.json`), JSON.stringify({ label, meta, opts, runs, summary: sum, runSummaries: good.map((r) => ({ seed: r.seed, comp: r.comp, heroCls: r.heroCls, result: r.result, finalLevels: r.finalLevels, wipes: r.wipes, steps: r.steps, moon: r.moon })) }, null, 1));
  const md = renderMarkdown(sum, { label, meta }); writeFileSync(join(outDir, `${label}.md`), md);
  console.log(md);
}
