// Prints voiced/unvoiced counts and characters by category and speaker. Usage: node scripts/voice-audit.mjs [--list]
import { readFileSync } from 'fs';
import { catalog } from './voice-catalog.mjs';
import { normVoiceText } from '../src/voices/norm.js';
const idx = JSON.parse(readFileSync(new URL('../src/voices/index.json', import.meta.url), 'utf8')).byText;
const rows = catalog().map((r) => ({ ...r, voiced: !!(idx[`${r.speaker.toLowerCase()}|${normVoiceText(r.text)}`] || idx[normVoiceText(r.text)]) }));
const agg = (key) => { const m = {}; for (const r of rows) { const k = key(r); const a = (m[k] ||= { lines: 0, chars: 0, vLines: 0, vChars: 0 }); a.lines++; a.chars += r.text.length; if (r.voiced) { a.vLines++; a.vChars += r.text.length; } } return m; };
const show = (title, m) => { console.log(`\n${title}\n${'category'.padEnd(46)} total  voiced  missing  missingChars`); for (const [k, a] of Object.entries(m).sort()) console.log(`${k.padEnd(46)} ${String(a.lines).padStart(5)} ${String(a.vLines).padStart(7)} ${String(a.lines - a.vLines).padStart(8)} ${String(a.chars - a.vChars).padStart(12)}`); };
show('BY CATEGORY', agg((r) => r.cat)); show('BY SPEAKER', agg((r) => r.speaker));
const miss = rows.filter((r) => !r.voiced); console.log(`\nTOTAL catalog ${rows.length} lines; voiced ${rows.length - miss.length}; missing ${miss.length} lines, ${miss.reduce((a, r) => a + r.text.length, 0)} chars`);
if (process.argv.includes('--list')) for (const r of miss) console.log(`${r.speaker}\t${r.cat}\t${r.text}`);
