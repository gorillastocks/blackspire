import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { insertAfterNarrator } from '../src/voices/victory-sequence.js';

function makeCtx() {
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {}),
    createGain() {
      return { gain: { value: 1 }, connect() { return this; }, disconnect() {} };
    },
    createBufferSource() {
      return {
        buffer: null,
        connect() { return this; },
        start() {},
        stop() {},
        onended: null,
      };
    },
    createBuffer() { return { duration: 0 }; },
    decodeAudioData: async () => ({ duration: 1.5 }),
  };
}

vi.mock('../src/audio.js', () => ({
  ac: () => globalThis.__testAc,
  unlock: () => {},
  duckBed: () => {},
  resumeCtx: async (c) => { if (c && c.state !== 'running') await c.resume?.(); return true; },
  onAudioReset: () => {},
}));

vi.mock('../src/victory-synth.js', () => ({
  playVictorySynth: () => ({ ok: true }),
}));

const GRUMSH = 'Farewell, Blackspire Cultist. You will have a stanza. A short one.';
// A known narrator / DM line already in the index (long enough to occupy the channel).
describe('quoted combat lines queue instead of dropping', () => {
  beforeEach(async () => {
    globalThis.__testAc = makeCtx();
    globalThis.fetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(64) }));
    vi.resetModules();
  });
  afterEach(() => { delete globalThis.fetch; delete globalThis.__testAc; });

  it('queues a keepForVictory kill line while another clip is playing', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    // Occupy the channel with any recorded clip.
    const occupied = V.playVoiceLine(GRUMSH, 'grumsh', { kind: 'battle' });
    expect(occupied).toBe(true);
    const queued = V.playVoiceLine('And so the Blackspire Cultist falls, like all things. Like my career in music.', 'grumsh', V.quotedVoiceOpts({ combat: true }));
    expect(queued).toBe(true);
    const waiting = V.queuedVoices();
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.some((w) => w.opts.keepForVictory && w.opts.text.includes('And so the Blackspire Cultist'))).toBe(true);
  });

  it('folds taken queued kill lines after the narrator, not dropped', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    V.playVoiceLine(GRUMSH, 'grumsh', { kind: 'battle' });
    V.playVoiceLine(GRUMSH, 'grumsh', V.quotedVoiceOpts({ combat: true }));
    // Same file is de-duplicated in the waiting list; queue a second distinct line too.
    V.playVoiceLine('One less thing in the dark.', 'liora', V.quotedVoiceOpts({ combat: true }));
    const pending = V.takeQueuedVoices((w) => w.opts?.keepForVictory).map((w) => ({
      role: 'character', text: w.opts.text, who: w.opts.speaker, kind: 'battle',
    }));
    expect(pending.some((l) => /One less thing/.test(l.text))).toBe(true);
    const lines = insertAfterNarrator([
      { role: 'narrator', text: 'Victory! The cultists fall.', who: 'narrator' },
      { role: 'character', text: 'We won. And yet… did we?', who: 'grumsh' },
    ], pending);
    expect(lines.map((l) => l.role)).toEqual(['narrator', ...pending.map(() => 'character'), 'character']);
    expect(lines[0].text).toMatch(/Victory/);
    expect(lines[lines.length - 1].text).toMatch(/We won/);
  });

  it('enqueues a keepForVictory line onto an active victory sequence instead of dropping it', async () => {
    const VS = await import('../src/voices/victory-sequence.js');
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    let musicDone;
    VS.configureVictorySequencer({
      playMusic(done) { musicDone = done; },
      playLine(line, done) { done(); },
      stopMusic() {},
      stopLine() {},
    });
    VS.victorySeq.start({
      lines: [
        { role: 'narrator', text: 'Victory! The cultists fall.', who: 'narrator' },
        { role: 'character', text: 'We won. And yet… did we?', who: 'grumsh' },
      ],
    });
    expect(VS.victorySeq.isActive()).toBe(true);
    expect(VS.victorySeq.state).toBe('music');
    const ok = V.playVoiceLine(GRUMSH, 'grumsh', V.quotedVoiceOpts({ combat: true }));
    expect(ok).toBe(true);
    expect(VS.victorySeq.snapshot().remaining).toBe(3); // narrator, victory banter, then the queued kill line
    // A leftover attack bark without keepForVictory is still dropped.
    expect(V.playVoiceLine(GRUMSH, 'grumsh', { kind: 'battle', combatBark: true })).toBe(false);
  });
});
