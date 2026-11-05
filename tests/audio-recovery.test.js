import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Simulates the iOS background/foreground life cycle of the shared AudioContext (see src/audio.js recoverAudio()).
// FakeCtx.mode controls what resume() does: 'ok' (→ running), 'reject', or 'hang' (never settles).
let made;
class FakeCtx {
  constructor() {
    this.state = 'suspended'; this.mode = FakeCtx.nextMode; this.currentTime = 0; this.sampleRate = 44100;
    this.destination = { id: 'dest' }; this.sources = []; this.suspendCalls = 0; this.closeCalls = 0; made.push(this);
  }
  resume() {
    if (this.state === 'closed') return Promise.reject(new Error('closed'));
    if (this.mode === 'reject') return Promise.reject(new Error('NotAllowed'));
    if (this.mode === 'hang') return new Promise(() => {});
    this.state = 'running'; return Promise.resolve();
  }
  suspend() { this.suspendCalls++; if (this.state === 'running') this.state = 'suspended'; return Promise.resolve(); }
  close() { this.closeCalls++; this.state = 'closed'; return Promise.resolve(); }
  createGain() { const n = { gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} }, connect(x) { n.to = x; return x; }, disconnect() {} }; return n; }
  createBufferSource() { const s = { buffer: null, loop: false, started: 0, connect(x) { s.to = x; return x; }, start() { s.started++; }, stop() {}, disconnect() {} }; this.sources.push(s); return s; }
  createBuffer() { return { duration: 0 }; }
  async decodeAudioData() { return { duration: 3 }; }
}
FakeCtx.nextMode = 'ok';

const flush = (ms = 50) => vi.advanceTimersByTimeAsync(ms);
const win = () => globalThis.window;
const fire = (target, name) => target.dispatchEvent(new Event(name));
const setHidden = (h) => { globalThis.document.hidden = h; fire(globalThis.document, 'visibilitychange'); };
const musicSources = (c) => c.sources.filter((s) => s.loop && s.started > 0);

async function boot({ play = true } = {}) {
  vi.resetModules();
  made = []; FakeCtx.nextMode = 'ok';
  const w = new EventTarget(); w.AudioContext = FakeCtx;
  const d = new EventTarget(); d.hidden = false; d.baseURI = 'http://localhost/'; d.createElement = () => ({ canPlayType: () => 'maybe' });
  vi.stubGlobal('window', w); vi.stubGlobal('document', d);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, type: 'basic', arrayBuffer: async () => new ArrayBuffer(8) })));
  const A = await import('../src/audio.js');
  A.ac();
  if (play) A.play('town');
  fire(w, 'pointerdown'); // first user gesture unlocks audio and starts the wanted track
  await flush();
  return A;
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('audio recovery after app switch', () => {
  it('unlocks on the first gesture and plays the music bed', async () => {
    await boot();
    expect(made).toHaveLength(1);
    expect(made[0].state).toBe('running');
    expect(musicSources(made[0])).toHaveLength(1);
  });

  it('suspends cleanly when the page is hidden', async () => {
    await boot();
    setHidden(true); await flush();
    expect(made[0].suspendCalls).toBe(1);
    expect(made[0].state).toBe('suspended');
  });

  it('resumes the same context when visible again (suspended)', async () => {
    await boot();
    setHidden(true); await flush();
    setHidden(false); await flush();
    expect(made).toHaveLength(1);
    expect(made[0].state).toBe('running');
    expect(musicSources(made[0])).toHaveLength(1); // still the original bed, not restarted
  });

  it('resumes an "interrupted" context and restarts the current track', async () => {
    await boot();
    made[0].state = 'interrupted';
    setHidden(false); await flush(2000);
    expect(made).toHaveLength(1);
    expect(made[0].state).toBe('running');
    expect(musicSources(made[0]).length).toBeGreaterThanOrEqual(2);
  });

  it('recreates a closed context, re-attaches the graph and restarts music', async () => {
    const A = await boot();
    const old = made[0]; expect(old).toBeTruthy();
    old.state = 'closed';
    setHidden(false); await flush(2000);
    expect(made).toHaveLength(2);
    const next = made[1];
    expect(A.ac()).toBe(next);
    expect(next.state).toBe('running');
    expect(musicSources(next)).toHaveLength(1);
    expect(A.currentTrack()).toBe('town');
    // gain graph hangs off the new context's destination
    const musicBus = A.out('music');
    expect(musicBus.to.to.id).toBe('dest');
  });

  it('recreates the context when resume() rejects', async () => {
    const A = await boot();
    made[0].state = 'suspended'; made[0].mode = 'reject';
    setHidden(false); await flush(2000);
    expect(made).toHaveLength(2);
    expect(made[0].closeCalls).toBe(1);
    expect(A.ac()).toBe(made[1]);
    expect(made[1].state).toBe('running');
    expect(musicSources(made[1])).toHaveLength(1);
  });

  it('recreates the context when resume() hangs (never settles)', async () => {
    const A = await boot();
    made[0].state = 'interrupted'; made[0].mode = 'hang';
    setHidden(false);
    await flush(500);
    expect(made).toHaveLength(1); // still waiting
    await flush(2000);
    expect(made).toHaveLength(2);
    expect(made[0].closeCalls).toBe(1);
    expect(A.ac()).toBe(made[1]);
    expect(made[1].state).toBe('running');
    expect(musicSources(made[1])).toHaveLength(1);
  });

  it.each(['pageshow', 'focus', 'blackspireAudioResume'])('%s also triggers recovery', async (ev) => {
    await boot();
    made[0].state = 'suspended';
    fire(win(), ev); await flush(2000);
    expect(made[0].state).toBe('running');
  });

  it('does nothing while the page is still hidden', async () => {
    await boot();
    made[0].state = 'suspended';
    globalThis.document.hidden = true;
    fire(win(), 'focus'); await flush(2000);
    expect(made[0].state).toBe('suspended');
    expect(made).toHaveLength(1);
  });

  it('does not recreate anything before the first user gesture', async () => {
    const A = await boot({ play: false });
    // fresh module, never unlocked
    vi.resetModules(); made.length = 0;
    const B = await import('../src/audio.js');
    B.ac();
    setHidden(false); await flush(2000);
    expect(made).toHaveLength(1);
    expect(made[0].state).toBe('suspended');
    expect(A).toBeTruthy();
  });

  it('falls back to the next user gesture when nothing else brought audio back', async () => {
    const A = await boot();
    made[0].state = 'suspended'; made[0].mode = 'reject';
    fire(win(), 'pointerdown'); // gesture: resume() is attempted synchronously, then recovery recreates the context
    await flush(2000);
    expect(made).toHaveLength(2);
    expect(A.ac()).toBe(made[1]);
    expect(made[1].state).toBe('running');
  });

  it('a gesture recreates a closed context', async () => {
    const A = await boot();
    made[0].state = 'closed';
    fire(win(), 'touchend'); await flush(2000);
    expect(made).toHaveLength(2);
    expect(A.ac()).toBe(made[1]);
    expect(musicSources(made[1])).toHaveLength(1);
  });

  it('keeps one recovery in flight when several foreground signals fire together', async () => {
    await boot();
    made[0].state = 'closed';
    setHidden(false); fire(win(), 'focus'); fire(win(), 'pageshow'); fire(win(), 'blackspireAudioResume');
    await flush(2000);
    expect(made).toHaveLength(2);
  });

  it('resumeCtx gives up on a hung resume instead of wedging callers', async () => {
    const A = await boot();
    made[0].state = 'suspended'; made[0].mode = 'hang';
    const p = A.resumeCtx(made[0]);
    await flush(2000);
    await expect(p).resolves.toBe(false);
  });

  it('notifies onAudioReset hooks when the context is recreated', async () => {
    const A = await boot();
    const hook = vi.fn(); A.onAudioReset(hook);
    made[0].state = 'closed';
    setHidden(false); await flush(2000);
    expect(hook).toHaveBeenCalledTimes(1);
  });
});
