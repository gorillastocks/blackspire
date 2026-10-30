// Shared helpers for the App Store screenshot tooling (scripts/appstore-shots). Own port + own build dir so it never clashes with e2e.
import { chromium } from '@playwright/test';
export const URL = process.env.SHOTS_URL || 'http://localhost:4391/';
export const DEVICES = {
  iphone: { dir: 'iphone-6.9', viewport: { width: 440, height: 806 }, dpr: 3, out: [1320, 2868], band: 150 },
  ipad: { dir: 'ipad-13', viewport: { width: 1032, height: 1176 }, dpr: 2, out: [2064, 2752], band: 200 },
};
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export async function open(dev) {
  const d = DEVICES[dev];
  const browser = await chromium.launch({ args: gl });
  const ctx = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { try { localStorage.setItem('blackspire.settings', JSON.stringify({ areaDesc: false, battleSpeed: 'normal', battleSpeedSet: true, tutorialDone: true })); } catch {} });
  const page = await ctx.newPage(); page.setDefaultTimeout(150000);
  page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
  await page.goto(URL); await page.waitForSelector('#btn-new', { timeout: 90000 });
  return { browser, page, d };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
