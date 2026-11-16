/**
 * Sequential loot / battle-victory audio: music or sting first, then narrator, then character lines one at a time.
 * Host supplies play/stop hooks so the order can be unit-tested without WebAudio.
 *
 * start({ lines, playMusic? }) where each line is { role: 'narrator'|'character', text, who, kind }.
 * playMusic, if passed, overrides the host hook for this run (e.g. a rare-item reveal sting).
 * onDismiss(): if music is still playing, skip the rest of it and continue the voices in order (no overlap).
 * onLeave(): stop everything and drop the queue (leaving the screen).
 * whenIdle(): resolves once the sequence has finished or been cancelled.
 */
export function createVictorySequencer(getHooks = {}) {
  const hooks = () => (typeof getHooks === 'function' ? getHooks() : getHooks);
  let gen = 0;
  let state = 'idle'; // idle | music | narrator | character
  let queue = [];
  let idleWaiters = [];

  const bump = () => { gen += 1; return gen; };

  function notifyIdle() {
    const ws = idleWaiters.splice(0);
    for (const w of ws) try { w(); } catch { /* ignore */ }
  }

  function finish() {
    state = 'idle';
    queue = [];
    notifyIdle();
  }

  function advance(my) {
    if (my !== gen) return;
    const next = queue.shift();
    if (!next) { finish(); return; }
    state = next.role === 'narrator' ? 'narrator' : 'character';
    hooks().playLine(next, () => advance(my));
  }

  function start({ lines = [], playMusic } = {}) {
    const my = bump();
    hooks().stopMusic?.();
    hooks().stopLine?.();
    queue = (lines || []).filter((l) => l && l.text);
    state = 'music';
    const play = playMusic || hooks().playMusic;
    play(() => advance(my));
  }

  function enqueue(line) {
    if (state === 'idle' || !line?.text) return false;
    queue.push(line);
    return true;
  }

  function onDismiss() {
    if (state === 'idle') return;
    if (state === 'music') {
      hooks().stopMusic?.();
      // Bump so a cancelled sting's end callback cannot also advance (which would overlap narrator + character).
      const my = bump();
      advance(my);
    }
    // If a voice line is already playing, let it finish; the rest stay queued in order.
  }

  function onLeave() {
    bump();
    queue = [];
    const was = state;
    state = 'idle';
    if (was === 'music') hooks().stopMusic?.();
    else if (was !== 'idle') hooks().stopLine?.();
    notifyIdle();
  }

  function whenIdle(ms = 15000) {
    if (state === 'idle') return Promise.resolve();
    return new Promise((res) => {
      const t = setTimeout(res, Math.max(0, ms));
      idleWaiters.push(() => { clearTimeout(t); res(); });
    });
  }

  return {
    start,
    enqueue,
    onDismiss,
    onLeave,
    whenIdle,
    isActive: () => state !== 'idle',
    snapshot: () => ({ state, remaining: queue.length }),
    get state() { return state; },
  };
}

export const victorySeq = createVictorySequencer(() => victoryHooks);
let victoryHooks = {
  playMusic: (done) => { if (done) done(); },
  playLine: (_line, done) => { if (done) done(); },
  stopMusic: () => {},
  stopLine: () => {},
};
export function configureVictorySequencer(h) { victoryHooks = { ...victoryHooks, ...h }; }
