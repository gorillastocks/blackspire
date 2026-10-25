import { describe, it, expect, beforeEach } from 'vitest';
const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
globalThis.btoa ??= (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob ??= (s) => Buffer.from(s, 'base64').toString('binary');
const { writeSave, readSave, exportCode, importCode, migrateLegacy } = await import('../src/storage.js');
const save = (n) => JSON.stringify({ party: [{ name: 'Hero ' + n }], gold: n, savedAt: n });

describe('save storage', () => {
  beforeEach(() => mem.clear());
  it('writes atomically and keeps the previous save as a backup', () => {
    writeSave('k', save(1)); writeSave('k', save(2));
    expect(readSave('k')).toEqual({ raw: save(2), recovered: false });
    expect(mem.get('k.bak')).toBe(save(1)); expect(mem.has('k.tmp')).toBe(false);
  });
  it('refuses to write invalid data', () => {
    expect(() => writeSave('k', '{"nope":1}')).toThrow(); expect(() => writeSave('k', 'garbage')).toThrow(); expect(mem.size).toBe(0);
  });
  it('recovers from a corrupt main save using the backup', () => {
    writeSave('k', save(1)); writeSave('k', save(2)); mem.set('k', '{"party":[{"na'); // truncated write
    const r = readSave('k'); expect(r.recovered).toBe(true); expect(JSON.parse(r.raw).gold).toBe(1);
    expect(mem.get('k')).toBe(save(1)); // repaired in place
  });
  it('recovers from an interrupted write via the temp copy', () => { mem.set('k', 'xx'); mem.set('k.tmp', save(5)); expect(JSON.parse(readSave('k').raw).gold).toBe(5); });
  it('returns null when nothing usable exists', () => { mem.set('k', 'bad'); expect(readSave('k')).toBeNull(); });
  it('export code round-trips (incl. unicode) and import validates', () => {
    const raw = JSON.stringify({ party: [{ name: 'Zîzzy 🥄' }], gold: 3 });
    expect(importCode(exportCode(raw))).toBe(raw); expect(importCode(raw)).toBe(raw);
    expect(() => importCode('GW1:Zm9v')).toThrow(); expect(() => importCode('hello')).toThrow();
  });
  it('migrates saves and settings from the pre-rename keys without overwriting newer ones', () => {
    const old = 'grok' + 'wizard.';
    mem.set(old + 'save.v1', save(7)); mem.set(old + 'save.slot2', save(8)); mem.set(old + 'settings', '{"music":0.1}');
    mem.set('blackspire.save.slot2', save(9));
    expect(migrateLegacy(localStorage)).toBe(2);
    expect(JSON.parse(readSave('blackspire.save.v1').raw).gold).toBe(7);
    expect(JSON.parse(readSave('blackspire.save.slot2').raw).gold).toBe(9);
    expect(mem.get('blackspire.settings')).toBe('{"music":0.1}');
  });
  it('still imports codes exported before the rename', () => { const raw = save(4); const code = exportCode(raw).replace(/^BS1/, 'GW1'); expect(importCode(code)).toBe(raw); });
});
