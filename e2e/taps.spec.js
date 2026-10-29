import { test, expect } from '@playwright/test';
import { trackErrors, newGame, openLocation, dismissCards } from './helpers.js';

// "Tap to continue" must never freeze the game: pause-mode rat fights hammered with fast, double and mistimed taps,
// keys, and monsters dying mid-caption must always finish. Plus exploration message cards (clues, wall writings).
test.describe.configure({ timeout: 900000 });
const enterDungeon = async (page) => { await openLocation(page, 'Edge of Town'); await page.click('#btn-enter'); await expect.poll(() => page.evaluate(() => window.__gw.state.mode)).toBe('dungeon'); await dismissCards(page); };
const capShown = (page) => page.locator('#caption.show').isVisible();

async function tapAt(page, x, y, touch) { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); }

test('pause mode: many rat fights with fast, double and mistimed taps always finish', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'stress run on iPhone portrait');
  const errors = trackErrors(page);
  await page.addInitScript(() => localStorage.setItem('blackspire.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('blackspire.settings') || '{}'), battleSpeed: 'pause', battleSpeedSet: true })));
  // Page-side tracker: a stray tap from the previous loop pass can land (slowly, under software GL) after the loot card appeared,
  // and a tap >1s after the card is a legitimate dismissal. So record when the card shows/hides and when input happened,
  // instead of asserting "visible right now" (that raced with the test's own taps and was the flake).
  await page.addInitScript(() => {
    window.__loot = { shown: 0, hidden: 0, hideAt: 0, lastInput: 0 };
    for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { window.__loot.lastInput = performance.now(); }, true);
    let vis = false;
    setInterval(() => { const v = !!document.querySelector('#caption.show.loot'); if (v && !vis) window.__loot.shown++; if (!v && vis) { window.__loot.hidden++; window.__loot.hideAt = performance.now(); } vis = v; }, 30);
  });
  await newGame(page); await enterDungeon(page);
  const vp = page.viewportSize(); let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let fight = 0; fight < (+process.env.FIGHTS || 12); fight++) { console.log('fight', fight, new Date().toISOString());
    await page.evaluate(() => { for (const c of window.__gw.state.party) { c.maxHp = 999; c.hp = 999; c.dead = false; } window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 3 }] }); });
    await expect.poll(() => page.evaluate(() => !!window.__gw.combat)).toBe(true);
    const t0 = Date.now(); let lastChange = Date.now(), lastSig = '';
    while (await page.evaluate(() => !!window.__gw.combat)) {
      expect(Date.now() - t0, `fight ${fight} finishes`).toBeLessThan(150000);
      const sig = await page.evaluate(() => `${document.querySelector('#caption').textContent}|${document.querySelector('#cmenu').textContent}|${window.__gw.combat?.monsters.map((m) => m.hp).join(',')}`);
      if (sig !== lastSig) { lastSig = sig; lastChange = Date.now(); }
      if (Date.now() - lastChange > 19000) console.log('STALL', await page.evaluate(() => { const b = document.querySelector('#cmenu .combatmenu button'); const r = b?.getBoundingClientRect(); const top = r && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { top: top && (top.id || top.className || top.tagName), tap: document.querySelector('#tapcatch').className, body: document.body.className, cur: window.__gw.combat?.current()?.name, ni: window.__gw.combat?.needsInput(), modal: document.querySelector('#modal').className, gm: document.querySelector('#gmenu')?.className, tip: document.querySelector('#tip').className, mtext: document.querySelector('#modal').textContent.slice(0, 200) }; }));
      expect(Date.now() - lastChange, `fight ${fight} stalled on ${sig}`).toBeLessThan(20000);
      const close = page.locator('#modal:not(.hidden) button', { hasText: '✕ Close' }).first(); if (await close.isVisible().catch(() => false)) await close.click().catch(() => {}); // a stray tap during the player's turn may open a sheet
      const r = rnd(), touch = rnd() < 0.7, x = 20 + rnd() * (vp.width - 40), y = 20 + rnd() * (vp.height - 40);
      if (await capShown(page)) {
        if (r < 0.12) await page.evaluate(() => { const c = window.__gw.combat; const m = c?.monsters.find((q) => q.hp > 0); if (m) { m.hp = 0; window.__gw.R.monsterDie(m.id); } }); // death mid-caption
        if (r < 0.35) await tapAt(page, x, y, touch); // anywhere, incl. Menu button / party / bubbles
        else if (r < 0.6) { await tapAt(page, x, y, touch); await page.waitForTimeout(25); await tapAt(page, x, y, touch); } // double tap
        else if (r < 0.75) await page.keyboard.press(rnd() < 0.5 ? 'Enter' : ' ');
        else if (r < 0.9) await page.waitForTimeout(800 + rnd() * 600); // tap during the 0.7 s menu/log restore
        else await tapAt(page, vp.width / 2, vp.height - 60, touch); // where the menu will reappear
        if (await page.locator('#gmenu:not(.hidden)').isVisible().catch(() => false)) await page.keyboard.press('Escape').catch(() => {});
        if (await page.locator('#gmenu').isVisible().catch(() => false)) { const close = page.locator('#gmenu button', { hasText: /Resume|Close|Back/ }).first(); if (await close.isVisible().catch(() => false)) await close.click().catch(() => {}); }
      } else if (await page.locator('.combatmenu').isVisible()) {
        const b = (rnd() < 0.5 ? page.locator('.combatmenu button', { hasText: 'Attack' }).first() : page.locator('#autobtn'));
        if (await b.isVisible()) { if (touch) await b.tap().catch(() => {}); else await b.click().catch(() => {}); if (rnd() < 0.3) await tapAt(page, x, y, touch); }
        const pick = page.locator('.mtag.pick').first(); if (await pick.isVisible().catch(() => false)) await pick.click({ force: true }).catch(() => {});
        const m1 = page.locator('#cmenu .combatmenu button').first(); if (await page.locator('#cmenu .who', { hasText: /target|Which|ally/i }).isVisible().catch(() => false)) await m1.click().catch(() => {});
      } else await page.waitForTimeout(120);
      // whenever it's the player's turn the menu must be really visible (not collapsed under a stale caption)
      if (await page.evaluate(() => !!document.querySelector('#cmenu .combatmenu') && !document.querySelector('#caption.show'))) {
        await expect.poll(() => page.evaluate(() => { const m = document.querySelector('#cmenu .combatmenu'); return !m || !!document.querySelector('#caption.show') || (m.offsetParent !== null && m.getBoundingClientRect().height > 40); }), { timeout: 4000, message: `fight ${fight}: player menu visible` }).toBe(true);
      }
    }
    // the victory loot card must appear for every won fight, and may only leave by a tap / Enter / Space (never by the watchdog)
    if (await page.evaluate(() => window.__gw.state.party.some((c) => c.hp > 0))) {
      await expect.poll(() => page.evaluate(() => window.__loot.shown), { message: `fight ${fight}: loot card shown`, timeout: 8000 }).toBeGreaterThanOrEqual(fight + 1);
      if (await page.locator('#caption.show.loot').isVisible()) {
        const d = rnd(); await page.waitForTimeout(rnd() < 0.5 ? 30 : 300);
        if (fight % 4 === 0) await page.waitForTimeout(2600);
        if (d < 0.4) await tapAt(page, 20 + rnd() * (vp.width - 40), 20 + rnd() * (vp.height - 40), rnd() < 0.7);
        else if (d < 0.7) { await tapAt(page, vp.width / 2, vp.height / 3, true); await page.waitForTimeout(25); await tapAt(page, vp.width / 2, vp.height / 3, true); }
        else await page.keyboard.press(d < 0.85 ? 'Enter' : ' ');
      }
      for (let k = 0; k < 8 && await page.locator('#caption.show.loot').isVisible(); k++) { await page.waitForTimeout(300); await page.keyboard.press('Enter'); } // a too-early tap is ignored by the double-tap guard
      await expect(page.locator('#caption.show.loot')).toHaveCount(0);
      const w = await page.evaluate(() => ({ ...window.__loot, now: performance.now() }));
      expect(w.hideAt - w.lastInput, `fight ${fight}: loot card left only because of a tap/key (not the watchdog)`).toBeLessThan(600);
      const close = page.locator('#modal:not(.hidden) button', { hasText: '✕ Close' }).first(); if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
    }
    expect(await page.evaluate(() => document.body.classList.contains('capup')), 'layout restored after the fight').toBe(false);
    await page.evaluate(() => window.__gw.state.mode === 'dungeon' || window.__gw.state.mode === 'town');
    const cont = page.locator('#modal:not(.hidden) button').first(); if (await cont.isVisible().catch(() => false)) await cont.click().catch(() => {});
  }
  expect(errors).toEqual([]);
});

test('exploration messages show as tap-to-dismiss cards, queued one at a time', async ({ page }, info) => {
  const errors = trackErrors(page);
  await newGame(page); await enterDungeon(page);
  const msgs = ['📜 You find a folded note in Elowen\'s hand. "The seals are failing. Find the five keys before the Sovereign wakes, and trust the dwarf."', 'Scratched into the wall: TURN BACK. THE RATS ARE NOT THE WORST OF IT.', 'Your keen eyes notice a hidden door!'];
  await page.evaluate((m) => window.__gw.handle([{ log: m[0], cls: 'lore', card: true }, { log: m[1], cls: 'lore' }, { log: m[2], cls: 'good', card: true }]), msgs);
  const touch = info.project.name.startsWith('iphone') || info.project.name.startsWith('ipad');
  for (let i = 0; i < msgs.length; i++) {
    await expect(page.locator('#caption.show.msg')).toBeVisible();
    await expect(page.locator('#caption .captxt')).toHaveText(msgs[i]);
    const m = await page.evaluate(() => { const b = (s) => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return r.width && r.height ? r : null; }; const c = b('#caption'), v = b('#view'), ctl = b('#controls'); return { c, v, ctl, font: parseFloat(getComputedStyle(document.querySelector('#caption .captxt')).fontSize), log: document.querySelector('#log').textContent }; });
    expect(m.c.top >= m.v.top - 1 && m.c.bottom <= m.v.bottom + 1, 'card inside the 3D view').toBe(true);
    expect(!m.ctl || m.c.bottom <= m.ctl.top + 1 || m.c.top >= m.ctl.bottom - 1 || m.c.right <= m.ctl.left + 1 || m.c.left >= m.ctl.right - 1, 'card not covering the controls').toBe(true);
    expect(Math.abs((m.c.left + m.c.right) / 2 - (m.v.left + m.v.right) / 2), 'card centred').toBeLessThan(4);
    expect(await page.evaluate(() => { const c = document.querySelector('#caption').getBoundingClientRect(); return [...document.querySelectorAll('#banter .bubble')].some((b) => { if (getComputedStyle(b).visibility === 'hidden') return false; const r = b.getBoundingClientRect(); return r.width && r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top; }); }), 'no speech bubble over the card').toBe(false);
    expect(m.font, 'large text').toBeGreaterThanOrEqual(15);
    expect(m.log, 'still logged').toContain(msgs[i].slice(0, 30));
    // movement is held while a card is up
    const pos = await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
    expect(await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`), 'no movement under a card').toBe(pos);
    if (i === 0) await page.screenshot({ path: `test-results/message-${info.project.name}.png` });
    await page.waitForTimeout(260);
    const vp = page.viewportSize();
    if (i === 0) { if (touch) await page.touchscreen.tap(vp.width * 0.2, vp.height * 0.9); else await page.mouse.click(vp.width * 0.2, vp.height * 0.9); }
    else if (i === 1) await page.keyboard.press('Enter'); else await page.keyboard.press(' ');
  }
  await expect(page.locator('#caption.show')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__gw.messages().showing)).toBe(false);
  // a fight that starts while a card is up waits for it, then runs normally
  await page.evaluate(() => { window.__gw.queueMessage('A cold draft. Something skitters in the dark.'); window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 1 }] }); });
  await page.waitForTimeout(500); expect(await page.evaluate(() => !!window.__gw.combat), 'combat waits for the card').toBe(false);
  await page.waitForTimeout(260); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat)).toBe(true);
  expect(errors).toEqual([]);
});

// After every won battle the loot shows in the caption box until dismissed — in every battle-speed mode, on every device.
for (const speed of ['normal', 'fast', 'pause']) {
  test(`victory loot card (${speed} speed) stays until tapped, fits, and is logged`, async ({ page }, info) => {
    test.skip(speed !== 'normal' && info.project.name !== 'iphone', 'speed variants on iPhone portrait');
    const errors = trackErrors(page);
    await page.addInitScript((sp) => localStorage.setItem('blackspire.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('blackspire.settings') || '{}'), battleSpeed: sp, battleSpeedSet: true })), speed);
    await newGame(page); await enterDungeon(page);
    await page.evaluate(() => { for (const c of window.__gw.state.party) { c.maxHp = 999; c.hp = 999; } window.__gw.startCombat({ groups: [{ key: 'giantRat', count: 2 }] }); });
    await expect.poll(() => page.evaluate(() => !!window.__gw.combat)).toBe(true);
    // a big haul (long card): loot picked up during the fight shows on the card
    await page.evaluate(() => { const s = window.__gw.state; s.inventory.push('potionHealing', 'potionHealing', 'potionGreater', 'antitoxin', 'tinCup'); s.party[1].xp += 5000; });
    const touch = !info.project.name.startsWith('desktop');
    for (let i = 0; i < 600 && await page.evaluate(() => !!window.__gw.combat); i++) {
      if (await page.locator('.combatmenu').isVisible()) { await page.locator('#autobtn').first().click().catch(() => {}); }
      else if (speed === 'pause' && await capShown(page)) { await page.waitForTimeout(240); await page.keyboard.press('Enter'); }
      else await page.waitForTimeout(150);
    }
    await expect(page.locator('#caption.show.loot')).toBeVisible();
    const txt = await page.locator('#caption').textContent();
    expect(txt).toMatch(/XP/); expect(txt).toMatch(/gold/); expect(txt).toMatch(/Potion of Healing/); expect(txt).toMatch(/ready for level/); expect(txt).toMatch(/Tap to continue/);
    const m = await page.evaluate(() => { const b = (s) => { const e = document.querySelector(s); const r = e && e.offsetParent && e.getBoundingClientRect(); return r && r.width ? r : null; }; const c = document.querySelector('#caption'); return { c: b('#caption'), v: b('#view'), ctl: b('#controls'), fits: c.scrollHeight <= c.clientHeight + 1, font: parseFloat(getComputedStyle(c.querySelector('.caploot')).fontSize), log: document.querySelector('#log').textContent }; });
    expect(m.c.top >= m.v.top - 1 && m.c.bottom <= m.v.bottom + 1, 'loot card inside the 3D view').toBe(true);
    expect(!m.ctl || m.c.bottom <= m.ctl.top + 1 || m.c.top >= m.ctl.bottom - 1 || m.c.right <= m.ctl.left + 1 || m.c.left >= m.ctl.right - 1, 'loot card not covering the controls').toBe(true);
    expect(await page.evaluate(() => { const c = document.querySelector('#caption').getBoundingClientRect(), r = document.querySelector('#btn-menu').getBoundingClientRect(); return r.width > 0 && r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top; }), 'Menu button not over the card').toBe(false);
    expect(m.fits, 'loot fits').toBe(true); expect(m.font).toBeGreaterThanOrEqual(12);
    expect(m.log, 'loot logged').toMatch(/XP.*gold/);
    await page.screenshot({ path: `test-results/loot-${speed}-${info.project.name}.png` });
    await page.waitForTimeout(3000); await expect(page.locator('#caption.show.loot'), 'not auto-cleared').toBeVisible();
    const pos = await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150);
    expect(await page.evaluate(() => `${window.__gw.state.x},${window.__gw.state.y}`), 'no movement under the card').toBe(pos);
    const vp = page.viewportSize(); if (touch) await page.touchscreen.tap(vp.width * 0.8, vp.height * 0.15); else await page.mouse.click(vp.width * 0.8, vp.height * 0.15);
    await expect(page.locator('#caption.show')).toHaveCount(0);
    await expect(page.locator('#modal:not(.hidden)')).toHaveCount(0); // the dismissing tap did not click through
    expect(errors).toEqual([]);
  });
}
