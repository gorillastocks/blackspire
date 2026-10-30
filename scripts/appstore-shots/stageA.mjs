// Stage A: class creation (frame 6), the Elowen abduction (frame 2), the town square (frame 7). Saves the town state for later stages.
import { open, sleep } from './lib.mjs';
import fs from 'node:fs';
const dev = process.argv[2] || 'iphone';
const { browser, page } = await open(dev);
const raw = `/workspace/appstore-raw/${dev}`; fs.mkdirSync(raw, { recursive: true });
await page.click('#btn-new'); await sleep(600);
await page.selectOption('#ccls', 'wizard'); await page.fill('#cname', 'Aldric'); await sleep(300);
await page.evaluate(() => { const s = document.querySelector('#ccls'); s.size = s.options.length; s.scrollIntoView({ block: 'center' }); });
await sleep(400);
await page.screenshot({ path: `${raw}/create.png` });
await page.evaluate(() => { const s = document.querySelector('#ccls'); s.removeAttribute('size'); s.value = 'wizard'; });
await page.click('#btn-begin'); await sleep(1500);
let got = false;
for (let i = 0; i < 20; i++) {
  if (await page.locator('#btn-spell-ok:visible').count()) { await page.click('#btn-spell-rec').catch(() => {}); await page.click('#btn-spell-ok'); await sleep(800); continue; }
  const txt = await page.evaluate(() => document.querySelector('#modal')?.innerText || '');
  if (!got && /Take it!/.test(txt)) { await sleep(600); await page.screenshot({ path: `${raw}/elowen.png` }); got = true; console.log('elowen shot'); }
  const ch = page.locator('[data-choice]:visible'); if (await ch.count()) { const ids = await ch.evaluateAll((e) => e.map((x) => x.dataset.choice)); console.log('choices', ids); await page.locator(`[data-choice="${ids.includes('skip') ? 'skip' : 'vow'}"]`).click(); await sleep(450); continue; }
  const next = page.locator('#dlg-next:visible'); if (await next.count()) { await next.click(); await sleep(450); continue; }
  if (await page.locator('#btn-tavern:visible').count()) break;
  await sleep(400);
}
await page.waitForSelector('#btn-tavern', { timeout: 30000 }); await sleep(1500);
await page.screenshot({ path: `${raw}/town.png` });
fs.writeFileSync(`${raw}/town-state.json`, await page.evaluate(() => window.__gw.G.serialize(window.__gw.state)));
console.log('done'); await browser.close();
