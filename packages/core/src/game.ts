import { CONFIG } from './config.ts';
import { CARD_BY_ID, CARDS_BY_RARITY, RARITIES, rarityRank, type Rarity } from './content.ts';
import { nextFloat, pick, seedRng, type RngState } from './rng.ts';
import { GOOD_BY_ID, GOODS, STATION_BY_ID, STATIONS, type GoodId, type StationId } from './world.ts';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const STATE_VERSION = 2;

export type EncounterKind = 'pirates' | 'customs';
export type EncounterChoice = 'fight' | 'flee' | 'pay' | 'submit' | 'bribe' | 'breakThrough';

interface CargoLot { qty: number; avgCost: number }

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
  location: StationId;
  cargo: Partial<Record<GoodId, CargoLot>>;
  /** Price drift per station and good, roughly -0.4 to 0.4. */
  market: Record<StationId, Record<GoodId, number>>;
  routes: StationId[];
  pending: { to: StationId; kind: EncounterKind } | null;
  stats: { jumps: number; profit: number };
}

// ---------------------------------------------------------------------------
// Client view
// ---------------------------------------------------------------------------

export interface MarketRow { goodId: GoodId; buy: number; sell: number; /** Price relative to the good's galaxy-wide base. */ level: number }
export interface RouteView {
  stationId: StationId;
  fuel: number;
  customs: number;
  pirates: number;
  /** Goods that currently sell there for more than they cost here. */
  hints: { goodId: GoodId; pct: number }[];
}
export interface EncounterOption { id: EncounterChoice; chance: number; cost: number }
export interface CrewBonus { nav: number; hdl: number; tec: number; kmp: number }

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
  location: StationId;
  cargo: { cap: number; used: number; items: Partial<Record<GoodId, CargoLot>> };
  market: MarketRow[];
  routes: RouteView[];
  encounter: { to: StationId; kind: EncounterKind; hasContraband: boolean; options: EncounterOption[] } | null;
  crew: CrewBonus;
  stats: { jumps: number; profit: number };
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
  | { type: 'Encounter'; choice: EncounterChoice };

export interface Pull {
  cardId: string;
  rarity: Rarity;
  isNew: boolean;
  shards: number;
}

export type RejectReason =
  | 'free_crate_not_ready' | 'not_enough_credits' | 'unknown_command'
  | 'no_cargo_space' | 'not_in_cargo' | 'no_fuel' | 'no_such_route'
  | 'encounter_pending' | 'no_encounter' | 'invalid_choice';

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
  }
  | { type: 'Arrived'; stationId: StationId }
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
    location: CONFIG.startStation,
    cargo: {},
    market: Object.fromEntries(
      STATIONS.map((s) => [s.id, Object.fromEntries(GOODS.map((g) => [g.id, 0]))]),
    ) as GameState['market'],
    routes: [],
    pending: null,
    stats: { jumps: 0, profit: 0 },
  };
  driftMarkets(state);
  driftMarkets(state);
  rollRoutes(state);
  return state;
}

/** State is plain JSON data by design, so this is a faithful deep copy. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const xpForLevel = (level: number): number => 100 + (level - 1) * 50;

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

/** Best stat among owned cards, mapped to 0..1. The collection is the crew. */
export function crewBonus(collection: Record<string, number>): CrewBonus {
  const best = { nav: 40, hdl: 40, tec: 40, kmp: 40 };
  for (const id of Object.keys(collection)) {
    const card = CARD_BY_ID.get(id);
    if (!card) continue;
    for (const k of ['nav', 'hdl', 'tec', 'kmp'] as const) best[k] = Math.max(best[k], card.stats[k]);
  }
  const norm = (v: number): number => Math.min(1, Math.max(0, (v - 40) / 60));
  return { nav: norm(best.nav), hdl: norm(best.hdl), tec: norm(best.tec), kmp: norm(best.kmp) };
}

const cargoUsed = (state: GameState): number =>
  Object.values(state.cargo).reduce((sum, lot) => sum + (lot?.qty ?? 0), 0);

function listPrice(state: GameState, stationId: StationId, goodId: GoodId): number {
  const good = GOOD_BY_ID.get(goodId)!;
  const mod = STATION_BY_ID.get(stationId)!.mods[goodId] ?? 1;
  return Math.max(1, Math.round(good.base * mod * (1 + state.market[stationId][goodId])));
}

function sellPrice(state: GameState, stationId: StationId, goodId: GoodId): number {
  const factor = CONFIG.travel.sellFactor + CONFIG.travel.sellFactorCrew * crewBonus(state.collection).hdl;
  return Math.max(1, Math.floor(listPrice(state, stationId, goodId) * factor));
}

function driftMarkets(state: GameState): void {
  for (const s of STATIONS) {
    for (const g of GOODS) {
      const next = state.market[s.id][g.id] * 0.6 + (nextFloat(state.rng.market) * 2 - 1) * 0.12 * g.vol;
      state.market[s.id][g.id] = Math.max(-0.4, Math.min(0.4, next));
    }
  }
}

function rollRoutes(state: GameState): void {
  const others = STATIONS.map((s) => s.id).filter((id) => id !== state.location);
  const routes: StationId[] = [];
  while (routes.length < CONFIG.routesOffered && others.length > 0) {
    const i = Math.floor(nextFloat(state.rng.travel) * others.length);
    routes.push(...others.splice(i, 1));
  }
  state.routes = routes;
}

function contrabandValue(state: GameState): number {
  let value = 0;
  for (const g of GOODS) {
    if (g.contraband) value += (state.cargo[g.id]?.qty ?? 0) * listPrice(state, state.location, g.id);
  }
  return value;
}

function encounterOptions(state: GameState, kind: EncounterKind): EncounterOption[] {
  const e = CONFIG.encounter;
  const crew = crewBonus(state.collection);
  if (kind === 'pirates') {
    const tribute = Math.min(state.wallet.credits, Math.max(e.tributeMin, Math.round(state.wallet.credits * e.tributeShare)));
    return [
      { id: 'fight', chance: e.fight.base + e.fight.crew * crew.kmp, cost: 0 },
      { id: 'flee', chance: e.flee.base + e.flee.crew * crew.nav, cost: 0 },
      { id: 'pay', chance: 1, cost: tribute },
    ];
  }
  const hot = contrabandValue(state);
  const detect = e.detect.base - e.detect.crew * crew.tec;
  const bribe = Math.min(state.wallet.credits, e.bribeBase + Math.round(hot * e.bribeShare));
  return [
    { id: 'submit', chance: hot > 0 ? 1 - detect : 1, cost: 0 },
    { id: 'bribe', chance: e.bribe.base + e.bribe.crew * crew.hdl, cost: bribe },
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
  driftMarkets(state);
  rollRoutes(state);
  events.push({ type: 'Arrived', stationId: to });
  addXp(state, CONFIG.travel.xpPerJump, events, now);
}

function loseCargo(state: GameState, share: number, onlyContraband: boolean): Partial<Record<GoodId, number>> {
  const lost: Partial<Record<GoodId, number>> = {};
  for (const g of GOODS) {
    const lot = state.cargo[g.id];
    if (!lot || (onlyContraband && !g.contraband)) continue;
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
  const option = encounterOptions(state, pending.kind).find((o) => o.id === choice);
  if (!option) return false;

  const e = CONFIG.encounter;
  const before = state.wallet.credits;
  const success = nextFloat(state.rng.travel) < option.chance;
  let lost: Partial<Record<GoodId, number>> = {};
  state.wallet.credits -= option.cost;

  if (pending.kind === 'pirates') {
    if (choice === 'fight') {
      if (success) state.wallet.credits += Math.round(e.lootMin + nextFloat(state.rng.travel) * e.lootRange);
      else lost = loseCargo(state, e.lossOnLostFight, false);
    } else if (choice === 'flee' && !success) {
      lost = loseCargo(state, e.lossOnFailedFlee, false);
    }
  } else if (!success) {
    // Any failed customs choice ends in a full scan: contraband is seized and fined.
    const fine = Math.min(state.wallet.credits, Math.round(contrabandValue(state) * e.fineShare));
    lost = loseCargo(state, 1, true);
    state.wallet.credits -= fine;
  }

  events.push({
    type: 'EncounterResolved', kind: pending.kind, choice, success,
    creditsDelta: state.wallet.credits - before, lost,
  });
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
      if (!GOOD_BY_ID.has(cmd.goodId) || !isQty(cmd.qty)) return reject('unknown_command');
      if (cargoUsed(state) + cmd.qty > CONFIG.cargoCap) return reject('no_cargo_space');
      const cost = listPrice(state, state.location, cmd.goodId) * cmd.qty;
      if (state.wallet.credits < cost) return reject('not_enough_credits');
      state.wallet.credits -= cost;
      const lot = state.cargo[cmd.goodId] ?? { qty: 0, avgCost: 0 };
      lot.avgCost = (lot.avgCost * lot.qty + cost) / (lot.qty + cmd.qty);
      lot.qty += cmd.qty;
      state.cargo[cmd.goodId] = lot;
      events.push({ type: 'Bought', goodId: cmd.goodId, qty: cmd.qty, cost });
      break;
    }
    case 'Sell': {
      if (!GOOD_BY_ID.has(cmd.goodId) || !isQty(cmd.qty)) return reject('unknown_command');
      const lot = state.cargo[cmd.goodId];
      if (!lot || lot.qty < cmd.qty) return reject('not_in_cargo');
      const revenue = sellPrice(state, state.location, cmd.goodId) * cmd.qty;
      const profit = Math.round(revenue - lot.avgCost * cmd.qty);
      state.wallet.credits += revenue;
      lot.qty -= cmd.qty;
      if (lot.qty === 0) delete state.cargo[cmd.goodId];
      state.stats.profit += profit;
      events.push({ type: 'Sold', goodId: cmd.goodId, qty: cmd.qty, revenue, profit });
      addXp(state, profit * CONFIG.travel.xpPerProfit, events, now);
      break;
    }
    case 'Jump': {
      if (!state.routes.includes(cmd.to)) return reject('no_such_route');
      if (state.fuel.amount < 1) return reject('no_fuel');
      state.fuel.amount -= 1;
      events.push({ type: 'JumpStarted', from: state.location, to: cmd.to });
      const dest = STATION_BY_ID.get(cmd.to)!;
      const roll = nextFloat(state.rng.travel);
      const pPirates = dest.pirates * CONFIG.travel.piratesPerLevel;
      const pCustoms = dest.customs * CONFIG.travel.customsPerLevel;
      const kind: EncounterKind | null = roll < pPirates ? 'pirates' : roll < pPirates + pCustoms ? 'customs' : null;
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

  const market: MarketRow[] = GOODS.map((g) => {
    const buy = listPrice(s, here, g.id);
    return { goodId: g.id, buy, sell: sellPrice(s, here, g.id), level: buy / g.base };
  });

  const routes: RouteView[] = s.routes.map((id) => {
    const dest = STATION_BY_ID.get(id)!;
    const hints = GOODS
      .map((g) => ({ goodId: g.id, pct: sellPrice(s, id, g.id) / listPrice(s, here, g.id) - 1 }))
      .filter((h) => h.pct > 0.05)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
    return { stationId: id, fuel: 1, customs: dest.customs, pirates: dest.pirates, hints };
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
    location: here,
    cargo: { cap: CONFIG.cargoCap, used: cargoUsed(s), items: s.cargo },
    market,
    routes,
    encounter: s.pending
      ? { to: s.pending.to, kind: s.pending.kind, hasContraband: contrabandValue(s) > 0, options: encounterOptions(s, s.pending.kind) }
      : null,
    crew: crewBonus(s.collection),
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
    default:
      return null;
  }
}
