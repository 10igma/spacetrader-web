import { CONFIG } from './config.ts';
import {
  CARD_BY_ID, CARDS_BY_RARITY, RARITIES, rarityRank,
  type CardDef, type FactionId, type Rarity, type RoleId,
} from './content.ts';
import {
  albumInfo, CRATE_TIERS, cratePrice, dayEndsAt, dayIndex, effectiveOdds, liveStreak, rollMissions, speedUpCost, streakBonus, streakStatus, upgradeCost,
  type AlbumView, type CrateTier, type Mission, type Reward, type Slot, type StreakState, type StreakStatus,
} from './meta.ts';
import { nextFloat, pick, seedRng, type RngState } from './rng.ts';
import {
  GOOD_BY_ID, GOODS, isBanned, STATION_BY_ID, STATIONS, stationMod,
  type Category, type GoodDef, type GoodId, type StationId,
} from './world.ts';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const STATE_VERSION = 5;

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
  rng: { crate: RngState; market: RngState; travel: RngState; daily: RngState };
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
  daily: { day: number; missions: Mission[]; chestClaimed: boolean; bought: Record<CrateTier, number> };
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
  stats: { jumps: number; profit: number; caught: number };
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

export interface SlotView { tier: CrateTier; state: 'sealed' | 'unlocking' | 'ready'; readyAt: number | null; unlockMs: number; speedUpCost: number }

/** What the client is allowed to see. No RNG state, no prices of places you are not at. */
export interface ClientView {
  serverTime: number;
  profile: { level: number; xp: number };
  wallet: { credits: number; quanta: number; shards: number };
  fuel: { amount: number; max: number; nextAt: number | null };
  crates: {
    free: { stock: number; max: number; nextAt: number | null };
    tiers: Record<CrateTier, { currency: 'credits' | 'quanta'; price: number; nextPrice: number; cards: number; floor: Rarity; odds: Record<Rarity, number>; unlockMs: number; dailyLimit: number; leftToday: number }>;
    opened: number;
    pityElite: { current: number; max: number };
    pityLegend: { current: number; max: number };
  };
  slots: SlotView[];
  slotCap: number;
  collection: Record<string, number>;
  cardLevels: Record<string, number>;
  daily: { endsAt: number; missions: Mission[]; chest: { done: number; total: number; claimed: boolean; reward: Reward } };
  calendar: { step: number; claimable: boolean; rewards: readonly Reward[] };
  streak: { count: number; best: number; bonus: number; status: StreakStatus; freezes: number; maxFreezes: number; freezePrice: number; endsAt: number };
  albums: Record<FactionId, AlbumView>;
  /** Permanent and streak bonuses on every sale, already included in market prices. */
  saleBonus: { streak: number; album: number };
  /** Things waiting to be collected, per tab. Drives the red dots. */
  badges: { hangar: number; daily: number; deck: number };
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
  stats: { jumps: number; profit: number; caught: number };
}

// ---------------------------------------------------------------------------
// Commands and events
// ---------------------------------------------------------------------------

export type Command =
  | { type: 'ClaimFreeCrate' }
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
  | 'daily_limit' | 'already_owned';

export type GameEvent =
  | { type: 'CrateOpened'; source: 'free' | 'bought' | 'slot'; tier: CrateTier; pulls: Pull[] }
  | { type: 'CrateEarned'; tier: CrateTier }
  | { type: 'CrateLost'; tier: CrateTier }
  | { type: 'RewardGranted'; reward: Reward }
  | { type: 'CardUpgraded'; cardId: string; level: number }
  | { type: 'CardForged'; cardId: string }
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
    rng: { crate: seedRng(`${seed}:crate`), market: seedRng(`${seed}:market`), travel: seedRng(`${seed}:travel`), daily: seedRng(`${seed}:daily`) },
    profile: { level: 1, xp: 0 },
    wallet: { credits: CONFIG.startCredits, quanta: CONFIG.startQuanta, shards: 0 },
    fuel: { amount: CONFIG.fuel.max, updatedAt: now },
    // First free crate is ready immediately: generous start.
    crates: { freeStock: 1, freeAt: now + CONFIG.crate.freeIntervalMs, opened: 0, sinceElite: 0, sinceLegend: 0 },
    slots: [],
    collection: {},
    cardLevels: {},
    deck: { pilot: null, trader: null, tech: null, gunner: null, smuggler: null },
    daily: { day: -1, missions: [], chestClaimed: false, bought: { standard: 0, premium: 0 } },
    calendar: { lastDay: -1, step: 0 },
    streak: { count: 0, lastDay: -1, freezes: 0, best: 0 },
    albums: { helix: 0, tessera: 0, asche: 0, zenit: 0 },
    location: CONFIG.startStation,
    hold: 0,
    cargo: {},
    market: Object.fromEntries(
      STATIONS.map((s) => [s.id, Object.fromEntries(GOODS.map((g) => [g.id, 0]))]),
    ) as GameState['market'],
    fence: Object.fromEntries(STATIONS.map((s) => [s.id, CONFIG.smuggling.fenceCap])) as GameState['fence'],
    event: null,
    wanted: Object.fromEntries(FACTION_IDS.map((f) => [f, { level: 0, cool: 0 }])) as GameState['wanted'],
    routes: [],
    pending: null,
    stats: { jumps: 0, profit: 0, caught: 0 },
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

function settleFuel(state: GameState, now: number): void {
  const { max, regenMs } = CONFIG.fuel;
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
  while (state.profile.xp >= xpForLevel(state.profile.level)) {
    state.profile.xp -= xpForLevel(state.profile.level);
    state.profile.level += 1;
    // A level-up refills the tank: the session continues exactly when it would end.
    state.fuel.amount = CONFIG.fuel.max;
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
  state.daily = { day, missions: rollMissions(state.rng.daily, state.profile.level), chestClaimed: false, bought: { standard: 0, premium: 0 } };
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
}

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

function saleBonus(state: GameState): { streak: number; album: number } {
  return {
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
  const owned = Object.keys(state.collection).map((id) => CARD_BY_ID.get(id)).filter((c): c is CardDef => !!c);
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
    sellFactor: (banned ? s.fenceSell + s.fenceSellCrew * hdl : CONFIG.travel.sellFactor + CONFIG.travel.sellFactorCrew * hdl) * hot * (1 + extra.streak + extra.album),
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
      + maxHeat(state) * CONFIG.smuggling.heatCustoms * (1 - 0.5 * crew.smg);
  return { pirates, customs: clamp(customs, 0, 0.9 - pirates) };
}

function encounterOptions(state: GameState, kind: EncounterKind, to: StationId): EncounterOption[] {
  const e = CONFIG.encounter;
  const crew = crewOf(state);
  if (kind === 'pirates') {
    const tribute = Math.min(state.wallet.credits, Math.max(e.tributeMin, Math.round(state.wallet.credits * e.tributeShare)));
    return [
      { id: 'fight', chance: e.fight.base + e.fight.crew * crew.kmp, cost: 0 },
      { id: 'flee', chance: e.flee.base + e.flee.crew * crew.nav, cost: 0 },
      { id: 'pay', chance: 1, cost: tribute },
    ];
  }
  const faction = factionOf(to);
  const stars = state.wanted[faction].level;
  const hot = bannedValue(state, faction);
  const detect = clamp(
    e.detect.base - e.detect.tec * crew.tec - e.detect.smg * crew.smg + CONFIG.smuggling.heatDetect * maxHeat(state),
    0.1, 0.95,
  );
  const bribe = Math.min(state.wallet.credits, e.bribeBase + Math.round(hot * e.bribeShare));
  return [
    { id: 'submit', chance: hot > 0 ? 1 - detect : 1, cost: 0 },
    { id: 'bribe', chance: clamp(e.bribe.base + e.bribe.crew * crew.hdl - CONFIG.wanted.bribePenalty * stars, 0.2, 0.97), cost: bribe },
    { id: 'breakThrough', chance: e.breakThrough.base + e.breakThrough.crew * crew.nav, cost: 0 },
  ];
}

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
    const card = pick(rng, CARDS_BY_RARITY[rarity]);
    const owned = state.collection[card.id] ?? 0;
    const isNew = owned === 0;
    const shards = isNew ? 0 : CONFIG.shardsPerDuplicate[rarity];
    state.collection[card.id] = owned + 1;
    state.wallet.shards += shards;
    // A new specialist takes the empty seat for their role, so the first crates matter at once.
    if (isNew && state.deck[card.role] === null) state.deck[card.role] = card.id;
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

function resolveEncounter(state: GameState, choice: EncounterChoice, events: GameEvent[], now: number): boolean {
  const pending = state.pending!;
  const option = encounterOptions(state, pending.kind, pending.to).find((o) => o.id === choice);
  if (!option) return false;

  const e = CONFIG.encounter;
  const before = state.wallet.credits;
  const success = nextFloat(state.rng.travel) < option.chance;
  let lost: Partial<Record<GoodId, number>> = {};
  let wantedDelta = 0;
  const inner: GameEvent[] = [];
  state.wallet.credits -= option.cost;

  if (pending.kind === 'pirates') {
    if (choice === 'fight') {
      if (success) {
        state.wallet.credits += Math.round(e.lootMin + nextFloat(state.rng.travel) * e.lootRange);
        progress(state, 'fightWin', 1);
        // Sometimes the wreck holds a sealed crate.
        if (nextFloat(state.rng.travel) < CONFIG.crate.lootChance) grantCrate(state, 'standard', inner);
      } else lost = loseCargo(state, e.lossOnLostFight);
    } else if (choice === 'flee' && !success) {
      lost = loseCargo(state, e.lossOnFailedFlee);
    }
  } else {
    const faction = factionOf(pending.to);
    if (!success) {
      // Any failed customs choice ends in a full scan: banned cargo is seized and fined.
      const hot = bannedValue(state, faction);
      const stars = state.wanted[faction].level;
      const fine = hot > 0 ? Math.round(hot * e.fineShare * (1 + CONFIG.wanted.fineMult * stars)) : choice === 'submit' ? 0 : e.flatFine;
      lost = loseCargo(state, 1, faction);
      state.wallet.credits -= Math.min(state.wallet.credits, fine);
      if (hot > 0) state.stats.caught += 1;
      wantedDelta = addWanted(state, faction, choice === 'breakThrough' ? 2 : 1, inner);
    } else {
      progress(state, 'customsPass', 1);
      // Running a blockade is noticed, even when it works.
      if (choice === 'breakThrough') wantedDelta = addWanted(state, faction, 1, inner);
    }
  }

  events.push({
    type: 'EncounterResolved', kind: pending.kind, choice, success,
    creditsDelta: state.wallet.credits - before, lost, wantedDelta,
  });
  events.push(...inner);
  arrive(state, pending.to, events, now);
  return true;
}

// ---------------------------------------------------------------------------
// The one way state changes
// ---------------------------------------------------------------------------

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
      const cost = CONFIG.cards.forge[card.rarity];
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
      if (cargoUsed(state) + cmd.qty > holdCap(state.hold)) return reject('no_cargo_space');
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
    case 'UpgradeHold': {
      if (state.hold >= CONFIG.hold.maxLevel) return reject('max_level');
      const cost = holdCost(state.hold);
      if (state.wallet.credits < cost) return reject('not_enough_credits');
      state.wallet.credits -= cost;
      state.hold += 1;
      events.push({ type: 'HoldUpgraded', level: state.hold, cap: holdCap(state.hold) });
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
  const { max, regenMs } = CONFIG.fuel;
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
    fuel: { amount: s.fuel.amount, max, nextAt: s.fuel.amount >= max ? null : s.fuel.updatedAt + regenMs },
    crates: {
      free: { stock: s.crates.freeStock, max: CONFIG.crate.freeMax, nextAt: s.crates.freeStock >= CONFIG.crate.freeMax ? null : s.crates.freeAt },
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
    },
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
      daily: s.daily.missions.filter((m) => !m.claimed && m.progress >= m.target).length + (chestClaimable ? 1 : 0) + (calendarClaimable ? 1 : 0),
      deck: FACTION_IDS.filter((f) => albums[f].claimable).length,
    },
    deck: { seats: deck.seats, chem: deck.chem },
    crew: deck.bonus,
    location: here,
    cargo: { cap: holdCap(s.hold), used: cargoUsed(s), items: s.cargo },
    holdUpgrade: s.hold < CONFIG.hold.maxLevel ? { level: s.hold + 1, cost: holdCost(s.hold), cap: holdCap(s.hold + 1) } : null,
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
      return { type: c.type };
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
