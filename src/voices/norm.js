// Text normalisation shared by the runtime (voice.js) and the recorder scripts.
// Pure: no imports, so Node scripts can load it directly.

/** The dash-free form of a line: what gets recorded. Dashes between words become commas (never read aloud as "dash"). */
export function spokenText(t) {
  return String(t ?? '')
    .replace(/^Dungeon Master:\s*/i, '')
    .replace(/^(?:\uD83D\uDD6F|\uD83D\uDCDC)\uFE0F?\s*/, '') // leading 🕯 or 📜 marker
    .replace(/\s*[\u2014\u2013\u2015]+\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/\s*--+\s*/g, ', ')
    .replace(/([.!?,;:])\s*,\s+/g, '$1 ')
    .replace(/,\s*$/, '.')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lookup key: spoken form, straight quotes, three-dot ellipsis, lower case. */
export function normVoiceText(t) {
  return spokenText(t)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, '...')
    .toLowerCase();
}
