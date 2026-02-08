/**
 * Space Trader 1.2.0 — Encounter generation during travel
 * Ported from Traveler.c Travel() and GenerateOpponent()
 */

import type { Ship, SolarSystem, CrewMember } from '../models/types';
import { createEmptyShip } from '../models/types';
import {
  MAXSHIPTYPE, MAXSHIELD, MAXWEAPON, MAXGADGET, MAXCREW,
  MAXWEAPONTYPE, MAXSHIELDTYPE, MAXGADGETTYPE, MAXCREWMEMBER, MAXSKILL,
  MAXTRADEITEM,
  POLICE, PIRATE, TRADER, MANTIS, FAMOUSCAPTAIN,
  MANTISTYPE, REFLECTIVESHIELD, RSHIELDPOWER,
  MILITARYLASERWEAPON, TARGETINGSYSTEM, NAVIGATINGSYSTEM,
  EXTRABAYS,
  NORMAL, HARD,
  PSYCHOPATHSCORE, VILLAINSCORE,
  KRAVATSYSTEM,
} from '../data/constants';
import { SHIP_TYPES } from '../data/shipTypes';
import { WEAPONS } from '../data/weapons';
import { SHIELDS } from '../data/shields';
import { GADGETS } from '../data/gadgets';
import { POLITICS_DATA } from '../data/politics';
import { getRandom } from '../utils/math';
import { hasGadget } from './skills';
import { currentWorth } from './bank';

// ── STRENGTHPOLICE macro ─────────────────────────────────────────────────

export function strengthPolice(
  systemId: number,
  solarSystems: SolarSystem[],
  policeRecordScore: number,
): number {
  const base = POLITICS_DATA[solarSystems[systemId].politics].strengthPolice;
  if (policeRecordScore < PSYCHOPATHSCORE) return 3 * base;
  if (policeRecordScore < VILLAINSCORE) return 2 * base;
  return base;
}

// ── Generate opponent ship ───────────────────────────────────────────────

/**
 * Generate an opposing ship. Ported from GenerateOpponent() in Traveler.c.
 * Returns the generated opponent Ship and updates mercenaries[MAXCREWMEMBER].
 */
export function generateOpponent(
  opp: number,
  warpSystem: number,
  solarSystems: SolarSystem[],
  mercenaries: CrewMember[],
  difficulty: number,
  policeRecordScore: number,
  _reputationScore: number,
  ship: Ship,
  credits: number,
  debt: number,
  moonBought: boolean,
  scarabStatus: number,
  wildStatus: number,
  buyingPrice: number[],
): Ship {
  const opponent = createEmptyShip();

  if (opp === FAMOUSCAPTAIN) {
    opponent.type = MAXSHIPTYPE - 1;
    for (let i = 0; i < MAXSHIELD; i++) {
      opponent.shield[i] = REFLECTIVESHIELD;
      opponent.shieldStrength[i] = RSHIELDPOWER;
    }
    for (let i = 0; i < MAXWEAPON; i++) {
      opponent.weapon[i] = MILITARYLASERWEAPON;
    }
    opponent.gadget[0] = TARGETINGSYSTEM;
    opponent.gadget[1] = NAVIGATINGSYSTEM;
    opponent.hull = SHIP_TYPES[MAXSHIPTYPE - 1].hullStrength;
    opponent.crew[0] = MAXCREWMEMBER;
    mercenaries[MAXCREWMEMBER].pilot = MAXSKILL;
    mercenaries[MAXCREWMEMBER].fighter = MAXSKILL;
    mercenaries[MAXCREWMEMBER].trader = MAXSKILL;
    mercenaries[MAXCREWMEMBER].engineer = MAXSKILL;
    return opponent;
  }

  let tries = 1;
  if (opp === MANTIS) tries = 1 + difficulty;
  if (opp === POLICE) {
    if (policeRecordScore < VILLAINSCORE && wildStatus !== 1) tries = 3;
    else if (policeRecordScore < PSYCHOPATHSCORE || wildStatus === 1) tries = 5;
    tries = Math.max(1, tries + difficulty - NORMAL);
  }
  if (opp === PIRATE) {
    const worth = currentWorth(ship, credits, debt, moonBought, scarabStatus, buyingPrice);
    tries = 1 + Math.floor(worth / 100000);
    tries = Math.max(1, tries + difficulty - NORMAL);
  }

  let j = 0;
  opponent.type = opp === TRADER ? 0 : 1;

  const k = difficulty >= NORMAL ? difficulty - NORMAL : 0;

  while (j < tries) {
    let redo = true;
    while (redo) {
      const d = getRandom(100);
      let i = 0;
      let sum = SHIP_TYPES[0].occurrence;
      while (sum < d) {
        if (i >= MAXSHIPTYPE - 1) break;
        ++i;
        sum += SHIP_TYPES[i].occurrence;
      }
      if (opp === POLICE && (SHIP_TYPES[i].police < 0 ||
        POLITICS_DATA[solarSystems[warpSystem].politics].strengthPolice + k < SHIP_TYPES[i].police)) continue;
      if (opp === PIRATE && (SHIP_TYPES[i].pirates < 0 ||
        POLITICS_DATA[solarSystems[warpSystem].politics].strengthPirates + k < SHIP_TYPES[i].pirates)) continue;
      if (opp === TRADER && (SHIP_TYPES[i].traders < 0 ||
        POLITICS_DATA[solarSystems[warpSystem].politics].strengthTraders + k < SHIP_TYPES[i].traders)) continue;
      redo = false;
      if (i > opponent.type) opponent.type = i;
    }
    ++j;
  }

  if (opp === MANTIS) {
    opponent.type = MANTISTYPE;
  } else {
    const worth = currentWorth(ship, credits, debt, moonBought, scarabStatus, buyingPrice);
    tries = Math.max(1, Math.floor(worth / 150000) + difficulty - NORMAL);
  }

  // Gadgets
  let d: number;
  if (SHIP_TYPES[opponent.type].gadgetSlots <= 0) {
    d = 0;
  } else if (difficulty <= HARD) {
    d = getRandom(SHIP_TYPES[opponent.type].gadgetSlots + 1);
    if (d < SHIP_TYPES[opponent.type].gadgetSlots) {
      if (tries > 4) ++d;
      else if (tries > 2) d += getRandom(2);
    }
  } else {
    d = SHIP_TYPES[opponent.type].gadgetSlots;
  }
  for (let i = 0; i < d; ++i) {
    let e = 0;
    let f = 0;
    while (e < tries) {
      const kk = getRandom(100);
      let jj = 0;
      let sum = GADGETS[0].chance;
      while (kk < sum) {
        if (jj >= MAXGADGETTYPE - 1) break;
        ++jj;
        sum += GADGETS[jj].chance;
      }
      if (!hasGadget(opponent, jj)) {
        if (jj > f) f = jj;
      }
      ++e;
    }
    opponent.gadget[i] = f;
  }
  for (let i = d; i < MAXGADGET; ++i) opponent.gadget[i] = -1;

  // Cargo bays
  let bays = SHIP_TYPES[opponent.type].cargoBays;
  for (let i = 0; i < MAXGADGET; ++i) {
    if (opponent.gadget[i] === EXTRABAYS) bays += 5;
  }
  for (let i = 0; i < MAXTRADEITEM; ++i) opponent.cargo[i] = 0;

  if (bays > 5) {
    let sum: number;
    if (difficulty >= NORMAL) {
      const m = 3 + getRandom(bays - 5);
      sum = Math.min(m, 15);
    } else {
      sum = bays;
    }
    if (opp === POLICE) sum = 0;
    if (opp === PIRATE) {
      if (difficulty < NORMAL) sum = Math.floor((sum * 4) / 5);
      else sum = Math.floor(sum / difficulty);
    }
    if (sum < 1) sum = 1;

    let ii = 0;
    while (ii < sum) {
      const jj = getRandom(MAXTRADEITEM);
      let kk = 1 + getRandom(10 - jj);
      if (ii + kk > sum) kk = sum - ii;
      opponent.cargo[jj] += kk;
      ii += kk;
    }
  }

  opponent.fuel = SHIP_TYPES[opponent.type].fuelTanks;
  opponent.tribbles = 0;

  // Weapons
  if (SHIP_TYPES[opponent.type].weaponSlots <= 0) {
    d = 0;
  } else if (SHIP_TYPES[opponent.type].weaponSlots <= 1) {
    d = 1;
  } else if (difficulty <= HARD) {
    d = 1 + getRandom(SHIP_TYPES[opponent.type].weaponSlots);
    if (d < SHIP_TYPES[opponent.type].weaponSlots) {
      if (tries > 4 && difficulty >= HARD) ++d;
      else if (tries > 3 || difficulty >= HARD) d += getRandom(2);
    }
  } else {
    d = SHIP_TYPES[opponent.type].weaponSlots;
  }
  for (let i = 0; i < d; ++i) {
    let e = 0;
    let f = 0;
    while (e < tries) {
      const kk = getRandom(100);
      let jj = 0;
      let sum = WEAPONS[0].chance;
      while (kk < sum) {
        if (jj >= MAXWEAPONTYPE - 1) break;
        ++jj;
        sum += WEAPONS[jj].chance;
      }
      if (jj > f) f = jj;
      ++e;
    }
    opponent.weapon[i] = f;
  }
  for (let i = d; i < MAXWEAPON; ++i) opponent.weapon[i] = -1;

  // Shields
  if (SHIP_TYPES[opponent.type].shieldSlots <= 0) {
    d = 0;
  } else if (difficulty <= HARD) {
    d = getRandom(SHIP_TYPES[opponent.type].shieldSlots + 1);
    if (d < SHIP_TYPES[opponent.type].shieldSlots) {
      if (tries > 3) ++d;
      else if (tries > 1) d += getRandom(2);
    }
  } else {
    d = SHIP_TYPES[opponent.type].shieldSlots;
  }
  for (let i = 0; i < d; ++i) {
    let e = 0;
    let f = 0;
    while (e < tries) {
      const kk = getRandom(100);
      let jj = 0;
      let sum = SHIELDS[0].chance;
      while (kk < sum) {
        if (jj >= MAXSHIELDTYPE - 1) break;
        ++jj;
        sum += SHIELDS[jj].chance;
      }
      if (jj > f) f = jj;
      ++e;
    }
    opponent.shield[i] = f;
    let jj = 0;
    let kk = 0;
    while (jj < 5) {
      const ee = 1 + getRandom(SHIELDS[opponent.shield[i]].power);
      if (ee > kk) kk = ee;
      ++jj;
    }
    opponent.shieldStrength[i] = kk;
  }
  for (let i = d; i < MAXSHIELD; ++i) {
    opponent.shield[i] = -1;
    opponent.shieldStrength[i] = 0;
  }

  // Hull
  if (opponent.shield[0] >= 0 && getRandom(10) <= 7) {
    opponent.hull = SHIP_TYPES[opponent.type].hullStrength;
  } else {
    let ii = 0;
    let kk = 0;
    while (ii < 5) {
      const dd = 1 + getRandom(SHIP_TYPES[opponent.type].hullStrength);
      if (dd > kk) kk = dd;
      ++ii;
    }
    opponent.hull = kk;
  }
  if (opp === MANTIS || opp === FAMOUSCAPTAIN) {
    opponent.hull = SHIP_TYPES[opponent.type].hullStrength;
  }

  // Crew
  opponent.crew[0] = MAXCREWMEMBER;
  mercenaries[MAXCREWMEMBER].pilot = 1 + getRandom(MAXSKILL);
  mercenaries[MAXCREWMEMBER].fighter = 1 + getRandom(MAXSKILL);
  mercenaries[MAXCREWMEMBER].trader = 1 + getRandom(MAXSKILL);
  mercenaries[MAXCREWMEMBER].engineer = 1 + getRandom(MAXSKILL);
  if (warpSystem === KRAVATSYSTEM && wildStatus === 1 && getRandom(10) < difficulty + 1) {
    mercenaries[MAXCREWMEMBER].engineer = MAXSKILL;
  }
  if (difficulty <= HARD) {
    d = 1 + getRandom(SHIP_TYPES[opponent.type].crewQuarters);
    if (difficulty >= HARD && d < SHIP_TYPES[opponent.type].crewQuarters) ++d;
  } else {
    d = SHIP_TYPES[opponent.type].crewQuarters;
  }
  for (let i = 1; i < d; ++i) {
    opponent.crew[i] = getRandom(MAXCREWMEMBER);
  }
  for (let i = d; i < MAXCREW; ++i) opponent.crew[i] = -1;

  return opponent;
}
