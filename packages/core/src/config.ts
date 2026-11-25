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
    freeIntervalMs: 12 * HOUR,
    /** Free crates wait for you, but only this many: come back or lose the next one. */
    freeMax: 2,
    tiers: {
      standard: {
        cards: 3,
        currency: 'credits' as 'credits' | 'quanta',
        price: 4_000,
        /** Every purchase on the same day multiplies the price. Wealth buys more, but never the whole set at once. */
        priceGrowth: 4,
        dailyLimit: 4,
        /** At least one card of this rarity or better. */
        floor: 'rare' as Rarity,
        /** Base odds per card, before the upgrade moment. */
        odds: { standard: 0.72, rare: 0.215, elite: 0.056, legend: 0.008, singularity: 0.001 } satisfies Record<Rarity, number>,
        unlockMs: 30 * MINUTE,
      },
      premium: {
        cards: 5,
        currency: 'quanta' as 'credits' | 'quanta',
        price: 150,
        priceGrowth: 1,
        dailyLimit: 1,
        floor: 'elite' as Rarity,
        odds: { standard: 0.50, rare: 0.34, elite: 0.135, legend: 0.022, singularity: 0.003 } satisfies Record<Rarity, number>,
        unlockMs: 3 * HOUR,
      },
    },
    /** Upgrade moment: chance that a card (below Legend) lands one rarity higher. Part of the published odds. */
    bumpChance: 0.04,
    /** Crates without an Elite+ before one is forced. */
    pityElite: 10,
    /** Crates without a Legend+ before one is forced. */
    pityLegend: 60,
    /** Earned crates wait in slots and must be unsealed. A full hangar loses new loot. */
    slots: 4,
    speedUpMinutesPerQuantum: 10,
    speedUpFreeMs: 3 * MINUTE,
    /** Chance that a won pirate fight drops a crate. */
    lootChance: 0.15,
  },
  cards: {
    maxLevel: 5,
    /** Every level above 1 adds this to all of a card's stats. */
    statPerLevel: 2,
    upgradeBase: { standard: 20, rare: 50, elite: 150, legend: 500, singularity: 1_500 } satisfies Record<Rarity, number>,
    /** Cost multiplier for level 2, 3, 4 and 5. */
    upgradeMult: [1, 2, 3, 5],
    /** Shards to forge a card you do not own yet: the planned way to finish an album. */
    forge: { standard: 60, rare: 200, elite: 800, legend: 4_000, singularity: 20_000 } satisfies Record<Rarity, number>,
  },
  daily: {
    /** Days roll over at midnight Central European Time (no daylight saving). */
    dayOffsetMs: 1 * HOUR,
    missions: 3,
    chest: { crate: 'standard', quanta: 10 } as const,
  },
  /** Login calendar: one claim per day, seven steps, then it starts again. */
  calendar: [
    { credits: 500 },
    { shards: 40 },
    { quanta: 10 },
    { credits: 2_000 },
    { freeze: 1 },
    { quanta: 20 },
    { crate: 'premium' },
  ] as const,
  streak: {
    /** Sale price bonus per day of the streak. */
    bonusPerDay: 0.01,
    maxBonus: 0.10,
    freezePrice: 40,
    maxFreezes: 2,
  },
  album: {
    milestones: [0.25, 0.5, 0.75, 1] as const,
    rewards: [
      { credits: 1_500, shards: 30 },
      { crate: 'standard' },
      { quanta: 20, shards: 120 },
      { crate: 'premium' },
    ] as const,
    /** Permanent sale price bonus per completed album. */
    bonusPerAlbum: 0.02,
  },
  levelUpQuanta: 5,
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
