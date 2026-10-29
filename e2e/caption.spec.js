import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

// The big narration caption must sit below the monsters (in the lower band of the 3D view) and above the combat menu,
// on every device, for the tallest bosses and for long captions.
const LONG = 'Gorvax the Tyrant rears up, roaring so loud the vault shakes, and brings its enormous jaws crashing down on Ser Aldric — who somehow raises the Sunshard Aegis just in time!';
const measure = (page) => page.evaluate(() => {
  const box = (el) => { if (!el || !el.offsetParent) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
  const view = document.querySelector('#view').getBoundingClientRect(); const m = window.__gw.R.monsterScreenRect();
  const mon = m && { l: view.left + (m.left / 100) * view.width, r: view.left + (m.right / 100) * view.width, t: view.top + (m.top / 100) * view.height, b: view.top + (m.bottom / 100) * view.height };
  const cap = document.querySelector('#caption');
  const bub = getComputedStyle(document.querySelector('#banter')).visibility === 'hidden' ? [] : [...document.querySelectorAll('#banter .bubble')].map(box).filter(Boolean);
  const hud = box(document.querySelector('#hud'));
  return { bub, raw: m && m.raw, vh: view.height, view: { l: view.left, t: view.top, r: view.right, b: view.bottom }, mon, cap: box(cap), menu: box(document.querySelector('#cmenu')), font: parseFloat(getComputedStyle(cap.querySelector('.captxt')).fontSize), clipped: cap.scrollHeight > cap.clientHeight + 1, dbg: [cap.scrollHeight, cap.clientHeight, cap.style.maxHeight, window.__gw.R.captionReservePx, window.__gw.R.arenaShift, view.height, window.__gw.R.monsterRect()] };
});
// monsters measure at rest: a lunge/stagger from the last enemy attack (now 1.5x longer) may still be finishing when the menu appears
const settle = (page) => page.waitForFunction(() => { const R = window.__gw.R; return ![...R.monsterObjs.values()].some((v) => v.lunge > 0 || v.stagger > 0) && !(R.aBump > 0) && !(R.aShake > 0); }, null, { timeout: 4000, polling: 100 }).catch(() => {});
// A real layout bug fails on every attempt; a lunge, a screen shake or a caption swapped by the next narration line only fails one frame.
async function checkAtRest(page, what) {
  let err;
  for (let i = 0; i < 8; i++) {
    await page.waitForSelector('#caption.show .captxt', { timeout: 30000 }); await settle(page);
    const m = await measure(page).catch(() => null); if (!m) { await page.waitForTimeout(300); continue; }
    try { check(m, what); return m; } catch (e) { err = e; await page.waitForTimeout(400); }
  }
  throw err || new Error(what + ': never measurable');
}
const overlap = (a, b) => !!a && !!b && a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
function check(m, what) {
  expect(m.cap, `${what}: caption visible`).toBeTruthy();
  expect(m.mon, `${what}: monsters on screen`).toBeTruthy();
  // the monsters must really be visible: not cut off by the edges of the view and big enough to see
  const raw = m.raw; expect(raw.top >= -1 && raw.bottom <= 101 && raw.left >= -1 && raw.right <= 101, `${what}: monsters fully inside the view ${JSON.stringify(raw)}`).toBe(true);
  expect(m.mon.b - m.mon.t >= Math.min(100, m.vh * 0.22) || m.mon.r - m.mon.l >= 0.7 * (m.view.r - m.view.l), `${what}: monsters big enough to see clearly (tall, or a line filling the width) ${JSON.stringify(m.mon)} view ${JSON.stringify(m.view)}`).toBe(true);
  expect(m.mon.t - m.view.t, `${what}: monsters sit in the upper part of the view`).toBeLessThanOrEqual(0.45 * (m.view.b - m.view.t));
  for (const b of m.bub) { expect(overlap(b, m.mon), `${what}: speech bubble ${JSON.stringify(b)} covers the monsters ${JSON.stringify(m.mon)}`).toBe(false); expect(overlap(b, m.cap), `${what}: speech bubble covers the caption`).toBe(false); }
  expect(overlap(m.cap, m.mon), `${what}: caption ${JSON.stringify(m.cap)} overlaps monsters ${JSON.stringify(m.mon)} dbg ${JSON.stringify(m.dbg)}`).toBe(false);
  expect(m.cap.t, `${what}: caption below the monsters`).toBeGreaterThanOrEqual(m.mon.b - 1);
  expect(overlap(m.cap, m.menu), `${what}: caption overlaps the combat menu ${JSON.stringify(m.menu)}`).toBe(false);
  expect(m.cap.t >= m.view.t - 1 && m.cap.b <= m.view.b + 1, `${what}: caption inside the 3D view`).toBe(true);
  expect(m.font, `${what}: caption font stays large ${JSON.stringify(m.dbg)} mon ${JSON.stringify(m.mon)} cap ${JSON.stringify(m.cap)}`).toBeGreaterThanOrEqual(16);
  expect(m.clipped, `${what}: caption text fits ${JSON.stringify(m.dbg)} mon ${JSON.stringify(m.mon)}`).toBe(false);
}

for (const [name, groups] of [['Gorvax', [{ key: 'tyrannosaurus', count: 1 }]], ['Brakk + Cindermaw', [{ key: 'brakk', count: 1 }, { key: 'cindermaw', count: 1 }]], ['4 armors', [{ key: 'animatedArmor', count: 4 }]]]) {
  test(`narration caption sits below ${name} and above the combat menu`, async ({ page }, info) => {
    test.setTimeout(240000);
    const errors = trackErrors(page);
    await newGame(page);
    await page.evaluate((g) => { for (const c of window.__gw.state.party) { c.maxHp = 999; c.hp = 999; } window.__gw.startCombat({ groups: g, boss: true }); }, groups);
    // enemies may win initiative: tap through their narration until it's our turn
    for (let i = 0; i < 400 && !(await page.locator('.combatmenu').isVisible()); i++) { if (await page.locator('#caption.show').isVisible()) await page.locator('#caption').click({ force: true }).catch(() => {}); await page.waitForTimeout(300); }
    await page.waitForSelector('.combatmenu', { timeout: 30000 });
    for (const [label, e] of [['short', { text: 'Gorvax bites Ser Aldric!', sub: '14 damage', tone: 'bad' }], ['long', { text: LONG, sub: '27 piercing damage — CRITICAL!', tone: 'crit' }]]) {
      await page.evaluate((e) => { window.__gw.say({ who: 'Fizzwick', color: '#ff80ff', text: 'Fizzwick notes the enemy\'s poor posture. Advantage: Fizzwick.' }); window.__gw.caption(e, true); }, e);
      await page.waitForTimeout(600);
      await checkAtRest(page, `${name}/${label}`);
      if (label === 'long') await page.screenshot({ path: `test-results/caption-${name.split(' ').pop().toLowerCase()}-${info.project.name}.png` });
    }
    // a real narration caption from the combat engine
    await page.evaluate(() => window.__gw.hideCaption());
    await page.locator('#autobtn').click();
    await page.waitForSelector('#caption.show', { timeout: 120000 });
    await checkAtRest(page, `${name}/live`);
    expect(errors).toEqual([]);
  });
}
