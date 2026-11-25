import type { Rarity } from './content.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const CONFIG = {
  startCredits: 5_000,
  startQuanta: 50,
  fuel: { max: 5, regenMs: 20 * MINUTE },
  crate: {
    cards: 3,
    price: 500,
    freeIntervalMs: 4 * HOUR,
    /** Base odds per card slot. Published to the player. */
    odds: {
      standard: 0.70,
      rare: 0.22,
      elite: 0.065,
      legend: 0.014,
      singularity: 0.001,
    } satisfies Record<Rarity, number>,
    /** At least one card of this rarity or better per crate. */
    guaranteed: 'rare' as Rarity,
    /** Crates without an Elite+ before one is forced. */
    pityElite: 10,
    /** Crates without a Legend+ before one is forced. */
    pityLegend: 60,
  },
  shardsPerDuplicate: {
    standard: 5,
    rare: 20,
    elite: 80,
    legend: 400,
    singularity: 2_000,
  } satisfies Record<Rarity, number>,
} as const;
