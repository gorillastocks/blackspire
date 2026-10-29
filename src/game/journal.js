// The Journal log: every entry is filed under the chapter of the story it was written in (the prologue and Emberhollow, or a dungeon floor B1 to B5).
// DOM-free. The log has no length cap: the full story stays in the save.

export const CHAPTERS = [
  { id: 'town', label: 'Prologue & Emberhollow', icon: '🏘' },
  { id: 'b1', label: 'B1 · The Rat Warrens', icon: '🐀' },
  { id: 'b2', label: 'B2 · The Drowned Grotto', icon: '🌊' },
  { id: 'b3', label: 'B3 · The Glimmerdeep', icon: '💎' },
  { id: 'b4', label: 'B4 · The Ashforge', icon: '🔥' },
  { id: 'b5', label: 'B5 · The Vault', icon: '🐉' },
  { id: 'earlier', label: 'Earlier entries', icon: '📜' },
];
const IDS = CHAPTERS.map((c) => c.id);
export const chapterLabel = (id) => (CHAPTERS.find((c) => c.id === id) || CHAPTERS[CHAPTERS.length - 1]).label;

/** The chapter the party is in right now: a dungeon floor, else the prologue / town. */
export function chapterOf(s) { return s.mode === 'dungeon' && Number.isInteger(s.level) && s.level >= 0 && s.level <= 4 ? 'b' + (s.level + 1) : 'town'; }

/** Append an entry (never trimmed). */
export function addEntry(s, text) { (s.journal ||= []).push({ t: s.steps || 0, moon: s.moon, text, ch: chapterOf(s) }); }

/** Best guess at the chapter of an old entry from its words (B1 to B5, the town, else null). */
export function inferChapter(text) {
  const t = String(text || ''), m = t.match(/\bB([1-5])\b/);
  if (m) return 'b' + m[1];
  const lv = [[/Rat.?Warrens?|Skarn|Broodmother|Lost Patrol/i, 'b1'], [/Grotto|Clubtail|Sisters of the Tide|Posy/i, 'b2'], [/Glimmerdeep|Glasshide|kiln|Orchard|Mirror|Heartroot/i, 'b3'], [/Ashforge|Brakk|Cindermaw|smiths?\b/i, 'b4'], [/Seneschal's door|Malthrax's vault|Gorvax|Vault\b/i, 'b5']];
  for (const [re, id] of lv) if (re.test(t)) return id;
  if (/Harvest night|Emberhollow|Rowan|Odalys|Pawnbroker|Ledger|Harl Tollow asked|Marga|Boar & Spoon/i.test(t)) return 'town';
  return null;
}
/** Saves from before chapters: file every loose entry under an inferred chapter, else 'Earlier entries'. Entries written as plain strings become objects. Idempotent. */
export function migrateJournal(s) {
  s.journal = (s.journal || []).map((e) => { const o = typeof e === 'string' ? { t: 0, moon: s.moon | 0, text: e } : e; if (!IDS.includes(o.ch)) o.ch = inferChapter(o.text) || 'earlier'; return o; });
}
/** Chapters for the Journal tab, with the chapter written in most recently first ("Earlier entries" last) and each chapter's entries newest first. */
export function groupJournal(s) {
  const by = new Map();
  (s.journal || []).forEach((e, i) => { const id = IDS.includes(e.ch) ? e.ch : 'earlier'; const g = by.get(id) || { id, label: chapterLabel(id), icon: CHAPTERS[IDS.indexOf(id)].icon, entries: [], last: -1 }; g.entries.unshift(typeof e === 'string' ? { text: e } : e); g.last = i; by.set(id, g); });
  return [...by.values()].sort((a, b) => (a.id === 'earlier') - (b.id === 'earlier') || b.last - a.last);
}
