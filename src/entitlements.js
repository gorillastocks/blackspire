// Fair paywall: B1 is free forever; one unlock covers B2-B5. No real in-app purchase yet (Capacitor / StoreKit comes later):
// the paywall is OFF by default (the web build is fully unlocked so it can keep being tested) and is switched on with a dev flag:
//   ?paywall=1 in the URL, localStorage 'blackspire.paywall' = '1' (the Settings toggle), or VITE_PAYWALL=1 at build time.
// When it is on, 'unlock' / 'restore' only flip a local placeholder flag.
export const FREE_LEVELS = 1;          // dungeon levels (B1) that never need the unlock
export const PAYWALL_KEY = 'blackspire.paywall';
export const ENTITLEMENT_KEY = 'blackspire.entitlement.full';
export const PRODUCT = { id: 'blackspire.full', title: 'Unlock Blackspire: Levels 2–5', price: '$—.— (placeholder)', blurb: 'One purchase. Every deeper level, forever. No consumables, no timers, no pulls.' };

const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
const envFlag = () => { try { return import.meta.env?.VITE_PAYWALL === '1'; } catch { return false; } };
const urlFlag = () => { try { return typeof location !== 'undefined' && new URLSearchParams(location.search).get('paywall') === '1'; } catch { return false; } };

export function paywallActive() { return envFlag() || urlFlag() || store()?.getItem(PAYWALL_KEY) === '1'; }
export function setPaywallDev(on) { const st = store(); if (!st) return; if (on) st.setItem(PAYWALL_KEY, '1'); else st.removeItem(PAYWALL_KEY); }
export const isUnlocked = () => !paywallActive() || store()?.getItem(ENTITLEMENT_KEY) === '1';
export const isLevelLocked = (lvl) => lvl >= FREE_LEVELS && !isUnlocked();
/** Placeholder purchase: no store involved. Returns true when the (fake) entitlement is granted. */
export function purchase() { const st = store(); if (!st) return false; st.setItem(ENTITLEMENT_KEY, '1'); return true; }
/** Placeholder restore: succeeds when this device already holds the entitlement. Real build: StoreKit restore. */
export function restore() { return store()?.getItem(ENTITLEMENT_KEY) === '1'; }
export function resetEntitlement() { store()?.removeItem(ENTITLEMENT_KEY); }
