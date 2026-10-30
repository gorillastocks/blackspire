import { describe, it, expect, beforeEach } from 'vitest';
import * as E from '../src/entitlements.js';

const listeners = {};
const fake = (over = {}) => ({
  getProduct: async () => ({ id: E.PRODUCT.id, displayPrice: '€4,99' }),
  getEntitlements: async () => ({ owned: false }),
  purchase: async () => ({ status: 'purchased' }),
  restore: async () => ({ status: 'ok', owned: true }),
  addListener: (n, fn) => { listeners[n] = fn; },
  ...over,
});
const ls = () => globalThis.localStorage;
beforeEach(() => {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  for (const k of Object.keys(listeners)) delete listeners[k];
  E._configure();
});

describe('product + free tier', () => {
  it('uses the App Store product id and keeps only B1 free', () => {
    expect(E.PRODUCT.id).toBe('com.gorillastocks.blackspire.fullgame');
    expect(E.FREE_LEVELS).toBe(1);
  });
});

describe('web / GitHub Pages build (no StoreKit)', () => {
  it('is fully unlocked: paywall off, every level open, no store backend', async () => {
    E._configure({ native: false });
    expect(E.paywallActive()).toBe(false);
    for (let l = 0; l < 5; l++) expect(E.isLevelLocked(l)).toBe(false);
    expect(await E.initStore()).toBe('web');
  });
  it('the dev switch simulates the free version; the placeholder purchase unlocks it', async () => {
    E._configure({ native: false }); E.setPaywallDev(true);
    expect(E.isLevelLocked(0)).toBe(false); expect(E.isLevelLocked(1)).toBe(true);
    expect(E.priceLabel()).toContain('$4.99');
    expect((await E.restore()).status).toBe('nothing');
    expect((await E.purchase()).status).toBe('purchased');
    expect(E.isLevelLocked(4)).toBe(false);
    expect((await E.restore()).status).toBe('restored');
  });
});

describe('iOS app', () => {
  it('forces the paywall on: B1 free, B2-B5 sealed until owned', () => {
    E._configure({ native: true, store: fake() });
    expect(E.paywallActive()).toBe(true);
    expect(E.isLevelLocked(0)).toBe(false);
    for (let l = 1; l < 5; l++) expect(E.isLevelLocked(l)).toBe(true);
  });
  it('a missing StoreKit plugin never grants a free unlock', async () => {
    E._configure({ native: true, store: null });
    expect(E.canPurchase()).toBe(false);
    expect((await E.purchase()).status).toBe('failed');
    expect((await E.restore()).status).toBe('failed');
    expect(E.isLevelLocked(1)).toBe(true);
  });

  describe('purchase states', () => {
    it('purchased unlocks B2-B5', async () => {
      E._configure({ native: true, store: fake() });
      expect((await E.purchase()).status).toBe('purchased');
      for (let l = 1; l < 5; l++) expect(E.isLevelLocked(l)).toBe(false);
    });
    for (const status of ['pending', 'cancelled', 'failed']) {
      it(`${status} does not unlock anything`, async () => {
        E._configure({ native: true, store: fake({ purchase: async () => ({ status, message: 'x' }) }) });
        expect((await E.purchase()).status).toBe(status);
        expect(E.isLevelLocked(1)).toBe(true);
      });
    }
    it('a thrown error or an unknown status is a failure, not an unlock', async () => {
      E._configure({ native: true, store: fake({ purchase: async () => { throw new Error('boom'); } }) });
      expect((await E.purchase()).status).toBe('failed');
      E._configure({ native: true, store: fake({ purchase: async () => ({ status: 'granted!' }) }) });
      expect((await E.purchase()).status).toBe('failed');
      expect(E.isLevelLocked(1)).toBe(true);
    });
    it('a pending Ask-to-Buy purchase unlocks later through the entitlement event', async () => {
      E._configure({ native: true, store: fake({ purchase: async () => ({ status: 'pending' }) }) });
      let seen = null; E.onEntitlementChange((o) => { seen = o; });
      await E.initStore(); await E.purchase();
      expect(E.isLevelLocked(1)).toBe(true);
      listeners.entitlement({ owned: true });
      expect(E.isLevelLocked(1)).toBe(false); expect(seen).toBe(true);
      listeners.entitlement({ owned: false }); // refund
      expect(E.isLevelLocked(1)).toBe(true); expect(seen).toBe(false);
    });
  });

  describe('restore purchases', () => {
    it('restores an owned unlock', async () => {
      E._configure({ native: true, store: fake() });
      expect((await E.restore()).status).toBe('restored'); expect(E.isLevelLocked(3)).toBe(false);
    });
    it('reports nothing to restore when the account never bought it', async () => {
      E._configure({ native: true, store: fake({ restore: async () => ({ status: 'ok', owned: false }) }) });
      expect((await E.restore()).status).toBe('nothing'); expect(E.isLevelLocked(1)).toBe(true);
    });
    it('a failed restore (offline, sign-in cancelled) never removes an existing unlock', async () => {
      E._configure({ native: true, store: fake({ restore: async () => ({ status: 'failed', message: 'offline' }) }) });
      ls().setItem(E.ENTITLEMENT_KEY, '1');
      const r = await E.restore(); expect(r.status).toBe('failed'); expect(E.isLevelLocked(1)).toBe(false);
      E._configure({ native: true, store: fake({ restore: async () => { throw new Error('net'); } }) });
      expect((await E.restore()).status).toBe('failed'); expect(E.isLevelLocked(1)).toBe(false);
    });
  });

  describe('launch verification (Transaction.currentEntitlements)', () => {
    it('loads the localized price from StoreKit', async () => {
      E._configure({ native: true, store: fake() });
      expect(E.priceLabel()).toBeNull();
      await E.initStore(); expect(E.PRODUCT.price).toBe('€4,99'); expect(E.priceLabel()).toBe('€4,99');
    });
    it('grants the unlock when StoreKit says owned (reinstall / new device)', async () => {
      E._configure({ native: true, store: fake({ getEntitlements: async () => ({ owned: true }) }) });
      expect(await E.initStore()).toBe('owned'); expect(E.isLevelLocked(4)).toBe(false);
    });
    it('re-locks a stale cached entitlement when StoreKit definitively says not owned (refund)', async () => {
      E._configure({ native: true, store: fake() });
      ls().setItem(E.ENTITLEMENT_KEY, '1'); expect(E.isLevelLocked(1)).toBe(false);
      expect(await E.initStore()).toBe('free'); expect(E.isLevelLocked(1)).toBe(true);
    });
    it('keeps the cached entitlement when StoreKit cannot answer (offline)', async () => {
      E._configure({ native: true, store: fake({ getEntitlements: async () => { throw new Error('offline'); }, getProduct: async () => { throw new Error('offline'); } }) });
      ls().setItem(E.ENTITLEMENT_KEY, '1');
      expect(await E.initStore()).toBe('unverified'); expect(E.isLevelLocked(1)).toBe(false); expect(E.priceLabel()).toBeNull();
    });
    it('does not hang on a StoreKit call that never returns', async () => {
      E._configure({ native: true, store: fake({ getEntitlements: () => new Promise(() => {}), getProduct: () => new Promise(() => {}) }) });
      expect(await E.initStore(30)).toBe('unverified');
    });
  });
});
