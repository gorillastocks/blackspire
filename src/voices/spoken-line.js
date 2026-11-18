/**
 * Fill a companion template ({m} monster, {p} fallen friend) so the logged line
 * is one we can actually voice. Prefer the exact names, then the monster's base
 * type (elites are renamed in combat), then the generic "creature" / "friend"
 * fallbacks. The returned text is both what the log shows and what is spoken.
 */
export function interpolateSpoken(template, ctx = {}, { hasVoice, speaker } = {}) {
  const raw = String(template || '');
  const fills = [];
  const add = (m, p) => {
    const text = raw.replaceAll('{m}', m).replaceAll('{p}', p);
    if (text && !fills.includes(text)) fills.push(text);
  };
  const m = ctx.m || 'creature';
  const p = ctx.p || 'friend';
  add(m, p);
  if (ctx.mBase && ctx.mBase !== m) add(ctx.mBase, p);
  if (m !== 'creature') add('creature', p);
  if (p !== 'friend') {
    add(m, 'friend');
    if (ctx.mBase && ctx.mBase !== m) add(ctx.mBase, 'friend');
    add('creature', 'friend');
  }
  if (typeof hasVoice === 'function') {
    for (const text of fills) if (hasVoice(text, speaker)) return text;
  }
  return fills[0] || raw;
}
