import type { Rarity } from './content.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const CONFIG = {
  startCredits: 3_000,
  startStation: 'meridian' as const,
  cargoCap: 20,
  routesOffered: 3,
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
  travel: {
    /** Encounter chance per level of the destination (0 to 3). */
    piratesPerLevel: 0.11,
    customsPerLevel: 0.13,
    /** Share of the list price you get when selling, before crew bonus. */
    sellFactor: 0.92,
    sellFactorCrew: 0.05,
    xpPerJump: 15,
    xpPerProfit: 1 / 40,
  },
  /** Base chance plus the part the crew can add (0 to 1 crew bonus). */
  encounter: {
    fight: { base: 0.45, crew: 0.30 },
    flee: { base: 0.50, crew: 0.30 },
    breakThrough: { base: 0.35, crew: 0.30 },
    bribe: { base: 0.70, crew: 0.25 },
    /** Chance that a scan finds contraband. Crew lowers it. */
    detect: { base: 0.80, crew: 0.45 },
    fineShare: 0.10,
    bribeBase: 100,
    bribeShare: 0.10,
    tributeShare: 0.12,
    tributeMin: 100,
    lossOnLostFight: 0.40,
    lossOnFailedFlee: 0.25,
    lootMin: 150,
    lootRange: 450,
  },
  shardsPerDuplicate: {
    standard: 5,
    rare: 20,
    elite: 80,
    legend: 400,
    singularity: 2_000,
  } satisfies Record<Rarity, number>,
} as const;
