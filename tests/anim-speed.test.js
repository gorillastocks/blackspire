import { describe, it, expect } from 'vitest';
import { ANIM_SLOW, BATTLE_SPEEDS } from '../src/menu.js';

describe('attack animation pacing', () => {
  it('attack animations run ~1.4-1.6x longer', () => { expect(ANIM_SLOW).toBeGreaterThanOrEqual(1.4); expect(ANIM_SLOW).toBeLessThanOrEqual(1.6); });
  it('battle speed still scales (fast < pause < slow) and Pause is the default stop-after-action mode', () => {
    expect(BATTLE_SPEEDS.fast.f).toBeLessThan(BATTLE_SPEEDS.pause.f);
    expect(BATTLE_SPEEDS.slow.f).toBeGreaterThan(BATTLE_SPEEDS.pause.f);
    expect(BATTLE_SPEEDS.pause.hold).toBe(0);
  });
});
