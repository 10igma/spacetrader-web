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
