#!/usr/bin/env node
// node scripts/balance-compare.mjs baseline after [--dir scripts/balance-results]  ->  per-floor before/after table (markdown) on stdout.
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter((a) => !a.startsWith('--')); const di = process.argv.indexOf('--dir');
const dir = di > 0 ? resolve(process.argv[di + 1]) : join(here, 'balance-results');
const [a, b] = args.map((n) => JSON.parse(readFileSync(join(dir, `${n}.json`), 'utf8')).summary);
const f1 = (x) => (x == null ? '–' : x.toFixed(1)), f0 = (x) => (x == null ? '–' : Math.round(x));
for (const comp of Object.keys(a.by)) {
  if (!b.by[comp]) continue;
  console.log(`\n### ${comp === 'all' ? 'All parties' : comp} (${a.by[comp].runs} → ${b.by[comp].runs} runs)\n`);
  console.log('| Floor | Arrive lvl | Boss win % (1st try) | Boss rounds* | Wipes/run | Deaths/run | Grind fights | Grind min | Elite win % |\n|---|---|---|---|---|---|---|---|---|');
  a.by[comp].floors.forEach((x, i) => { const y = b.by[comp].floors[i]; const r = (s, f) => { const e = s.encounters.filter((q) => q.floor === f + 1 && (q.kind === 'boss' || q.kind === 'phase2')); const n = e.reduce((t, q) => t + q.n, 0); return n ? e.reduce((t, q) => t + q.roundsAvg * q.n, 0) / n : null; };
    console.log(`| B${i + 1} | ${f1(x.arrLvl)} → ${f1(y.arrLvl)} | ${f0(x.bossFirstWin)} → ${f0(y.bossFirstWin)} | ${f1(r(a, i))} → ${f1(r(b, i))} | ${x.wipes.toFixed(2)} → ${y.wipes.toFixed(2)} | ${x.deaths.toFixed(2)} → ${y.deaths.toFixed(2)} | ${f1(x.grindFights)} → ${f1(y.grindFights)} | ${f1(x.grindMin)} → ${f1(y.grindMin)} | ${f0(x.eliteWin)} → ${f0(y.eliteWin)} |`); });
}
console.log('\n*average rounds of the boss fight(s) across all parties in the file.');
