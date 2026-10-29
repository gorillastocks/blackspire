// Battle ranks layout: where each monster stands so the groups read front to back.
// Pure maths (no three.js), shared by the 3D arena and anything that wants to draw the same ranks.
export const RANK_Z0 = -2;      // front rank depth (the old single-row depth)
export const RANK_DZ = 1.45;    // each rank further back
/** ranks: array (front to back) of arrays of monster ids; sizes: id -> unused hook. Returns { pos: Map id -> {x, z}, crowd }. */
export function rankLayout(monsters, ranks) {
  const rows = ranks && ranks.length ? ranks : [monsters.map((m) => m.id)];
  const widest = Math.max(1, ...rows.map((r) => r.length));
  let crowd = widest > 3 ? 3 / widest + 0.15 : 1;
  if (rows.length >= 3) crowd *= 0.92;
  const pos = new Map();
  rows.forEach((row, ri) => {
    const n = row.length, width = Math.min(9, 2.6 * n);
    const gap = n > 1 ? width / (n - 1) : 2.6;
    const shift = ri % 2 ? gap * 0.5 : 0; // odd ranks sit between the monsters in front so they peek through
    row.forEach((id, i) => {
      const x = (n === 1 ? 0 : -width / 2 + gap * i) + (n === 1 ? (ri % 2 ? 1.2 : 0) * (ri > 1 ? -1 : 1) : shift);
      const m = monsters.find((q) => q.id === id);
      const boss = m && m.T && m.T.boss ? 1 : 0;
      pos.set(id, { x: Math.max(-6, Math.min(6, x)), z: RANK_Z0 - ri * RANK_DZ - (i % 2) * 0.8 * (ri === 0 ? 1 : 0.5) - boss, rank: ri });
    });
  });
  return { pos, crowd };
}

// ---- Painted-sprite layout -------------------------------------------------------------------------------------------
// Sprites are flat billboards of known width/height, so ranks are laid out from their real sizes: each rank is a row where
// the biggest figure (a boss or elite lead) stands in the middle, slightly further back, and its neighbours stand a little
// in front and overlap its edges. Back ranks are smaller and sit in the gaps of the rank in front. Rows of five or more
// split into two interleaved lines so a big pack still reads and the camera can stay close.
export const SPR_RANK_SCALE = [1, 0.84, 0.72, 0.63, 0.57, 0.52];
// The painted-sprite front rank stands well forward on the stage (the disc centre is z = -2, its near edge z = 3.5) and the ranks
// behind are packed closer together, so the pack fills the stage but back groups still read as further back.
export const SPR_BOSS_MIN_SCALE = 0.92;
export const SPR_Z0 = 0.9;
export const SPR_RANK_DZ = 0.95;
const rscale = (r) => SPR_RANK_SCALE[Math.min(r, SPR_RANK_SCALE.length - 1)];
/** Positions for one line of figures (already scaled widths `ws`), biggest in the middle. Returns x per input index, centred on 0. */
function chainLine(items, overlap) {
  const order = items.slice().sort((a, b) => b.h - a.h); // biggest first
  const seq = []; order.forEach((it, i) => { if (i % 2) seq.unshift(it); else seq.push(it); }); // ... l2 l1 [big] r1 r2 ...  (big ends up in the middle)
  const mid = seq.indexOf(order[0]); const left = seq.slice(0, mid).reverse(), right = seq.slice(mid + 1);
  const xs = new Map(); xs.set(order[0], 0);
  let x = 0, prev = order[0]; for (const it of right) { x += (prev.w + it.w) / 2 * (1 - overlap); xs.set(it, x); prev = it; }
  x = 0; prev = order[0]; for (const it of left) { x -= (prev.w + it.w) / 2 * (1 - overlap); xs.set(it, x); prev = it; }
  return xs;
}
/**
 * items: [{ id, w, h, boss, elite }] sprite world size at rank 0; ranks: arrays of ids (front to back) or null.
 * Returns { pos: Map id -> { x, z, y, s, rank } } where s is the rank scale to multiply w/h with.
 */
export function spriteRankLayout(items, ranks) {
  const rows = ranks && ranks.length ? ranks : [items.map((m) => m.id)];
  const pos = new Map(); let prevExtents = []; let f0 = null; // f0: x-span of the front rank, back ranks should not stick out far beyond it
  const placed = []; // { lo, hi, top } of every figure already standing: back figures are raised until their heads clear what hides them
  rows.forEach((row, ri) => {
    const its = row.map((id) => items.find((q) => q.id === id)).filter(Boolean).map((q) => { const s = q.boss ? Math.max(rscale(ri), SPR_BOSS_MIN_SCALE) : rscale(ri); return { id: q.id, w: q.w * s, h: q.h * s, boss: !!q.boss, sc: s }; }); // a boss or elite never shrinks much with rank: it must still read at the back
    if (!its.length) return;
    const z0 = SPR_Z0 - ri * SPR_RANK_DZ; const place = []; // { it, x, z, k }
    if (its.length >= (ri === 0 ? 3 : 5)) { // two interleaved lines in this rank
      const nf = Math.ceil(its.length / 2); const sorted = its.slice().sort((a, b) => b.h - a.h); const A = [], B = [];
      sorted.forEach((it, i) => (i % 2 ? B : A).push(it)); // spread the big ones over both lines
      while (A.length > nf) B.push(A.pop());
      const xa = chainLine(A, 0.16); const front = A.map((it) => ({ it, x: xa.get(it) })).sort((p, q) => p.x - q.x);
      const gaps = front.slice(0, -1).map((p, i) => (p.x + front[i + 1].x) / 2); const avg = front.length > 1 ? (front[front.length - 1].x - front[0].x) / (front.length - 1) : A[0].w * 0.8;
      while (gaps.length < B.length) gaps.push(gaps.length ? gaps[gaps.length - 1] + avg : front[0].x - avg / 2);
      const Bs = B.slice().sort((a, b) => b.h - a.h); const gAbs = gaps.slice(0, Bs.length).sort((p, q) => Math.abs(p) - Math.abs(q)); // biggest back-liners nearest the middle
      Bs.forEach((it, i) => place.push({ it, x: gAbs[i], z: z0 - 0.95, k: 0.9, line: 1 }));
      front.forEach((p, i) => place.push({ it: p.it, x: p.x, z: z0 + (p.it.boss ? -0.25 : 0), k: 1, line: 0 }));
    } else {
      const xs = chainLine(its, ri === 0 ? 0.2 : 0.22); const big = its.slice().sort((a, b) => b.h - a.h)[0];
      for (const it of its) place.push({ it, x: xs.get(it), z: z0 + (it === big && its.length > 1 ? -0.3 : it.boss ? 0 : its.length > 1 ? 0.15 : 0), k: 1 });
    }
    // centre the row, then slide it sideways (rank >= 1) to the spot where it is least hidden by the rank in front
    const ext = (p) => [p.x - p.it.w * p.k / 2, p.x + p.it.w * p.k / 2];
    let lo = Infinity, hi = -Infinity; for (const p of place) { const [a, b] = ext(p); lo = Math.min(lo, a); hi = Math.max(hi, b); }
    const c0 = -(lo + hi) / 2; let best = c0;
    if (ri > 0 && prevExtents.length) {
      const avgW = place.reduce((t, p) => t + p.it.w, 0) / place.length; let bc = Infinity;
      const hasBoss = place.some((p) => p.it.boss); for (let d = hasBoss ? -2.4 : -1.6; d <= (hasBoss ? 2.401 : 1.601); d += 0.1) { const sh = c0 + d * avgW; let cost = Math.abs(d) * avgW * 0.5;
        for (const p of place) { const [a, b] = ext(p); const ca = a + sh, cb = b + sh, w = (cb - ca) * 0.7, mid = (ca + cb) / 2; for (const [pa, pb] of prevExtents) cost += (p.it.boss ? 2.5 : 0.5) * Math.max(0, Math.min(mid + w / 2, pb) - Math.max(mid - w / 2, pa));
          if (f0) cost += (hasBoss && p.it.boss ? 0.8 : 3) * (Math.max(0, f0[0] - ca) + Math.max(0, cb - f0[1])); }
        if (cost < bc - 1e-6) { bc = cost; best = sh; } }
    }
    const ex = []; const fin = place.map((p) => ({ ...p, x: Math.max(-9, Math.min(9, p.x + best)) })).sort((p, q) => (p.line || 0) - (q.line || 0)); const mine = [];
    for (const p of fin) {
      const [a, b] = ext(p), w = (b - a) * 0.6, mid = (a + b) / 2, hh = p.it.h * p.k; let y = ri > 0 || p.line ? 0.1 + (p.line ? 0.22 * hh : 0) : 0;
      for (const q of placed) if (!(q.rank === ri && q.line === (p.line || 0)) && Math.min(mid + w / 2, q.hi) - Math.max(mid - w / 2, q.lo) > 0.1 * w) y = Math.max(y, Math.min(2.6 * hh, q.top - (p.it.boss ? 0.4 : 0.52) * hh));
      pos.set(p.it.id, { x: p.x, z: p.z, y, s: p.it.sc * p.k, rank: ri }); mine.push({ lo: mid - w / 2, hi: mid + w / 2, top: y + hh, rank: ri, line: p.line || 0 }); ex.push([a, b]);
    }
    placed.push(...mine);
    prevExtents = ex; if (ri === 0) f0 = [Math.min(...ex.map((e) => e[0])), Math.max(...ex.map((e) => e[1]))];
  });
  return { pos };
}
