// Dice utilities. RNG is swappable for deterministic tests/simulation.
let rng = Math.random;
export function setRng(f) { rng = f || Math.random; }
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = () => rng();
export const die = (n) => 1 + Math.floor(rng() * n);
export const pick = (a) => a[Math.floor(rng() * a.length)];
export function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function parse(expr) {
  if (typeof expr === 'number') return { n: 0, s: 0, b: expr };
  const m = /^(\d*)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s/g, ''));
  if (!m) return { n: 0, s: 0, b: parseInt(expr, 10) || 0 };
  return { n: +(m[1] || 1), s: +m[2], b: +(m[3] || 0) };
}
/** Roll a dice expression. crit doubles the number of dice (5e rule). extraDice adds more dice of same size. */
export function roll(expr, { crit = false, extraDice = 0 } = {}) {
  if (typeof expr === 'string' && /d\d+\s*\+\s*\d*d/.test(expr)) { // compound: '2d8+1d6'
    const parts = expr.replace(/\s/g, '').split('+'); return parts.reduce((t, x, i) => t + roll(x, { crit, extraDice: i === 0 ? extraDice : 0 }), 0);
  }
  const p = parse(expr);
  const n = p.n * (crit ? 2 : 1) + extraDice;
  let t = p.b;
  for (let i = 0; i < n; i++) t += die(p.s);
  return Math.max(0, t);
}
export function avg(expr) { const p = parse(expr); return (p.n * (p.s + 1)) / 2 + p.b; }
/** d20 with advantage/disadvantage (they cancel). lucky = halfling Lucky (reroll natural 1s once). */
export function d20({ adv = false, dis = false, lucky = false } = {}) {
  const r1 = () => { let r = die(20); if (lucky && r === 1) r = die(20); return r; };
  const a = r1();
  if (adv && !dis) return Math.max(a, r1());
  if (dis && !adv) return Math.min(a, r1());
  return a;
}
