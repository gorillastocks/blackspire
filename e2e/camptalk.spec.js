import { test, expect } from '@playwright/test';
import { newGame, trackErrors, expectReachable } from './helpers.js';
const okErr = (errors) => errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e));
const shot = async (page, path) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ path, timeout: 8000 }); return; } catch { await page.mouse.move(1, 1); } } };
const tag = (info) => (info.project.name.startsWith('ipad') ? (info.project.name === 'ipad-portrait' ? 'ipad-portrait' : 'ipad') : info.project.name === 'iphone' ? 'iphone' : info.project.name);
const toEnd = async (page) => { for (let i = 0; i < 8; i++) { const hint = await page.locator('.dialogue .hint').first().innerText().catch(() => ''); const m = hint.match(/(\d+) \/ (\d+)/); if (!m || m[1] === m[2]) return; await page.locator('#dlg-next').click(); await page.waitForTimeout(120); } };

test('Listen In: a patron exchange is overheard, named, logged, filed in the Journal, and does not repeat', async ({ page }, info) => {
  test.setTimeout(180000); const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { const g = window.__gw; g.state.party = g.state.party.filter((c) => !c.companion); g.refresh?.(); });
  await page.evaluate(() => window.__gw.showTown('tavern'));
  await page.locator('#modal [data-tab="bar"]').click();
  const btn = page.locator('#btn-listen'); await expect(btn).toHaveText(/Listen in/); await expectReachable(page, btn, 'Listen in');
  const heard = [];
  for (let i = 0; i < 4; i++) {
    await btn.click(); await expect(page.locator('.dialogue')).toBeVisible();
    const name = await page.locator('.dialogue .dlgtext b').first().innerText(); expect(name).toMatch(/Brogan|Tilda|Ketter|Mosk|Iolen/);
    await expect(page.locator('.dialogue .dlgrow')).toBeVisible();
    if (i === 0) { await shot(page, `/workspace/shots/listen-${tag(info)}.png`); const box = await page.locator('.dialogue').boundingBox(); const vp = page.viewportSize(); expect(box.x).toBeGreaterThanOrEqual(-1); expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1); }
    heard.push(await page.locator('.dialogue .dlgtext p').first().innerText());
    await toEnd(page); await page.locator('#dlg-next').click();
    await expect(page.locator('#modal [data-tab="bar"]')).toBeVisible(); // back at the tavern
    await page.locator('#modal [data-tab="bar"]').click();
  }
  expect(new Set(heard).size).toBe(4);
  const st = await page.evaluate(() => ({ heard: Object.keys(window.__gw.state.rumors.heard).length, taps: window.__gw.state.rumors.taps, jr: window.__gw.state.journal.filter((j) => /^Rumour/.test(j.text)).length, log: document.querySelector('#log').innerText }));
  expect(st.heard).toBe(4); expect(st.taps).toBe(4); expect(st.jr).toBeGreaterThanOrEqual(1); expect(st.log).toMatch(/Overheard/);
  expect(okErr(errors)).toEqual([]);
});

test('camp Talk: pick a companion, a voiced heart to heart, +1 approval, a camp bonus, one talk per rest, Bonds log', async ({ page }, info) => {
  test.setTimeout(180000); const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => { const g = window.__gw; g.state.party = g.state.party.filter((c) => !c.companion); for (const k of ['brambur', 'pip', 'zizzy']) g.G.recruitCompanion(g.state, k); g.refresh?.(); });
  await page.evaluate(() => window.__gw.showCamp());
  const talk = page.locator('#btn-talk'); await expect(talk).toContainText('Talk'); await expect(talk).toContainText('❗'); await talk.click();
  const picker = page.locator('#talk-picker'); await expect(picker).toBeVisible();
  const rows = picker.locator('[data-talk]'); expect(await rows.count()).toBeGreaterThanOrEqual(3); await expect(rows.first()).toContainText('❗');
  for (let i = 0; i < await rows.count(); i++) await expectReachable(page, rows.nth(i), `talk row ${i}`);
  await expectReachable(page, page.locator('#talk-back'), 'back');
  await shot(page, `/workspace/shots/camptalk-picker-${tag(info)}.png`);
  const before = await page.evaluate(() => window.__gw.G.RX.approval(window.__gw.state, 'brambur'));
  await page.locator('[data-talk="brambur"]').click(); await expect(page.locator('.dialogue')).toBeVisible();
  await expect(page.locator('.dialogue h2')).toContainText('Brambur');
  await expect(page.locator('.dialogue .dlgtext b').first()).toContainText('Brambur');
  const n = await page.locator('.dialogue .hint').first().innerText(); expect(n).toMatch(/1 \/ [234]/);
  await toEnd(page); await expect(page.locator('.dialogue .fxlist')).toContainText('opens up'); await expect(page.locator('.dialogue .fxlist')).toContainText('Camp bonus');
  await shot(page, `/workspace/shots/camptalk-${tag(info)}.png`);
  await page.locator('#dlg-next').click();
  await expect(picker).toBeVisible(); await expect(page.locator('[data-talk="brambur"]')).toBeDisabled();
  const st = await page.evaluate(() => { const { state: S, G } = window.__gw; return { a: G.RX.approval(S, 'brambur'), q: S.quests.hammer, done: S.talk.done.brambur, j: S.journal.some((j) => /Bond, Brambur, chapter 1/.test(j.text)), init: S.flags.campInit, log: document.querySelector('#log').innerText }; });
  expect(st.a).toBe(before + 1); expect(st.q).toBe('active'); expect(st.done).toBe(1); expect(st.j).toBe(true); expect(st.log).toMatch(/Camp bonus from Brambur/);
  // a second companion in the same rest: chapter plays, but the bonus is already claimed
  await page.locator('[data-talk="pip"]').click(); await expect(page.locator('.dialogue h2')).toContainText('Pip'); await toEnd(page); await expect(page.locator('.dialogue .fxlist')).toContainText('already claimed'); await page.locator('#dlg-next').click();
  // a rest makes everyone available again
  await page.evaluate(() => window.__gw.G.CampTalk.newRest(window.__gw.state)); await page.locator('#talk-back').click(); await page.locator('#btn-talk').click();
  await expect(page.locator('[data-talk="brambur"]')).toBeEnabled();
  await page.locator('#talk-back').click();
  await page.evaluate(() => window.__gw.showJournal?.('bonds'));
  if (await page.locator('[data-bond-chapters="brambur"]').count() === 0) { await page.evaluate(() => document.querySelector('#btn-journal')?.click()); await page.locator('#modal [data-tab="bonds"]').click(); }
  await expect(page.locator('[data-bond-chapters="brambur"]')).toContainText("Mum's Hammer");
  expect(okErr(errors)).toEqual([]);
});
