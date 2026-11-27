/**
 * Seasons, charter, leagues and the weekend event. All schedules are pure
 * functions of time, and league rivals are pure functions of a seed, the week
 * and the tier: nothing here reacts to the player.
 */
import { CONFIG } from './config.ts';
import { dayIndex, type Reward } from './meta.ts';
import { nextFloat, seedRng } from './rng.ts';

const DAY = 86_400_000;
const dayStart = (day: number): number => day * DAY - CONFIG.daily.dayOffsetMs;

/** Weeks start on Monday. Day 0 of the epoch was a Thursday. */
export const weekIndex = (now: number): number => Math.floor((dayIndex(now) + 3) / 7);
export const weekday = (now: number): number => (((dayIndex(now) + 3) % 7) + 7) % 7; // 0 = Monday
export const weekStartsAt = (week: number): number => dayStart(week * 7 - 3);
export const weekEndsAt = (now: number): number => weekStartsAt(weekIndex(now) + 1);

// ---------------------------------------------------------------------------
// Season and charter
// ---------------------------------------------------------------------------

export const seasonIndex = (now: number): number => Math.floor(weekIndex(now) / CONFIG.season.weeks);
export const seasonEndsAt = (now: number): number => weekStartsAt((seasonIndex(now) + 1) * CONFIG.season.weeks);
export const seasonName = (index: number): string => {
  const names = CONFIG.season.names;
  return names[((index % names.length) + names.length) % names.length]!;
};
export const charterTier = (xp: number): number => Math.min(CONFIG.season.tiers, Math.floor(xp / CONFIG.season.xpPerTier));

/** What tier `tier` (1 based) pays on each track. Pure data, the same for everyone. */
export function charterReward(tier: number, track: 'free' | 'premium'): Reward {
  if (track === 'free') {
    if (tier % 10 === 0) return { crate: 'premium' };
    if (tier % 5 === 0) return { crate: 'standard' };
    if (tier % 3 === 0) return { quanta: 8 };
    if (tier % 2 === 0) return { shards: 40 };
    return { credits: 1_000 + 250 * tier };
  }
  // The premium track ends with the season's legend, and hands out an elite on the way.
  if (tier === CONFIG.season.tiers) return { seasonCard: 'legend', quanta: 100 };
  if (tier === CONFIG.season.tiers / 2) return { seasonCard: 'elite', quanta: 30 };
  if (tier % 10 === 0) return { crate: 'premium', quanta: 30 };
  if (tier % 5 === 0) return { crate: 'premium' };
  if (tier % 2 === 0) return { quanta: 15 };
  return { shards: 120 };
}

// ---------------------------------------------------------------------------
// League
// ---------------------------------------------------------------------------

export const RIVAL_FIRST = ['Mara', 'Jonn', 'Sile', 'Okta', 'Brix', 'Vela', 'Tarn', 'Ines', 'Kolja', 'Remy', 'Asha', 'Dario', 'Nuri', 'Pavel', 'Lotte', 'Ezra', 'Saga', 'Milo', 'Thea', 'Arno', 'Zuri', 'Hakon', 'Lien', 'Corin', 'Maud', 'Ravi', 'Elke', 'Jude', 'Noor'];
export const RIVAL_LAST = ['Varek', 'Sund', 'Okonjo', 'Lindt', 'Harrow', 'Quade', 'Meszaros', 'Tilden', 'Abendroth', 'Castellan', 'Wray', 'Dunmore', 'Iversen', 'Solano', 'Brecht', 'Nakamura', 'Fenn', 'Osei', 'Kruger', 'Valmont'];

export interface Standing { name: string; score: number; you: boolean }

/** Standard normal from two uniforms. */
function gauss(a: number, b: number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, a))) * Math.cos(2 * Math.PI * b);
}

/** A rival's name, final score for the week, and how early or late in the week they tend to play. */
function rival(seed: string, week: number, tier: number, i: number): { name: string; final: number; pace: number } {
  const rng = seedRng(`${seed}:rival:${week}:${tier}:${i}`);
  const name = `${RIVAL_FIRST[Math.floor(nextFloat(rng) * RIVAL_FIRST.length)]} ${RIVAL_LAST[Math.floor(nextFloat(rng) * RIVAL_LAST.length)]}`;
  const final = Math.round((CONFIG.league.typicalScore[tier]! * Math.exp(CONFIG.league.spread * gauss(nextFloat(rng), nextFloat(rng)))) / 100) * 100;
  return { name, final, pace: 0.7 + nextFloat(rng) * 0.9 };
}

/** League table at a moment in time. Rival scores only ever grow and reach their final value at the week's end. */
export function standings(seed: string, week: number, tier: number, yourScore: number, now: number): Standing[] {
  const start = weekStartsAt(week);
  const f = Math.min(1, Math.max(0, (now - start) / (7 * DAY)));
  const table: Standing[] = [{ name: 'Du', score: yourScore, you: true }];
  for (let i = 0; i < CONFIG.league.size - 1; i++) {
    const r = rival(seed, week, tier, i);
    table.push({ name: r.name, score: Math.round((r.final * f ** r.pace) / 100) * 100, you: false });
  }
  // Ties go to the player: nobody should lose a place to a simulated rival on a coin flip.
  return table.sort((a, b) => b.score - a.score || (a.you ? -1 : b.you ? 1 : 0));
}

export function leagueReward(rank: number, tier: number): Reward {
  const bonus = tier * 5_000;
  if (rank === 1) return { crate: 'premium', quanta: 40, credits: 10_000 + bonus };
  if (rank <= 3) return { crate: 'premium', credits: 5_000 + bonus };
  if (rank <= CONFIG.league.promote) return { crate: 'standard', quanta: 15, credits: bonus };
  if (rank <= 15) return { quanta: 10, shards: 60 };
  if (rank < CONFIG.league.relegate) return { shards: 40 };
  return {};
}

/** +1 promoted, -1 relegated, 0 stays. */
export function leagueMove(rank: number, tier: number): -1 | 0 | 1 {
  if (rank <= CONFIG.league.promote && tier < CONFIG.league.tiers.length - 1) return 1;
  if (rank >= CONFIG.league.relegate && tier > 0) return -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Weekend event
// ---------------------------------------------------------------------------

/** Saturday and Sunday. */
export const weekendActive = (now: number): boolean => weekday(now) >= 5;
export const weekendStartsAt = (now: number): number => weekStartsAt(weekIndex(now)) + 5 * DAY;
