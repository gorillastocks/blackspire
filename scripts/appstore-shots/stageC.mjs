// Stage C: the Boar & Spoon tavern "Listen In" (optional frame). Loads the town state saved by stage A.
import { open, sleep } from './lib.mjs';
import fs from 'node:fs';
const dev = process.argv[2] || 'iphone';
const { browser, page } = await open(dev);
const raw = `/workspace/appstore-raw/${dev}`;
await page.evaluate((s) => window.__gw.loadState(s), fs.readFileSync(`${raw}/town-state.json`, 'utf8')); await sleep(1200);
await page.evaluate(() => { const l = document.querySelector('#log'); if (l) l.scrollTop = 0; }); await sleep(500); await page.screenshot({ path: `${raw}/town.png` });
await page.click('#btn-tavern'); await sleep(1000);
for (let i = 0; i < 4; i++) { for (const sel of ['#tip-skip']) { const l = page.locator(sel); if (await l.isVisible().catch(() => false)) await l.click({ force: true }); } await sleep(200); }
await page.screenshot({ path: `${raw}/tavern.png` });
await page.locator('#modal button, #view button', { hasText: 'Bar' }).first().click(); await sleep(800);
await page.locator('#btn-listen').click(); await sleep(1800);
console.log((await page.evaluate(() => document.querySelector('#modal')?.innerText || '')).slice(0, 400));
await page.screenshot({ path: `${raw}/listen.png` });
await browser.close();
