/**
 * Space Trader 1.2.0 — Trading engine
 * Ported from Merchant.c, Cargo.c, Traveler.c
 */

import type { Ship, SolarSystem, CrewMember } from '../models/types';
import {
  MAXTRADEITEM, MAXSKILL, NARCOTICS, FIREARMS,
  ROBOTS, DUBIOUSSCORE,
  TRADERSELL, TRADERBUY,
} from '../data/constants';
import { TRADE_ITEMS } from '../data/tradeItems';
import { POLITICS_DATA } from '../data/politics';
import { getRandom } from '../utils/math';
import { abs } from '../utils/math';
import { traderSkill } from './skills';
import { totalCargoBays, filledCargoBays } from './ship';

// ── Standard price calculation ───────────────────────────────────────────

/**
 * Standard price calculation. Ported from StandardPrice() in Traveler.c.
 */
export function standardPrice(
  good: number,
  size: number,
  tech: number,
  government: number,
  resources: number,
): number {
  const pol = POLITICS_DATA[government];
  const item = TRADE_ITEMS[good];

  if ((good === NARCOTICS && !pol.drugsOK) || (good === FIREARMS && !pol.firearmsOK)) {
    return 0;
  }

  // Base price on tech level
  let price = item.priceLowTech + tech * item.priceInc;

  // If a good is highly requested, increase the price
  if (pol.wanted === good) {
    price = Math.floor((price * 4) / 3);
  }

  // High trader activity decreases prices
  price = Math.floor((price * (100 - 2 * pol.strengthTraders)) / 100);

  // Large system = high production decreases prices
  price = Math.floor((price * (100 - size)) / 100);

  // Special resources price adaptation
  if (resources > 0) {
    if (item.cheapResource >= 0 && resources === item.cheapResource) {
      price = Math.floor((price * 3) / 4);
    }
    if (item.expensiveResource >= 0 && resources === item.expensiveResource) {
      price = Math.floor((price * 4) / 3);
    }
  }

  // If a system can't use something, its selling price is zero
  if (tech < item.techUsage) return 0;

  if (price < 0) return 0;

  return price;
}

// ── Initialize trade item quantities for a system ────────────────────────

/**
 * Initialize trade item quantities for a system.
 * Ported from InitializeTradeitems() in Traveler.c.
 */
export function initializeTradeItems(
  solarSystems: SolarSystem[],
  index: number,
  difficulty: number,
): void {
  const system = solarSystems[index];
  const pol = POLITICS_DATA[system.politics];

  for (let i = 0; i < MAXTRADEITEM; ++i) {
    if (
      (i === NARCOTICS && !pol.drugsOK) ||
      (i === FIREARMS && !pol.firearmsOK) ||
      system.techLevel < TRADE_ITEMS[i].techProduction
    ) {
      system.qty[i] = 0;
      continue;
    }

    system.qty[i] =
      (9 + getRandom(5) -
        abs(TRADE_ITEMS[i].techTopProduction - system.techLevel)) *
      (1 + system.size);

    // Robots and narcotics: reduced availability
    if (i === ROBOTS || i === NARCOTICS) {
      system.qty[i] = Math.floor((system.qty[i] * (5 - difficulty)) / (6 - difficulty)) + 1;
    }

    if (TRADE_ITEMS[i].cheapResource >= 0) {
      if (system.specialResources === TRADE_ITEMS[i].cheapResource) {
        system.qty[i] = Math.floor((system.qty[i] * 4) / 3);
      }
    }

    if (TRADE_ITEMS[i].expensiveResource >= 0) {
      if (system.specialResources === TRADE_ITEMS[i].expensiveResource) {
        system.qty[i] = (system.qty[i] * 3) >> 2;
      }
    }

    if (TRADE_ITEMS[i].doublePriceStatus >= 0) {
      if (system.status === TRADE_ITEMS[i].doublePriceStatus) {
        system.qty[i] = Math.floor(system.qty[i] / 5);
      }
    }

    system.qty[i] = system.qty[i] - getRandom(10) + getRandom(10);

    if (system.qty[i] < 0) system.qty[i] = 0;
  }
}

// ── Determine prices for a system ────────────────────────────────────────

/**
 * Determine buy/sell prices for a system. Ported from DeterminePrices() in Traveler.c.
 */
export function determinePrices(
  systemId: number,
  solarSystems: SolarSystem[],
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
  policeRecordScore: number,
  jarekStatus: number,
): { buyPrice: number[]; sellPrice: number[] } {
  const buyPrice: number[] = new Array(MAXTRADEITEM).fill(0);
  const sellPrice: number[] = new Array(MAXTRADEITEM).fill(0);
  const sys = solarSystems[systemId];

  for (let i = 0; i < MAXTRADEITEM; ++i) {
    buyPrice[i] = standardPrice(
      i, sys.size, sys.techLevel, sys.politics, sys.specialResources,
    );

    if (buyPrice[i] <= 0) {
      buyPrice[i] = 0;
      sellPrice[i] = 0;
      continue;
    }

    // Special status price increase
    if (TRADE_ITEMS[i].doublePriceStatus >= 0) {
      if (sys.status === TRADE_ITEMS[i].doublePriceStatus) {
        buyPrice[i] = (buyPrice[i] * 3) >> 1;
      }
    }

    // Randomize price
    buyPrice[i] = buyPrice[i] + getRandom(TRADE_ITEMS[i].variance) -
      getRandom(TRADE_ITEMS[i].variance);

    if (buyPrice[i] <= 0) {
      buyPrice[i] = 0;
      sellPrice[i] = 0;
      continue;
    }

    sellPrice[i] = buyPrice[i];
    if (policeRecordScore < DUBIOUSSCORE) {
      // Criminals have to pay off an intermediary
      sellPrice[i] = Math.floor((sellPrice[i] * 90) / 100);
    }
  }

  // Recalculate buy prices (markup for trader skill)
  recalculateBuyPrices(
    buyPrice, sellPrice, systemId, solarSystems,
    ship, mercenaries, difficulty, policeRecordScore, jarekStatus,
  );

  return { buyPrice, sellPrice };
}

/**
 * Recalculate buy prices after trader skill changes.
 * Ported from RecalculateBuyPrices() in Skill.c.
 */
export function recalculateBuyPrices(
  buyPrice: number[],
  sellPrice: number[],
  systemId: number,
  solarSystems: SolarSystem[],
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
  policeRecordScore: number,
  jarekStatus: number,
): void {
  const sys = solarSystems[systemId];
  const pol = POLITICS_DATA[sys.politics];
  const ts = traderSkill(ship, mercenaries, difficulty, jarekStatus);

  for (let i = 0; i < MAXTRADEITEM; ++i) {
    if (sys.techLevel < TRADE_ITEMS[i].techProduction) {
      buyPrice[i] = 0;
    } else if (
      (i === NARCOTICS && !pol.drugsOK) ||
      (i === FIREARMS && !pol.firearmsOK)
    ) {
      buyPrice[i] = 0;
    } else {
      if (policeRecordScore < DUBIOUSSCORE) {
        buyPrice[i] = Math.floor((sellPrice[i] * 100) / 90);
      } else {
        buyPrice[i] = sellPrice[i];
      }
      // BuyPrice = SellPrice + 1 to 12% (minimum is 1, max 12)
      buyPrice[i] = Math.floor((buyPrice[i] * (103 + (MAXSKILL - ts))) / 100);
      if (buyPrice[i] <= sellPrice[i]) {
        buyPrice[i] = sellPrice[i] + 1;
      }
    }
  }
}

/**
 * After erasure of police record, selling prices must be recalculated.
 * Ported from RecalculateSellPrices() in Skill.c.
 */
export function recalculateSellPrices(sellPrice: number[]): void {
  for (let i = 0; i < MAXTRADEITEM; ++i) {
    sellPrice[i] = Math.floor((sellPrice[i] * 100) / 90);
  }
}

// ── Buy / Sell cargo ─────────────────────────────────────────────────────

export interface TradeResult {
  success: boolean;
  message?: string;
}

/**
 * Buy cargo. Ported from BuyCargo() in Cargo.c.
 */
export function buyCargo(
  index: number,
  amount: number,
  ship: Ship,
  curSystem: SolarSystem,
  buyPrice: number[],
  buyingPrice: number[],
  credits: number,
  japoriDiseaseStatus: number,
  reactorStatus: number,
  leaveEmpty: number,
  reserveMoney: boolean,
  mercenaryMoney: number,
  insuranceMoney: number,
  _debt: number,
): { credits: number; bought: number } {
  if (curSystem.qty[index] <= 0 || buyPrice[index] <= 0) {
    return { credits, bought: 0 };
  }

  const bays = totalCargoBays(ship, japoriDiseaseStatus, reactorStatus);
  const filled = filledCargoBays(ship);
  if (bays - filled - leaveEmpty <= 0) {
    return { credits, bought: 0 };
  }

  const toSpend = reserveMoney ? Math.max(0, credits - mercenaryMoney - insuranceMoney) : credits;
  if (toSpend < buyPrice[index]) {
    return { credits, bought: 0 };
  }

  let toBuy = Math.min(amount, curSystem.qty[index]);
  toBuy = Math.min(toBuy, bays - filled - leaveEmpty);
  toBuy = Math.min(toBuy, Math.floor(toSpend / buyPrice[index]));

  ship.cargo[index] += toBuy;
  credits -= toBuy * buyPrice[index];
  buyingPrice[index] += toBuy * buyPrice[index];
  curSystem.qty[index] -= toBuy;

  return { credits, bought: toBuy };
}

/**
 * Sell or jettison cargo. Ported from SellCargo() in Cargo.c.
 * Operation: 1=SELLCARGO, 2=DUMPCARGO, 3=JETTISONCARGO
 */
export function sellCargo(
  index: number,
  amount: number,
  operation: number,
  ship: Ship,
  sellPrice: number[],
  buyingPrice: number[],
  credits: number,
  difficulty: number,
  policeRecordScore: number,
  reserveMoney: boolean,
  mercenaryMoney: number,
  insuranceMoney: number,
): { credits: number; sold: number; policeRecordScore: number } {
  if (ship.cargo[index] <= 0) {
    return { credits, sold: 0, policeRecordScore };
  }

  if (sellPrice[index] <= 0 && operation === 1) {
    return { credits, sold: 0, policeRecordScore };
  }

  let toSell = Math.min(amount, ship.cargo[index]);

  if (operation === 2) {
    // Dump cargo costs money
    const toSpend = reserveMoney ? Math.max(0, credits - mercenaryMoney - insuranceMoney) : credits;
    toSell = Math.min(toSell, Math.floor(toSpend / (5 * (difficulty + 1))));
  }

  buyingPrice[index] = Math.floor(
    (buyingPrice[index] * (ship.cargo[index] - toSell)) / ship.cargo[index],
  );
  ship.cargo[index] -= toSell;

  if (operation === 1) {
    credits += toSell * sellPrice[index];
  }
  if (operation === 2) {
    credits -= toSell * 5 * (difficulty + 1);
  }
  if (operation === 3) {
    // Jettison: chance of getting caught littering
    if (getRandom(10) < difficulty + 1) {
      if (policeRecordScore > DUBIOUSSCORE) {
        policeRecordScore = DUBIOUSSCORE;
      } else {
        --policeRecordScore;
      }
    }
  }

  return { credits, sold: toSell, policeRecordScore };
}

// ── Orbit trading helpers ────────────────────────────────────────────────

/** Does a ship have tradeable items for the given operation? */
export function hasTradeableItems(
  ship: Ship,
  buyPrice: number[],
  sellPrice: number[],
  policeRecordScore: number,
  operation: number,
): boolean {
  for (let i = 0; i < MAXTRADEITEM; i++) {
    let thisRet = false;
    if (ship.cargo[i] > 0 && operation === TRADERSELL && buyPrice[i] > 0) thisRet = true;
    else if (ship.cargo[i] > 0 && operation === TRADERBUY && sellPrice[i] > 0) thisRet = true;

    if (policeRecordScore < DUBIOUSSCORE && i !== FIREARMS && i !== NARCOTICS) thisRet = false;
    else if (policeRecordScore >= DUBIOUSSCORE && (i === FIREARMS || i === NARCOTICS)) thisRet = false;

    if (thisRet) return true;
  }
  return false;
}

/** Get a random tradeable item index. */
export function getRandomTradeableItem(
  ship: Ship,
  buyPrice: number[],
  sellPrice: number[],
  policeRecordScore: number,
  operation: number,
): number {
  let j = -1;
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = getRandom(MAXTRADEITEM);
    const isBuy = ship.cargo[candidate] > 0 && operation === TRADERBUY && sellPrice[candidate] > 0;
    const isSell = ship.cargo[candidate] > 0 && operation === TRADERSELL && buyPrice[candidate] > 0;
    const isCriminal = policeRecordScore < DUBIOUSSCORE;
    const isIllegal = candidate === FIREARMS || candidate === NARCOTICS;
    const legalOk = (isCriminal && isIllegal) || (!isCriminal && !isIllegal);

    if ((isBuy || isSell) && legalOk) {
      j = candidate;
      break;
    }
  }
  if (j === -1) {
    // Sequential fallback
    for (let candidate = 0; candidate < MAXTRADEITEM; candidate++) {
      const isBuy = ship.cargo[candidate] > 0 && operation === TRADERBUY && sellPrice[candidate] > 0;
      const isSell = ship.cargo[candidate] > 0 && operation === TRADERSELL && buyPrice[candidate] > 0;
      const isCriminal = policeRecordScore < DUBIOUSSCORE;
      const isIllegal = candidate === FIREARMS || candidate === NARCOTICS;
      const legalOk = (isCriminal && isIllegal) || (!isCriminal && !isIllegal);
      if ((isBuy || isSell) && legalOk) {
        j = candidate;
        break;
      }
    }
  }
  return j === -1 ? 0 : j;
}
