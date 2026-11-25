import type { Rarity } from './content.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const CONFIG = {
  startCredits: 1_200,
  startStation: 'meridian' as const,
  /** Cargo hold: base size, units per upgrade, and the price curve (cost of the next level). */
  hold: { base: 20, perLevel: 5, maxLevel: 6, costBase: 6_000, costGrowth: 2.2 },
  routesOffered: 3,
  startQuanta: 50,
  fuel: { max: 5, regenMs: 20 * MINUTE },
  crate: {
    cards: 3,
    price: 2_500,
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
    xpPerJump: 20,
    /** Courier mail pays a little on every arrival, so nobody is ever stuck with nothing. */
    courierBase: 60,
    courierPerLevel: 15,
    /** XP for a profitable sale grows with the logarithm of the profit: big deals feel good, but cannot buy levels. */
    xpPerSaleLog: 12,
  },
  market: {
    /** Station price profiles are compressed with this exponent: 1 = as authored, 0 = no differences. */
    spread: 0.5,
    /** Each unit traded moves the local price by this share. Large lots pay for their size. */
    impact: 0.010,
    driftKeep: 0.6,
    driftNoise: 0.12,
    driftLimit: 0.5,
    /** Lot size used for the profit hints on routes. */
    hintLot: 10,
  },
  /** Base chance plus the part the crew can add (0 to 1 crew bonus). */
  encounter: {
    fight: { base: 0.45, crew: 0.30 },
    flee: { base: 0.50, crew: 0.30 },
    breakThrough: { base: 0.35, crew: 0.30 },
    bribe: { base: 0.50, crew: 0.25 },
    /** Chance that a scan finds banned cargo. Technician and smuggler lower it. */
    detect: { base: 0.80, tec: 0.25, smg: 0.25 },
    /** Fine for a failed bribe or break-through with clean cargo. */
    flatFine: 200,
    fineShare: 0.20,
    bribeBase: 150,
    bribeShare: 0.15,
    tributeShare: 0.12,
    tributeMin: 100,
    lossOnLostFight: 0.30,
    lossOnFailedFlee: 0.25,
    lootMin: 300,
    lootRange: 700,
  },
  deck: {
    /** Share of a card's stat that counts when it sits in a seat that is not its role. */
    offRole: 0.75,
    /** Bonus per other seated card of the same faction. */
    chemPerLink: 0.04,
  },
  smuggling: {
    heatMax: 5,
    /** Hot cargo: every jump carried raises the sale price and the risk. */
    heatSellBonus: 0.08,
    heatCustoms: 0.04,
    heatDetect: 0.03,
    /** Fences pay less than the open market and charge more. */
    fenceSell: 0.86,
    fenceSellCrew: 0.05,
    fenceBuy: 1.15,
    /** Units a fence will move before needing time. */
    fenceCap: 12,
    fenceRefill: 4,
    fenceClosedAtWanted: 4,
  },
  wanted: {
    max: 5,
    customsPerStar: 0.07,
    fineMult: 0.3,
    bribePenalty: 0.05,
    /** Jumps until one star cools off. */
    coolJumps: 3,
    payOffPerStar: 400,
  },
  marketEvent: { chance: 0.25, jumps: 3, multMin: 1.5, multRange: 0.5 },
  shardsPerDuplicate: {
    standard: 5,
    rare: 20,
    elite: 80,
    legend: 400,
    singularity: 2_000,
  } satisfies Record<Rarity, number>,
} as const;
