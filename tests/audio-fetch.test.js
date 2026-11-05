import { describe, it, expect, vi, afterEach } from 'vitest';
import { audioResponseOk, fetchAudioBytes } from '../src/audio-fetch.js';

// Capacitor iOS serves bundled mp3/m4a/wav as a plain URLResponse → WKWebView fetch() gives status 0, ok false.
const bytes = new Uint8Array([0xff, 0xfb, 0x90, 0x00]).buffer;
const resp = (o) => ({ ok: false, status: 200, type: 'basic', arrayBuffer: async () => bytes, ...o });

afterEach(() => { vi.unstubAllGlobals(); });

describe('audioResponseOk', () => {
  it('accepts HTTP 200 and 206', () => {
    expect(audioResponseOk(resp({ ok: true, status: 200 }))).toBe(true);
    expect(audioResponseOk(resp({ ok: true, status: 206 }))).toBe(true);
  });
  it('accepts the Capacitor iOS status-0 response for a bundled file', () => {
    expect(audioResponseOk(resp({ ok: false, status: 0 }))).toBe(true);
    expect(audioResponseOk({ ok: false, status: 0 })).toBe(true);
  });
  it('rejects real HTTP errors and opaque / network-error responses', () => {
    expect(audioResponseOk(resp({ status: 404 }))).toBe(false);
    expect(audioResponseOk(resp({ status: 500 }))).toBe(false);
    expect(audioResponseOk(resp({ status: 0, type: 'opaque' }))).toBe(false);
    expect(audioResponseOk(resp({ status: 0, type: 'error' }))).toBe(false);
    expect(audioResponseOk(null)).toBe(false);
  });
});

describe('fetchAudioBytes', () => {
  it('returns the body of a status-0 response (the TestFlight regression)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resp({ ok: false, status: 0 })));
    expect(await fetchAudioBytes('blackspire://localhost/voice/x.mp3', 'voice')).toBe(bytes);
  });
  it('still throws on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resp({ status: 404 })));
    await expect(fetchAudioBytes('./voice/missing.mp3', 'voice')).rejects.toThrow(/voice .* 404/);
  });
});

describe('voice.js plays a clip when fetch reports status 0', () => {
  it('decodes and starts the buffer', async () => {
    vi.resetModules();
    const started = [];
    const ctx = {
      state: 'running', currentTime: 0, destination: {}, resume: async () => {},
      createGain() { return { gain: { value: 1 }, connect() { return this; }, disconnect() {} }; },
      createBufferSource() { return { buffer: null, connect() { return this; }, start() { started.push(this.buffer); }, stop() {}, onended: null }; },
      createBuffer() { return {}; },
      decodeAudioData: async () => ({ duration: 1.5, tag: 'decoded' }),
    };
    vi.doMock('../src/audio.js', () => ({ ac: () => ctx, unlock: () => {}, duckBed: () => {} }));
    vi.doMock('../src/victory-synth.js', () => ({ playVictorySynth: () => ({ ok: true }) }));
    vi.stubGlobal('fetch', vi.fn(async () => resp({ ok: false, status: 0 })));
    const v = await import('../src/voices/voice.js');
    expect(v.testVoice()).toBe(true);
    // (the first start() is unlockVoices' silent priming buffer; the clip itself must follow)
    await vi.waitFor(() => expect(started.some((b) => b?.tag === 'decoded')).toBe(true));
  });
});
