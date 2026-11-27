import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { FEATURE_LEVEL, FEATURES, featuresAt, unlocksOf } from './features.ts';
import { applyCommand, createInitialState, toClientView } from './game.ts';

const T0 = 1_800_000_000_000;

describe('what a captain is shown when', () => {
  it('a new captain starts with station, market and container bay only', () => {
    const view = toClientView(createInitialState('rookie', T0), T0);
    expect(Object.values(view.unlocks).some(Boolean)).toBe(false);
    expect(Object.keys(view.unlocks).sort()).toEqual([...FEATURES].sort());
  });

  it('the deck opens with the first crew', () => {
    const s = createInitialState('rookie', T0);
    const res = applyCommand(s, { type: 'ClaimFreeCrate' }, T0);
    expect(toClientView(res.state, T0).unlocks).toMatchObject({ deck: true, daily: false });
  });

  it('everything else opens by level, a few things at a time, and never closes again on the way up', () => {
    let open = 0;
    for (let level = 1; level <= 30; level++) {
      const now = Object.values(unlocksOf(level, 1, 0)).filter(Boolean).length;
      expect(now).toBeGreaterThanOrEqual(open);
      expect(featuresAt(level).length).toBeLessThanOrEqual(3);
      open = now;
    }
    expect(open).toBe(FEATURES.length);
    // The first hour stays small, but nobody waits long: all of it is open after a few days of play.
    expect(Math.max(...Object.values(FEATURE_LEVEL))).toBeLessThanOrEqual(8);
    expect(FEATURE_LEVEL.orders).toBe(CONFIG.order.level);
  });

  it('prestige sets the level back but keeps everything open', () => {
    expect(Object.values(unlocksOf(1, 0, 1)).every(Boolean)).toBe(true);
  });

  it('nothing is held back in the rules: a locked part runs from the first minute', () => {
    const s = createInitialState('rookie', T0);
    expect(s.daily.missions.length).toBeGreaterThan(0);
    expect(applyCommand(s, { type: 'SpinWheel' }, T0).events.some((e) => e.type === 'WheelSpun')).toBe(true);
  });

  it('a dot only points at what is open: the charter does not count before its level', () => {
    const s = createInitialState('dots', T0);
    s.season.xp = 50_000;
    const locked = toClientView(s, T0);
    s.profile.level = CONFIG.unlock.season;
    const open = toClientView(s, T0);
    expect(open.badges.daily).toBe(locked.badges.daily + 1);
  });
});
