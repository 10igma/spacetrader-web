/**
 * Space Trader 1.2.0 — Bank operations
 * Ported from Bank.c, Money.c
 */

import { CLEANSCORE, COSTMOON } from '../data/constants';
import { currentShipPrice, currentShipPriceWithoutCargo } from './ship';
import type { Ship } from '../models/types';

// ── Current worth ────────────────────────────────────────────────────────

/**
 * Current worth of commander.
 * Ported from CurrentWorth() in Money.c.
 */
export function currentWorth(
  ship: Ship,
  credits: number,
  debt: number,
  moonBought: boolean,
  scarabStatus: number,
  buyingPrice: number[],
): number {
  return currentShipPrice(ship, false, scarabStatus, buyingPrice) +
    credits - debt + (moonBought ? COSTMOON : 0);
}

// ── Maximum loan ─────────────────────────────────────────────────────────

/**
 * Maximum loan the bank will give.
 * Ported from MaxLoan() in Bank.c.
 */
export function maxLoan(
  policeRecordScore: number,
  worth: number,
): number {
  if (policeRecordScore >= CLEANSCORE) {
    return Math.min(25000, Math.max(1000, Math.floor(Math.floor(worth / 10) / 500) * 500));
  }
  return 500;
}

// ── Get loan ─────────────────────────────────────────────────────────────

/**
 * Borrow money from the bank.
 * Ported from GetLoan() in Bank.c.
 */
export function getLoan(
  loan: number,
  credits: number,
  debt: number,
  policeRecordScore: number,
  worth: number,
): { credits: number; debt: number } {
  const ml = maxLoan(policeRecordScore, worth);
  const amount = Math.min(ml - debt, loan);
  return {
    credits: credits + amount,
    debt: debt + amount,
  };
}

// ── Pay back ─────────────────────────────────────────────────────────────

/**
 * Pay back part of the debt.
 * Ported from PayBack() in Bank.c.
 */
export function payBack(
  cash: number,
  credits: number,
  debt: number,
): { credits: number; debt: number } {
  let amount = Math.min(debt, cash);
  amount = Math.min(amount, credits);
  return {
    credits: credits - amount,
    debt: debt - amount,
  };
}

// ── Pay interest ─────────────────────────────────────────────────────────

/**
 * Pay interest on debt. Called daily.
 * Ported from PayInterest() in Money.c.
 */
export function payInterest(
  credits: number,
  debt: number,
): { credits: number; debt: number } {
  if (debt > 0) {
    const incDebt = Math.max(1, Math.floor(debt / 10));
    if (credits > incDebt) {
      credits -= incDebt;
    } else {
      debt += incDebt - credits;
      credits = 0;
    }
  }
  return { credits, debt };
}

// ── Insurance ────────────────────────────────────────────────────────────

/**
 * Calculate daily insurance payment.
 * Ported from InsuranceMoney() in Traveler.c.
 */
export function insuranceMoney(
  insurance: boolean,
  ship: Ship,
  scarabStatus: number,
  noClaim: number,
): number {
  if (!insurance) return 0;
  const shipPrice = currentShipPriceWithoutCargo(ship, true, scarabStatus);
  return Math.max(
    1,
    Math.floor(
      (Math.floor((shipPrice * 5) / 2000)) *
      (100 - Math.min(noClaim, 90)) / 100,
    ),
  );
}

// ── Mercenary daily pay ──────────────────────────────────────────────────

import type { CrewMember } from '../models/types';
import { MAXCREW, MAXCREWMEMBER } from '../data/constants';
import { mercenaryHirePrice } from './ship';

/**
 * What you owe mercenaries daily.
 * Ported from MercenaryMoney() in Traveler.c.
 */
export function mercenaryMoney(
  ship: Ship,
  mercenaries: CrewMember[],
  wildStatus: number,
): number {
  let toPay = 0;
  for (let i = 1; i < MAXCREW; ++i) {
    if (ship.crew[i] >= 0) {
      toPay += mercenaryHirePrice(mercenaries, ship.crew[i], MAXCREWMEMBER, wildStatus);
    }
  }
  return toPay;
}
