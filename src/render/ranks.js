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
