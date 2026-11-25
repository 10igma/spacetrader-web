/**
 * Space Trader 1.2.0 — Special event handling
 * Ported from SpecialEvent.c, Traveler.c (IncDays)
 */

import type { SolarSystem } from '../models/types';
import {
  MAXSOLARSYSTEM, MAXTRADEITEM,
  ANARCHY, GEMULONINVADED, EXPERIMENTNOTSTOPPED,
  FABRICRIPINITIALPROBABILITY,
  GEMULONSYSTEM, DALEDSYSTEM,
} from '../data/constants';
import { getRandom } from '../utils/math';

// ── IncDays ──────────────────────────────────────────────────────────────

export interface IncDaysResult {
  invasionStatus: number;
  reactorStatus: number;
  experimentStatus: number;
  fabricRipProbability: number;
  experimentPerformed: boolean;
}

/**
 * Increment game days and update quest statuses.
 * Ported from IncDays() in Traveler.c.
 */
export function incDays(
  amount: number,
  days: number,
  invasionStatus: number,
  reactorStatus: number,
  experimentStatus: number,
  fabricRipProbability: number,
  solarSystems: SolarSystem[],
): { days: number } & IncDaysResult {
  days += amount;
  let experimentPerformed = false;

  if (invasionStatus > 0 && invasionStatus < 8) {
    invasionStatus += amount;
    if (invasionStatus >= 8) {
      solarSystems[GEMULONSYSTEM].special = GEMULONINVADED;
      solarSystems[GEMULONSYSTEM].techLevel = 0;
      solarSystems[GEMULONSYSTEM].politics = ANARCHY;
    }
  }

  if (reactorStatus > 0 && reactorStatus < 21) {
    reactorStatus += amount;
    if (reactorStatus > 20) reactorStatus = 20;
  }

  if (experimentStatus > 0 && experimentStatus < 12) {
    experimentStatus += amount;
    if (experimentStatus > 11) {
      fabricRipProbability = FABRICRIPINITIALPROBABILITY;
      solarSystems[DALEDSYSTEM].special = EXPERIMENTNOTSTOPPED;
      experimentStatus = 12;
      experimentPerformed = true;
    }
  } else if (experimentStatus === 12 && fabricRipProbability > 0) {
    fabricRipProbability -= amount;
  }

  return {
    days,
    invasionStatus,
    reactorStatus,
    experimentStatus,
    fabricRipProbability,
    experimentPerformed,
  };
}

// ── Shuffle system statuses ──────────────────────────────────────────────

/**
 * Statuses may change over time. Called on arrival.
 * Ported from ShuffleStatus() in Traveler.c.
 */
export function shuffleStatus(solarSystems: SolarSystem[]): void {
  for (let i = 0; i < MAXSOLARSYSTEM; ++i) {
    if (solarSystems[i].status > 0) {
      if (getRandom(100) < 15) solarSystems[i].status = 0;
    } else if (getRandom(100) < 15) {
      solarSystems[i].status = 1 + getRandom(7);
    }
  }
}

// ── Change quantities after travel ───────────────────────────────────────

import { initializeTradeItems } from './trading';
import { POLITICS_DATA } from '../data/politics';
import { TRADE_ITEMS } from '../data/tradeItems';
import { NARCOTICS, FIREARMS } from '../data/constants';

/**
 * After a warp, quantities change slightly.
 * Ported from ChangeQuantities() in Traveler.c.
 */
export function changeQuantities(
  solarSystems: SolarSystem[],
  difficulty: number,
): void {
  const startCountdown = 3 + difficulty;
  for (let i = 0; i < MAXSOLARSYSTEM; ++i) {
    if (solarSystems[i].countDown > 0) {
      --solarSystems[i].countDown;
      if (solarSystems[i].countDown > startCountdown) {
        solarSystems[i].countDown = startCountdown;
      } else if (solarSystems[i].countDown <= 0) {
        initializeTradeItems(solarSystems, i, difficulty);
      } else {
        const pol = POLITICS_DATA[solarSystems[i].politics];
        for (let j = 0; j < MAXTRADEITEM; ++j) {
          if (
            (j === NARCOTICS && !pol.drugsOK) ||
            (j === FIREARMS && !pol.firearmsOK) ||
            solarSystems[i].techLevel < TRADE_ITEMS[j].techProduction
          ) {
            solarSystems[i].qty[j] = 0;
          } else {
            solarSystems[i].qty[j] += getRandom(5) - getRandom(5);
            if (solarSystems[i].qty[j] < 0) solarSystems[i].qty[j] = 0;
          }
        }
      }
    }
  }
}

// ── Score calculation ────────────────────────────────────────────────────

import { KILLED, RETIRED } from '../data/constants';

/**
 * Calculate the game score.
 * Ported from GetScore() in Traveler.c.
 */
export function getScore(
  endStatus: number,
  days: number,
  worth: number,
  level: number,
): number {
  worth = worth < 1000000 ? worth : 1000000 + Math.floor((worth - 1000000) / 10);

  if (endStatus === KILLED) {
    return (level + 1) * Math.floor((worth * 90) / 50000);
  } else if (endStatus === RETIRED) {
    return (level + 1) * Math.floor((worth * 95) / 50000);
  } else {
    let d = (level + 1) * 100 - days;
    if (d < 0) d = 0;
    return (level + 1) * Math.floor((worth + d * 1000) / 500);
  }
}
