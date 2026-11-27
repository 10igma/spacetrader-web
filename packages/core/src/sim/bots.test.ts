import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config.ts';
import { simulate } from './bots.ts';

/**
 * Guard rails for the economy. Bots play through the same commands and view
 * as a real client, so this is also an end-to-end test of the rules.
 */
describe('balance guard rails', () => {
  for (const policy of ['legal', 'smuggler', 'courier'] as const) {
    it(`${policy}: three days of play stay inside the intended corridor`, () => {
      const runs = [0, 1, 2, 3, 4, 5].map((i) => simulate(`guard-${i}`, policy, 3));
      for (const run of runs) {
        // Bots never send a command the rules reject: the view tells the truth about what is possible.
        expect(Object.keys(run.log).filter((k) => k.startsWith('rejected:'))).toEqual([]);
      }
      const median = (xs: number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
      const day1 = runs.map((r) => r.samples[0]!);
      const day3 = runs.map((r) => r.samples[2]!);
      // Energy system: a generous first day, then roughly three tanks a day.
      expect(median(day1.map((s) => s.jumps))).toBeGreaterThanOrEqual(3 * CONFIG.fuel.max);
      expect(median(day1.map((s) => s.jumps))).toBeLessThanOrEqual(40);
      expect(median(day3.map((s) => s.jumps)) - median(day1.map((s) => s.jumps))).toBeLessThanOrEqual(45);
      // Economy: growth, but no explosion.
      expect(median(day3.map((s) => s.worth))).toBeGreaterThan(CONFIG.startCredits * 3);
      expect(median(day3.map((s) => s.worth))).toBeLessThan(400_000);
      expect(median(day1.map((s) => s.level))).toBeLessThanOrEqual(7);
    });
  }
}, 60_000);
