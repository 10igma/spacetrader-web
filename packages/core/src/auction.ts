/**
 * Auction house. Lots are a pure function of a per-player seed, the slot and
 * time: nothing about a lot is stored, so the view and the state can never
 * disagree about what is on offer or how it ends.
 */
import { CONFIG } from './config.ts';
import { CARD_BY_ID, CARDS_BY_RARITY, RARITIES, seasonCards, type CardDef, type Rarity } from './content.ts';
import { nextFloat, seedRng } from './rng.ts';
import { seasonIndex } from './season.ts';

const MINUTE = 60_000;
const RATING: Record<Rarity, [number, number]> = { standard: [50, 64], rare: [68, 78], elite: [81, 88], legend: [91, 95], singularity: [99, 99] };

const nice = (n: number): number => Math.max(50, Math.round(n / 50) * 50);

/** What a card is worth on the market. Public knowledge: shown as the estimate. */
export function cardValue(card: CardDef): number {
  const [lo, hi] = RATING[card.rarity];
  const within = hi > lo ? Math.min(1, Math.max(0, (card.rating - lo) / (hi - lo))) : 0;
  return nice(CONFIG.auction.value[card.rarity] * (1 + 0.5 * within));
}

export const bidStep = (price: number): number => nice(price * 0.05);

export interface Lot {
  key: string;
  cardId: string;
  startAt: number;
  endsAt: number;
  estimate: number;
  start: number;
  /** The rival's highest bid. Never sent to the client. */
  rivalMax: number;
  buyNow: number;
}

/** The lot running in a slot at a given time. */
export function lotAt(seed: string, epoch: number, slot: number, now: number): Lot {
  const duration = CONFIG.auction.slotMinutes[slot]! * MINUTE;
  // Twin slots are offset by half a cycle, so something is always about to end.
  const origin = epoch - (slot % 2) * (duration / 2);
  const index = Math.floor((now - origin) / duration);
  return lotOf(seed, origin, slot, index, duration);
}

function lotOf(seed: string, origin: number, slot: number, index: number, duration: number): Lot {
  const rng = seedRng(`${seed}:lot:${slot}:${index}`);
  const weights = RARITIES.map((r) => CONFIG.auction.rarityWeights[r]);
  let x = nextFloat(rng) * weights.reduce((a, b) => a + b, 0);
  let rarity: Rarity = 'standard';
  for (let i = 0; i < RARITIES.length; i++) {
    x -= weights[i]!;
    if (x < 0) { rarity = RARITIES[i]!; break; }
  }
  const pool = CARDS_BY_RARITY[rarity];
  let card = pool[Math.floor(nextFloat(rng) * pool.length)]!;
  // Some lots carry a card of the edition that runs when the lot opens. A stream of its own keeps everything else as it was.
  const edition = seasonCards(seasonIndex(origin + index * duration)).filter((c) => c.rarity === rarity);
  if (edition.length > 0) {
    const pickRng = seedRng(`${seed}:lot:${slot}:${index}:edition`);
    if (nextFloat(pickRng) < CONFIG.season.cardShare) card = edition[Math.floor(nextFloat(pickRng) * edition.length)]!;
  }
  const estimate = cardValue(card);
  const a = CONFIG.auction;
  return {
    key: `${slot}:${index}`,
    cardId: card.id,
    startAt: origin + index * duration,
    endsAt: origin + (index + 1) * duration,
    estimate,
    start: nice(estimate * a.startShare),
    rivalMax: nice(estimate * (a.rivalMin + a.rivalRange * nextFloat(rng))),
    buyNow: nice(estimate * a.buyNowShare),
  };
}

/** Look a lot up by its key, for bids that were placed earlier. */
export function lotByKey(seed: string, epoch: number, key: string): Lot | null {
  const m = /^(\d):(-?\d{1,9})$/.exec(key);
  if (!m) return null;
  const slot = Number(m[1]);
  if (slot >= CONFIG.auction.slotMinutes.length) return null;
  const duration = CONFIG.auction.slotMinutes[slot]! * MINUTE;
  const origin = epoch - (slot % 2) * (duration / 2);
  return lotOf(seed, origin, slot, Number(m[2]), duration);
}

/**
 * The rival's bid at this moment. It climbs towards the rival's limit as the
 * end approaches and reaches it exactly at the end.
 */
export function rivalNow(lot: Lot, now: number): number {
  const f = Math.min(1, Math.max(0, (now - lot.startAt) / (lot.endsAt - lot.startAt)));
  if (f >= 1) return lot.rivalMax;
  return Math.min(lot.rivalMax, nice(lot.start + (lot.rivalMax - lot.start) * f ** 0.6));
}

/** Price the winner pays: one step above the rival, never more than the winner's own limit. */
export const winningPrice = (lot: Lot, max: number): number => Math.min(max, lot.rivalMax + bidStep(lot.rivalMax));

export interface Listing { cardId: string; min: number; startAt: number; endsAt: number; /** Best offer at the end. Hidden. */ offer: number }
export type AuctionResult = { kind: 'won' | 'lost' | 'bought' | 'sold' | 'unsold'; cardId: string; price: number };

export function offerNow(listing: Listing, now: number): number | null {
  if (listing.offer < listing.min) return null;
  const f = Math.min(1, Math.max(0, (now - listing.startAt) / (listing.endsAt - listing.startAt)));
  // Buyers take a while to show up: no bid in the first part of a listing.
  if (f < 0.15) return null;
  return nice(listing.min + (listing.offer - listing.min) * ((f - 0.15) / 0.85) ** 0.6);
}

export const auctionCard = (cardId: string): CardDef | undefined => CARD_BY_ID.get(cardId);
