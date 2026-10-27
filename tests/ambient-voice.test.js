import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
}));

vi.mock('../src/victory-synth.js', () => ({
  playVictorySynth: () => ({ ok: true }),
}));

const LINE = 'The tunnel widens into a nest of chewed bones, gnawed armour and stolen cutlery, piled into a lopsided throne. Something big stirs on top of it and sniffs the air.';

describe('ambient voice cancel / gate', () => {
  beforeEach(async () => {
    globalThis.__testAc = makeCtx();
    globalThis.fetch = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(64) };
    });
    vi.resetModules();
  });
  afterEach(() => { delete globalThis.fetch; delete globalThis.__testAc; });

  it('drops ambient play when invalidateAmbientVoices runs before decode finishes', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    expect(V.playAmbientNarration(LINE)).toBe(true);
    V.invalidateAmbientVoices();
    await new Promise((r) => setTimeout(r, 100));
    expect(V.currentVoice()).toBe(null);
    expect(V.voiceGeneration().ambientGen).toBeGreaterThan(0);
  });

  it('drops ambient when ambient gate closes before decode finishes', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    let allow = true;
    V.setAmbientVoiceGate(() => allow);
    expect(V.playAmbientNarration(LINE)).toBe(true);
    allow = false;
    await new Promise((r) => setTimeout(r, 100));
    expect(V.currentVoice()).toBe(null);
  });

  it('stillValid false drops the line after decode', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    expect(V.playAmbientNarration(LINE, { token: 1, stillValid: () => false })).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(V.currentVoice()).toBe(null);
  });

  it('refuses to start ambient when gate is already closed', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    V.setAmbientVoiceGate(() => false);
    expect(V.playAmbientNarration(LINE)).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(V.currentVoice()).toBe(null);
  });

  it('plays ambient when still valid after decode', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    V.setAmbientVoiceGate(() => true);
    expect(V.playAmbientNarration(LINE, { token: 'ok', stillValid: () => true })).toBe(true);
    await new Promise((r) => setTimeout(r, 100));
    expect(V.currentVoice()?.ambient).toBe(true);
    expect(V.currentVoice()?.file).toMatch(/narrator/);
  });

  it('battle lines are not cancelled by invalidateAmbientVoices', async () => {
    const V = await import('../src/voices/voice.js');
    V.setVoicesEnabled(true);
    expect(V.playVoiceLine('Rise, Knight of the Dawn.', 'elowen', { kind: 'battle' })).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    V.invalidateAmbientVoices();
    await new Promise((r) => setTimeout(r, 100));
    expect(V.currentVoice()?.file).toMatch(/elowen/);
    expect(V.currentVoice()?.ambient).toBeFalsy();
  });
});
