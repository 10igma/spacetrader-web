import { CONFIG } from './config.ts';
import {
  CARD_BY_ID, CARDS_BY_RARITY, RARITIES, rarityRank,
  type CardDef, type FactionId, type Rarity, type RoleId,
} from './content.ts';
import { nextFloat, pick, seedRng, type RngState } from './rng.ts';
import {
  GOOD_BY_ID, GOODS, isBanned, STATION_BY_ID, STATIONS, stationMod,
  type Category, type GoodDef, type GoodId, type StationId,
} from './world.ts';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const STATE_VERSION = 4;

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
  rng: { crate: RngState; market: RngState; travel: RngState };
  profile: { level: number; xp: number };
  wallet: { credits: number; quanta: number; shards: number };
  fuel: { amount: number; updatedAt: number };
  crates: { nextFreeAt: number; opened: number; sinceElite: number; sinceLegend: number };
  collection: Record<string, number>;
  deck: Record<RoleId, string | null>;
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

/** What the client is allowed to see. No RNG state, no prices of places you are not at. */
export interface ClientView {
  serverTime: number;
  profile: { level: number; xp: number };
  wallet: { credits: number; quanta: number; shards: number };
  fuel: { amount: number; max: number; nextAt: number | null };
  crates: {
    nextFreeAt: number;
    price: number;
    opened: number;
    pityElite: { current: number; max: number };
    pityLegend: { current: number; max: number };
  };
  collection: Record<string, number>;
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
  | { type: 'BuyCrate' }
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
}

export type RejectReason =
  | 'free_crate_not_ready' | 'not_enough_credits' | 'unknown_command'
  | 'no_cargo_space' | 'not_in_cargo' | 'no_fuel' | 'no_such_route'
  | 'encounter_pending' | 'no_encounter' | 'invalid_choice'
  | 'fence_limit' | 'fence_closed' | 'card_not_owned' | 'not_wanted' | 'max_level';

export type GameEvent =
  | { type: 'CrateOpened'; source: 'free' | 'bought'; pulls: Pull[] }
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
    rng: { crate: seedRng(`${seed}:crate`), market: seedRng(`${seed}:market`), travel: seedRng(`${seed}:travel`) },
    profile: { level: 1, xp: 0 },
    wallet: { credits: CONFIG.startCredits, quanta: CONFIG.startQuanta, shards: 0 },
    fuel: { amount: CONFIG.fuel.max, updatedAt: now },
    // First free crate is ready immediately: generous start.
    crates: { nextFreeAt: now, opened: 0, sinceElite: 0, sinceLegend: 0 },
    collection: {},
    deck: { pilot: null, trader: null, tech: null, gunner: null, smuggler: null },
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
    events.push({ type: 'LevelUp', level: state.profile.level });
  }
}

// ---------------------------------------------------------------------------
// Deck: five seats, role fit and faction chemistry
// ---------------------------------------------------------------------------

const SEAT_BONUS: Record<RoleId, BonusKey> = { pilot: 'nav', trader: 'hdl', tech: 'tec', gunner: 'kmp', smuggler: 'smg' };

/** The stat a card brings to a seat. Stealth has no stat of its own: it is nerve plus trade sense. */
export function seatStat(card: CardDef, seat: RoleId): number {
  const key = SEAT_BONUS[seat];
  return key === 'smg' ? Math.round((card.stats.nav + card.stats.hdl) / 2) : card.stats[key];
}

function seatFit(card: CardDef, seat: RoleId): number {
  return seatStat(card, seat) * (card.role === seat ? 1 : CONFIG.deck.offRole);
}

export function deckInfo(deck: GameState['deck']): { seats: Record<RoleId, SeatView | null>; bonus: CrewBonus; chem: number } {
  const seated = SEATS.map((seat) => ({ seat, card: deck[seat] ? CARD_BY_ID.get(deck[seat]!) : undefined }));
  const seats = {} as Record<RoleId, SeatView | null>;
  const bonus: CrewBonus = { nav: 0, hdl: 0, tec: 0, kmp: 0, smg: 0 };
  let linkSum = 0;
  for (const { seat, card } of seated) {
    if (!card) { seats[seat] = null; continue; }
    const links = seated.filter((o) => o.card && o.card.id !== card.id && o.card.faction === card.faction).length;
    const value = Math.round(seatFit(card, seat) * (1 + links * CONFIG.deck.chemPerLink));
    seats[seat] = { cardId: card.id, value, links, onRole: card.role === seat };
    bonus[SEAT_BONUS[seat]] = clamp((value - 40) / 60, 0, 1);
    linkSum += links;
  }
  // 5 cards with 4 links each is a full single-faction crew.
  return { seats, bonus, chem: Math.round((linkSum / (SEATS.length * (SEATS.length - 1))) * 100) };
}

const crewOf = (state: GameState): CrewBonus => deckInfo(state.deck).bonus;

function autoDeck(state: GameState): void {
  const owned = Object.keys(state.collection).map((id) => CARD_BY_ID.get(id)).filter((c): c is CardDef => !!c);
  const used = new Set<string>();
  // Fill the seat with the clearest best candidate first, so specialists land in their role.
  const order = [...SEATS].sort((a, b) => {
    const best = (seat: RoleId): number => Math.max(0, ...owned.map((c) => seatFit(c, seat)));
    return best(b) - best(a);
  });
  for (const seat of order) {
    let pickCard: CardDef | null = null;
    for (const c of owned) {
      if (used.has(c.id)) continue;
      if (!pickCard || seatFit(c, seat) > seatFit(pickCard, seat)) pickCard = c;
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
  const row = {
    goodId,
    channel: banned ? 'fence' as const : 'open' as const,
    list: anchor * (1 + state.market[stationId][goodId]),
    step: anchor * CONFIG.market.impact,
    buyFactor: banned ? s.fenceBuy : 1,
    sellFactor: (banned ? s.fenceSell + s.fenceSellCrew * hdl : CONFIG.travel.sellFactor + CONFIG.travel.sellFactorCrew * hdl) * hot,
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

function rollRarity(rng: RngState, min: Rarity): Rarity {
  const minRank = rarityRank(min);
  const pool = RARITIES.filter((r) => rarityRank(r) >= minRank);
  const total = pool.reduce((sum, r) => sum + CONFIG.crate.odds[r], 0);
  let x = nextFloat(rng) * total;
  for (const r of pool) {
    x -= CONFIG.crate.odds[r];
    if (x < 0) return r;
  }
  return pool[pool.length - 1] as Rarity;
}

function openCrate(state: GameState, source: 'free' | 'bought', events: GameEvent[], now: number): void {
  const cfg = CONFIG.crate;
  const rng = state.rng.crate;

  // The last slot carries the guarantees: base guarantee, then pity overrides.
  let floor: Rarity = cfg.guaranteed;
  if (state.crates.sinceElite + 1 >= cfg.pityElite) floor = 'elite';
  if (state.crates.sinceLegend + 1 >= cfg.pityLegend) floor = 'legend';

  const rarities: Rarity[] = [];
  for (let i = 0; i < cfg.cards; i++) rarities.push(rollRarity(rng, 'standard'));
  const best = Math.max(...rarities.map(rarityRank));
  if (best < rarityRank(floor)) rarities[cfg.cards - 1] = rollRarity(rng, floor);

  const pulls: Pull[] = rarities.map((rarity) => {
    const card = pick(rng, CARDS_BY_RARITY[rarity]);
    const owned = state.collection[card.id] ?? 0;
    const isNew = owned === 0;
    const shards = isNew ? 0 : CONFIG.shardsPerDuplicate[rarity];
    state.collection[card.id] = owned + 1;
    state.wallet.shards += shards;
    // A new specialist takes the empty seat for their role, so the first crates matter at once.
    if (isNew && state.deck[card.role] === null) state.deck[card.role] = card.id;
    return { cardId: card.id, rarity, isNew, shards };
  });
  // Reveal order: weakest first, best last.
  pulls.sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity));

  const top = Math.max(...pulls.map((p) => rarityRank(p.rarity)));
  state.crates.opened += 1;
  state.crates.sinceElite = top >= rarityRank('elite') ? 0 : state.crates.sinceElite + 1;
  state.crates.sinceLegend = top >= rarityRank('legend') ? 0 : state.crates.sinceLegend + 1;
  events.push({ type: 'CrateOpened', source, pulls });
  addXp(state, 25, events, now);
}

// ---------------------------------------------------------------------------
// Travel
// ---------------------------------------------------------------------------

function arrive(state: GameState, to: StationId, events: GameEvent[], now: number): void {
  state.location = to;
  state.pending = null;
  state.stats.jumps += 1;

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
      if (success) state.wallet.credits += Math.round(e.lootMin + nextFloat(state.rng.travel) * e.lootRange);
      else lost = loseCargo(state, e.lossOnLostFight);
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
    } else if (choice === 'breakThrough') {
      // Running a blockade is noticed, even when it works.
      wantedDelta = addWanted(state, faction, 1, inner);
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

  if (state.pending && cmd.type !== 'Encounter') return reject('encounter_pending');

  switch (cmd.type) {
    case 'ClaimFreeCrate': {
      if (now < state.crates.nextFreeAt) return reject('free_crate_not_ready');
      state.crates.nextFreeAt = now + CONFIG.crate.freeIntervalMs;
      openCrate(state, 'free', events, now);
      break;
    }
    case 'BuyCrate': {
      if (state.wallet.credits < CONFIG.crate.price) return reject('not_enough_credits');
      state.wallet.credits -= CONFIG.crate.price;
      openCrate(state, 'bought', events, now);
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
      if (profit > 0) addXp(state, CONFIG.travel.xpPerSaleLog * Math.log10(1 + profit), events, now);
      break;
    }
    case 'Jump': {
      if (!state.routes.includes(cmd.to)) return reject('no_such_route');
      if (state.fuel.amount < 1) return reject('no_fuel');
      state.fuel.amount -= 1;
      events.push({ type: 'JumpStarted', from: state.location, to: cmd.to });
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
  const { max, regenMs } = CONFIG.fuel;
  const here = s.location;
  const hereFaction = factionOf(here);
  const deck = deckInfo(s.deck);

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
      nextFreeAt: s.crates.nextFreeAt,
      price: CONFIG.crate.price,
      opened: s.crates.opened,
      pityElite: { current: s.crates.sinceElite, max: CONFIG.crate.pityElite },
      pityLegend: { current: s.crates.sinceLegend, max: CONFIG.crate.pityLegend },
    },
    collection: s.collection,
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
    case 'BuyCrate':
    case 'AutoDeck':
    case 'PayOff':
    case 'UpgradeHold':
      return { type: c.type };
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
