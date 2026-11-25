/**
 * Space Trader 1.2.0 — Combat engine
 * Ported from Encounter.c
 */

import type { Ship, CrewMember } from '../models/types';
import {
  MAXWEAPON, MAXSHIELD,
  BEGINNER, IMPOSSIBLE,
  SCARABTYPE, PULSELASERWEAPON, MORGANLASERWEAPON,
} from '../data/constants';
import { SHIP_TYPES } from '../data/shipTypes';
import { WEAPONS } from '../data/weapons';
import { SHIELDS } from '../data/shields';
import { getRandom } from '../utils/math';
import { pilotSkill, fighterSkill, engineerSkill, hasGadget as hasGadgetFn } from './skills';
import { getHullStrength, enemyShipPrice } from './ship';
import { CLOAKINGDEVICE as CLOAKINGDEVICE_VAL } from '../data/constants';

// ── Total weapon/shield calculations ─────────────────────────────────────

/**
 * Calculate total weapon power. Use minWeapon/maxWeapon = -1 for any weapon.
 * Ported from TotalWeapons() in Encounter.c.
 */
export function totalWeapons(ship: Ship, minWeapon: number, maxWeapon: number): number {
  let j = 0;
  for (let i = 0; i < MAXWEAPON; ++i) {
    if (ship.weapon[i] < 0) break;
    if ((minWeapon !== -1 && ship.weapon[i] < minWeapon) ||
      (maxWeapon !== -1 && ship.weapon[i] > maxWeapon)) continue;
    j += WEAPONS[ship.weapon[i]].power;
  }
  return j;
}

/** Calculate total possible shield strength. Ported from TotalShields() */
export function totalShields(ship: Ship): number {
  let j = 0;
  for (let i = 0; i < MAXSHIELD; ++i) {
    if (ship.shield[i] < 0) break;
    j += SHIELDS[ship.shield[i]].power;
  }
  return j;
}

/** Calculate current total shield strength. Ported from TotalShieldStrength() */
export function totalShieldStrength(ship: Ship): number {
  let k = 0;
  for (let i = 0; i < MAXSHIELD; ++i) {
    if (ship.shield[i] < 0) break;
    k += ship.shieldStrength[i];
  }
  return k;
}

// ── Bounty calculation ───────────────────────────────────────────────────

/** Calculate bounty for destroying an enemy ship. Ported from GetBounty() */
export function getBounty(
  ship: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): number {
  let bounty = enemyShipPrice(ship, mercenaries, difficulty);
  bounty = Math.floor(bounty / 200);
  bounty = Math.floor(bounty / 25) * 25;
  if (bounty <= 0) bounty = 25;
  if (bounty > 2500) bounty = 2500;
  return bounty;
}

// ── Attack execution ─────────────────────────────────────────────────────

export interface AttackResult {
  hit: boolean;
  shipDestroyed: boolean;
}

/**
 * Execute one attack: Attacker fires at Defender.
 * Ported from ExecuteAttack() in Encounter.c.
 *
 * @param flees - true if Defender is fleeing
 * @param commanderUnderAttack - true if the player's ship is the Defender
 */
export function executeAttack(
  attacker: Ship,
  defender: Ship,
  flees: boolean,
  commanderUnderAttack: boolean,
  mercenaries: CrewMember[],
  difficulty: number,
  reactorStatus: number,
  scarabStatus: number,
): AttackResult {
  // On beginner level, if you flee, you escape unharmed
  if (difficulty === BEGINNER && commanderUnderAttack && flees) {
    return { hit: false, shipDestroyed: false };
  }

  const attackerFighter = fighterSkill(attacker, mercenaries, difficulty);
  const defenderPilot = pilotSkill(defender, mercenaries, difficulty);
  const defenderSize = SHIP_TYPES[defender.type].size;

  // Fighter skill vs pilot skill check
  if (getRandom(attackerFighter + defenderSize) <
    (flees ? 2 : 1) * getRandom(5 + (defenderPilot >> 1))) {
    return { hit: false, shipDestroyed: false };
  }

  let damage: number;
  const attackerEngineer = engineerSkill(attacker, mercenaries, difficulty);

  if (totalWeapons(attacker, -1, -1) <= 0) {
    damage = 0;
  } else if (defender.type === SCARABTYPE) {
    const pulseAndMorgan = totalWeapons(attacker, PULSELASERWEAPON, PULSELASERWEAPON) +
      totalWeapons(attacker, MORGANLASERWEAPON, MORGANLASERWEAPON);
    if (pulseAndMorgan <= 0) {
      damage = 0;
    } else {
      damage = getRandom(Math.floor(pulseAndMorgan * (100 + 2 * attackerEngineer) / 100));
    }
  } else {
    damage = getRandom(
      Math.floor(totalWeapons(attacker, -1, -1) * (100 + 2 * attackerEngineer) / 100),
    );
  }

  if (damage <= 0) {
    return { hit: false, shipDestroyed: false };
  }

  // Reactor on board — damage is boosted!
  if (commanderUnderAttack && reactorStatus > 0 && reactorStatus < 21) {
    if (difficulty < 2 /* NORMAL */) {
      damage = Math.floor(damage * (1 + (difficulty + 1) * 0.25));
    } else {
      damage = Math.floor(damage * (1 + (difficulty + 1) * 0.33));
    }
  }

  // First, shields are depleted
  for (let i = 0; i < MAXSHIELD; ++i) {
    if (defender.shield[i] < 0) break;
    if (damage <= defender.shieldStrength[i]) {
      defender.shieldStrength[i] -= damage;
      damage = 0;
      break;
    }
    damage -= defender.shieldStrength[i];
    defender.shieldStrength[i] = 0;
  }

  // If damage remains, subtract from hull
  if (damage > 0) {
    const defenderEngineer = engineerSkill(defender, mercenaries, difficulty);
    damage -= getRandom(defenderEngineer);
    if (damage <= 0) damage = 1;

    // Limit max damage per hit
    let maxHull: number;
    if (commanderUnderAttack && scarabStatus === 3) {
      maxHull = getHullStrength(defender, scarabStatus);
    } else {
      maxHull = SHIP_TYPES[defender.type].hullStrength;
    }
    const divisor = commanderUnderAttack ? Math.max(1, IMPOSSIBLE - difficulty) : 2;
    damage = Math.min(damage, Math.floor(maxHull / divisor));

    defender.hull -= damage;
    if (defender.hull < 0) defender.hull = 0;
  }

  return { hit: true, shipDestroyed: defender.hull <= 0 };
}

// ── Flee check ───────────────────────────────────────────────────────────

/**
 * Check if the commander successfully flees.
 * Returns true if escape is successful.
 * Ported from ExecuteAction() flee logic in Encounter.c.
 */
export function attemptFlee(
  ship: Ship,
  opponent: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): boolean {
  if (difficulty === BEGINNER) return true;

  const playerPilot = pilotSkill(ship, mercenaries, difficulty);
  const opponentPilot = pilotSkill(opponent, mercenaries, difficulty);

  return (getRandom(7) + Math.floor(playerPilot / 3)) * 2 >=
    getRandom(opponentPilot) * (2 + difficulty);
}

/**
 * Check if a fleeing opponent escapes.
 * Returns true if opponent escapes.
 */
export function opponentFlees(
  ship: Ship,
  opponent: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): boolean {
  const playerPilot = pilotSkill(ship, mercenaries, difficulty);
  const opponentPilot = pilotSkill(opponent, mercenaries, difficulty);

  return getRandom(playerPilot) * 4 <=
    getRandom(7 + Math.floor(opponentPilot / 3)) * 2;
}

// ── Cloaking ─────────────────────────────────────────────────────────────

/** Is ship cloaked relative to opponent? Ported from Cloaked() in Traveler.c */
export function isCloaked(
  ship: Ship,
  opponent: Ship,
  mercenaries: CrewMember[],
  difficulty: number,
): boolean {
  return hasGadgetFn(ship, CLOAKINGDEVICE_VAL) &&
    engineerSkill(ship, mercenaries, difficulty) > engineerSkill(opponent, mercenaries, difficulty);
}

// ── Encounter type helpers (macros from spacetrader.h) ───────────────────

import {
  POLICE, MAXPOLICE, PIRATE, MAXPIRATE, TRADER, MAXTRADER,
  SPACEMONSTERATTACK as SMA, MAXSPACEMONSTER,
  DRAGONFLYATTACK as DFA, MAXDRAGONFLY,
  SCARABATTACK as SCA, MAXSCARAB,
  FAMOUSCAPTAIN, MAXFAMOUSCAPTAIN,
} from '../data/constants';

export function isEncounterPolice(t: number): boolean { return t >= POLICE && t <= MAXPOLICE; }
export function isEncounterPirate(t: number): boolean { return t >= PIRATE && t <= MAXPIRATE; }
export function isEncounterTrader(t: number): boolean { return t >= TRADER && t <= MAXTRADER; }
export function isEncounterMonster(t: number): boolean { return t >= SMA && t <= MAXSPACEMONSTER; }
export function isEncounterDragonfly(t: number): boolean { return t >= DFA && t <= MAXDRAGONFLY; }
export function isEncounterScarab(t: number): boolean { return t >= SCA && t <= MAXSCARAB; }
export function isEncounterFamous(t: number): boolean { return t >= FAMOUSCAPTAIN && t <= MAXFAMOUSCAPTAIN; }
