import { test, expect } from '@playwright/test';

// Bug (TestFlight 1.0.1 (8)): tapping Roll (and any other control that rebuilds the creator) jumped the modal back to the top,
// because draw() replaced #modal .panel and the new panel started at scrollTop 0.

const panel = (page) => page.evaluate(() => {
  const p = document.querySelector('#modal .panel');
  return { top: p.scrollTop, client: p.clientHeight, height: p.scrollHeight };
});

async function openCreator(page) {
  await page.goto('./');
  await page.click('#btn-new', { timeout: 90000 });
  await page.waitForSelector('#btn-roll');
}

// Scroll the panel itself (not scrollIntoView, which no-ops when Roll is already on-screen in the desktop two-column layout).
// Clicks go through element.click() so Playwright will not scroll the target into view and undo the position we just set.
async function scrollPanelDown(page) {
  return page.evaluate(() => {
    const p = document.querySelector('#modal .panel');
    const max = p.scrollHeight - p.clientHeight;
    p.scrollTop = Math.min(max, Math.max(200, Math.floor(max * 0.55)));
    return p.scrollTop;
  });
}

const waitFrame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function expectScrollHeld(page, y, what) {
  await waitFrame(page);
  const after = await panel(page);
  expect(after.top, `${what}: did not jump to the top (was ${y}, now ${after.top})`).toBeGreaterThan(Math.min(50, Math.max(0, y - 1)));
  expect(Math.abs(after.top - y), `${what}: scroll stayed near ${y}, got ${after.top}`).toBeLessThan(40);
  return after.top;
}

const clickSel = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
const pickChange = (page, sel, value) => page.evaluate(({ sel, value }) => {
  const el = document.querySelector(sel);
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, { sel, value });

test('creator: Roll, Standard Array, and other picks keep the modal scroll position', async ({ page }) => {
  await openCreator(page);
  const start = await panel(page);
  expect(start.height, 'creator is taller than the panel').toBeGreaterThan(start.client + 40);

  let y = await scrollPanelDown(page);
  expect(y, 'scrolled the creator panel down').toBeGreaterThan(50);

  await clickSel(page, '#btn-roll');
  y = await expectScrollHeld(page, y, 'Roll');
  await expect(page.locator('#btn-roll')).toBeAttached();

  await page.evaluate(() => [...document.querySelectorAll('#modal .panel button')].find((b) => b.textContent.includes('Standard Array')).click());
  y = await expectScrollHeld(page, y, 'Standard Array');

  await pickChange(page, '#crace', 'highElf');
  y = await expectScrollHeld(page, y, 'race');

  await pickChange(page, '#ccls', 'wizard');
  y = await expectScrollHeld(page, y, 'class');

  await page.evaluate(() => {
    const picks = [...document.querySelectorAll('#pgrid .pick')];
    (picks.find((el) => !el.classList.contains('on')) || picks[1]).click();
  });
  y = await expectScrollHeld(page, y, 'portrait');

  await page.evaluate(() => {
    const opts = [...document.querySelectorAll('#voice-list .voiceopt')];
    (opts.find((el) => !el.classList.contains('sel')) || opts[1]).click();
  });
  y = await expectScrollHeld(page, y, 'voice');

  // difficulty does not rebuild the modal; scroll must still hold
  const beforeDiff = (await panel(page)).top;
  await pickChange(page, '#cdiff', 'hard');
  await waitFrame(page);
  expect((await panel(page)).top, 'difficulty left scroll alone').toBe(beforeDiff);
});
