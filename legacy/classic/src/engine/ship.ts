/**
 * Space Trader 1.2.0 — Ship management
 * Ported from Cargo.c, Fuel.c, ShipPrice.c, Shipyard.c
 */

import type { Ship, CrewMember } from '../models/types';
import {
  MAXTRADEITEM, MAXWEAPON, MAXSHIELD, MAXGADGET, MAXCREW,
  EXTRABAYS, FUELCOMPACTOR, UPGRADEDHULL,
} from '../data/constants';
import { SHIP_TYPES } from '../data/shipTypes';
import { WEAPONS } from '../data/weapons';
import { SHIELDS } from '../data/shields';
import { GADGETS } from '../data/gadgets';
import { hasGadget } from './skills';
import { pilotSkill, engineerSkill, fighterSkill } from './skills';

// ── Fuel ─────────────────────────────────────────────────────────────────

/** Determine size of fuel tanks. Ported from GetFuelTanks() in Fuel.c */
export function getFuelTanks(ship: Ship): number {
  return hasGadget(ship, FUELCOMPACTOR) ? 18 : SHIP_TYPES[ship.type].fuelTanks;
}

/** Determine current fuel. Ported from GetFuel() in Fuel.c */
export function getFuel(ship: Ship): number {
  return Math.min(ship.fuel, getFuelTanks(ship));
}

/** Buy fuel for Amount credits. Ported from BuyFuel() in Fuel.c */
export function buyFuel(
  ship: Ship,
  amount: number,
  credits: number,
): { credits: number } {
  const maxFuel = (getFuelTanks(ship) - getFuel(ship)) * SHIP_TYPES[ship.type].costOfFuel;
  let toBuy = Math.min(amount, maxFuel);
  toBuy = Math.min(toBuy, credits);
  const parsecs = Math.floor(toBuy / SHIP_TYPES[ship.type].costOfFuel);
  ship.fuel += parsecs;
  credits -= parsecs * SHIP_TYPES[ship.type].costOfFuel;
  return { credits };
}

// ── Hull ─────────────────────────────────────────────────────────────────

/** Determine ship's hull strength. Ported from GetHullStrength() in Shipyard.c */
export function getHullStrength(ship: Ship, scarabStatus: number): number {
  if (scarabStatus === 3) {
    return SHIP_TYPES[ship.type].hullStrength + UPGRADEDHULL;
  }
  return SHIP_TYPES[ship.type].hullStrength;
}

/** Buy repairs for Amount credits. Ported from BuyRepairs() in Shipyard.c */
export function buyRepairs(
  ship: Ship,
  amount: number,
  credits: number,
  scarabStatus: number,
): { credits: number } {
  const hullStr = getHullStrength(ship, scarabStatus);
  let maxRepairs = (hullStr - ship.hull) * SHIP_TYPES[ship.type].repairCosts;
  let repairAmount = Math.min(amount, maxRepairs);
  repairAmount = Math.min(repairAmount, credits);
  const percentage = Math.floor(repairAmount / SHIP_TYPES[ship.type].repairCosts);
  ship.hull += percentage;
  credits -= percentage * SHIP_TYPES[ship.type].repairCosts;
  return { credits };
}

// ── Cargo ────────────────────────────────────────────────────────────────

/** Calculate total cargo bays. Ported from TotalCargoBays() in Cargo.c */
export function totalCargoBays(
  ship: Ship,
  japoriDiseaseStatus: number,
  reactorStatus: number,
): number {
  let bays = SHIP_TYPES[ship.type].cargoBays;
  for (let i = 0; i < MAXGADGET; ++i) {
    if (ship.gadget[i] === EXTRABAYS) bays += 5;
  }
  if (japoriDiseaseStatus === 1) bays -= 10;
  if (reactorStatus > 0 && reactorStatus < 21) {
    bays -= (5 + 10 - Math.floor((reactorStatus - 1) / 2));
  }
  return bays;
}

/** Calculate total filled cargo bays. Ported from FilledCargoBays() in Cargo.c */
export function filledCargoBays(ship: Ship): number {
  let sum = 0;
  for (let i = 0; i < MAXTRADEITEM; ++i) {
    sum += ship.cargo[i];
  }
  return sum;
}

// ── Ship pricing ─────────────────────────────────────────────────────────

/** Base price of equipment item. Ported from BasePrice() macro in Cargo.c */
export function basePrice(
  itemTechLevel: number,
  price: number,
  systemTechLevel: number,
  traderSkillVal: number,
): number {
  if (itemTechLevel > systemTechLevel) return 0;
  return Math.floor((price * (100 - traderSkillVal)) / 100);
}

/** Selling price: 3/4 of original if index >= 0. Ported from BaseSellPrice() */
export function baseSellPrice(index: number, price: number): number {
  return index >= 0 ? Math.floor((price * 3) / 4) : 0;
}

/** WEAPONSELLPRICE macro */
export function weaponSellPrice(ship: Ship, slotIndex: number): number {
  if (ship.weapon[slotIndex] < 0) return 0;
  return baseSellPrice(ship.weapon[slotIndex], WEAPONS[ship.weapon[slotIndex]].price);
}

/** SHIELDSELLPRICE macro */
export function shieldSellPrice(ship: Ship, slotIndex: number): number {
  if (ship.shield[slotIndex] < 0) return 0;
  return baseSellPrice(ship.shield[slotIndex], SHIELDS[ship.shield[slotIndex]].price);
}

/** GADGETSELLPRICE macro */
export function gadgetSellPrice(ship: Ship, slotIndex: number): number {
  if (ship.gadget[slotIndex] < 0) return 0;
  return baseSellPrice(ship.gadget[slotIndex], GADGETS[ship.gadget[slotIndex]].price);
}

/** Determine value of enemy ship. Ported from EnemyShipPrice() in ShipPrice.c */
export function enemyShipPrice(
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): number {
  let curPrice = SHIP_TYPES[ship.type].price;
  for (let i = 0; i < MAXWEAPON; ++i) {
    if (ship.weapon[i] >= 0) curPrice += WEAPONS[ship.weapon[i]].price;
  }
  for (let i = 0; i < MAXSHIELD; ++i) {
    if (ship.shield[i] >= 0) curPrice += SHIELDS[ship.shield[i]].price;
  }
  const ps = pilotSkill(ship, mercenaries, difficulty);
  const es = engineerSkill(ship, mercenaries, difficulty);
  const fs = fighterSkill(ship, mercenaries, difficulty);
  curPrice = Math.floor(curPrice * (2 * ps + es + 3 * fs) / 60);
  return curPrice;
}

/** Current ship price without cargo. Ported from CurrentShipPriceWithoutCargo() in ShipPrice.c */
export function currentShipPriceWithoutCargo(
  ship: Ship,
  forInsurance: boolean,
  scarabStatus: number,
): number {
  const hullStr = getHullStrength(ship, scarabStatus);
  let curPrice = Math.floor(
    (SHIP_TYPES[ship.type].price * (ship.tribbles > 0 && !forInsurance ? 1 : 3)) / 4,
  );
  curPrice -= (hullStr - ship.hull) * SHIP_TYPES[ship.type].repairCosts;
  curPrice -= (SHIP_TYPES[ship.type].fuelTanks - getFuel(ship)) * SHIP_TYPES[ship.type].costOfFuel;
  for (let i = 0; i < MAXWEAPON; ++i) {
    if (ship.weapon[i] >= 0) curPrice += weaponSellPrice(ship, i);
  }
  for (let i = 0; i < MAXSHIELD; ++i) {
    if (ship.shield[i] >= 0) curPrice += shieldSellPrice(ship, i);
  }
  for (let i = 0; i < MAXGADGET; ++i) {
    if (ship.gadget[i] >= 0) curPrice += gadgetSellPrice(ship, i);
  }
  return curPrice;
}

/** Current ship price including cargo. Ported from CurrentShipPrice() in ShipPrice.c */
export function currentShipPrice(
  ship: Ship,
  forInsurance: boolean,
  scarabStatus: number,
  buyingPrice: number[],
): number {
  let curPrice = currentShipPriceWithoutCargo(ship, forInsurance, scarabStatus);
  for (let i = 0; i < MAXTRADEITEM; ++i) {
    curPrice += buyingPrice[i];
  }
  return curPrice;
}

// ── Mercenary hire price ─────────────────────────────────────────────────

/** MERCENARYHIREPRICE macro. */
export function mercenaryHirePrice(
  mercenaries: CrewMember[],
  index: number,
  maxCrewMember: number,
  wildStatus: number,
): number {
  if (index < 0 || (index >= maxCrewMember && wildStatus === 2)) return 0;
  const m = mercenaries[index];
  return (m.pilot + m.fighter + m.trader + m.engineer) * 3;
}

// ── Slot helpers ─────────────────────────────────────────────────────────

/** Determine first empty slot, return -1 if none. Ported from GetFirstEmptySlot() */
export function getFirstEmptySlot(slots: number, items: number[]): number {
  for (let j = 0; j < slots; ++j) {
    if (items[j] < 0) return j;
  }
  return -1;
}

/** Determine if there are any empty equipment slots. */
export function anyEmptySlots(ship: Ship): boolean {
  const st = SHIP_TYPES[ship.type];
  for (let j = 0; j < st.weaponSlots; ++j) {
    if (ship.weapon[j] < 0) return true;
  }
  for (let j = 0; j < st.shieldSlots; ++j) {
    if (ship.shield[j] < 0) return true;
  }
  for (let j = 0; j < st.gadgetSlots; ++j) {
    if (ship.gadget[j] < 0) return true;
  }
  return false;
}

/** Create a Flea ship (escape pod rescue). */
export function createFlea(ship: Ship): void {
  ship.type = 0; // Flea
  for (let i = 0; i < MAXTRADEITEM; ++i) ship.cargo[i] = 0;
  for (let i = 0; i < MAXWEAPON; ++i) ship.weapon[i] = -1;
  for (let i = 0; i < MAXSHIELD; ++i) {
    ship.shield[i] = -1;
    ship.shieldStrength[i] = 0;
  }
  for (let i = 0; i < MAXGADGET; ++i) ship.gadget[i] = -1;
  for (let i = 1; i < MAXCREW; ++i) ship.crew[i] = -1;
  ship.fuel = SHIP_TYPES[0].fuelTanks;
  ship.hull = SHIP_TYPES[0].hullStrength;
  ship.tribbles = 0;
}

/** BASESHIPPRICE macro */
export function baseShipPrice(
  shipTypeIndex: number,
  traderSkillVal: number,
): number {
  return Math.floor((SHIP_TYPES[shipTypeIndex].price * (100 - traderSkillVal)) / 100);
}
