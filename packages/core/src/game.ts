import {
  bidStep, cardValue, lotAt, lotByKey, offerNow, rivalNow, winningPrice,
  type AuctionResult, type Listing,
} from './auction.ts';
import { CONFIG } from './config.ts';
import {
  CARD_BY_ID, CARDS_BY_RARITY, EDITION_SIZE, RARITIES, rarityRank, seasonCards, seasonOf,
  type CardDef, type FactionId, type Rarity, type RoleId,
} from './content.ts';
import {
  albumInfo, CRATE_TIERS, cratePrice, dayEndsAt, dayIndex, effectiveOdds, liveStreak, manifestCandidates, minutesCost, pickWeighted,
  postCap, postPerHour, rollManifests, rollMissions, rollOffers, settlePost, speedUpCost, streakBonus, streakStatus, upgradeCost, wheelReward,
  type AlbumView, type CrateTier, type Manifest, type Mission, type Offer, type Post, type Reward, type SalvageKind, type SalvageLot,
  type Slot, type StreakState, type StreakStatus,
} from './meta.ts';
import {
  convoyChance, convoyPayout, MODULE_BY_ID, MODULE_MAX, newFleet, rigOf, rollConvoys, SHIP_BY_ID,
  type Convoy, type ConvoyOffer, type FleetState, type ModuleId, type Rig, type ShipId,
} from './fleet.ts';
import { PAINT_BY_ID, PAINTS, titleList, type Facts } from './profile.ts';
import { nextFloat, pick, seedRng, type RngState } from './rng.ts';
import {
  charterReward, charterTier, leagueMove, leagueReward, seasonEndsAt, seasonIndex, seasonName, standings, weekEndsAt,
  weekendActive, weekendStartsAt, weekIndex, weekStartsAt, type Standing,
} from './season.ts';
import {
  GOOD_BY_ID, GOODS, isBanned, STATION_BY_ID, STATIONS, stationMod,
  type Category, type GoodDef, type GoodId, type StationId,
} from './world.ts';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const STATE_VERSION = 10;

export type EncounterKind = 'pirates' | 'customs';
export type EncounterChoice = 'fight' | 'flee' | 'pay' | 'submit' | 'bribe' | 'breakThrough';
export const SEATS: readonly RoleId[] = ['pilot', 'trader', 'tech', 'gunner', 'smuggler'];
const FACTION_IDS: readonly FactionId[] = ['helix', 'tessera', 'asche', 'zenit'];

/** `heat`: jumps this lot has been carried. Only matters for goods that are banned somewhere. */
export interface CargoLot { qty: number; avgCost: number; heat: number }
export interface MarketEvent { stationId: StationId; category: Category; mult: number; jumpsLeft: number }

/** Authoritative state. Lives on the server side of the GameService boundary. */
export interface GameState {
  version: typeof STATE_VERSION;
  createdAt: number;
  rng: { crate: RngState; market: RngState; travel: RngState; daily: RngState; auction: RngState; convoy: RngState; season: RngState };
  profile: { level: number; xp: number };
  wallet: { credits: number; quanta: number; shards: number };
  fuel: { amount: number; updatedAt: number };
  /** `freeAt`: when the next free crate arrives, while there is room for it. */
  crates: { freeStock: number; freeAt: number; opened: number; sinceElite: number; sinceLegend: number };
  /** Earned crates waiting to be unsealed. */
  slots: Slot[];
  collection: Record<string, number>;
  /** Upgrade level per card. Missing means level 1. */
  cardLevels: Record<string, number>;
  deck: Record<RoleId, string | null>;
  daily: {
    day: number; missions: Mission[]; chestClaimed: boolean; bought: Record<CrateTier, number>;
    offers: Offer[]; manifests: Manifest[]; wheelSpun: boolean; convoys: ConvoyOffer[];
  };
  /** Ships, modules and what is built into the active ship. */
  fleet: FleetState;
  /** Convoys on their way. Their crew cannot sit on the bridge. */
  convoys: Convoy[];
  /** Auction house: the secret seed behind all lots, open bids (lot key to limit, held in escrow), and own listings. */
  auction: { seed: string; bids: Record<string, number>; bought: string[]; listings: Listing[]; results: AuctionResult[] };
  /** Current season: charter progress. Resets when a new season starts. */
  season: { index: number; xp: number; premium: boolean; claimedFree: number; claimedPremium: number; album: number };
  /** Times the captain has started over. Each one sells a little better for good. */
  prestige: number;
  /** Looks: chosen title and ship paint, bought paints, completed season albums, and the three cards on show. */
  cosmetics: { title: string; paint: string; owned: string[]; seasons: number[]; showcase: string[] };
  /** Weekly league. `last` is the finished week waiting to be collected. */
  league: {
    seed: string; tier: number; week: number; score: number;
    last: { week: number; tier: number; rank: number; moved: -1 | 0 | 1; reward: Reward } | null;
  };
  weekend: { week: number; points: number; claimed: number };
  /** Last day a command arrived, and whether a welcome-back gift is waiting. */
  lastActiveDay: number;
  comeback: boolean;
  /** True during the weekend event. Kept in state so every price and chance sees the same answer. */
  blockade: boolean;
  /** Trading posts by station. */
  posts: Partial<Record<StationId, Post>>;
  /** A sealed wreck container on offer at the current station, if any. */
  salvage: SalvageLot | null;
  calendar: { lastDay: number; step: number };
  streak: StreakState;
  /** Claimed milestones per faction album. */
  albums: Record<FactionId, number>;
  location: StationId;
  /** Cargo hold upgrade level. */
  hold: number;
  cargo: Partial<Record<GoodId, CargoLot>>;
  /** Price drift per station and good, roughly -0.4 to 0.4. */
  market: Record<StationId, Record<GoodId, number>>;
  /** Units each station's fence will still move. */
  fence: Record<StationId, number>;
  event: MarketEvent | null;
  wanted: Record<FactionId, { level: number; cool: number }>;
  routes: StationId[];
  pending: { to: StationId; kind: EncounterKind } | null;
  stats: { jumps: number; profit: number; caught: number; smuggled: number; convoys: number; bestLeague: number };
}

// ---------------------------------------------------------------------------
// Client view
// ---------------------------------------------------------------------------

export interface MarketRow {
  goodId: GoodId;
  /** Price of the next unit bought. */
  buy: number;
  /** Price of the next unit sold, for the lot you hold (includes its heat bonus). */
  sell: number;
  /** Price relative to the good's galaxy-wide base. */
  level: number;
  /** Banned here: only the fence trades it, at worse prices and limited volume. */
  channel: 'open' | 'fence';
  /** Inputs for `quote`: list price now, its change per unit traded, and the channel factors. */
  list: number;
  step: number;
  buyFactor: number;
  sellFactor: number;
}

/**
 * Total for trading `qty` units. Every unit moves the price a little, so a
 * large lot costs more to buy and earns less to sell than the first-unit price
 * suggests. Server and client both use this function, so quotes always match.
 */
export function quote(row: Pick<MarketRow, 'list' | 'step' | 'buyFactor' | 'sellFactor'>, side: 'buy' | 'sell', qty: number): number {
  let total = 0;
  for (let i = 0; i < qty; i++) {
    total += side === 'buy'
      ? Math.max(1, Math.round((row.list + row.step * i) * row.buyFactor))
      : Math.max(1, Math.floor(Math.max(0, row.list - row.step * i) * row.sellFactor));
  }
  return total;
}
export interface RouteView {
  stationId: StationId;
  fuel: number;
  /** Chance of each encounter on this jump with the current cargo. */
  customsChance: number;
  piratesChance: number;
  wanted: number;
  event: { category: Category; mult: number; jumpsLeft: number } | null;
  /** Goods that currently sell there for more than they cost here. */
  hints: { goodId: GoodId; pct: number; fence: boolean }[];
}
export interface EncounterOption { id: EncounterChoice; chance: number; cost: number }
export interface CrewBonus { nav: number; hdl: number; tec: number; kmp: number; smg: number }
export type BonusKey = keyof CrewBonus;
export interface SeatView { cardId: string; value: number; links: number; onRole: boolean }

export interface PostView {
  stationId: StationId; level: number; perHour: number; stored: number; cap: number;
  /** When the storage is full, or null while it is full already or under construction. */
  fullAt: number | null;
  /** End of construction, or null when the post is running. */
  readyAt: number | null;
  speedUpCost: number;
}

export interface LotView {
  key: string; cardId: string; endsAt: number; estimate: number;
  /** Highest bid right now. */
  price: number;
  /** Smallest bid that would be accepted. */
  minBid: number;
  buyNow: number;
  /** Your limit on this lot, if you bid. */
  yourMax: number | null;
  leading: boolean;
  /** Already bought out by you: gone until the next lot. */
  gone: boolean;
}

export interface SlotView { tier: CrateTier; state: 'sealed' | 'unlocking' | 'ready'; readyAt: number | null; unlockMs: number; speedUpCost: number }

/** What the client is allowed to see. No RNG state, no prices of places you are not at. */
export interface ClientView {
  serverTime: number;
  profile: { level: number; xp: number };
  wallet: { credits: number; quanta: number; shards: number };
  fuel: { amount: number; max: number; nextAt: number | null; /** When the tank is full, or null if it is. */ fullAt: number | null };
  crates: {
    free: { stock: number; max: number; intervalMs: number; nextAt: number | null };
    tiers: Record<CrateTier, { currency: 'credits' | 'quanta'; price: number; nextPrice: number; cards: number; floor: Rarity; odds: Record<Rarity, number>; unlockMs: number; dailyLimit: number; leftToday: number }>;
    opened: number;
    pityElite: { current: number; max: number };
    pityLegend: { current: number; max: number };
  };
  slots: SlotView[];
  slotCap: number;
  collection: Record<string, number>;
  cardLevels: Record<string, number>;
  daily: {
    endsAt: number; missions: Mission[]; chest: { done: number; total: number; claimed: boolean; reward: Reward };
    offers: Offer[];
    manifests: (Manifest & { have: number })[];
    wheel: { available: boolean; segments: { weight: number; reward: Reward }[] };
  };
  posts: {
    list: PostView[];
    /** What can be built at the current station, or null at the top level. */
    next: { level: number; cost: number; buildMs: number; perHour: number } | null;
    stored: number;
  };
  auction: {
    lots: LotView[];
    listings: { cardId: string; min: number; endsAt: number; offer: number | null }[];
    /** Finished auctions the player has not looked at yet. */
    results: AuctionResult[];
    openBids: number;
    maxBids: number;
    maxListings: number;
    fee: number;
    listMinutes: readonly number[];
  };
  season: {
    index: number; name: string; endsAt: number;
    xp: number; xpPerTier: number; tier: number; tiers: number;
    premium: boolean; premiumPrice: number;
    claimedFree: number; claimedPremium: number;
    /** Rewards that one tap would collect now. */
    claimable: number;
    /** Premium rewards already earned that buying the charter would unlock at once. */
    waitingPremium: number;
  };
  league: {
    tier: number; tierName: string; endsAt: number; score: number; rank: number;
    standings: Standing[];
    promote: number; relegate: number;
    last: GameState['league']['last'];
  };
  weekend: {
    active: boolean; startsAt: number; endsAt: number; points: number;
    milestones: { at: number; reward: Reward; claimed: boolean }[];
    claimable: number;
  };
  comeback: Reward | null;
  seasonAlbum: { owned: number; total: number; claimed: number; next: { need: number; reward: Reward } | null; claimable: boolean; complete: boolean; cardShare: number };
  captain: {
    titleId: string; title: string; paint: string; showcase: string[];
    titles: { id: string; name: string; hint: string; unlocked: boolean }[];
    paints: { id: string; name: string; tone: string | null; price: number | null; hint: string; unlocked: boolean }[];
    prestige: number; prestigeMax: number; prestigeLevel: number; prestigeBonus: number; canPrestige: boolean;
    facts: Facts;
  };
  fleet: { active: ShipId; owned: ShipId[]; modules: Partial<Record<ModuleId, number>>; fitted: ModuleId[]; rig: Rig };
  convoys: {
    slots: number; crew: number;
    running: (Convoy & { done: boolean; rushCost: number })[];
    offers: ConvoyOffer[];
    /** Cards that are away and cannot take a seat. */
    busy: string[];
  };
  salvage: (SalvageLot & { outcomes: { kind: SalvageKind; weight: number; credits: number; shards: number }[] }) | null;
  calendar: { step: number; claimable: boolean; rewards: readonly Reward[] };
  streak: { count: number; best: number; bonus: number; status: StreakStatus; freezes: number; maxFreezes: number; freezePrice: number; endsAt: number };
  albums: Record<FactionId, AlbumView>;
  /** Permanent and streak bonuses on every sale, already included in market prices. */
  saleBonus: { streak: number; album: number; prestige: number };
  /** Things waiting to be collected, per tab. Drives the red dots. */
  badges: { station: number; market: number; hangar: number; daily: number; deck: number };
  deck: { seats: Record<RoleId, SeatView | null>; chem: number };
  crew: CrewBonus;
  location: StationId;
  cargo: { cap: number; used: number; items: Partial<Record<GoodId, CargoLot>> };
  /** Next hold upgrade, or null when fully built out. */
  holdUpgrade: { level: number; cost: number; cap: number } | null;
  market: MarketRow[];
  fence: { left: number; cap: number; closed: boolean };
  event: MarketEvent | null;
  wanted: Record<FactionId, number>;
  /** Cost to buy one star off at this station, if you are wanted here. */
  payOff: number | null;
  routes: RouteView[];
  encounter: { to: StationId; kind: EncounterKind; hasContraband: boolean; options: EncounterOption[] } | null;
  stats: { jumps: number; profit: number; caught: number; smuggled: number; convoys: number; bestLeague: number };
}

// ---------------------------------------------------------------------------
// Commands and events
// ---------------------------------------------------------------------------

export type Command =
  | { type: 'ClaimFreeCrate' }
  | { type: 'ClaimSeasonAlbum' }
  | { type: 'SetTitle'; title: string }
  | { type: 'SetPaint'; paint: string }
  | { type: 'BuyPaint'; paint: string }
  | { type: 'SetShowcase'; cards: string[] }
  | { type: 'Prestige' }
  | { type: 'BuyShip'; ship: ShipId }
  | { type: 'SelectShip'; ship: ShipId }
  | { type: 'BuyModule'; module: ModuleId }
  | { type: 'FitModule'; module: ModuleId }
  | { type: 'UnfitModule'; module: ModuleId }
  | { type: 'SendConvoy'; offer: number; cards: string[] }
  | { type: 'ClaimConvoy'; slot: number }
  | { type: 'RushConvoy'; slot: number }
  | { type: 'BuyCrate'; tier: CrateTier }
  | { type: 'StartUnlock'; slot: number }
  | { type: 'OpenSlot'; slot: number }
  | { type: 'SpeedUp'; slot: number }
  | { type: 'UpgradeCard'; cardId: string }
  | { type: 'ForgeCard'; cardId: string }
  | { type: 'ClaimMission'; index: number }
  | { type: 'ClaimChest' }
  | { type: 'ClaimCalendar' }
  | { type: 'BuyFreeze' }
  | { type: 'ClaimAlbum'; faction: FactionId }
  | { type: 'BuildPost' }
  | { type: 'SpeedUpPost'; stationId: StationId }
  | { type: 'CollectPosts' }
  | { type: 'SpinWheel' }
  | { type: 'BuyOffer'; index: number }
  | { type: 'SubmitManifest'; index: number }
  | { type: 'BuySalvage' }
  | { type: 'PlaceBid'; lot: string; max: number }
  | { type: 'BuyNow'; lot: string }
  | { type: 'ListCard'; cardId: string; min: number; duration: number }
  | { type: 'AckAuctions' }
  | { type: 'ClaimCharter' }
  | { type: 'BuyCharter' }
  | { type: 'ClaimLeague' }
  | { type: 'ClaimWeekend' }
  | { type: 'ClaimComeback' }
  | { type: 'Buy'; goodId: GoodId; qty: number }
  | { type: 'Sell'; goodId: GoodId; qty: number }
  | { type: 'Jump'; to: StationId }
  | { type: 'Encounter'; choice: EncounterChoice }
  | { type: 'SetSeat'; seat: RoleId; cardId: string | null }
  | { type: 'AutoDeck' }
  | { type: 'PayOff' }
  | { type: 'UpgradeHold' };

export interface Pull {
  cardId: string;
  rarity: Rarity;
  isNew: boolean;
  shards: number;
  /** Set when the upgrade moment hit: the card was rolled one rarity lower and rose. */
  upgradedFrom?: Rarity;
}

export type RejectReason =
  | 'free_crate_not_ready' | 'not_enough_credits' | 'unknown_command'
  | 'no_cargo_space' | 'not_in_cargo' | 'no_fuel' | 'no_such_route'
  | 'encounter_pending' | 'no_encounter' | 'invalid_choice'
  | 'fence_limit' | 'fence_closed' | 'card_not_owned' | 'not_wanted' | 'max_level'
  | 'no_such_slot' | 'slot_busy' | 'slot_not_ready' | 'not_enough_quanta' | 'not_enough_shards' | 'not_claimable'
  | 'daily_limit' | 'already_owned'
  | 'no_such_lot' | 'bid_too_low' | 'too_many_bids' | 'too_many_listings' | 'no_spare_copy'
  | 'season_over' | 'level_too_low' | 'not_owned' | 'no_free_slot' | 'card_busy' | 'invalid_team' | 'no_such_contract';

export type GameEvent =
  | { type: 'CrateOpened'; source: 'free' | 'bought' | 'slot' | 'reward'; tier: CrateTier; pulls: Pull[] }
  | { type: 'CrateEarned'; tier: CrateTier }
  | { type: 'CrateLost'; tier: CrateTier }
  | { type: 'RewardGranted'; reward: Reward }
  | { type: 'CardUpgraded'; cardId: string; level: number }
  | { type: 'CardForged'; cardId: string }
  | { type: 'PostBuilt'; stationId: StationId; level: number }
  | { type: 'PostsCollected'; amount: number }
  | { type: 'WheelSpun'; index: number; reward: Reward }
  | { type: 'OfferBought'; index: number }
  | { type: 'ManifestDone'; index: number; cardIds: string[] }
  | { type: 'SalvageOpened'; kind: SalvageKind; credits: number; shards: number }
  | { type: 'BidPlaced'; lot: string; max: number }
  | { type: 'AuctionBought'; cardId: string; price: number }
  | { type: 'CardListed'; cardId: string }
  | { type: 'CharterClaimed'; rewards: number; total: Reward; crates: number }
  | { type: 'CharterBought' }
  | { type: 'SeasonAlbumClaimed'; step: number; complete: boolean }
  | { type: 'CosmeticsChanged' }
  | { type: 'PaintBought'; paint: string }
  | { type: 'Prestiged'; rank: number }
  | { type: 'ShipBought'; ship: ShipId }
  | { type: 'ShipSelected'; ship: ShipId }
  | { type: 'ModuleBought'; module: ModuleId; level: number }
  | { type: 'ModulesChanged' }
  | { type: 'ConvoySent'; hours: number; chance: number }
  | { type: 'ConvoyReturned'; success: boolean; reward: Reward; xp: number }
  | { type: 'LeagueClaimed'; rank: number; moved: -1 | 0 | 1; tier: number }
  | { type: 'StreakChanged'; count: number; kind: 'started' | 'extended' | 'saved' | 'lost'; previous: number }
  | { type: 'Bought'; goodId: GoodId; qty: number; cost: number }
  | { type: 'Sold'; goodId: GoodId; qty: number; revenue: number; profit: number }
  | { type: 'JumpStarted'; from: StationId; to: StationId }
  | { type: 'EncounterStarted'; kind: EncounterKind }
  | {
    type: 'EncounterResolved';
    kind: EncounterKind;
    choice: EncounterChoice;
    success: boolean;
    creditsDelta: number;
    /** Units the smuggling stash kept out of sight. */
    hidden: number;
    lost: Partial<Record<GoodId, number>>;
    /** Stars gained with the destination's faction. */
    wantedDelta: number;
  }
  | { type: 'Arrived'; stationId: StationId; courier: number }
  | { type: 'WantedChanged'; faction: FactionId; level: number }
  | { type: 'MarketEventStarted'; event: MarketEvent }
  | { type: 'DeckChanged' }
  | { type: 'HoldUpgraded'; level: number; cap: number }
  | { type: 'LevelUp'; level: number }
  | { type: 'CommandRejected'; reason: RejectReason };

type Result = { state: GameState; events: GameEvent[] };

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function createInitialState(seed: string, now: number): GameState {
  const state: GameState = {
    version: STATE_VERSION,
    createdAt: now,
    rng: { crate: seedRng(`${seed}:crate`), market: seedRng(`${seed}:market`), travel: seedRng(`${seed}:travel`), daily: seedRng(`${seed}:daily`), auction: seedRng(`${seed}:auction`), convoy: seedRng(`${seed}:convoy`), season: seedRng(`${seed}:season`) },
    profile: { level: 1, xp: 0 },
    wallet: { credits: CONFIG.startCredits, quanta: CONFIG.startQuanta, shards: 0 },
    fuel: { amount: CONFIG.fuel.max, updatedAt: now },
    // First free crate is ready immediately: generous start.
    crates: { freeStock: 1, freeAt: now + CONFIG.crate.freeIntervalMs, opened: 0, sinceElite: 0, sinceLegend: 0 },
    slots: [],
    collection: {},
    cardLevels: {},
    deck: { pilot: null, trader: null, tech: null, gunner: null, smuggler: null },
    daily: { day: -1, missions: [], chestClaimed: false, bought: { standard: 0, premium: 0 }, offers: [], manifests: [], wheelSpun: false, convoys: [] },
    auction: { seed: `${seed}:house`, bids: {}, bought: [], listings: [], results: [] },
    season: { index: seasonIndex(now), xp: 0, premium: false, claimedFree: 0, claimedPremium: 0, album: 0 },
    prestige: 0,
    cosmetics: { title: 'kapitaen', paint: 'werk', owned: [], seasons: [], showcase: [] },
    league: { seed: `${seed}:league`, tier: 0, week: weekIndex(now), score: 0, last: null },
    weekend: { week: weekIndex(now), points: 0, claimed: 0 },
    lastActiveDay: dayIndex(now),
    comeback: false,
    blockade: weekendActive(now),
    posts: {},
    salvage: null,
    calendar: { lastDay: -1, step: 0 },
    streak: { count: 0, lastDay: -1, freezes: 0, best: 0 },
    albums: { helix: 0, tessera: 0, asche: 0, zenit: 0 },
    location: CONFIG.startStation,
    hold: 0,
    fleet: newFleet(),
    convoys: [],
    cargo: {},
    market: Object.fromEntries(
      STATIONS.map((s) => [s.id, Object.fromEntries(GOODS.map((g) => [g.id, 0]))]),
    ) as GameState['market'],
    fence: Object.fromEntries(STATIONS.map((s) => [s.id, CONFIG.smuggling.fenceCap])) as GameState['fence'],
    event: null,
    wanted: Object.fromEntries(FACTION_IDS.map((f) => [f, { level: 0, cool: 0 }])) as GameState['wanted'],
    routes: [],
    pending: null,
    stats: { jumps: 0, profit: 0, caught: 0, smuggled: 0, convoys: 0, bestLeague: 0 },
  };
  driftMarkets(state);
  driftMarkets(state);
  rollRoutes(state);
  settleDaily(state, now);
  return state;
}

/** State is plain JSON data by design, so this is a faithful deep copy. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Early levels come fast (generous start), later ones take days. */
export const xpForLevel = (level: number): number => 80 * level + 30 * level * level;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const fuelMax = (state: GameState): number => CONFIG.fuel.max + rigOf(state.fleet).fuel;
const fuelRegen = (state: GameState): number => Math.round(CONFIG.fuel.regenMs * (1 - rigOf(state.fleet).charge));

function settleFuel(state: GameState, now: number): void {
  const max = fuelMax(state);
  const regenMs = fuelRegen(state);
  if (state.fuel.amount >= max) {
    state.fuel.updatedAt = now;
    return;
  }
  const gained = Math.floor((now - state.fuel.updatedAt) / regenMs);
  if (gained <= 0) return;
  state.fuel.amount = Math.min(max, state.fuel.amount + gained);
  state.fuel.updatedAt = state.fuel.amount >= max ? now : state.fuel.updatedAt + gained * regenMs;
}

function addXp(state: GameState, amount: number, events: GameEvent[], now: number): void {
  state.profile.xp += Math.max(0, Math.floor(amount));
  // Everything that earns experience also moves the season charter.
  state.season.xp += Math.max(0, Math.floor(amount));
  while (state.profile.xp >= xpForLevel(state.profile.level)) {
    state.profile.xp -= xpForLevel(state.profile.level);
    state.profile.level += 1;
    // A level-up refills the tank: the session continues exactly when it would end.
    state.fuel.amount = fuelMax(state);
    state.fuel.updatedAt = now;
    state.wallet.quanta += CONFIG.levelUpQuanta;
    events.push({ type: 'LevelUp', level: state.profile.level });
  }
}

// ---------------------------------------------------------------------------
// Retention layer: time-based settling, rewards, missions, streak
// ---------------------------------------------------------------------------

/** Free crates pile up while you are away, up to a small limit. */
function settleFree(state: GameState, now: number): void {
  const c = state.crates;
  const { freeMax, freeIntervalMs } = CONFIG.crate;
  while (c.freeStock < freeMax && now >= c.freeAt) {
    c.freeStock += 1;
    c.freeAt += freeIntervalMs;
  }
  // The timer only runs while there is room: a full stock earns nothing.
  if (c.freeStock >= freeMax) c.freeAt = now + freeIntervalMs;
}

/** A new day brings new missions. Unclaimed ones are gone. */
function settleDaily(state: GameState, now: number): void {
  const day = dayIndex(now);
  if (state.daily.day === day) return;
  state.daily = {
    day,
    missions: rollMissions(state.rng.daily, state.profile.level),
    chestClaimed: false,
    bought: { standard: 0, premium: 0 },
    offers: rollOffers(state.rng.daily, state.collection),
    manifests: rollManifests(state.rng.daily),
    wheelSpun: false,
    convoys: rollConvoys(state.rng.daily, state.profile.level),
  };
}

/** New season, new week: reset what belongs to the old one and close the league week. */
function settleCalendar(state: GameState, now: number): void {
  const season = seasonIndex(now);
  if (state.season.index !== season) {
    // Unclaimed charter rewards of the old season are gone.
    state.season = { index: season, xp: 0, premium: false, claimedFree: 0, claimedPremium: 0, album: 0 };
  }
  const week = weekIndex(now);
  if (state.league.week !== week) {
    const l = state.league;
    // Only a week that was played counts. Weeks away change nothing.
    if (l.score > 0) {
      // Final table: every rival has reached their score for that week.
      const table = standings(l.seed, l.week, l.tier, l.score, weekStartsAt(l.week + 1));
      const rank = table.findIndex((s) => s.you) + 1;
      const moved = leagueMove(rank, l.tier);
      l.last = { week: l.week, tier: l.tier, rank, moved, reward: leagueReward(rank, l.tier) };
      l.tier += moved;
      state.stats.bestLeague = Math.max(state.stats.bestLeague, l.tier);
    }
    l.week = week;
    l.score = 0;
  }
  if (state.weekend.week !== week) state.weekend = { week, points: 0, claimed: 0 };
}

/** Notice a long absence before today is marked as played. */
function settlePresence(state: GameState, now: number): void {
  const day = dayIndex(now);
  if (day - state.lastActiveDay >= CONFIG.comeback.days) state.comeback = true;
  state.lastActiveDay = day;
}

const comebackReward = (state: GameState): Reward =>
  ({ credits: CONFIG.comeback.creditsPerLevel * state.profile.level, quanta: CONFIG.comeback.quanta, crate: 'standard' });

function weekendPoints(state: GameState, now: number, points: number): void {
  if (weekendActive(now)) state.weekend.points += points;
}

/** Close every auction whose time is up: pay out, hand over cards, return escrow. */
function settleAuctions(state: GameState, now: number): void {
  const a = state.auction;
  const push = (r: AuctionResult): void => { a.results.push(r); if (a.results.length > 20) a.results.shift(); };
  for (const [key, max] of Object.entries(a.bids)) {
    const lot = lotByKey(a.seed, state.createdAt, key);
    if (!lot) { state.wallet.credits += max; delete a.bids[key]; continue; }
    if (now < lot.endsAt) continue;
    delete a.bids[key];
    if (max > lot.rivalMax) {
      const price = winningPrice(lot, max);
      state.wallet.credits += max - price;
      addCard(state, lot.cardId);
      push({ kind: 'won', cardId: lot.cardId, price });
    } else {
      state.wallet.credits += max;
      push({ kind: 'lost', cardId: lot.cardId, price: lot.rivalMax });
    }
  }
  a.listings = a.listings.filter((l) => {
    if (now < l.endsAt) return true;
    if (l.offer >= l.min) {
      const net = Math.round(l.offer * (1 - CONFIG.auction.fee));
      state.wallet.credits += net;
      push({ kind: 'sold', cardId: l.cardId, price: net });
    } else {
      // No buyer: the card comes back as it left, without a second shard payout.
      state.collection[l.cardId] = (state.collection[l.cardId] ?? 0) + 1;
      push({ kind: 'unsold', cardId: l.cardId, price: 0 });
    }
    return false;
  });
  // Forget buy-outs of lots that are over.
  a.bought = a.bought.filter((key) => { const lot = lotByKey(a.seed, state.createdAt, key); return !!lot && now < lot.endsAt; });
}

function activeLots(state: GameState, now: number): ReturnType<typeof lotAt>[] {
  return CONFIG.auction.slotMinutes.map((_, slot) => lotAt(state.auction.seed, state.createdAt, slot, now));
}

function settlePosts(state: GameState, now: number): void {
  for (const post of Object.values(state.posts)) if (post) settlePost(post, now);
}

/** Add one copy of a card. Duplicates pay shards; a new specialist takes the empty seat for their role. */
function addCard(state: GameState, cardId: string): { isNew: boolean; shards: number } {
  const card = CARD_BY_ID.get(cardId)!;
  const owned = state.collection[cardId] ?? 0;
  const isNew = owned === 0;
  const shards = isNew ? 0 : CONFIG.shardsPerDuplicate[card.rarity];
  state.collection[cardId] = owned + 1;
  state.wallet.shards += shards;
  if (isNew && state.deck[card.role] === null) state.deck[card.role] = cardId;
  return { isNew, shards };
}

function progress(state: GameState, kind: Mission['kind'], amount: number): void {
  for (const m of state.daily.missions) {
    if (m.kind === kind && !m.claimed) m.progress = Math.min(m.target, m.progress + Math.max(0, Math.floor(amount)));
  }
}

function grantCrate(state: GameState, tier: CrateTier, events: GameEvent[]): void {
  if (state.slots.length >= CONFIG.crate.slots) {
    // A full hangar loses the loot. The view warns about this before it happens.
    events.push({ type: 'CrateLost', tier });
    return;
  }
  state.slots.push({ tier, readyAt: null });
  events.push({ type: 'CrateEarned', tier });
}

function grantReward(state: GameState, reward: Reward, events: GameEvent[]): void {
  state.wallet.credits += reward.credits ?? 0;
  state.wallet.shards += reward.shards ?? 0;
  state.wallet.quanta += reward.quanta ?? 0;
  if (reward.freeze) state.streak.freezes = Math.min(CONFIG.streak.maxFreezes, state.streak.freezes + reward.freeze);
  events.push({ type: 'RewardGranted', reward });
  if (reward.crate) grantCrate(state, reward.crate, events);
  if (reward.seasonCard) grantSeasonCard(state, reward.seasonCard, events);
}

/** A card of the running edition, as a reward. One you lack, if there is one. It arrives like a crate with one card. */
function grantSeasonCard(state: GameState, rarity: Rarity, events: GameEvent[]): void {
  const pool = seasonCards(state.season.index).filter((c) => c.rarity === rarity);
  const missing = pool.filter((c) => !state.collection[c.id]);
  const card = pick(state.rng.season, missing.length > 0 ? missing : pool);
  const { isNew, shards } = addCard(state, card.id);
  events.push({ type: 'CrateOpened', source: 'reward', tier: 'premium', pulls: [{ cardId: card.id, rarity: card.rarity, isNew, shards }] });
}

function seasonAlbum(state: GameState): { owned: number; total: number; claimed: number; next: { need: number; reward: Reward } | null; claimable: boolean; complete: boolean } {
  const owned = seasonCards(state.season.index).filter((c) => state.collection[c.id]).length;
  const { milestones, rewards } = CONFIG.season.album;
  const claimed = state.season.album;
  const next = claimed < milestones.length ? { need: milestones[claimed]!, reward: rewards[claimed]! as Reward } : null;
  return { owned, total: EDITION_SIZE, claimed, next, claimable: next !== null && owned >= next.need, complete: owned >= EDITION_SIZE };
}

const factsOf = (state: GameState): Facts => ({
  jumps: state.stats.jumps,
  profit: state.stats.profit,
  cards: Object.keys(state.collection).filter((id) => seasonOf(id) === null).length,
  smuggled: state.stats.smuggled,
  convoys: state.stats.convoys,
  bestLeague: Math.max(state.stats.bestLeague, state.league.tier),
  prestige: state.prestige,
  ships: state.fleet.owned,
  seasons: state.cosmetics.seasons,
});

const paintUnlocked = (state: GameState, id: string): boolean => {
  const def = PAINT_BY_ID.get(id);
  return !!def && (def.unlocked(factsOf(state)) || state.cosmetics.owned.includes(id));
};

/** The first jump of a day keeps the streak alive. */
function touchStreak(state: GameState, events: GameEvent[]): void {
  const day = state.daily.day;
  const st = state.streak;
  if (st.lastDay === day) return;
  const previous = st.count;
  const status = streakStatus(st, day);
  let kind: 'started' | 'extended' | 'saved' | 'lost' = 'extended';
  if (status === 'none') { st.count = 1; kind = 'started'; }
  else if (status === 'broken') { st.count = 1; kind = 'lost'; }
  else {
    if (status === 'frozen') { st.freezes -= day - 1 - st.lastDay; kind = 'saved'; }
    st.count += 1;
  }
  st.lastDay = day;
  st.best = Math.max(st.best, st.count);
  events.push({ type: 'StreakChanged', count: st.count, kind, previous });
}

const completedAlbums = (state: GameState): number =>
  FACTION_IDS.filter((f) => state.albums[f] >= CONFIG.album.milestones.length).length;

function saleBonus(state: GameState): { streak: number; album: number; prestige: number } {
  return {
    prestige: state.prestige * CONFIG.prestige.saleBonus,
    streak: streakBonus(liveStreak(state.streak, state.daily.day)),
    album: completedAlbums(state) * CONFIG.album.bonusPerAlbum,
  };
}

// ---------------------------------------------------------------------------
// Deck: five seats, role fit and faction chemistry
// ---------------------------------------------------------------------------

const SEAT_BONUS: Record<RoleId, BonusKey> = { pilot: 'nav', trader: 'hdl', tech: 'tec', gunner: 'kmp', smuggler: 'smg' };

/** The stat a card brings to a seat. Stealth has no stat of its own: it is nerve plus trade sense. */
export function seatStat(card: CardDef, seat: RoleId, level = 1): number {
  const key = SEAT_BONUS[seat];
  const base = key === 'smg' ? Math.round((card.stats.nav + card.stats.hdl) / 2) : card.stats[key];
  return base + (level - 1) * CONFIG.cards.statPerLevel;
}

function seatFit(card: CardDef, seat: RoleId, level = 1): number {
  return seatStat(card, seat, level) * (card.role === seat ? 1 : CONFIG.deck.offRole);
}

export function deckInfo(
  deck: GameState['deck'],
  levels: Record<string, number> = {},
): { seats: Record<RoleId, SeatView | null>; bonus: CrewBonus; chem: number } {
  const seated = SEATS.map((seat) => ({ seat, card: deck[seat] ? CARD_BY_ID.get(deck[seat]!) : undefined }));
  const seats = {} as Record<RoleId, SeatView | null>;
  const bonus: CrewBonus = { nav: 0, hdl: 0, tec: 0, kmp: 0, smg: 0 };
  let linkSum = 0;
  for (const { seat, card } of seated) {
    if (!card) { seats[seat] = null; continue; }
    const links = seated.filter((o) => o.card && o.card.id !== card.id && o.card.faction === card.faction).length;
    const value = Math.round(seatFit(card, seat, levels[card.id] ?? 1) * (1 + links * CONFIG.deck.chemPerLink));
    seats[seat] = { cardId: card.id, value, links, onRole: card.role === seat };
    bonus[SEAT_BONUS[seat]] = clamp((value - 40) / 60, 0, 1);
    linkSum += links;
  }
  // 5 cards with 4 links each is a full single-faction crew.
  return { seats, bonus, chem: Math.round((linkSum / (SEATS.length * (SEATS.length - 1))) * 100) };
}

const crewOf = (state: GameState): CrewBonus => deckInfo(state.deck, state.cardLevels).bonus;

function autoDeck(state: GameState): void {
  const away = new Set(state.convoys.flatMap((c) => c.cards));
  const owned = Object.keys(state.collection).filter((id) => !away.has(id)).map((id) => CARD_BY_ID.get(id)).filter((c): c is CardDef => !!c);
  const used = new Set<string>();
  // Fill the seat with the clearest best candidate first, so specialists land in their role.
  const fit = (c: CardDef, seat: RoleId): number => seatFit(c, seat, state.cardLevels[c.id] ?? 1);
  const order = [...SEATS].sort((a, b) => {
    const best = (seat: RoleId): number => Math.max(0, ...owned.map((c) => fit(c, seat)));
    return best(b) - best(a);
  });
  for (const seat of order) {
    let pickCard: CardDef | null = null;
    for (const c of owned) {
      if (used.has(c.id)) continue;
      if (!pickCard || fit(c, seat) > fit(pickCard, seat)) pickCard = c;
    }
    state.deck[seat] = pickCard?.id ?? null;
    if (pickCard) used.add(pickCard.id);
  }
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

export const holdCap = (level: number): number => CONFIG.hold.base + CONFIG.hold.perLevel * level;
export const holdCost = (level: number): number => Math.round((CONFIG.hold.costBase * CONFIG.hold.costGrowth ** level) / 100) * 100;

/** Room in the active ship: hold upgrades, hull and cargo pods. */
const cargoCap = (state: GameState): number => holdCap(state.hold) + rigOf(state.fleet).hold;

const cargoUsed = (state: GameState): number =>
  Object.values(state.cargo).reduce((sum, lot) => sum + (lot?.qty ?? 0), 0);

const factionOf = (stationId: StationId): FactionId => STATION_BY_ID.get(stationId)!.faction;
const bannedAt = (good: GoodDef, stationId: StationId): boolean => isBanned(good, factionOf(stationId));

/** Local price of a good before drift: base, compressed station profile, running event. */
function anchorPrice(state: GameState, stationId: StationId, good: GoodDef): number {
  const station = STATION_BY_ID.get(stationId)!;
  const ev = state.event && state.event.stationId === stationId && state.event.category === good.category ? state.event.mult : 1;
  return good.base * Math.pow(stationMod(station, good), CONFIG.market.spread) * ev;
}

/** Everything needed to price a trade of this good at this station for a lot with the given heat. */
function marketRow(state: GameState, stationId: StationId, goodId: GoodId, heat: number): MarketRow {
  const good = GOOD_BY_ID.get(goodId)!;
  const anchor = anchorPrice(state, stationId, good);
  const banned = bannedAt(good, stationId);
  const hdl = crewOf(state).hdl;
  const s = CONFIG.smuggling;
  const hot = good.tier === 'free' ? 1 : 1 + s.heatSellBonus * Math.min(heat, s.heatMax);
  const extra = saleBonus(state);
  const row = {
    goodId,
    channel: banned ? 'fence' as const : 'open' as const,
    list: anchor * (1 + state.market[stationId][goodId]),
    step: anchor * CONFIG.market.impact,
    buyFactor: banned ? s.fenceBuy : 1,
    sellFactor: (banned ? s.fenceSell + s.fenceSellCrew * hdl + (state.blockade ? CONFIG.weekend.fenceBonus : 0) : CONFIG.travel.sellFactor + CONFIG.travel.sellFactorCrew * hdl)
      * hot * (1 + extra.streak + extra.album + extra.prestige),
  };
  return { ...row, buy: quote(row, 'buy', 1), sell: quote(row, 'sell', 1), level: row.list / good.base };
}

/** Trading moves the local price: buying pushes it up, selling down. It recovers over the next jumps. */
function moveMarket(state: GameState, stationId: StationId, goodId: GoodId, units: number): void {
  const limit = CONFIG.market.driftLimit;
  state.market[stationId][goodId] = clamp(state.market[stationId][goodId] + units * CONFIG.market.impact, -limit, limit);
}

const fenceClosed = (state: GameState, stationId: StationId): boolean =>
  state.wanted[factionOf(stationId)].level >= CONFIG.smuggling.fenceClosedAtWanted;

function driftMarkets(state: GameState): void {
  for (const s of STATIONS) {
    for (const g of GOODS) {
      const m = CONFIG.market;
      const next = state.market[s.id][g.id] * m.driftKeep + (nextFloat(state.rng.market) * 2 - 1) * m.driftNoise * g.vol;
      state.market[s.id][g.id] = clamp(next, -m.driftLimit, m.driftLimit);
    }
    state.fence[s.id] = Math.min(CONFIG.smuggling.fenceCap, state.fence[s.id] + CONFIG.smuggling.fenceRefill);
  }
}

function rollRoutes(state: GameState): void {
  const others = STATIONS.map((s) => s.id).filter((id) => id !== state.location);
  const routes: StationId[] = [];
  // A running market event is always reachable: news you cannot act on is no fun.
  if (state.event && state.event.stationId !== state.location) {
    routes.push(state.event.stationId);
    others.splice(others.indexOf(state.event.stationId), 1);
  }
  while (routes.length < CONFIG.routesOffered && others.length > 0) {
    const i = Math.floor(nextFloat(state.rng.travel) * others.length);
    routes.push(...others.splice(i, 1));
  }
  state.routes = routes;
}

// ---------------------------------------------------------------------------
// Law
// ---------------------------------------------------------------------------

/** Value of cargo that is banned under a faction's law, at base prices. */
function bannedValue(state: GameState, faction: FactionId): number {
  let value = 0;
  for (const g of GOODS) if (isBanned(g, faction)) value += (state.cargo[g.id]?.qty ?? 0) * g.base;
  return value;
}

function maxHeat(state: GameState): number {
  let heat = 0;
  for (const g of GOODS) {
    const lot = state.cargo[g.id];
    if (lot && g.tier !== 'free') heat = Math.max(heat, lot.heat);
  }
  return Math.min(heat, CONFIG.smuggling.heatMax);
}

function addWanted(state: GameState, faction: FactionId, stars: number, events: GameEvent[]): number {
  const w = state.wanted[faction];
  const before = w.level;
  w.level = clamp(w.level + stars, 0, CONFIG.wanted.max);
  w.cool = CONFIG.wanted.coolJumps;
  if (w.level !== before) events.push({ type: 'WantedChanged', faction, level: w.level });
  return w.level - before;
}

function encounterChances(state: GameState, to: StationId): { pirates: number; customs: number } {
  const dest = STATION_BY_ID.get(to)!;
  const crew = crewOf(state);
  const pirates = dest.pirates * CONFIG.travel.piratesPerLevel;
  const customs = dest.customs === 0 ? 0
    : dest.customs * CONFIG.travel.customsPerLevel
      + state.wanted[dest.faction].level * CONFIG.wanted.customsPerStar
      + maxHeat(state) * CONFIG.smuggling.heatCustoms * (1 - 0.5 * crew.smg)
      + (state.blockade ? CONFIG.weekend.customsBonus : 0);
  return { pirates, customs: clamp(customs, 0, 0.9 - pirates) };
}

function encounterOptions(state: GameState, kind: EncounterKind, to: StationId): EncounterOption[] {
  const e = CONFIG.encounter;
  const crew = crewOf(state);
  const rig = rigOf(state.fleet);
  if (kind === 'pirates') {
    const tribute = Math.min(state.wallet.credits, Math.max(e.tributeMin, Math.round(state.wallet.credits * e.tributeShare)));
    return [
      { id: 'fight', chance: Math.min(0.95, e.fight.base + e.fight.crew * crew.kmp + rig.fight), cost: 0 },
      { id: 'flee', chance: Math.min(0.95, e.flee.base + e.flee.crew * crew.nav + rig.flee), cost: 0 },
      { id: 'pay', chance: 1, cost: tribute },
    ];
  }
  const faction = factionOf(to);
  const stars = state.wanted[faction].level;
  const hot = bannedValue(state, faction);
  const detect = clamp(
    e.detect.base - e.detect.tec * crew.tec - e.detect.smg * crew.smg - rig.stealth + CONFIG.smuggling.heatDetect * maxHeat(state),
    0.1, 0.95,
  );
  const bribe = Math.min(state.wallet.credits, e.bribeBase + Math.round(hot * e.bribeShare));
  return [
    { id: 'submit', chance: hot > 0 ? 1 - detect : 1, cost: 0 },
    { id: 'bribe', chance: clamp(e.bribe.base + e.bribe.crew * crew.hdl - CONFIG.wanted.bribePenalty * stars, 0.2, 0.97), cost: bribe },
    { id: 'breakThrough', chance: Math.min(0.95, e.breakThrough.base + e.breakThrough.crew * crew.nav + rig.flee), cost: 0 },
  ];
}

/** Shards to forge a card you lack. Edition cards cost more. */
export const forgeCost = (card: CardDef): number =>
  Math.round(CONFIG.cards.forge[card.rarity] * (card.season === undefined ? 1 : CONFIG.season.forgeMult));

// ---------------------------------------------------------------------------
// Crates
// ---------------------------------------------------------------------------

function rollRarity(rng: RngState, odds: Record<Rarity, number>, min: Rarity): Rarity {
  const minRank = rarityRank(min);
  const pool = RARITIES.filter((r) => rarityRank(r) >= minRank);
  const total = pool.reduce((sum, r) => sum + odds[r], 0);
  let x = nextFloat(rng) * total;
  for (const r of pool) {
    x -= odds[r];
    if (x < 0) return r;
  }
  return pool[pool.length - 1] as Rarity;
}

function openCrate(state: GameState, source: 'free' | 'bought' | 'slot', tier: CrateTier, events: GameEvent[], now: number): void {
  const cfg = CONFIG.crate;
  const t = cfg.tiers[tier];
  const rng = state.rng.crate;
  const legendRank = rarityRank('legend');

  // The last slot carries the guarantees: tier floor, then pity overrides.
  let floor: Rarity = t.floor;
  if (state.crates.sinceElite + 1 >= cfg.pityElite && rarityRank(floor) < rarityRank('elite')) floor = 'elite';
  if (state.crates.sinceLegend + 1 >= cfg.pityLegend) floor = 'legend';

  const rolled: { rarity: Rarity; upgradedFrom?: Rarity }[] = [];
  for (let i = 0; i < t.cards; i++) {
    const base = rollRarity(rng, t.odds, 'standard');
    // Upgrade moment: a real second roll, decided here, shown as a colour change in the reveal.
    if (rarityRank(base) < legendRank && nextFloat(rng) < cfg.bumpChance) {
      rolled.push({ rarity: RARITIES[rarityRank(base) + 1]!, upgradedFrom: base });
    } else {
      rolled.push({ rarity: base });
    }
  }
  const best = Math.max(...rolled.map((r) => rarityRank(r.rarity)));
  if (best < rarityRank(floor)) rolled[t.cards - 1] = { rarity: rollRarity(rng, t.odds, floor) };

  const pulls: Pull[] = rolled.map(({ rarity, upgradedFrom }) => {
    // The permanent card is always drawn, so the crate stream never depends on the season.
    const base = pick(rng, CARDS_BY_RARITY[rarity]);
    const edition = seasonCards(state.season.index).filter((c) => c.rarity === rarity);
    const card = edition.length > 0 && nextFloat(state.rng.season) < CONFIG.season.cardShare ? pick(state.rng.season, edition) : base;
    const { isNew, shards } = addCard(state, card.id);
    return upgradedFrom ? { cardId: card.id, rarity, isNew, shards, upgradedFrom } : { cardId: card.id, rarity, isNew, shards };
  });
  // Reveal order: weakest first, best last.
  pulls.sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity));

  const top = Math.max(...pulls.map((p) => rarityRank(p.rarity)));
  state.crates.opened += 1;
  state.crates.sinceElite = top >= rarityRank('elite') ? 0 : state.crates.sinceElite + 1;
  state.crates.sinceLegend = top >= legendRank ? 0 : state.crates.sinceLegend + 1;
  events.push({ type: 'CrateOpened', source, tier, pulls });
  progress(state, 'openCrate', 1);
  addXp(state, 25, events, now);
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

function arrive(state: GameState, to: StationId, events: GameEvent[], now: number): void {
  state.location = to;
  state.pending = null;
  state.stats.jumps += 1;
  progress(state, 'jumps', 1);
  weekendPoints(state, now, CONFIG.weekend.points.jump);

  // Cargo that is banned somewhere gets hotter with every jump it is carried.
  for (const g of GOODS) {
    const lot = state.cargo[g.id];
    if (lot && g.tier !== 'free') lot.heat = Math.min(CONFIG.smuggling.heatMax, lot.heat + 1);
  }
  // Wanted levels cool off over time.
  for (const f of FACTION_IDS) {
    const w = state.wanted[f];
    if (w.level === 0) continue;
    w.cool -= 1;
    if (w.cool <= 0) {
      w.level -= 1;
      w.cool = CONFIG.wanted.coolJumps;
      events.push({ type: 'WantedChanged', faction: f, level: w.level });
    }
  }
  driftMarkets(state);

  // Market events: a shortage somewhere, for a limited number of jumps.
  if (state.event) {
    state.event.jumpsLeft -= 1;
    if (state.event.jumpsLeft <= 0) state.event = null;
  }
  if (!state.event && nextFloat(state.rng.market) < CONFIG.marketEvent.chance) {
    const stations = STATIONS.filter((s) => s.id !== to);
    const station = pick(state.rng.market, stations);
    const categories = [...new Set(GOODS.map((g) => g.category))];
    state.event = {
      stationId: station.id,
      category: pick(state.rng.market, categories),
      mult: Math.round((CONFIG.marketEvent.multMin + nextFloat(state.rng.market) * CONFIG.marketEvent.multRange) * 100) / 100,
      jumpsLeft: CONFIG.marketEvent.jumps,
    };
    events.push({ type: 'MarketEventStarted', event: { ...state.event } });
  }

  // Now and then a sealed wreck container is on offer at the dock.
  if (nextFloat(state.rng.market) < CONFIG.salvage.chance) {
    const weight = pickWeighted(state.rng.market, [5, 3, 1]) as 0 | 1 | 2;
    const base = CONFIG.salvage.basePrice * state.profile.level ** 1.2 * CONFIG.salvage.weights[weight]!;
    state.salvage = { price: Math.max(100, Math.round(base / 100) * 100), weight, origin: pick(state.rng.market, FACTION_IDS) };
  } else {
    state.salvage = null;
  }

  rollRoutes(state);
  const courier = CONFIG.travel.courierBase + CONFIG.travel.courierPerLevel * state.profile.level;
  state.wallet.credits += courier;
  events.push({ type: 'Arrived', stationId: to, courier });
  addXp(state, CONFIG.travel.xpPerJump, events, now);
}

function loseCargo(state: GameState, share: number, only?: FactionId): Partial<Record<GoodId, number>> {
  const lost: Partial<Record<GoodId, number>> = {};
  for (const g of GOODS) {
    const lot = state.cargo[g.id];
    if (!lot || (only && !isBanned(g, only))) continue;
    const n = Math.min(lot.qty, Math.ceil(lot.qty * share));
    if (n <= 0) continue;
    lost[g.id] = n;
    lot.qty -= n;
    if (lot.qty === 0) delete state.cargo[g.id];
  }
  return lost;
}

/**
 * The smuggling stash: take up to `units` of banned cargo out of sight, most valuable first.
 * Returns a function that puts them back after the scan, and how many units were hidden.
 */
function hideCargo(state: GameState, faction: FactionId, units: number): { restore: () => void; hidden: number } {
  const taken: { id: GoodId; lot: CargoLot; qty: number }[] = [];
  let left = units;
  for (const g of [...GOODS].sort((a, b) => b.base - a.base)) {
    const lot = state.cargo[g.id];
    if (left <= 0 || !lot || !isBanned(g, faction)) continue;
    const qty = Math.min(left, lot.qty);
    lot.qty -= qty;
    left -= qty;
    taken.push({ id: g.id, lot, qty });
  }
  return {
    hidden: units - left,
    restore: () => { for (const { id, lot, qty } of taken) { lot.qty += qty; state.cargo[id] = lot; } },
  };
}

function resolveEncounter(state: GameState, choice: EncounterChoice, events: GameEvent[], now: number): boolean {
  const pending = state.pending!;
  const option = encounterOptions(state, pending.kind, pending.to).find((o) => o.id === choice);
  if (!option) return false;

  const e = CONFIG.encounter;
  const before = state.wallet.credits;
  const success = nextFloat(state.rng.travel) < option.chance;
  let lost: Partial<Record<GoodId, number>> = {};
  let wantedDelta = 0;
  let hidden = 0;
  const inner: GameEvent[] = [];
  state.wallet.credits -= option.cost;

  if (pending.kind === 'pirates') {
    if (choice === 'fight') {
      if (success) {
        state.wallet.credits += Math.round(e.lootMin + nextFloat(state.rng.travel) * e.lootRange);
        progress(state, 'fightWin', 1);
        weekendPoints(state, now, CONFIG.weekend.points.fightWin);
        // Sometimes the wreck holds a sealed crate.
        if (nextFloat(state.rng.travel) < CONFIG.crate.lootChance) grantCrate(state, 'standard', inner);
      } else lost = loseCargo(state, e.lossOnLostFight);
    } else if (choice === 'flee' && !success) {
      lost = loseCargo(state, e.lossOnFailedFlee);
    }
  } else {
    const faction = factionOf(pending.to);
    if (!success) {
      // Any failed customs choice ends in a full scan: banned cargo is seized and fined. What sits in the stash is not found.
      const stash = hideCargo(state, faction, rigOf(state.fleet).stash);
      hidden = stash.hidden;
      const hot = bannedValue(state, faction);
      const stars = state.wanted[faction].level;
      const fine = hot > 0 ? Math.round(hot * e.fineShare * (1 + CONFIG.wanted.fineMult * stars)) : choice === 'submit' ? 0 : e.flatFine;
      lost = loseCargo(state, 1, faction);
      stash.restore();
      state.wallet.credits -= Math.min(state.wallet.credits, fine);
      if (hot > 0) state.stats.caught += 1;
      wantedDelta = addWanted(state, faction, choice === 'breakThrough' ? 2 : 1, inner);
    } else {
      progress(state, 'customsPass', 1);
      if (bannedValue(state, faction) > 0) { state.stats.smuggled += 1; weekendPoints(state, now, CONFIG.weekend.points.smuggled); }
      // Running a blockade is noticed, even when it works.
      if (choice === 'breakThrough') wantedDelta = addWanted(state, faction, 1, inner);
    }
  }

  events.push({
    type: 'EncounterResolved', kind: pending.kind, choice, success,
    creditsDelta: state.wallet.credits - before, lost, wantedDelta, hidden,
  });
  events.push(...inner);
  arrive(state, pending.to, events, now);
  return true;
}

/** Move into another ship you own. Fails if the cargo on board would not fit. */
function selectShip(state: GameState, ship: ShipId): boolean {
  const fitted = state.fleet.fitted.slice(0, SHIP_BY_ID.get(ship)!.slots);
  const next: FleetState = { ...state.fleet, active: ship, fitted };
  if (cargoUsed(state) > holdCap(state.hold) + rigOf(next).hold) return false;
  state.fleet = next;
  state.fuel.amount = Math.min(state.fuel.amount, fuelMax(state));
  return true;
}

// ---------------------------------------------------------------------------
// The one way state changes
// ---------------------------------------------------------------------------

/** What a salvage outcome pays for a lot of the given price. Used for the result and for the odds sheet. */
function salvagePrize(kind: SalvageKind, price: number): { credits: number; shards: number } {
  const o = CONFIG.salvage.outcomes.find((x) => x.kind === kind)!;
  if (kind === 'shards') return { credits: 0, shards: Math.round(price * o.factor) };
  if (kind === 'crate' || kind === 'premium') return { credits: 0, shards: 0 };
  return { credits: Math.round(price * o.factor), shards: 0 };
}

const isQty = (n: number): boolean => Number.isInteger(n) && n > 0 && n <= 1000;

/**
 * Pure with respect to its inputs: same state, command and time always give
 * the same result. `now` is supplied by the host (server clock), never read
 * from the environment.
 */
export function applyCommand(prev: GameState, cmd: Command, now: number): Result {
  const state = clone(prev);
  const events: GameEvent[] = [];
  const reject = (reason: RejectReason): Result => ({ state: prev, events: [{ type: 'CommandRejected', reason }] });
  settleFuel(state, now);
  settleFree(state, now);
  settleDaily(state, now);
  settlePosts(state, now);
  settleAuctions(state, now);
  settleCalendar(state, now);
  state.blockade = weekendActive(now);
  settlePresence(state, now);

  if (state.pending && cmd.type !== 'Encounter') return reject('encounter_pending');

  switch (cmd.type) {
    case 'ClaimFreeCrate': {
      if (state.crates.freeStock < 1) return reject('free_crate_not_ready');
      state.crates.freeStock -= 1;
      openCrate(state, 'free', 'standard', events, now);
      break;
    }
    case 'BuyCrate': {
      if (!CRATE_TIERS.includes(cmd.tier)) return reject('unknown_command');
      const { currency, dailyLimit } = CONFIG.crate.tiers[cmd.tier];
      const price = cratePrice(cmd.tier, state.daily.bought[cmd.tier]);
      if (state.daily.bought[cmd.tier] >= dailyLimit) return reject('daily_limit');
      if (state.wallet[currency] < price) return reject(currency === 'credits' ? 'not_enough_credits' : 'not_enough_quanta');
      state.wallet[currency] -= price;
      state.daily.bought[cmd.tier] += 1;
      openCrate(state, 'bought', cmd.tier, events, now);
      break;
    }
    case 'StartUnlock': {
      const slot = state.slots[cmd.slot];
      if (!slot) return reject('no_such_slot');
      if (slot.readyAt !== null) return reject('slot_busy');
      // One crate at a time: the queue is the wait.
      if (state.slots.some((s) => s.readyAt !== null && s.readyAt > now)) return reject('slot_busy');
      slot.readyAt = now + CONFIG.crate.tiers[slot.tier].unlockMs;
      break;
    }
    case 'SpeedUp': {
      const slot = state.slots[cmd.slot];
      if (!slot) return reject('no_such_slot');
      if (slot.readyAt === null || slot.readyAt <= now) return reject('slot_not_ready');
      const cost = speedUpCost(slot, now);
      if (state.wallet.quanta < cost) return reject('not_enough_quanta');
      state.wallet.quanta -= cost;
      slot.readyAt = now;
      break;
    }
    case 'OpenSlot': {
      const slot = state.slots[cmd.slot];
      if (!slot) return reject('no_such_slot');
      if (slot.readyAt === null || slot.readyAt > now) return reject('slot_not_ready');
      state.slots.splice(cmd.slot, 1);
      openCrate(state, 'slot', slot.tier, events, now);
      break;
    }
    case 'UpgradeCard': {
      const card = CARD_BY_ID.get(cmd.cardId);
      if (!card || !state.collection[cmd.cardId]) return reject('card_not_owned');
      const level = state.cardLevels[cmd.cardId] ?? 1;
      const cost = upgradeCost(card, level);
      if (cost === null) return reject('max_level');
      if (state.wallet.shards < cost) return reject('not_enough_shards');
      state.wallet.shards -= cost;
      state.cardLevels[cmd.cardId] = level + 1;
      events.push({ type: 'CardUpgraded', cardId: cmd.cardId, level: level + 1 });
      break;
    }
    case 'ForgeCard': {
      const card = CARD_BY_ID.get(cmd.cardId);
      if (!card) return reject('card_not_owned');
      if (state.collection[cmd.cardId]) return reject('already_owned');
      // Edition cards can only be made while their season runs.
      if (card.season !== undefined && card.season !== state.season.index) return reject('season_over');
      const cost = forgeCost(card);
      if (state.wallet.shards < cost) return reject('not_enough_shards');
      state.wallet.shards -= cost;
      state.collection[cmd.cardId] = 1;
      if (state.deck[card.role] === null) state.deck[card.role] = card.id;
      events.push({ type: 'CardForged', cardId: cmd.cardId });
      break;
    }
    case 'ClaimMission': {
      const m = state.daily.missions[cmd.index];
      if (!m || m.claimed || m.progress < m.target) return reject('not_claimable');
      m.claimed = true;
      grantReward(state, m.reward, events);
      break;
    }
    case 'ClaimChest': {
      if (state.daily.chestClaimed || state.daily.missions.some((m) => m.progress < m.target)) return reject('not_claimable');
      state.daily.chestClaimed = true;
      grantReward(state, CONFIG.daily.chest, events);
      break;
    }
    case 'ClaimCalendar': {
      if (state.calendar.lastDay === state.daily.day) return reject('not_claimable');
      const reward = CONFIG.calendar[state.calendar.step % CONFIG.calendar.length]! as Reward;
      state.calendar.lastDay = state.daily.day;
      state.calendar.step += 1;
      grantReward(state, reward, events);
      break;
    }
    case 'BuyFreeze': {
      if (state.streak.freezes >= CONFIG.streak.maxFreezes) return reject('max_level');
      if (state.wallet.quanta < CONFIG.streak.freezePrice) return reject('not_enough_quanta');
      state.wallet.quanta -= CONFIG.streak.freezePrice;
      state.streak.freezes += 1;
      break;
    }
    case 'BuildPost': {
      const here = state.location;
      const post = state.posts[here];
      const level = post?.level ?? 0;
      if (post && post.readyAt > now) return reject('slot_busy');
      if (level >= CONFIG.posts.maxLevel) return reject('max_level');
      const cost = CONFIG.posts.cost[level]!;
      if (state.wallet.credits < cost) return reject('not_enough_credits');
      state.wallet.credits -= cost;
      const readyAt = now + CONFIG.posts.buildMs[level]!;
      // Storage keeps what it holds. Nothing new accrues until construction is done.
      state.posts[here] = { level: level + 1, stored: post?.stored ?? 0, storedAt: now, readyAt };
      events.push({ type: 'PostBuilt', stationId: here, level: level + 1 });
      break;
    }
    case 'SpeedUpPost': {
      const post = state.posts[cmd.stationId];
      if (!post || post.readyAt <= now) return reject('slot_not_ready');
      const cost = minutesCost(post.readyAt - now);
      if (state.wallet.quanta < cost) return reject('not_enough_quanta');
      state.wallet.quanta -= cost;
      post.readyAt = now;
      post.storedAt = now;
      break;
    }
    case 'CollectPosts': {
      let amount = 0;
      for (const post of Object.values(state.posts)) {
        if (!post) continue;
        const take = Math.floor(post.stored);
        amount += take;
        post.stored -= take;
      }
      if (amount <= 0) return reject('not_claimable');
      state.wallet.credits += amount;
      events.push({ type: 'PostsCollected', amount });
      break;
    }
    case 'SpinWheel': {
      if (state.daily.wheelSpun) return reject('not_claimable');
      state.daily.wheelSpun = true;
      const index = pickWeighted(state.rng.daily, CONFIG.wheel.map((s) => s.weight));
      const reward = wheelReward(index, state.profile.level);
      events.push({ type: 'WheelSpun', index, reward });
      grantReward(state, reward, events);
      break;
    }
    case 'BuyOffer': {
      const offer = state.daily.offers[cmd.index];
      if (!offer || offer.bought) return reject('not_claimable');
      if (state.wallet.credits < offer.price) return reject('not_enough_credits');
      state.wallet.credits -= offer.price;
      offer.bought = true;
      if (offer.kind === 'card') addCard(state, offer.cardId!);
      if (offer.kind === 'shards') state.wallet.shards += offer.amount ?? 0;
      if (offer.kind === 'quanta') state.wallet.quanta += offer.amount ?? 0;
      events.push({ type: 'OfferBought', index: cmd.index });
      break;
    }
    case 'SubmitManifest': {
      const manifest = state.daily.manifests[cmd.index];
      if (!manifest || manifest.done) return reject('not_claimable');
      const cardIds = manifestCandidates(manifest, state.collection).slice(0, manifest.need);
      if (cardIds.length < manifest.need) return reject('not_claimable');
      for (const id of cardIds) state.collection[id]! -= 1;
      manifest.done = true;
      events.push({ type: 'ManifestDone', index: cmd.index, cardIds });
      grantReward(state, manifest.reward, events);
      break;
    }
    case 'BuySalvage': {
      const lot = state.salvage;
      if (!lot) return reject('not_claimable');
      if (state.wallet.credits < lot.price) return reject('not_enough_credits');
      state.wallet.credits -= lot.price;
      state.salvage = null;
      const outcome = CONFIG.salvage.outcomes[pickWeighted(state.rng.travel, CONFIG.salvage.outcomes.map((o) => o.weight))]!;
      const win = salvagePrize(outcome.kind, lot.price);
      state.wallet.credits += win.credits;
      state.wallet.shards += win.shards;
      events.push({ type: 'SalvageOpened', kind: outcome.kind, credits: win.credits, shards: win.shards });
      if (outcome.kind === 'crate') grantCrate(state, 'standard', events);
      if (outcome.kind === 'premium') grantCrate(state, 'premium', events);
      break;
    }
    case 'PlaceBid': {
      const lot = activeLots(state, now).find((l) => l.key === cmd.lot);
      if (!lot || state.auction.bought.includes(lot.key)) return reject('no_such_lot');
      if (!Number.isInteger(cmd.max) || cmd.max > 100_000_000) return reject('unknown_command');
      const existing = state.auction.bids[lot.key] ?? 0;
      const price = Math.max(lot.start, rivalNow(lot, now));
      if (cmd.max < Math.max(price, existing) + bidStep(price)) return reject('bid_too_low');
      if (existing === 0 && Object.keys(state.auction.bids).length >= CONFIG.auction.maxBids) return reject('too_many_bids');
      // The whole limit is held in escrow. What is not needed comes back when the auction ends.
      if (state.wallet.credits < cmd.max - existing) return reject('not_enough_credits');
      state.wallet.credits -= cmd.max - existing;
      state.auction.bids[lot.key] = cmd.max;
      events.push({ type: 'BidPlaced', lot: lot.key, max: cmd.max });
      break;
    }
    case 'BuyNow': {
      const lot = activeLots(state, now).find((l) => l.key === cmd.lot);
      if (!lot || state.auction.bought.includes(lot.key)) return reject('no_such_lot');
      const existing = state.auction.bids[lot.key] ?? 0;
      if (state.wallet.credits + existing < lot.buyNow) return reject('not_enough_credits');
      state.wallet.credits += existing - lot.buyNow;
      delete state.auction.bids[lot.key];
      state.auction.bought.push(lot.key);
      addCard(state, lot.cardId);
      events.push({ type: 'AuctionBought', cardId: lot.cardId, price: lot.buyNow });
      break;
    }
    case 'ListCard': {
      const card = CARD_BY_ID.get(cmd.cardId);
      if (!card || (state.collection[cmd.cardId] ?? 0) < 2) return reject('no_spare_copy');
      const minutes = CONFIG.auction.listMinutes[cmd.duration];
      if (minutes === undefined || !Number.isInteger(cmd.min) || cmd.min < 50 || cmd.min > 100_000_000) return reject('unknown_command');
      if (state.auction.listings.length >= CONFIG.auction.maxListings) return reject('too_many_listings');
      state.collection[cmd.cardId]! -= 1;
      const a = CONFIG.auction;
      // The best offer this listing will get is drawn now and does not depend on the asking price.
      const offer = Math.max(50, Math.round((cardValue(card) * (a.offerMin + a.offerRange * nextFloat(state.rng.auction)) * a.listFactor[cmd.duration]!) / 50) * 50);
      state.auction.listings.push({ cardId: cmd.cardId, min: cmd.min, startAt: now, endsAt: now + minutes * 60_000, offer });
      events.push({ type: 'CardListed', cardId: cmd.cardId });
      break;
    }
    case 'AckAuctions': {
      state.auction.results = [];
      break;
    }
    case 'ClaimCharter': {
      const s = state.season;
      const tier = charterTier(s.xp);
      const total: Reward = {};
      let count = 0;
      let crates = 0;
      const take = (r: Reward): void => {
        count += 1;
        if (r.crate) crates += 1;
        total.credits = (total.credits ?? 0) + (r.credits ?? 0);
        total.shards = (total.shards ?? 0) + (r.shards ?? 0);
        total.quanta = (total.quanta ?? 0) + (r.quanta ?? 0);
        if (r.crate) grantCrate(state, r.crate, events);
        if (r.seasonCard) grantSeasonCard(state, r.seasonCard, events);
      };
      for (let t = s.claimedFree + 1; t <= tier; t++) take(charterReward(t, 'free'));
      s.claimedFree = Math.max(s.claimedFree, tier);
      if (s.premium) {
        for (let t = s.claimedPremium + 1; t <= tier; t++) take(charterReward(t, 'premium'));
        s.claimedPremium = Math.max(s.claimedPremium, tier);
      }
      if (count === 0) return reject('not_claimable');
      state.wallet.credits += total.credits ?? 0;
      state.wallet.shards += total.shards ?? 0;
      state.wallet.quanta += total.quanta ?? 0;
      for (const k of ['credits', 'shards', 'quanta'] as const) if (!total[k]) delete total[k];
      events.push({ type: 'CharterClaimed', rewards: count, total, crates });
      break;
    }
    case 'BuyCharter': {
      if (state.season.premium) return reject('already_owned');
      if (state.wallet.quanta < CONFIG.season.premiumPrice) return reject('not_enough_quanta');
      state.wallet.quanta -= CONFIG.season.premiumPrice;
      state.season.premium = true;
      events.push({ type: 'CharterBought' });
      break;
    }
    case 'ClaimLeague': {
      const last = state.league.last;
      if (!last) return reject('not_claimable');
      state.league.last = null;
      events.push({ type: 'LeagueClaimed', rank: last.rank, moved: last.moved, tier: last.tier + last.moved });
      if (Object.keys(last.reward).length > 0) grantReward(state, last.reward, events);
      break;
    }
    case 'ClaimWeekend': {
      const w = state.weekend;
      const { milestones, rewards } = CONFIG.weekend;
      if (w.claimed >= milestones.length || w.points < milestones[w.claimed]!) return reject('not_claimable');
      const reward = rewards[w.claimed]! as Reward;
      w.claimed += 1;
      grantReward(state, reward, events);
      break;
    }
    case 'ClaimComeback': {
      if (!state.comeback) return reject('not_claimable');
      state.comeback = false;
      state.fuel.amount = fuelMax(state);
      state.fuel.updatedAt = now;
      grantReward(state, comebackReward(state), events);
      break;
    }
    case 'ClaimAlbum': {
      if (!FACTION_IDS.includes(cmd.faction)) return reject('unknown_command');
      const album = albumInfo(state.collection, state.albums[cmd.faction], cmd.faction);
      if (!album.claimable || !album.next) return reject('not_claimable');
      state.albums[cmd.faction] += 1;
      grantReward(state, album.next.reward, events);
      break;
    }
    case 'Buy': {
      const good = GOOD_BY_ID.get(cmd.goodId);
      if (!good || !isQty(cmd.qty)) return reject('unknown_command');
      const viaFence = bannedAt(good, state.location);
      if (viaFence && fenceClosed(state, state.location)) return reject('fence_closed');
      if (viaFence && cmd.qty > state.fence[state.location]) return reject('fence_limit');
      if (cargoUsed(state) + cmd.qty > cargoCap(state)) return reject('no_cargo_space');
      const cost = quote(marketRow(state, state.location, cmd.goodId, 0), 'buy', cmd.qty);
      if (state.wallet.credits < cost) return reject('not_enough_credits');
      state.wallet.credits -= cost;
      moveMarket(state, state.location, cmd.goodId, cmd.qty);
      if (viaFence) state.fence[state.location] -= cmd.qty;
      const lot = state.cargo[cmd.goodId] ?? { qty: 0, avgCost: 0, heat: 0 };
      lot.avgCost = (lot.avgCost * lot.qty + cost) / (lot.qty + cmd.qty);
      // Fresh units cool the lot down: heat is the average time carried.
      lot.heat = Math.floor((lot.heat * lot.qty) / (lot.qty + cmd.qty));
      lot.qty += cmd.qty;
      state.cargo[cmd.goodId] = lot;
      events.push({ type: 'Bought', goodId: cmd.goodId, qty: cmd.qty, cost });
      progress(state, 'buyUnits', cmd.qty);
      break;
    }
    case 'Sell': {
      const good = GOOD_BY_ID.get(cmd.goodId);
      if (!good || !isQty(cmd.qty)) return reject('unknown_command');
      const lot = state.cargo[cmd.goodId];
      if (!lot || lot.qty < cmd.qty) return reject('not_in_cargo');
      const viaFence = bannedAt(good, state.location);
      if (viaFence && fenceClosed(state, state.location)) return reject('fence_closed');
      if (viaFence && cmd.qty > state.fence[state.location]) return reject('fence_limit');
      const revenue = quote(marketRow(state, state.location, cmd.goodId, lot.heat), 'sell', cmd.qty);
      const profit = Math.round(revenue - lot.avgCost * cmd.qty);
      state.wallet.credits += revenue;
      moveMarket(state, state.location, cmd.goodId, -cmd.qty);
      if (viaFence) state.fence[state.location] -= cmd.qty;
      lot.qty -= cmd.qty;
      if (lot.qty === 0) delete state.cargo[cmd.goodId];
      state.stats.profit += profit;
      if (profit > 0) state.league.score += profit;
      events.push({ type: 'Sold', goodId: cmd.goodId, qty: cmd.qty, revenue, profit });
      progress(state, 'sellUnits', cmd.qty);
      progress(state, 'profit', profit);
      if (good.tier !== 'free') progress(state, 'hotUnits', cmd.qty);
      if (profit > 0) addXp(state, CONFIG.travel.xpPerSaleLog * Math.log10(1 + profit), events, now);
      break;
    }
    case 'Jump': {
      if (!state.routes.includes(cmd.to)) return reject('no_such_route');
      if (state.fuel.amount < 1) return reject('no_fuel');
      state.fuel.amount -= 1;
      events.push({ type: 'JumpStarted', from: state.location, to: cmd.to });
      touchStreak(state, events);
      const chance = encounterChances(state, cmd.to);
      const roll = nextFloat(state.rng.travel);
      const kind: EncounterKind | null = roll < chance.pirates ? 'pirates' : roll < chance.pirates + chance.customs ? 'customs' : null;
      if (kind) {
        state.pending = { to: cmd.to, kind };
        events.push({ type: 'EncounterStarted', kind });
      } else {
        arrive(state, cmd.to, events, now);
      }
      break;
    }
    case 'Encounter': {
      if (!state.pending) return reject('no_encounter');
      if (!resolveEncounter(state, cmd.choice, events, now)) return reject('invalid_choice');
      break;
    }
    case 'SetSeat': {
      if (!SEATS.includes(cmd.seat)) return reject('unknown_command');
      if (cmd.cardId !== null && !(state.collection[cmd.cardId] && CARD_BY_ID.has(cmd.cardId))) return reject('card_not_owned');
      if (cmd.cardId !== null && state.convoys.some((c) => c.cards.includes(cmd.cardId!))) return reject('card_busy');
      // A card sits in one seat only: taking a new seat frees the old one.
      if (cmd.cardId) for (const seat of SEATS) if (state.deck[seat] === cmd.cardId) state.deck[seat] = null;
      state.deck[cmd.seat] = cmd.cardId;
      events.push({ type: 'DeckChanged' });
      break;
    }
    case 'AutoDeck': {
      autoDeck(state);
      events.push({ type: 'DeckChanged' });
      break;
    }
    case 'ClaimSeasonAlbum': {
      const album = seasonAlbum(state);
      if (!album.claimable || !album.next) return reject('not_claimable');
      state.season.album += 1;
      const complete = state.season.album >= CONFIG.season.album.milestones.length;
      // A finished album leaves a title and a paint behind for good.
      if (complete && !state.cosmetics.seasons.includes(state.season.index)) state.cosmetics.seasons.push(state.season.index);
      events.push({ type: 'SeasonAlbumClaimed', step: state.season.album, complete });
      grantReward(state, album.next.reward, events);
      break;
    }
    case 'SetTitle': {
      const title = titleList(factsOf(state), state.season.index).find((x) => x.id === cmd.title);
      if (!title) return reject('unknown_command');
      if (!title.unlocked) return reject('not_owned');
      state.cosmetics.title = title.id;
      events.push({ type: 'CosmeticsChanged' });
      break;
    }
    case 'SetPaint': {
      if (!PAINT_BY_ID.has(cmd.paint)) return reject('unknown_command');
      if (!paintUnlocked(state, cmd.paint)) return reject('not_owned');
      state.cosmetics.paint = cmd.paint;
      events.push({ type: 'CosmeticsChanged' });
      break;
    }
    case 'BuyPaint': {
      const def = PAINT_BY_ID.get(cmd.paint);
      if (!def || def.price === null) return reject('unknown_command');
      if (state.cosmetics.owned.includes(def.id)) return reject('already_owned');
      if (state.wallet.quanta < def.price) return reject('not_enough_quanta');
      state.wallet.quanta -= def.price;
      state.cosmetics.owned.push(def.id);
      state.cosmetics.paint = def.id;
      events.push({ type: 'PaintBought', paint: def.id });
      break;
    }
    case 'SetShowcase': {
      const cards = cmd.cards;
      if (cards.length > 3 || new Set(cards).size !== cards.length) return reject('invalid_choice');
      if (cards.some((id) => !state.collection[id] || !CARD_BY_ID.has(id))) return reject('card_not_owned');
      state.cosmetics.showcase = [...cards];
      events.push({ type: 'CosmeticsChanged' });
      break;
    }
    case 'Prestige': {
      const p = CONFIG.prestige;
      if (state.prestige >= p.max) return reject('max_level');
      if (state.profile.level < p.level) return reject('level_too_low');
      state.prestige += 1;
      // Gone: level, credits, cargo, hold, ships, modules, trading posts, wanted levels.
      // Kept: crew and their levels, quanta, shards, albums, season, league, streak, cosmetics, lifetime numbers.
      state.profile = { level: 1, xp: 0 };
      state.wallet.credits = CONFIG.startCredits;
      state.wallet.quanta += p.quanta;
      state.wallet.shards += p.shards;
      state.hold = 0;
      state.fleet = newFleet();
      state.posts = {};
      state.cargo = {};
      state.salvage = null;
      for (const f of FACTION_IDS) state.wanted[f] = { level: 0, cool: 0 };
      state.fuel = { amount: fuelMax(state), updatedAt: now };
      events.push({ type: 'Prestiged', rank: state.prestige });
      break;
    }
    case 'BuyShip': {
      const def = SHIP_BY_ID.get(cmd.ship);
      if (!def) return reject('unknown_command');
      if (state.fleet.owned.includes(def.id)) return reject('already_owned');
      if (state.profile.level < def.level) return reject('level_too_low');
      if (state.wallet.credits < def.price) return reject('not_enough_credits');
      state.wallet.credits -= def.price;
      state.fleet.owned.push(def.id);
      events.push({ type: 'ShipBought', ship: def.id });
      // Move in right away when the cargo fits.
      if (selectShip(state, def.id)) events.push({ type: 'ShipSelected', ship: def.id });
      break;
    }
    case 'SelectShip': {
      if (!SHIP_BY_ID.has(cmd.ship)) return reject('unknown_command');
      if (!state.fleet.owned.includes(cmd.ship)) return reject('not_owned');
      if (state.fleet.active === cmd.ship) return reject('invalid_choice');
      if (!selectShip(state, cmd.ship)) return reject('no_cargo_space');
      events.push({ type: 'ShipSelected', ship: cmd.ship });
      break;
    }
    case 'BuyModule': {
      const def = MODULE_BY_ID.get(cmd.module);
      if (!def) return reject('unknown_command');
      const level = state.fleet.modules[def.id] ?? 0;
      if (level >= MODULE_MAX) return reject('max_level');
      const price = def.prices[level]!;
      if (state.wallet.credits < price) return reject('not_enough_credits');
      state.wallet.credits -= price;
      state.fleet.modules[def.id] = level + 1;
      if (!state.fleet.fitted.includes(def.id) && state.fleet.fitted.length < rigOf(state.fleet).slots) state.fleet.fitted.push(def.id);
      events.push({ type: 'ModuleBought', module: def.id, level: level + 1 });
      break;
    }
    case 'FitModule': {
      if (!MODULE_BY_ID.has(cmd.module)) return reject('unknown_command');
      if (!state.fleet.modules[cmd.module]) return reject('not_owned');
      if (state.fleet.fitted.includes(cmd.module)) return reject('invalid_choice');
      if (state.fleet.fitted.length >= rigOf(state.fleet).slots) return reject('no_free_slot');
      state.fleet.fitted.push(cmd.module);
      events.push({ type: 'ModulesChanged' });
      break;
    }
    case 'UnfitModule': {
      if (!state.fleet.fitted.includes(cmd.module)) return reject('invalid_choice');
      const fitted = state.fleet.fitted.filter((m) => m !== cmd.module);
      if (cargoUsed(state) > holdCap(state.hold) + rigOf({ ...state.fleet, fitted }).hold) return reject('no_cargo_space');
      state.fleet.fitted = fitted;
      state.fuel.amount = Math.min(state.fuel.amount, fuelMax(state));
      events.push({ type: 'ModulesChanged' });
      break;
    }
    case 'SendConvoy': {
      const offer = state.daily.convoys[cmd.offer];
      if (!offer || offer.taken) return reject('no_such_contract');
      if (state.convoys.length >= CONFIG.convoy.slots) return reject('no_free_slot');
      const seated = new Set<string>(SEATS.map((seat) => state.deck[seat]).filter((id): id is string => !!id));
      const away = new Set(state.convoys.flatMap((c) => c.cards));
      const team = cmd.cards;
      if (team.length < 1 || team.length > CONFIG.convoy.crew || new Set(team).size !== team.length) return reject('invalid_team');
      for (const id of team) {
        if (!state.collection[id] || !CARD_BY_ID.has(id)) return reject('card_not_owned');
        if (seated.has(id) || away.has(id)) return reject('card_busy');
      }
      offer.taken = true;
      const chance = convoyChance(offer, team, state.cardLevels);
      state.convoys.push({ offer: { ...offer }, cards: [...team], endsAt: now + offer.hours * 3_600_000, chance });
      events.push({ type: 'ConvoySent', hours: offer.hours, chance });
      break;
    }
    case 'ClaimConvoy': {
      const convoy = state.convoys[cmd.slot];
      if (!convoy) return reject('no_such_slot');
      if (convoy.endsAt > now) return reject('slot_not_ready');
      state.convoys.splice(cmd.slot, 1);
      const success = nextFloat(state.rng.convoy) < convoy.chance;
      const { reward, xp } = convoyPayout(convoy.offer, success);
      if (success) state.stats.convoys += 1;
      events.push({ type: 'ConvoyReturned', success, reward, xp });
      grantReward(state, reward, events);
      addXp(state, xp, events, now);
      break;
    }
    case 'RushConvoy': {
      const convoy = state.convoys[cmd.slot];
      if (!convoy) return reject('no_such_slot');
      if (convoy.endsAt <= now) return reject('not_claimable');
      const cost = minutesCost(convoy.endsAt - now);
      if (state.wallet.quanta < cost) return reject('not_enough_quanta');
      state.wallet.quanta -= cost;
      convoy.endsAt = now;
      break;
    }
    case 'UpgradeHold': {
      if (state.hold >= CONFIG.hold.maxLevel) return reject('max_level');
      const cost = holdCost(state.hold);
      if (state.wallet.credits < cost) return reject('not_enough_credits');
      state.wallet.credits -= cost;
      state.hold += 1;
      events.push({ type: 'HoldUpgraded', level: state.hold, cap: cargoCap(state) });
      break;
    }
    case 'PayOff': {
      const faction = factionOf(state.location);
      const w = state.wanted[faction];
      if (w.level === 0) return reject('not_wanted');
      const cost = CONFIG.wanted.payOffPerStar * w.level;
      if (state.wallet.credits < cost) return reject('not_enough_credits');
      state.wallet.credits -= cost;
      w.level -= 1;
      w.cool = CONFIG.wanted.coolJumps;
      events.push({ type: 'WantedChanged', faction, level: w.level });
      break;
    }
    default:
      return reject('unknown_command');
  }
  return { state, events };
}

// ---------------------------------------------------------------------------
// View and wire format
// ---------------------------------------------------------------------------

export function toClientView(state: GameState, now: number): ClientView {
  const s = clone(state);
  settleFuel(s, now);
  settleFree(s, now);
  settleDaily(s, now);
  settlePosts(s, now);
  settleAuctions(s, now);
  settleCalendar(s, now);
  s.blockade = weekendActive(now);
  if (dayIndex(now) - s.lastActiveDay >= CONFIG.comeback.days) s.comeback = true;
  const max = fuelMax(s);
  const regenMs = fuelRegen(s);
  const album = seasonAlbum(s);
  const facts = factsOf(s);
  const titles = titleList(facts, s.season.index);
  const here = s.location;
  const hereFaction = factionOf(here);
  const deck = deckInfo(s.deck, s.cardLevels);
  const day = s.daily.day;

  const slots: SlotView[] = s.slots.map((slot) => ({
    tier: slot.tier,
    state: slot.readyAt === null ? 'sealed' : slot.readyAt > now ? 'unlocking' : 'ready',
    readyAt: slot.readyAt,
    unlockMs: CONFIG.crate.tiers[slot.tier].unlockMs,
    speedUpCost: speedUpCost(slot, now),
  }));
  const albums = Object.fromEntries(FACTION_IDS.map((f) => [f, albumInfo(s.collection, s.albums[f], f)])) as Record<FactionId, AlbumView>;
  const missionsDone = s.daily.missions.filter((m) => m.progress >= m.target).length;
  const calendarClaimable = s.calendar.lastDay !== day;
  const chestClaimable = !s.daily.chestClaimed && missionsDone === s.daily.missions.length;
  const manifests = s.daily.manifests.map((m) => ({ ...m, have: manifestCandidates(m, s.collection).length }));
  const postList: PostView[] = (Object.entries(s.posts) as [StationId, Post][]).map(([stationId, post]) => {
    const cap = postCap(post.level);
    const building = post.readyAt > now;
    return {
      stationId,
      level: post.level,
      perHour: postPerHour(post.level),
      stored: Math.floor(post.stored),
      cap,
      fullAt: building || post.stored >= cap ? null : now + ((cap - post.stored) / postPerHour(post.level)) * 3_600_000,
      readyAt: building ? post.readyAt : null,
      speedUpCost: building ? minutesCost(post.readyAt - now) : 0,
    };
  });
  const hereLevel = s.posts[here]?.level ?? 0;
  const tier = charterTier(s.season.xp);
  const table = standings(s.league.seed, s.league.week, s.league.tier, s.league.score, now);
  const milestones = CONFIG.weekend.milestones.map((at, i) => ({ at, reward: CONFIG.weekend.rewards[i]! as Reward, claimed: i < s.weekend.claimed }));
  const weekendClaimable = milestones.filter((m, i) => i >= s.weekend.claimed && s.weekend.points >= m.at).length;
  const charterClaimable = (tier - s.season.claimedFree) + (s.season.premium ? tier - s.season.claimedPremium : 0);
  const lots: LotView[] = activeLots(s, now).map((lot) => {
    const yourMax = s.auction.bids[lot.key] ?? null;
    const rival = rivalNow(lot, now);
    const price = Math.max(lot.start, rival);
    const leading = yourMax !== null && yourMax > rival;
    return {
      key: lot.key, cardId: lot.cardId, endsAt: lot.endsAt, estimate: lot.estimate,
      price,
      minBid: Math.max(price, yourMax ?? 0) + bidStep(price),
      buyNow: lot.buyNow,
      yourMax,
      leading,
      gone: s.auction.bought.includes(lot.key),
    };
  });

  const market: MarketRow[] = GOODS.map((g) => marketRow(s, here, g.id, s.cargo[g.id]?.heat ?? 0));
  const lot = CONFIG.market.hintLot;

  const routes: RouteView[] = s.routes.map((id) => {
    const dest = STATION_BY_ID.get(id)!;
    const chance = encounterChances(s, id);
    const hints = GOODS
      // Hints are quoted for a typical lot, including the price impact on both ends.
      .map((g) => ({
        goodId: g.id,
        pct: quote(marketRow(s, id, g.id, 1), 'sell', lot) / quote(marketRow(s, here, g.id, 0), 'buy', lot) - 1,
        fence: bannedAt(g, id),
      }))
      .filter((h) => h.pct > 0.05)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
    return {
      stationId: id,
      fuel: 1,
      customsChance: chance.customs,
      piratesChance: chance.pirates,
      wanted: s.wanted[dest.faction].level,
      event: s.event && s.event.stationId === id ? { category: s.event.category, mult: s.event.mult, jumpsLeft: s.event.jumpsLeft } : null,
      hints,
    };
  });

  return {
    serverTime: now,
    profile: s.profile,
    wallet: s.wallet,
    fuel: {
      amount: s.fuel.amount, max,
      nextAt: s.fuel.amount >= max ? null : s.fuel.updatedAt + regenMs,
      fullAt: s.fuel.amount >= max ? null : s.fuel.updatedAt + (max - s.fuel.amount) * regenMs,
    },
    crates: {
      free: { stock: s.crates.freeStock, max: CONFIG.crate.freeMax, intervalMs: CONFIG.crate.freeIntervalMs, nextAt: s.crates.freeStock >= CONFIG.crate.freeMax ? null : s.crates.freeAt },
      tiers: Object.fromEntries(CRATE_TIERS.map((tier) => {
        const cfg = CONFIG.crate.tiers[tier];
        return [tier, {
          currency: cfg.currency, price: cratePrice(tier, s.daily.bought[tier]), nextPrice: cratePrice(tier, s.daily.bought[tier] + 1), cards: cfg.cards, floor: cfg.floor, odds: effectiveOdds(tier), unlockMs: cfg.unlockMs,
          dailyLimit: cfg.dailyLimit, leftToday: Math.max(0, cfg.dailyLimit - s.daily.bought[tier]),
        }];
      })) as ClientView['crates']['tiers'],
      opened: s.crates.opened,
      pityElite: { current: s.crates.sinceElite, max: CONFIG.crate.pityElite },
      pityLegend: { current: s.crates.sinceLegend, max: CONFIG.crate.pityLegend },
    },
    slots,
    slotCap: CONFIG.crate.slots,
    collection: s.collection,
    cardLevels: s.cardLevels,
    daily: {
      endsAt: dayEndsAt(now),
      missions: s.daily.missions,
      chest: { done: missionsDone, total: s.daily.missions.length, claimed: s.daily.chestClaimed, reward: CONFIG.daily.chest },
      offers: s.daily.offers,
      manifests,
      wheel: {
        available: !s.daily.wheelSpun,
        segments: CONFIG.wheel.map((seg, i) => ({ weight: seg.weight, reward: wheelReward(i, s.profile.level) })),
      },
    },
    posts: {
      list: postList,
      next: hereLevel < CONFIG.posts.maxLevel
        ? { level: hereLevel + 1, cost: CONFIG.posts.cost[hereLevel]!, buildMs: CONFIG.posts.buildMs[hereLevel]!, perHour: postPerHour(hereLevel + 1) }
        : null,
      stored: postList.reduce((sum, p) => sum + p.stored, 0),
    },
    auction: {
      lots,
      listings: s.auction.listings.map((l) => ({ cardId: l.cardId, min: l.min, endsAt: l.endsAt, offer: offerNow(l, now) })),
      results: s.auction.results,
      openBids: Object.keys(s.auction.bids).length,
      maxBids: CONFIG.auction.maxBids,
      maxListings: CONFIG.auction.maxListings,
      fee: CONFIG.auction.fee,
      listMinutes: CONFIG.auction.listMinutes,
    },
    season: {
      index: s.season.index, name: seasonName(s.season.index), endsAt: seasonEndsAt(now),
      xp: s.season.xp, xpPerTier: CONFIG.season.xpPerTier, tier, tiers: CONFIG.season.tiers,
      premium: s.season.premium, premiumPrice: CONFIG.season.premiumPrice,
      claimedFree: s.season.claimedFree, claimedPremium: s.season.claimedPremium,
      claimable: charterClaimable,
      waitingPremium: s.season.premium ? 0 : tier,
    },
    seasonAlbum: { ...album, cardShare: CONFIG.season.cardShare },
    captain: {
      titleId: s.cosmetics.title,
      title: titles.find((x) => x.id === s.cosmetics.title)?.name ?? 'Kapitän',
      paint: s.cosmetics.paint,
      showcase: s.cosmetics.showcase.filter((id) => s.collection[id]),
      titles,
      paints: PAINTS.map((p) => ({ id: p.id, name: p.name, tone: p.tone, price: p.price, hint: p.hint, unlocked: paintUnlocked(s, p.id) })),
      prestige: s.prestige,
      prestigeMax: CONFIG.prestige.max,
      prestigeLevel: CONFIG.prestige.level,
      prestigeBonus: CONFIG.prestige.saleBonus,
      canPrestige: s.prestige < CONFIG.prestige.max && s.profile.level >= CONFIG.prestige.level,
      facts,
    },
    league: {
      tier: s.league.tier, tierName: CONFIG.league.tiers[s.league.tier]!, endsAt: weekEndsAt(now), score: s.league.score,
      rank: table.findIndex((x) => x.you) + 1,
      standings: table,
      promote: CONFIG.league.promote, relegate: CONFIG.league.relegate,
      last: s.league.last,
    },
    weekend: {
      active: s.blockade,
      startsAt: weekendStartsAt(now), endsAt: weekEndsAt(now),
      points: s.weekend.points, milestones, claimable: weekendClaimable,
    },
    comeback: s.comeback ? comebackReward(s) : null,
    salvage: s.salvage
      ? { ...s.salvage, outcomes: CONFIG.salvage.outcomes.map((o) => ({ kind: o.kind, weight: o.weight, ...salvagePrize(o.kind, s.salvage!.price) })) }
      : null,
    calendar: { step: s.calendar.step, claimable: calendarClaimable, rewards: CONFIG.calendar },
    streak: {
      count: liveStreak(s.streak, day),
      best: s.streak.best,
      bonus: streakBonus(liveStreak(s.streak, day)),
      status: streakStatus(s.streak, day),
      freezes: s.streak.freezes,
      maxFreezes: CONFIG.streak.maxFreezes,
      freezePrice: CONFIG.streak.freezePrice,
      endsAt: dayEndsAt(now),
    },
    albums,
    saleBonus: saleBonus(s),
    badges: {
      hangar: s.crates.freeStock + slots.filter((x) => x.state === 'ready').length,
      station: postList.filter((p) => p.readyAt === null && p.stored >= p.cap * 0.9).length,
      market: s.auction.results.length + lots.filter((l) => l.yourMax !== null && !l.leading).length,
      daily: s.daily.missions.filter((m) => !m.claimed && m.progress >= m.target).length + (chestClaimable ? 1 : 0) + (calendarClaimable ? 1 : 0)
        + (s.daily.wheelSpun ? 0 : 1)
        + (charterClaimable > 0 ? 1 : 0) + (s.league.last ? 1 : 0) + (weekendClaimable > 0 ? 1 : 0) + (s.comeback ? 1 : 0),
      deck: FACTION_IDS.filter((f) => albums[f].claimable).length + s.convoys.filter((c) => c.endsAt <= now).length + (album.claimable ? 1 : 0)
        // Manifests are handed in where the spare copies are: with the collection.
        + manifests.filter((m) => !m.done && m.have >= m.need).length,
    },
    deck: { seats: deck.seats, chem: deck.chem },
    crew: deck.bonus,
    location: here,
    cargo: { cap: cargoCap(s), used: cargoUsed(s), items: s.cargo },
    holdUpgrade: s.hold < CONFIG.hold.maxLevel ? { level: s.hold + 1, cost: holdCost(s.hold), cap: cargoCap(s) + CONFIG.hold.perLevel } : null,
    fleet: { active: s.fleet.active, owned: s.fleet.owned, modules: s.fleet.modules, fitted: s.fleet.fitted, rig: rigOf(s.fleet) },
    convoys: {
      slots: CONFIG.convoy.slots,
      crew: CONFIG.convoy.crew,
      running: s.convoys.map((c) => ({ ...c, done: c.endsAt <= now, rushCost: c.endsAt <= now ? 0 : minutesCost(c.endsAt - now) })),
      offers: s.daily.convoys,
      busy: s.convoys.flatMap((c) => c.cards),
    },
    market,
    fence: { left: s.fence[here], cap: CONFIG.smuggling.fenceCap, closed: fenceClosed(s, here) },
    event: s.event,
    wanted: Object.fromEntries(FACTION_IDS.map((f) => [f, s.wanted[f].level])) as Record<FactionId, number>,
    payOff: s.wanted[hereFaction].level > 0 ? CONFIG.wanted.payOffPerStar * s.wanted[hereFaction].level : null,
    routes,
    encounter: s.pending
      ? {
        to: s.pending.to,
        kind: s.pending.kind,
        hasContraband: bannedValue(s, factionOf(s.pending.to)) > 0,
        options: encounterOptions(s, s.pending.kind, s.pending.to),
      }
      : null,
    stats: s.stats,
  };
}

const CHOICES: readonly EncounterChoice[] = ['fight', 'flee', 'pay', 'submit', 'bribe', 'breakThrough'];

/** Structural check for commands arriving over the wire. Rules are checked in applyCommand. */
export function parseCommand(input: unknown): Command | null {
  if (typeof input !== 'object' || input === null) return null;
  const c = input as Record<string, unknown>;
  switch (c.type) {
    case 'ClaimFreeCrate':
    case 'AutoDeck':
    case 'PayOff':
    case 'UpgradeHold':
    case 'ClaimChest':
    case 'ClaimCalendar':
    case 'BuyFreeze':
    case 'BuildPost':
    case 'CollectPosts':
    case 'SpinWheel':
    case 'BuySalvage':
    case 'AckAuctions':
    case 'ClaimCharter':
    case 'BuyCharter':
    case 'ClaimLeague':
    case 'ClaimWeekend':
    case 'ClaimComeback':
      return { type: c.type };
    case 'ClaimSeasonAlbum':
    case 'Prestige':
      return { type: c.type };
    case 'SetTitle':
      return typeof c.title === 'string' && c.title.length < 24 ? { type: 'SetTitle', title: c.title } : null;
    case 'SetPaint':
    case 'BuyPaint':
      return typeof c.paint === 'string' && PAINT_BY_ID.has(c.paint) ? { type: c.type, paint: c.paint } : null;
    case 'SetShowcase':
      return Array.isArray(c.cards) && c.cards.length <= 3 && c.cards.every((x: unknown) => typeof x === 'string' && x.length < 16)
        ? { type: 'SetShowcase', cards: c.cards as string[] }
        : null;
    case 'BuyShip':
    case 'SelectShip':
      return typeof c.ship === 'string' && SHIP_BY_ID.has(c.ship as ShipId) ? { type: c.type, ship: c.ship as ShipId } : null;
    case 'BuyModule':
    case 'FitModule':
    case 'UnfitModule':
      return typeof c.module === 'string' && MODULE_BY_ID.has(c.module as ModuleId) ? { type: c.type, module: c.module as ModuleId } : null;
    case 'SendConvoy':
      return Number.isInteger(c.offer) && Array.isArray(c.cards) && c.cards.length <= 8 && c.cards.every((x: unknown) => typeof x === 'string' && x.length < 16)
        ? { type: 'SendConvoy', offer: c.offer as number, cards: c.cards as string[] }
        : null;
    case 'ClaimConvoy':
    case 'RushConvoy':
      return Number.isInteger(c.slot) ? { type: c.type, slot: c.slot as number } : null;
    case 'PlaceBid':
      return typeof c.lot === 'string' && /^\d:-?\d{1,9}$/.test(c.lot) && typeof c.max === 'number' ? { type: 'PlaceBid', lot: c.lot, max: c.max } : null;
    case 'BuyNow':
      return typeof c.lot === 'string' && /^\d:-?\d{1,9}$/.test(c.lot) ? { type: 'BuyNow', lot: c.lot } : null;
    case 'ListCard':
      return typeof c.cardId === 'string' && c.cardId.length < 16 && typeof c.min === 'number' && typeof c.duration === 'number'
        ? { type: 'ListCard', cardId: c.cardId, min: c.min, duration: c.duration }
        : null;
    case 'SpeedUpPost':
      return typeof c.stationId === 'string' && STATION_BY_ID.has(c.stationId as StationId) ? { type: 'SpeedUpPost', stationId: c.stationId as StationId } : null;
    case 'BuyOffer':
    case 'SubmitManifest':
      return typeof c.index === 'number' && Number.isInteger(c.index) && c.index >= 0 && c.index < 16 ? { type: c.type, index: c.index } : null;
    case 'BuyCrate':
      return typeof c.tier === 'string' && CRATE_TIERS.includes(c.tier as CrateTier) ? { type: 'BuyCrate', tier: c.tier as CrateTier } : null;
    case 'StartUnlock':
    case 'OpenSlot':
    case 'SpeedUp':
      return typeof c.slot === 'number' && Number.isInteger(c.slot) && c.slot >= 0 && c.slot < 16 ? { type: c.type, slot: c.slot } : null;
    case 'ClaimMission':
      return typeof c.index === 'number' && Number.isInteger(c.index) && c.index >= 0 && c.index < 16 ? { type: 'ClaimMission', index: c.index } : null;
    case 'UpgradeCard':
    case 'ForgeCard':
      return typeof c.cardId === 'string' && c.cardId.length < 16 ? { type: c.type, cardId: c.cardId } : null;
    case 'ClaimAlbum':
      return typeof c.faction === 'string' && FACTION_IDS.includes(c.faction as FactionId) ? { type: 'ClaimAlbum', faction: c.faction as FactionId } : null;
    case 'Buy':
    case 'Sell':
      if (typeof c.goodId === 'string' && GOOD_BY_ID.has(c.goodId as GoodId) && typeof c.qty === 'number') {
        return { type: c.type, goodId: c.goodId as GoodId, qty: c.qty };
      }
      return null;
    case 'Jump':
      return typeof c.to === 'string' && STATION_BY_ID.has(c.to as StationId) ? { type: 'Jump', to: c.to as StationId } : null;
    case 'Encounter':
      return typeof c.choice === 'string' && CHOICES.includes(c.choice as EncounterChoice)
        ? { type: 'Encounter', choice: c.choice as EncounterChoice }
        : null;
    case 'SetSeat':
      if (typeof c.seat === 'string' && SEATS.includes(c.seat as RoleId) && (c.cardId === null || typeof c.cardId === 'string')) {
        return { type: 'SetSeat', seat: c.seat as RoleId, cardId: c.cardId as string | null };
      }
      return null;
    default:
      return null;
  }
}
