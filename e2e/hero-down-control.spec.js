import { test, expect } from '@playwright/test';
import { newGame, trackErrors } from './helpers.js';

test('when the hero goes down, AI companions switch to player control', async ({ page }) => {
  test.setTimeout(180000);
  const errors = trackErrors(page);
  await newGame(page);
  await page.evaluate(() => {
    localStorage.setItem('blackspire.settings', JSON.stringify({ battleSpeed: 'double', battleSpeedSet: true, tutorialDone: true }));
    const g = window.__gw;
    for (const c of g.state.party) { c.maxHp = 999; c.hp = 999; if (!g.G.isHero(c)) c.ai = true; }
    g.hideCaption?.();
    g.startCombat({ groups: [{ key: 'giantRat', count: 1 }] });
  });
  await expect.poll(() => page.evaluate(() => !!window.__gw.combat), { timeout: 30000 }).toBe(true);

  const before = await page.evaluate(() => window.__gw.state.party.map((c) => ({ name: c.name, ai: !!c.ai, hero: window.__gw.G.isHero(c) })));
  expect(before.find((c) => c.hero).ai).toBe(false);
  expect(before.filter((c) => !c.hero).every((c) => c.ai)).toBe(true);

  const result = await page.evaluate(async () => {
    const g = window.__gw;
    g.hideCaption?.();
    const hero = g.G.heroOf(g.state);
    g.combat.damage(hero, hero.hp, 'slashing', g.combat.monsters[0] || null);
    await g.flushCombat();
    g.renderCombatUI();
    return {
      party: g.state.party.map((c) => ({ name: c.name, ai: !!c.ai, hero: g.G.isHero(c), hp: c.hp, down: c.hp <= 0 })),
      log: [...document.querySelectorAll('#log div')].map((el) => el.textContent).join('\n'),
      toast: document.querySelector('#toast')?.textContent || '',
      auto: document.getElementById('autobtn')?.getAttribute('aria-pressed') || '',
    };
  });

  expect(result.party.find((c) => c.hero).down).toBe(true);
  expect(result.party.filter((c) => !c.hero).every((c) => c.ai === false), JSON.stringify(result.party)).toBe(true);
  expect(result.log).toMatch(/down, .+ now under your control/i);
  expect(result.toast).toMatch(/down, your companions are now under your control/i);
  expect(result.auto).toBe('false');
  const labels = await page.locator('#party .aitog').allTextContents();
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.every((t) => t.trim() === 'YOU')).toBe(true);
  expect(errors.filter((e) => !/favicon|Failed to load resource|net::/.test(e))).toEqual([]);
});
