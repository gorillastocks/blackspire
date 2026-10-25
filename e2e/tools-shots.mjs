import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errs=[]; p.on('pageerror', e => errs.push(e.message));
const shot = async (n) => { await p.waitForTimeout(1500); await p.screenshot({ path: `/workspace/shots/${n}.png`, timeout: 60000 }); console.log('ok', n); };
await p.goto('http://localhost:4173/'); await p.waitForSelector('#btn-new',{timeout:90000}); await p.waitForTimeout(2000); await shot('01-title');
await p.click('#btn-new'); await p.selectOption('#ccls', 'paladin').catch(()=>{}); await p.fill('#cname','Sean').catch(()=>{}); await shot('02-create-paladin');
await p.click('#btn-begin'); await p.click('#dlg-next'); await p.click('#dlg-next'); await shot('03-prologue-feast');
await p.click('#dlg-skip'); await p.click('[data-choice="fight"]');
await p.waitForSelector('.combatmenu',{timeout:60000}); await p.waitForTimeout(3000); await shot('04-tutorial-fight-narration');
await p.evaluate(()=>{ const c=window.__gw.combat; c.monsters.forEach(m=>m.hp=1); });
await p.locator('.combatmenu button',{hasText:'Auto-battle'}).click();
await p.waitForSelector('#dlg-next',{timeout:240000}); await p.click('#dlg-next'); await p.click('#dlg-next'); await p.click('#dlg-next'); await p.click('#dlg-next'); await shot('05-abduction-malthrax');
await p.click('#dlg-skip'); await p.click('[data-choice="vow"]'); const s=p.locator('#tip-skip'); if (await s.isVisible()) await s.click();
await p.click('#btn-folk'); await p.locator('[data-npc="rowan"]').click(); await shot('06-townfolk-rowan');
const bosses = { 0:[{key:'giantSpider',count:1},{key:'skarn',count:1}],1:[{key:'ankylosaurus',count:1},{key:'giantWasp',count:2}],2:[{key:'glasshide',count:1},{key:'darkmantle',count:2}],3:[{key:'brakk',count:1},{key:'cindermaw',count:1}],4:[{key:'malthrax',count:1},{key:'animatedArmor',count:2}] };
const reload = async () => { await p.goto('http://localhost:4173/'); await p.waitForSelector('#btn-continue',{timeout:90000}); await p.click('#btn-continue'); await p.waitForTimeout(2000); };
for (let l=0;l<5;l++){
  await reload();
  await p.evaluate(()=>{ window.__gw.state.maxDepth=4; window.__gw.showTown('edge'); });
  if (l===0) await p.click('#btn-enter'); else await p.locator('#modal button',{hasText:'Mine lift to'}).nth(l-1).click();
  await p.waitForTimeout(4000); await p.keyboard.press('d'); await shot(`1${l}-level-B${l+1}`);
  await p.evaluate((g)=>window.__gw.startCombat({groups:g,boss:true}), bosses[l]); await p.waitForSelector('.combatmenu',{timeout:60000}); await p.waitForTimeout(3500); await shot(`2${l}-boss-B${l+1}`);
}
await reload(); await p.evaluate(()=>{window.__gw.state.maxDepth=4; window.__gw.showTown('edge');}); await p.locator('#modal button',{hasText:'Mine lift to'}).nth(3).click(); await p.waitForTimeout(3000);
await p.evaluate(()=>window.__gw.startCombat({groups:[{key:'tyrannosaurus',count:1}],boss:true,phase2:true})); await p.waitForSelector('.combatmenu',{timeout:60000}); await p.waitForTimeout(3500); await shot('25-boss-B5-phase2-gorvax');
console.log('errors', JSON.stringify(errs)); await b.close();
