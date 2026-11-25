import { CONFIG } from './config.ts';
import { CARDS_BY_RARITY, RARITIES, rarityRank, type Rarity } from './content.ts';
import { nextFloat, pick, seedRng, type RngState } from './rng.ts';

/** Authoritative state. Lives on the server side of the GameService boundary. */
export interface GameState {
  version: 1;
  createdAt: number;
  rng: { crate: RngState };
  profile: { level: number; xp: number };
  wallet: { credits: number; quanta: number; shards: number };
  fuel: { amount: number; updatedAt: number };
  crates: { nextFreeAt: number; opened: number; sinceElite: number; sinceLegend: number };
  collection: Record<string, number>;
}

/** What the client is allowed to see. No RNG state, no hidden counters beyond what we publish. */
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
}

export type Command = { type: 'ClaimFreeCrate' } | { type: 'BuyCrate' };

export interface Pull {
  cardId: string;
  rarity: Rarity;
  isNew: boolean;
  shards: number;
}

export type RejectReason = 'free_crate_not_ready' | 'not_enough_credits' | 'unknown_command';

export type GameEvent =
  | { type: 'CrateOpened'; source: 'free' | 'bought'; pulls: Pull[] }
  | { type: 'CommandRejected'; reason: RejectReason };

export function createInitialState(seed: string, now: number): GameState {
  return {
    version: 1,
    createdAt: now,
    rng: { crate: seedRng(`${seed}:crate`) },
    profile: { level: 1, xp: 0 },
    wallet: { credits: CONFIG.startCredits, quanta: CONFIG.startQuanta, shards: 0 },
    fuel: { amount: CONFIG.fuel.max, updatedAt: now },
    // First free crate is ready immediately: generous start.
    crates: { nextFreeAt: now, opened: 0, sinceElite: 0, sinceLegend: 0 },
    collection: {},
  };
}

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

function openCrate(state: GameState, source: 'free' | 'bought'): GameEvent {
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
  state.profile.xp += 25;
  while (state.profile.xp >= xpForLevel(state.profile.level)) {
    state.profile.xp -= xpForLevel(state.profile.level);
    state.profile.level += 1;
  }
  return { type: 'CrateOpened', source, pulls };
}

/** State is plain JSON data by design, so this is a faithful deep copy. */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const xpForLevel = (level: number): number => 100 + (level - 1) * 50;

/**
 * The only way state changes. Pure with respect to its inputs: same state,
 * command and time always give the same result. `now` is supplied by the host
 * (server clock), never read from the environment.
 */
export function applyCommand(
  prev: GameState,
  cmd: Command,
  now: number,
): { state: GameState; events: GameEvent[] } {
  const state = clone(prev);
  settleFuel(state, now);

  switch (cmd.type) {
    case 'ClaimFreeCrate': {
      if (now < state.crates.nextFreeAt) return reject(prev, 'free_crate_not_ready');
      state.crates.nextFreeAt = now + CONFIG.crate.freeIntervalMs;
      return { state, events: [openCrate(state, 'free')] };
    }
    case 'BuyCrate': {
      if (state.wallet.credits < CONFIG.crate.price) return reject(prev, 'not_enough_credits');
      state.wallet.credits -= CONFIG.crate.price;
      return { state, events: [openCrate(state, 'bought')] };
    }
    default:
      return reject(prev, 'unknown_command');
  }
}

function reject(state: GameState, reason: RejectReason): { state: GameState; events: GameEvent[] } {
  return { state, events: [{ type: 'CommandRejected', reason }] };
}

export function toClientView(state: GameState, now: number): ClientView {
  const s = clone(state);
  settleFuel(s, now);
  const { max, regenMs } = CONFIG.fuel;
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
  };
}

/** Structural check for commands arriving over the wire. */
export function parseCommand(input: unknown): Command | null {
  if (typeof input !== 'object' || input === null) return null;
  const type = (input as { type?: unknown }).type;
  if (type === 'ClaimFreeCrate' || type === 'BuyCrate') return { type };
  return null;
}
