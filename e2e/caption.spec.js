import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

// The big narration caption must sit below the monsters (in the lower band of the 3D view) and above the combat menu,
// on every device, for the tallest bosses and for long captions.
const LONG = 'Gorvax the Tyrant rears up, roaring so loud the vault shakes, and brings its enormous jaws crashing down on Ser Aldric — who somehow raises the Sunshard Aegis just in time!';
const measure = (page) => page.evaluate(() => {
  const box = (el) => { if (!el || !el.offsetParent) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
  const view = document.querySelector('#view').getBoundingClientRect(); const m = window.__gw.R.monsterRect();
  const mon = m && { l: view.left + (m.left / 100) * view.width, r: view.left + (m.right / 100) * view.width, t: view.top + (m.top / 100) * view.height, b: view.top + (m.bottom / 100) * view.height };
  const cap = document.querySelector('#caption');
  return { view: { l: view.left, t: view.top, r: view.right, b: view.bottom }, mon, cap: box(cap), menu: box(document.querySelector('#cmenu')), font: parseFloat(getComputedStyle(cap.querySelector('.captxt')).fontSize), clipped: cap.scrollHeight > cap.clientHeight + 1, dbg: [cap.scrollHeight, cap.clientHeight, cap.style.maxHeight, window.__gw.R.captionReservePx, window.__gw.R.arenaShift, view.height] };
});
const overlap = (a, b) => !!a && !!b && a.l < b.r - 1 && a.r > b.l + 1 && a.t < b.b - 1 && a.b > b.t + 1;
function check(m, what) {
  expect(m.cap, `${what}: caption visible`).toBeTruthy();
  expect(m.mon, `${what}: monsters on screen`).toBeTruthy();
  expect(overlap(m.cap, m.mon), `${what}: caption ${JSON.stringify(m.cap)} overlaps monsters ${JSON.stringify(m.mon)}`).toBe(false);
  expect(m.cap.t, `${what}: caption below the monsters`).toBeGreaterThanOrEqual(m.mon.b - 1);
  expect(overlap(m.cap, m.menu), `${what}: caption overlaps the combat menu ${JSON.stringify(m.menu)}`).toBe(false);
  expect(m.cap.t >= m.view.t - 1 && m.cap.b <= m.view.b + 1, `${what}: caption inside the 3D view`).toBe(true);
  expect(m.font, `${what}: caption font stays large`).toBeGreaterThanOrEqual(16);
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
      await page.evaluate((e) => window.__gw.caption(e, true), e);
      await page.waitForTimeout(600);
      check(await measure(page), `${name}/${label}`);
      if (label === 'long' && name !== '4 armors') await page.screenshot({ path: `test-results/caption-${name.split(' ')[0].toLowerCase()}-${info.project.name}.png` });
    }
    // a real narration caption from the combat engine
    await page.evaluate(() => window.__gw.hideCaption());
    await page.locator('.combatmenu button', { hasText: 'Auto-battle' }).click();
    await page.waitForSelector('#caption.show', { timeout: 120000 });
    check(await measure(page), `${name}/live`);
    expect(errors).toEqual([]);
  });
}
