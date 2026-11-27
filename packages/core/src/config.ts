import type { Rarity } from './content.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const CONFIG = {
  startCredits: 1_200,
  /** A quiet trading post on the ring: the first jumps are cheap ones. */
  startStation: 'lumen' as const,
  /** Cargo hold: base size, units per upgrade, and the price curve (cost of the next level). */
  hold: { base: 20, perLevel: 5, maxLevel: 6, costBase: 6_000, costGrowth: 2.2 },
  routesOffered: 3,
  startQuanta: 50,
  /**
   * A new captain flies for free until this level: the first session lasts until shop, posts and yard are open,
   * and only then does the tank start to pace the day.
   */
  fuel: { max: 5, regenMs: 20 * MINUTE, freeBelowLevel: 4 },
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
        odds: { standard: 0.722, rare: 0.216, elite: 0.056, legend: 0.005, singularity: 0.001 } satisfies Record<Rarity, number>,
        unlockMs: 30 * MINUTE,
      },
      premium: {
        cards: 5,
        currency: 'quanta' as 'credits' | 'quanta',
        price: 150,
        priceGrowth: 1,
        dailyLimit: 1,
        floor: 'elite' as Rarity,
        odds: { standard: 0.50, rare: 0.345, elite: 0.135, legend: 0.017, singularity: 0.003 } satisfies Record<Rarity, number>,
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
    forge: { standard: 60, rare: 250, elite: 1_200, legend: 8_000, singularity: 40_000 } satisfies Record<Rarity, number>,
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
  /** Trading posts earn while you are away, but their storage fills up: come back or lose the rest. */
  posts: {
    maxLevel: 5,
    cost: [15_000, 37_000, 94_000, 234_000, 586_000],
    perHour: [100, 220, 480, 1_000, 2_100],
    buildMs: [10 * MINUTE, 30 * MINUTE, 2 * HOUR, 6 * HOUR, 12 * HOUR],
    storageHours: 6,
  },
  /** One free spin per day. Segment sizes on screen are proportional to these weights. */
  wheel: [
    { weight: 28, reward: { credits: 400 }, scales: true },
    { weight: 18, reward: { credits: 1_200 }, scales: true },
    { weight: 5, reward: { credits: 4_000 }, scales: true },
    { weight: 20, reward: { shards: 40 } },
    { weight: 16, reward: { quanta: 5 } },
    { weight: 5, reward: { quanta: 25 } },
    { weight: 7, reward: { crate: 'standard' } },
    { weight: 1, reward: { crate: 'premium' } },
  ] as const,
  /** Daily offers. One of them is marked down. */
  shop: {
    cardPrice: { standard: 2_000, rare: 9_000, elite: 45_000, legend: 350_000, singularity: 2_000_000 } satisfies Record<Rarity, number>,
    legendChance: 0.05,
    shards: { amount: 150, price: 12_000 },
    quanta: { amount: 20, price: 30_000 },
    dealDiscount: 0.4,
  },
  /** Seasons run for six weeks, Monday to Sunday. Everything about a season is data. */
  season: {
    weeks: 6,
    names: ['Blockade von Kessin', 'Der Helix-Riss', 'Zenit unter Verdacht', 'Glut über Varn'],
    tiers: 40,
    xpPerTier: 1_800,
    /** The premium track is bought with quanta you earn by playing. */
    premiumPrice: 500,
    /** Share of rare, elite and legend pulls that come from the running season's edition instead of the permanent set. */
    cardShare: 0.15,
    /** Edition cards can be forged while their season runs, at this multiple of the usual price. */
    forgeMult: 1.5,
    /** Season album: cards of the edition you need, and what each step pays. The last step also gives a title and a paint. */
    album: {
      milestones: [4, 8, 12],
      rewards: [{ shards: 300 }, { crate: 'premium' }, { quanta: 80 }] as const,
    },
  },
  /**
   * Prestige: start over with a small ship and empty pockets, keep crew, cosmetics and league,
   * and sell a little better for good.
   */
  prestige: { level: 22, max: 5, saleBonus: 0.03, quanta: 150, shards: 500, paintPrice: 120 },
  /**
   * Weekly leagues of thirty. The twenty-nine rivals are simulated and say so on screen. Their scores depend
   * only on the league tier and the week, never on what the player does.
   */
  league: {
    size: 30,
    tiers: ['Bronze', 'Silber', 'Gold', 'Platin', 'Diamant'],
    /** Typical weekly trading profit of a rival per tier. */
    typicalScore: [120_000, 300_000, 550_000, 800_000, 1_100_000],
    spread: 0.55,
    promote: 7,
    relegate: 26,
  },
  /** Blockade run: every weekend, more customs, better black-market prices, and a milestone track. */
  weekend: {
    customsBonus: 0.08,
    fenceBonus: 0.10,
    points: { jump: 1, fightWin: 2, smuggled: 3 },
    milestones: [10, 25, 45, 70],
    rewards: [{ credits: 3_000 }, { shards: 150 }, { quanta: 25 }, { crate: 'premium' }] as const,
  },
  /**
   * Convoys: crew that is not on the bridge flies timed contracts. Four contracts a day, two at a time.
   * `need` is the team strength for certain success. Three ordinary cards bring about 165, so the long
   * contracts want strong crew of the right faction and role.
   */
  convoy: {
    slots: 2,
    crew: 3,
    daily: [0, 0, 1, 2],
    kinds: [
      { hours: 1, need: 170, credits: 300, creditsPerLevel: 90, shards: 0, quanta: 0, xp: 30 },
      { hours: 4, need: 250, credits: 900, creditsPerLevel: 260, shards: 30, quanta: 0, xp: 80 },
      { hours: 8, need: 330, credits: 1_600, creditsPerLevel: 450, shards: 0, quanta: 6, xp: 150 },
    ],
    /** Every captain level raises what a contract asks for. Levelling up reserve crew keeps pace. */
    needPerLevel: 0.035,
    factionBonus: 1.25,
    roleBonus: 1.15,
    minChance: 0.15,
    /** Share of credits and experience a failed convoy still brings home. */
    failShare: 0.3,
  },
  /** Welcome-back gift after this many days away. */
  comeback: { days: 3, creditsPerLevel: 1_500, quanta: 20 },
  /**
   * Card auctions against simulated traders. Every lot has a rival whose highest bid is fixed when the lot
   * appears and never reacts to the player: an honest second-price auction with a hidden competitor.
   */
  auction: {
    /** One lot per slot, running back to back. Minutes per lot. */
    slotMinutes: [10, 10, 30, 30, 120, 120, 360, 360],
    rarityWeights: { standard: 36, rare: 41, elite: 20.3, legend: 2.5, singularity: 0.2 } satisfies Record<Rarity, number>,
    /** Estimated value of a card at the low end of its rarity. Rating adds up to half on top. */
    value: { standard: 1_200, rare: 6_000, elite: 30_000, legend: 250_000, singularity: 1_500_000 } satisfies Record<Rarity, number>,
    startShare: 0.3,
    /** The rival's highest bid as a share of the estimate: between rivalMin and rivalMin + rivalRange. */
    rivalMin: 0.55,
    rivalRange: 0.7,
    buyNowShare: 1.35,
    maxBids: 4,
    maxListings: 3,
    /** Share of the sale price the house keeps. */
    fee: 0.05,
    listMinutes: [30, 120, 360],
    /** Longer listings reach more buyers. */
    listFactor: [0.9, 1, 1.08],
    offerMin: 0.6,
    offerRange: 0.55,
  },
  /** Sealed wreck containers: a gamble with credits, inside the fiction. Odds are shown before buying. */
  salvage: {
    chance: 0.35,
    basePrice: 600,
    weights: [1, 2, 4],
    outcomes: [
      { weight: 40, kind: 'scrap', factor: 0.25 },
      { weight: 27, kind: 'credits', factor: 1.6 },
      { weight: 6, kind: 'jackpot', factor: 4 },
      { weight: 15, kind: 'shards', factor: 1 / 40 },
      { weight: 10, kind: 'crate', factor: 0 },
      { weight: 2, kind: 'premium', factor: 0 },
    ] as const,
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
    /**
     * How much of a price shift is left after a jump. With fixed lanes a market you have just flooded
     * stays flooded for a while: shuttling between two stations pays less than a round trip.
     */
    driftKeep: 0.85,
    driftNoise: 0.075,
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
    detect: { base: 0.70, tec: 0.25, smg: 0.25 },
    /** Fine for a failed bribe or break-through with clean cargo. */
    flatFine: 200,
    fineShare: 0.15,
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
    heatSellBonus: 0.17,
    heatCustoms: 0.04,
    heatDetect: 0.03,
    /** Fences pay less than the open market and charge more. */
    fenceSell: 0.9,
    fenceSellCrew: 0.05,
    fenceBuy: 1.15,
    /** Units a fence will move before needing time. */
    fenceCap: 30,
    fenceRefill: 8,
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
  /**
   * A crisis somewhere in the sector: one category sells for more there until the demand is met.
   * Other traders deliver too: the demand drops by a fixed, visible amount with every jump you make,
   * and by every unit you sell there yourself. Nothing about it is hidden or random once it has started.
   */
  marketEvent: {
    chance: 0.3,
    /** How many can run at once. */
    max: 2,
    /** A new crisis starts at least this many jumps from where you are. */
    minHops: 2,
    multMin: 1.5,
    multRange: 0.6,
    /** Units other traders deliver per jump: between drainMin and drainMin + drainRange. */
    /** How big the demand is: this many units per jump of its intended life, between drainMin and drainMin + drainRange. */
    drainMin: 5,
    drainRange: 4,
    /** It lasts as many jumps as the direct way takes, plus this much slack: between slackMin and slackMin + slackRange. */
    slackMin: 1.5,
    slackRange: 2,
    /** Small traders deliver a little with every jump you make: between trickleMin and trickleMin + trickleRange. */
    trickleMin: 2,
    trickleRange: 1,
    /**
     * Rivals: named traders on their way to the crisis. They move one lane per jump you make and deliver
     * their whole lot on arrival. Where they are and what they carry is on the chart.
     */
    rivalsMin: 2,
    rivalsRange: 1,
    /** A rival's lot as a share of the demand: between rivalShareMin and rivalShareMin + rivalShareRange. */
    rivalShareMin: 0.2,
    rivalShareRange: 0.15,
    /** A direct run from where you are when it starts always finds at least this share of the demand. */
    leftMin: 0.3,
  },
  /**
   * What a new captain is shown when, by level. Nothing here changes a rule: every system runs from the
   * first minute and what it earns waits. The client only opens the way in once the level is reached,
   * so the first hour has three things on screen instead of fifteen. The freight board follows `order.level`.
   */
  unlock: { daily: 2, posts: 3, shop: 3, yard: 4, season: 4, salvage: 4, auction: 5, league: 5, convoys: 6 },
  /**
   * Delivery orders: a station wants a fixed amount of a good within a number of jumps and pays a fixed
   * price per unit, above its market. You leave a deposit and get it back on delivery. While the order
   * is open the station has none of the good to sell, so the cargo has to come from somewhere else.
   */
  order: {
    /** The board opens once a captain can afford a lot. */
    level: 3,
    /** New offers at every station you dock at. Offers you leave behind are gone. */
    offers: 3,
    maxActive: 2,
    minHops: 2,
    maxHops: 4,
    /** Jumps on top of the direct way: between slackMin and slackMin + slackRange. */
    slackMin: 1,
    slackRange: 1,
    /** Share of your cargo hold: between holdMin and holdMin + holdRange. */
    holdMin: 0.4,
    holdRange: 0.4,
    /** Price per unit over the plain market price at the destination: premium + premiumPerHop per jump of the direct way. */
    premium: 1.35,
    premiumPerHop: 0.09,
    /** Share of the price rise a lot of this size causes when bought in one place that the order pays on top. */
    bulk: 0.5,
    /** Share of the total pay you put down when you accept. */
    deposit: 0.1,
    /**
     * Some orders are for goods that are banned where they are wanted. They pay more, and customs on the
     * way can end them. They are only offered where the lot can be loaded legally.
     */
    hotChance: 0.3,
    hotBonus: 1.3,
  },
  shardsPerDuplicate: {
    standard: 5,
    rare: 20,
    elite: 80,
    legend: 400,
    singularity: 2_000,
  } satisfies Record<Rarity, number>,
} as const;
