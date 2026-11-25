/**
 * The retention layer: crate tiers and slots, card levels, daily missions,
 * login calendar, streak and albums. Everything here is plain data plus pure
 * helpers. State changes still only happen in `applyCommand`.
 */
import { CONFIG } from './config.ts';
import { CARDS_BY_FACTION, RARITIES, rarityRank, type CardDef, type FactionId, type Rarity } from './content.ts';
import { nextFloat, type RngState } from './rng.ts';

const DAY = 86_400_000;

export type CrateTier = keyof typeof CONFIG.crate.tiers;
export const CRATE_TIERS: readonly CrateTier[] = ['standard', 'premium'];

export interface Reward { credits?: number; shards?: number; quanta?: number; crate?: CrateTier; freeze?: number }

/** An earned crate. `readyAt` is null until the player starts unsealing it. */
export interface Slot { tier: CrateTier; readyAt: number | null }

export type MissionKind = 'jumps' | 'profit' | 'sellUnits' | 'buyUnits' | 'hotUnits' | 'fightWin' | 'openCrate' | 'customsPass';
export interface Mission { kind: MissionKind; target: number; progress: number; claimed: boolean; reward: Reward }

export const dayIndex = (now: number): number => Math.floor((now + CONFIG.daily.dayOffsetMs) / DAY);
export const dayEndsAt = (now: number): number => (dayIndex(now) + 1) * DAY - CONFIG.daily.dayOffsetMs;

// ---------------------------------------------------------------------------
// Crates
// ---------------------------------------------------------------------------

/**
 * The odds the player actually gets per card, including the upgrade moment.
 * This is what the odds sheet shows. Guarantees and pity only improve on it.
 */
export function effectiveOdds(tier: CrateTier): Record<Rarity, number> {
  const base = CONFIG.crate.tiers[tier].odds;
  const b = CONFIG.crate.bumpChance;
  const cap = rarityRank('legend');
  const out = {} as Record<Rarity, number>;
  for (const r of RARITIES) {
    const rank = rarityRank(r);
    const stays = rank < cap ? base[r] * (1 - b) : base[r];
    const below = rank > 0 ? RARITIES[rank - 1]! : null;
    const arrives = below && rarityRank(below) < cap ? base[below] * b : 0;
    out[r] = stays + arrives;
  }
  return out;
}

/** Price of the next crate of this tier today. */
export function cratePrice(tier: CrateTier, boughtToday: number): number {
  const t = CONFIG.crate.tiers[tier];
  return Math.round(t.price * t.priceGrowth ** boughtToday);
}

export function speedUpCost(slot: Slot, now: number): number {
  if (slot.readyAt === null) return 0;
  const left = slot.readyAt - now;
  if (left <= CONFIG.crate.speedUpFreeMs) return 0;
  return Math.ceil(left / 60_000 / CONFIG.crate.speedUpMinutesPerQuantum);
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/** Shards to take a card from `level` to the next one, or null at the cap. */
export function upgradeCost(card: CardDef, level: number): number | null {
  if (level >= CONFIG.cards.maxLevel) return null;
  return CONFIG.cards.upgradeBase[card.rarity] * CONFIG.cards.upgradeMult[level - 1]!;
}

// ---------------------------------------------------------------------------
// Daily missions
// ---------------------------------------------------------------------------

const MISSION_KINDS: readonly MissionKind[] = ['jumps', 'profit', 'sellUnits', 'buyUnits', 'hotUnits', 'fightWin', 'openCrate', 'customsPass'];

function missionTarget(kind: MissionKind, level: number): number {
  switch (kind) {
    case 'jumps': return 5;
    case 'profit': return Math.min(60_000, 500 * level * level);
    case 'sellUnits': return 30;
    case 'buyUnits': return 30;
    case 'hotUnits': return 8;
    case 'fightWin': return 1;
    case 'openCrate': return 2;
    case 'customsPass': return 1;
  }
}

export function rollMissions(rng: RngState, level: number): Mission[] {
  const pool = [...MISSION_KINDS];
  const rewards: Reward[] = [{ credits: 400 + 250 * level }, { shards: 40 }, { quanta: 6 }];
  const missions: Mission[] = [];
  for (let i = 0; i < CONFIG.daily.missions; i++) {
    const kind = pool.splice(Math.floor(nextFloat(rng) * pool.length), 1)[0]!;
    missions.push({ kind, target: missionTarget(kind, level), progress: 0, claimed: false, reward: rewards[i % rewards.length]! });
  }
  return missions;
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

export interface StreakState { count: number; lastDay: number; freezes: number; best: number }
export type StreakStatus = 'none' | 'safe' | 'atRisk' | 'frozen' | 'broken';

/** Where the streak stands today, before the player has done anything about it. */
export function streakStatus(streak: StreakState, day: number): StreakStatus {
  if (streak.count === 0) return 'none';
  if (streak.lastDay === day) return 'safe';
  if (streak.lastDay === day - 1) return 'atRisk';
  const missed = day - 1 - streak.lastDay;
  return streak.freezes >= missed ? 'frozen' : 'broken';
}

/** Streak length that currently counts for the sale bonus. */
export function liveStreak(streak: StreakState, day: number): number {
  return streakStatus(streak, day) === 'broken' ? 0 : streak.count;
}

export const streakBonus = (count: number): number => Math.min(CONFIG.streak.maxBonus, count * CONFIG.streak.bonusPerDay);

// ---------------------------------------------------------------------------
// Albums
// ---------------------------------------------------------------------------

export interface AlbumView { owned: number; total: number; claimed: number; claimable: boolean; next: { pct: number; reward: Reward } | null; complete: boolean }

export function albumInfo(collection: Record<string, number>, claimed: number, faction: FactionId): AlbumView {
  const cards = CARDS_BY_FACTION[faction];
  const owned = cards.filter((c) => collection[c.id]).length;
  const { milestones, rewards } = CONFIG.album;
  const next = claimed < milestones.length ? { pct: milestones[claimed]!, reward: rewards[claimed]! as Reward } : null;
  return {
    owned,
    total: cards.length,
    claimed,
    next,
    claimable: next !== null && owned >= Math.ceil(cards.length * next.pct),
    complete: owned === cards.length,
  };
}

// ---------------------------------------------------------------------------
// Daily shop and manifests
// ---------------------------------------------------------------------------

export interface Offer {
  kind: 'card' | 'shards' | 'quanta';
  cardId?: string;
  amount?: number;
  price: number;
  /** Price before the daily markdown, when this is the deal of the day. */
  listPrice?: number;
  bought: boolean;
}

/** Hand in spare copies of cards for a reward. Only duplicates count: you never lose your last copy. */
export interface Manifest { need: number; faction?: FactionId; minRarity?: Rarity; reward: Reward; done: boolean }

const FACTION_LIST: readonly FactionId[] = ['helix', 'tessera', 'asche', 'zenit'];

export function rollOffers(rng: RngState, collection: Record<string, number>): Offer[] {
  const cfg = CONFIG.shop;
  const card = (rarity: Rarity): Offer => {
    const pool = Object.values(CARDS_BY_FACTION).flat().filter((c) => c.rarity === rarity);
    const missing = pool.filter((c) => !collection[c.id]);
    // Mostly something you do not own yet: an offer should be worth a look.
    const from = missing.length > 0 && nextFloat(rng) < 0.7 ? missing : pool;
    return { kind: 'card', cardId: from[Math.floor(nextFloat(rng) * from.length)]!.id, price: cfg.cardPrice[rarity], bought: false };
  };
  const offers: Offer[] = [
    card('rare'),
    card('elite'),
    nextFloat(rng) < cfg.legendChance ? card('legend') : card(nextFloat(rng) < 0.5 ? 'rare' : 'elite'),
    { kind: 'shards', amount: cfg.shards.amount, price: cfg.shards.price, bought: false },
    { kind: 'quanta', amount: cfg.quanta.amount, price: cfg.quanta.price, bought: false },
  ];
  const deal = offers[Math.floor(nextFloat(rng) * offers.length)]!;
  deal.listPrice = deal.price;
  deal.price = Math.round((deal.price * (1 - cfg.dealDiscount)) / 100) * 100;
  return offers;
}

export function rollManifests(rng: RngState): Manifest[] {
  const faction = FACTION_LIST[Math.floor(nextFloat(rng) * FACTION_LIST.length)]!;
  const templates: Manifest[] = [
    { need: 4, reward: { shards: 80 }, done: false },
    { need: 3, faction, reward: { crate: 'standard' }, done: false },
    { need: 2, minRarity: 'rare', reward: { quanta: 12 }, done: false },
    { need: 1, minRarity: 'elite', reward: { quanta: 30 }, done: false },
  ];
  const first = templates.splice(Math.floor(nextFloat(rng) * templates.length), 1)[0]!;
  const second = templates[Math.floor(nextFloat(rng) * templates.length)]!;
  return [first, second];
}

/** Spare copies that fit a manifest, cheapest first. A card with n copies offers n - 1. */
export function manifestCandidates(manifest: Manifest, collection: Record<string, number>): string[] {
  const out: CardDef[] = [];
  for (const cards of Object.values(CARDS_BY_FACTION)) {
    for (const c of cards) {
      if (manifest.faction && c.faction !== manifest.faction) continue;
      if (manifest.minRarity && rarityRank(c.rarity) < rarityRank(manifest.minRarity)) continue;
      for (let i = 1; i < (collection[c.id] ?? 0); i++) out.push(c);
    }
  }
  return out.sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity) || a.rating - b.rating).map((c) => c.id);
}

// ---------------------------------------------------------------------------
// Trading posts
// ---------------------------------------------------------------------------

export interface Post { level: number; stored: number; storedAt: number; readyAt: number }

export const postPerHour = (level: number): number => CONFIG.posts.perHour[level - 1] ?? 0;
export const postCap = (level: number): number => postPerHour(level) * CONFIG.posts.storageHours;

/** Bring a post's storage up to date. Nothing accrues while it is being built or once it is full. */
export function settlePost(post: Post, now: number): void {
  const start = Math.max(post.storedAt, post.readyAt);
  if (now > start) post.stored = Math.min(postCap(post.level), post.stored + ((now - start) / 3_600_000) * postPerHour(post.level));
  post.storedAt = Math.max(now, post.storedAt);
}

export function minutesCost(msLeft: number): number {
  if (msLeft <= CONFIG.crate.speedUpFreeMs) return 0;
  return Math.ceil(msLeft / 60_000 / CONFIG.crate.speedUpMinutesPerQuantum);
}

// ---------------------------------------------------------------------------
// Wheel and salvage
// ---------------------------------------------------------------------------

export function wheelReward(index: number, level: number): Reward {
  const seg = CONFIG.wheel[index]!;
  const reward: Reward = { ...seg.reward };
  // Credit prizes grow with your level, so the wheel stays worth a spin.
  if ('scales' in seg && seg.scales && reward.credits) reward.credits = reward.credits * level;
  return reward;
}

export interface SalvageLot { price: number; weight: 0 | 1 | 2; origin: FactionId }
export type SalvageKind = (typeof CONFIG.salvage.outcomes)[number]['kind'];

export function pickWeighted(rng: RngState, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = nextFloat(rng) * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i]!;
    if (x < 0) return i;
  }
  return weights.length - 1;
}
