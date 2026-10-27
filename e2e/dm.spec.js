import { test, expect } from '@playwright/test';
import { trackErrors, newGame } from './helpers.js';
// NOT helpers.openLocation: that taps the #tapcatch after 300ms (dismissCards), which would close the very DM card this spec inspects.
const openLocation = (page, name) => page.locator('#modal button', { hasText: name }).first().click();

// Dungeon Master read-aloud cards: once per save, readable on every device, can be switched off.
test.use({ storageState: { cookies: [], origins: [] } });
const card = (page) => page.locator('#caption.show.msg');
const dismiss = async (page) => { await page.waitForTimeout(260); await page.keyboard.press('Enter'); await expect(card(page)).toHaveCount(0); };
async function checkCard(page, what) {
  await expect(card(page), what).toBeVisible();
  const m = await page.evaluate(() => { const b = (s) => { const e = document.querySelector(s); const r = e && e.offsetParent && e.getBoundingClientRect(); return r && r.width ? r : null; }; const c = document.querySelector('#caption'); return { c: b('#caption'), v: b('#view'), ctl: b('#controls'), fits: c.scrollHeight <= c.clientHeight + 1, font: parseFloat(getComputedStyle(c.querySelector('.captxt')).fontSize), menu: b('#btn-menu') }; });
  expect(m.c.top >= m.v.top - 1 && m.c.bottom <= m.v.bottom + 1, `${what}: inside the 3D view`).toBe(true);
  expect(m.fits, `${what}: text fits`).toBe(true); expect(m.font, `${what}: readable`).toBeGreaterThanOrEqual(15);
  expect(!m.ctl || m.c.bottom <= m.ctl.top + 1 || m.c.top >= m.ctl.bottom - 1 || m.c.right <= m.ctl.left + 1 || m.c.left >= m.ctl.right - 1, `${what}: clear of the controls`).toBe(true);
  expect(!m.menu || m.menu.left >= m.c.right || m.menu.right <= m.c.left || m.menu.top >= m.c.bottom || m.menu.bottom <= m.c.top, `${what}: clear of the Menu button`).toBe(true);
}

test('DM read-aloud: town, floor intro, rooms — once per save, reminders, setting off', async ({ page }, info) => {
  const errors = trackErrors(page); const P = info.project.name;
  await newGame(page);
  if (await card(page).isVisible()) await dismiss(page); // town square (may already be dismissed by the tutorial skip)
  expect(await page.evaluate(() => !!window.__gw.state.seen?.['town:square'])).toBe(true);
  // town spot, first visit
  await openLocation(page, 'Tavern');
  await checkCard(page, 'tavern'); await expect(page.locator('#caption .captxt')).toContainText('Boar & Spoon is warm');
  await page.waitForTimeout(700); await page.screenshot({ path: `/workspace/shots/dm-tavern-${P}.png` }); await dismiss(page);
  await page.locator('[data-back="top"]').first().click(); await openLocation(page, 'Tavern'); await page.waitForTimeout(400);
  await expect(card(page), 'tavern only once').toHaveCount(0);
  // floor intro
  await page.locator('[data-back="top"]').first().click(); await openLocation(page, 'Edge of Town');
  if (await card(page).isVisible()) await dismiss(page);
  await page.click('#btn-enter');
  await page.waitForTimeout(800); await page.screenshot({ path: `/workspace/shots/dm-floor-${P}.png` });
  await checkCard(page, 'B1 intro'); await expect(page.locator('#caption .captxt')).toContainText('the Rat-Warrens are awake');
  expect(await page.locator('#log').textContent(), 'logged').toContain('the Rat-Warrens are awake');
  const pos = await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
  expect(await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`), 'no movement under the card').toBe(pos);
  await dismiss(page);
  // a themed room: first time a card, second time nothing
  const enterRoom = () => page.evaluate(() => { const g = window.__gw, s = g.state, G = g.G; const open = (x, y) => { const c = G.tile(s, x, y); return c && c !== '#' && c !== 'S'; };
    for (let y = 1; y < 20; y++) for (let x = 1; x < 20; x++) { let ok = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!open(x + dx, y + dy)) ok = false; if (ok && G.tile(s, x, y) === '.') { s.x = x; s.y = y; g.handle(G.enterTile(s)); return G.Narr.AREAS[0].rooms.some((r) => document.querySelector('#caption')?.textContent.includes(r.slice(0, 20))); } } return 'no room'; });
  expect(await enterRoom(), 'room card').toBe(true);
  await checkCard(page, 'room'); await page.screenshot({ path: `/workspace/shots/dm-room-${P}.png` }); await dismiss(page);
  await enterRoom(); await page.waitForTimeout(300); await expect(card(page), 'room only once').toHaveCount(0);
  // seen flags live in the save: reload, come back to B1 -> one-line reminder in the log, no card
  await page.evaluate(async () => { const g = window.__gw; await g.loadState(g.G.serialize(g.state)); g.handle(g.G.enterDungeon(g.state, 0)); });
  await page.waitForTimeout(400); await expect(card(page), 'no repeat after reload').toHaveCount(0);
  expect(await page.locator('#log').textContent()).toContain('Back in the Rat-Warrens');
  // setting off: B2 intro goes to the log only
  await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('blackspire.settings') || '{}'); st.areaDesc = false; localStorage.setItem('blackspire.settings', JSON.stringify(st)); window.__gw.handle(window.__gw.G.goDown(window.__gw.state)); });
  await page.waitForTimeout(400); await expect(card(page), 'off = no card').toHaveCount(0);
  expect(await page.locator('#log').textContent()).toContain('Drowned Grotto, then goes still');
  expect(errors).toEqual([]);
});
