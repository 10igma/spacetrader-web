/**
 * Space Trader 1.2.0 — Skill calculations
 * Ported from Skill.c
 */

import type { Ship, CrewMember } from '../models/types';
import {
  MAXCREW, MAXGADGET, MAXSHIELD, MAXWEAPON, MAXSKILL, MAXSKILLTYPE,
  NAVIGATINGSYSTEM, TARGETINGSYSTEM, AUTOREPAIRSYSTEM, CLOAKINGDEVICE,
  SKILLBONUS, CLOAKBONUS,
  BEGINNER, EASY, IMPOSSIBLE,
  PILOTSKILL, FIGHTERSKILL, TRADERSKILL, ENGINEERSKILL,
} from '../data/constants';
import { getRandom } from '../utils/math';

// ── Equipment checks ─────────────────────────────────────────────────────

/** Does this ship have a specific gadget? Ported from HasGadget() in Skill.c */
export function hasGadget(ship: Ship, gadgetType: number): boolean {
  for (let i = 0; i < MAXGADGET; ++i) {
    if (ship.gadget[i] < 0) continue;
    if (ship.gadget[i] === gadgetType) return true;
  }
  return false;
}

/** Does this ship have a specific shield type? */
export function hasShield(ship: Ship, shieldType: number): boolean {
  for (let i = 0; i < MAXSHIELD; ++i) {
    if (ship.shield[i] < 0) continue;
    if (ship.shield[i] === shieldType) return true;
  }
  return false;
}

/** Does this ship have a specific weapon? If exactCompare is false, better weapons also count. */
export function hasWeapon(ship: Ship, weaponType: number, exactCompare: boolean): boolean {
  for (let i = 0; i < MAXWEAPON; ++i) {
    if (ship.weapon[i] < 0) continue;
    if (ship.weapon[i] === weaponType || (ship.weapon[i] > weaponType && !exactCompare)) return true;
  }
  return false;
}

// ── Difficulty adaptation ────────────────────────────────────────────────

/** Adapt a skill to the difficulty level. Ported from AdaptDifficulty() in Skill.c */
export function adaptDifficulty(level: number, difficulty: number): number {
  if (difficulty === BEGINNER || difficulty === EASY) {
    return level + 1;
  } else if (difficulty === IMPOSSIBLE) {
    return Math.max(1, level - 1);
  }
  return level;
}

// ── Skill aggregation ────────────────────────────────────────────────────

/** Trader skill — best among crew, +1 if Jarek aboard (status>=2). Ported from TraderSkill() */
export function traderSkill(
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
  jarekStatus: number,
): number {
  let maxSkill = mercenaries[ship.crew[0]].trader;
  for (let i = 1; i < MAXCREW; ++i) {
    if (ship.crew[i] < 0) break;
    if (mercenaries[ship.crew[i]].trader > maxSkill) {
      maxSkill = mercenaries[ship.crew[i]].trader;
    }
  }
  if (jarekStatus >= 2) ++maxSkill;
  return adaptDifficulty(maxSkill, difficulty);
}

/** Fighter skill — best among crew, +SKILLBONUS if targeting system. Ported from FighterSkill() */
export function fighterSkill(
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): number {
  let maxSkill = mercenaries[ship.crew[0]].fighter;
  for (let i = 1; i < MAXCREW; ++i) {
    if (ship.crew[i] < 0) break;
    if (mercenaries[ship.crew[i]].fighter > maxSkill) {
      maxSkill = mercenaries[ship.crew[i]].fighter;
    }
  }
  if (hasGadget(ship, TARGETINGSYSTEM)) maxSkill += SKILLBONUS;
  return adaptDifficulty(maxSkill, difficulty);
}

/** Pilot skill — best among crew, +SKILLBONUS if nav system, +CLOAKBONUS if cloak. Ported from PilotSkill() */
export function pilotSkill(
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): number {
  let maxSkill = mercenaries[ship.crew[0]].pilot;
  for (let i = 1; i < MAXCREW; ++i) {
    if (ship.crew[i] < 0) break;
    if (mercenaries[ship.crew[i]].pilot > maxSkill) {
      maxSkill = mercenaries[ship.crew[i]].pilot;
    }
  }
  if (hasGadget(ship, NAVIGATINGSYSTEM)) maxSkill += SKILLBONUS;
  if (hasGadget(ship, CLOAKINGDEVICE)) maxSkill += CLOAKBONUS;
  return adaptDifficulty(maxSkill, difficulty);
}

/** Engineer skill — best among crew, +SKILLBONUS if auto-repair system. Ported from EngineerSkill() */
export function engineerSkill(
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): number {
  let maxSkill = mercenaries[ship.crew[0]].engineer;
  for (let i = 1; i < MAXCREW; ++i) {
    if (ship.crew[i] < 0) break;
    if (mercenaries[ship.crew[i]].engineer > maxSkill) {
      maxSkill = mercenaries[ship.crew[i]].engineer;
    }
  }
  if (hasGadget(ship, AUTOREPAIRSYSTEM)) maxSkill += SKILLBONUS;
  return adaptDifficulty(maxSkill, difficulty);
}

// ── Random skill for mercenaries ─────────────────────────────────────────

/** Random mercenary skill: 1 + random(5) + random(6). Ported from RandomSkill() */
export function randomSkill(): number {
  return 1 + getRandom(5) + getRandom(6);
}

// ── Nth lowest skill ─────────────────────────────────────────────────────

/** Returns the skill type with the nth lowest score for the commander.
 *  Ported from NthLowestSkill() in Skill.c. */
export function nthLowestSkill(ship: Ship, mercenaries: CrewMember[], n: number): number {
  let i = 0;
  let lower = 1;
  let retVal = 0;
  let looping = true;
  const cmdr = mercenaries[ship.crew[0]];

  while (looping) {
    retVal = 0;
    if (cmdr.pilot === i) {
      if (lower === n) { looping = false; retVal = PILOTSKILL; }
      lower++;
    }
    if (cmdr.fighter === i) {
      if (lower === n) { looping = false; retVal = FIGHTERSKILL; }
      lower++;
    }
    if (cmdr.trader === i) {
      if (lower === n) { looping = false; retVal = TRADERSKILL; }
      lower++;
    }
    if (cmdr.engineer === i) {
      if (lower === n) { looping = false; retVal = ENGINEERSKILL; }
      lower++;
    }
    i++;
  }
  return retVal;
}

// ── Increase / Decrease random skill ─────────────────────────────────────

export function increaseRandomSkill(
  mercenaries: CrewMember[],
  ship: Ship,
  _difficulty: number,
  _jarekStatus: number,
): void {
  const cmdr = mercenaries[ship.crew[0]];
  if (cmdr.pilot >= MAXSKILL && cmdr.trader >= MAXSKILL &&
    cmdr.fighter >= MAXSKILL && cmdr.engineer >= MAXSKILL) return;

  let redo = true;
  let d = 0;
  while (redo) {
    d = getRandom(MAXSKILLTYPE);
    if ((d === 0 && cmdr.pilot < MAXSKILL) ||
      (d === 1 && cmdr.fighter < MAXSKILL) ||
      (d === 2 && cmdr.trader < MAXSKILL) ||
      (d === 3 && cmdr.engineer < MAXSKILL)) {
      redo = false;
    }
  }
  if (d === 0) cmdr.pilot += 1;
  else if (d === 1) cmdr.fighter += 1;
  else if (d === 2) cmdr.trader += 1;
  else cmdr.engineer += 1;
}

export function decreaseRandomSkill(
  mercenaries: CrewMember[],
  ship: Ship,
  amount: number,
): void {
  const cmdr = mercenaries[ship.crew[0]];
  let redo = true;
  let d = 0;
  while (redo) {
    d = getRandom(MAXSKILLTYPE);
    if ((d === 0 && cmdr.pilot > amount) ||
      (d === 1 && cmdr.fighter > amount) ||
      (d === 2 && cmdr.trader > amount) ||
      (d === 3 && cmdr.engineer > amount)) {
      redo = false;
    }
  }
  if (d === 0) cmdr.pilot -= amount;
  else if (d === 1) cmdr.fighter -= amount;
  else if (d === 2) cmdr.trader -= amount;
  else cmdr.engineer -= amount;
}

export function tonicTweakRandomSkill(
  mercenaries: CrewMember[],
  ship: Ship,
  difficulty: number,
  jarekStatus: number,
): void {
  const cmdr = mercenaries[ship.crew[0]];
  const oldPilot = cmdr.pilot;
  const oldFighter = cmdr.fighter;
  const oldTrader = cmdr.trader;
  const oldEngineer = cmdr.engineer;

  if (difficulty < 3 /* HARD */) {
    while (
      oldPilot === cmdr.pilot &&
      oldFighter === cmdr.fighter &&
      oldTrader === cmdr.trader &&
      oldEngineer === cmdr.engineer
    ) {
      increaseRandomSkill(mercenaries, ship, difficulty, jarekStatus);
      decreaseRandomSkill(mercenaries, ship, 1);
    }
  } else {
    increaseRandomSkill(mercenaries, ship, difficulty, jarekStatus);
    increaseRandomSkill(mercenaries, ship, difficulty, jarekStatus);
    decreaseRandomSkill(mercenaries, ship, 3);
  }
}
