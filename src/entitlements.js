// Fair paywall: B1 is free forever; one non-consumable unlock (com.gorillastocks.blackspire.fullgame, $4.99) opens B2-B5.
//
// Platforms
//  - iOS app (Capacitor): the paywall is ALWAYS on. The purchase goes through the app-local StoreKit 2 plugin
//    (ios/App/App/StoreKitPlugin.swift, JS name 'BlackspireStore'). The entitlement is cached in localStorage and re-verified
//    on every launch from Transaction.currentEntitlements (initStore). There is no free unlock on iOS: if StoreKit is
//    unavailable, buying fails and nothing is granted.
//  - Web / GitHub Pages: no StoreKit, so the paywall is OFF and the whole game is playable. The old dev switch still works to
//    test the free version in a browser (?paywall=1, localStorage 'blackspire.paywall' = '1' (Settings toggle) or
//    VITE_PAYWALL=1); in that mode the purchase is a local placeholder flag.
import { registerPlugin } from '@capacitor/core';

export const FREE_LEVELS = 1;          // dungeon levels (B1) that never need the unlock
export const PAYWALL_KEY = 'blackspire.paywall';
export const ENTITLEMENT_KEY = 'blackspire.entitlement.full';
export const PRODUCT = {
  id: 'com.gorillastocks.blackspire.fullgame',
  title: 'Unlock Blackspire: Levels 2–5',
  blurb: 'One purchase. Every deeper level, forever. No consumables, no timers, no pulls.',
  price: null, // localized price from StoreKit (e.g. "$4.99"); null until loaded
};
export const WEB_PLACEHOLDER_PRICE = '$4.99';

const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
const envFlag = () => { try { return import.meta.env?.VITE_PAYWALL === '1'; } catch { return false; } };
const urlFlag = () => { try { return typeof location !== 'undefined' && new URLSearchParams(location.search).get('paywall') === '1'; } catch { return false; } };

// ---- platform / backend (overridable for tests) ----
let nativeOverride = null;
export function isNativeIOS() {
  if (nativeOverride !== null) return nativeOverride;
  try { return !!globalThis.Capacitor?.isNativePlatform?.() && globalThis.Capacitor.getPlatform?.() === 'ios'; } catch { return false; }
}
let backend; // undefined = not resolved yet; null = none
function getBackend() {
  if (backend !== undefined) return backend;
  backend = null;
  if (isNativeIOS()) { try { backend = registerPlugin('BlackspireStore'); } catch { backend = null; } }
  return backend;
}
/** Tests: inject a fake StoreKit backend and/or force the platform. Pass nothing to reset. */
export function _configure({ native = null, store: b } = {}) { nativeOverride = native; backend = b; listening = false; PRODUCT.price = null; }

// ---- gating ----
export function paywallActive() { return isNativeIOS() || envFlag() || urlFlag() || store()?.getItem(PAYWALL_KEY) === '1'; }
export function setPaywallDev(on) { const st = store(); if (!st) return; if (on) st.setItem(PAYWALL_KEY, '1'); else st.removeItem(PAYWALL_KEY); }
export const hasEntitlement = () => store()?.getItem(ENTITLEMENT_KEY) === '1';
export const isUnlocked = () => !paywallActive() || hasEntitlement();
export const isLevelLocked = (lvl) => lvl >= FREE_LEVELS && !isUnlocked();
export function resetEntitlement() { store()?.removeItem(ENTITLEMENT_KEY); }
function setEntitlement(owned) { const st = store(); if (!st) return; if (owned) st.setItem(ENTITLEMENT_KEY, '1'); else st.removeItem(ENTITLEMENT_KEY); }

/** True when buying is possible at all: a StoreKit backend on iOS, or the placeholder in a web dev paywall. */
export const canPurchase = () => !!getBackend() || !isNativeIOS();
/** Text for the price line on the paywall. */
export function priceLabel() {
  if (PRODUCT.price) return PRODUCT.price;
  return isNativeIOS() ? null : `${WEB_PLACEHOLDER_PRICE} (test build: no real purchase)`;
}

// ---- store calls ----
let listening = false;
let onChange = null;
/** Called when the entitlement changes outside a button press (Ask-to-Buy approval, refund, purchase on another device). */
export function onEntitlementChange(fn) { onChange = fn; }
function listen(b) {
  if (listening || !b?.addListener) return; listening = true;
  try { b.addListener('entitlement', (d) => { const owned = !!d?.owned; const was = hasEntitlement(); setEntitlement(owned); if (owned !== was) onChange?.(owned); }); } catch { /* ignore */ }
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/**
 * Launch: load the localized price and re-verify the entitlement from Transaction.currentEntitlements.
 * A definitive answer overwrites the cache (so a refund or revocation re-locks); an error (offline, StoreKit hiccup) keeps it.
 * Never rejects. Returns 'web' | 'owned' | 'free' | 'unverified'.
 */
export async function initStore(timeoutMs = 5000) {
  const b = getBackend();
  if (!b) return 'web';
  listen(b);
  try { const p = await withTimeout(b.getProduct(), timeoutMs); if (p?.displayPrice) PRODUCT.price = p.displayPrice; } catch { /* price stays null */ }
  try {
    const r = await withTimeout(b.getEntitlements(), timeoutMs);
    if (r && typeof r.owned === 'boolean') { setEntitlement(r.owned); return r.owned ? 'owned' : 'free'; }
  } catch { /* keep the cached entitlement */ }
  return 'unverified';
}

/**
 * Buy the unlock. Resolves { status: 'purchased' | 'pending' | 'cancelled' | 'failed', message? } and never throws.
 * Only 'purchased' grants the entitlement. 'pending' = Ask to Buy / SCA: nothing is unlocked until Apple approves (the
 * 'entitlement' event then unlocks it).
 */
export async function purchase() {
  const b = getBackend();
  if (!b) {
    if (isNativeIOS()) return { status: 'failed', message: 'The App Store is not available.' };
    setEntitlement(true); return { status: 'purchased', placeholder: true }; // web dev paywall only
  }
  try {
    const r = await b.purchase();
    const status = ['purchased', 'pending', 'cancelled', 'failed'].includes(r?.status) ? r.status : 'failed';
    if (status === 'purchased') setEntitlement(true);
    return { status, message: r?.message };
  } catch (e) { return { status: 'failed', message: String(e?.message || e) }; }
}

/**
 * Restore Purchases (App Store requirement): sync with the App Store, then re-read Transaction.currentEntitlements.
 * Resolves { status: 'restored' | 'nothing' | 'failed', message? } and never throws. A failure never removes an entitlement.
 */
export async function restore() {
  const b = getBackend();
  if (!b) {
    if (isNativeIOS()) return { status: 'failed', message: 'The App Store is not available.' };
    return { status: hasEntitlement() ? 'restored' : 'nothing' }; // web: the placeholder flag on this browser
  }
  try {
    const r = await b.restore();
    if (r?.status === 'failed' || typeof r?.owned !== 'boolean') return { status: 'failed', message: r?.message };
    setEntitlement(r.owned);
    return { status: r.owned ? 'restored' : 'nothing' };
  } catch (e) { return { status: 'failed', message: String(e?.message || e) }; }
}
