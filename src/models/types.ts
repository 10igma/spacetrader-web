/**
 * Space Trader 1.2.0 — TypeScript type definitions
 * Ported from DataTypes.h
 *
 * Copyright (C) 2000-2002 Pieter Spronck
 * Web port (C) 2026
 */

// ─── Ship ────────────────────────────────────────────────────────────────────

import {
  MAXTRADEITEM,
  MAXWEAPON,
  MAXSHIELD,
  MAXGADGET,
  MAXCREW,
} from '../data/constants';

export interface Ship {
  type: number;
  cargo: number[];          // [MAXTRADEITEM]
  weapon: number[];         // [MAXWEAPON]  — index into Weapontype[], -1 = empty
  shield: number[];         // [MAXSHIELD]  — index into Shieldtype[], -1 = empty
  shieldStrength: number[]; // [MAXSHIELD]  — current strength per slot
  gadget: number[];         // [MAXGADGET]  — index into Gadgettype[], -1 = empty
  crew: number[];           // [MAXCREW]    — index into Mercenary[], -1 = empty
  fuel: number;
  hull: number;
  tribbles: number;
  forFutureUse: number[];   // [4]
}

// ─── Equipment types ─────────────────────────────────────────────────────────

export interface Gadget {
  name: string;
  price: number;
  techLevel: number;
  chance: number; // Chance that this is fitted in a slot (percentage)
}

export interface Weapon {
  name: string;
  power: number;
  price: number;
  techLevel: number;
  chance: number;
}

export interface Shield {
  name: string;
  power: number;
  price: number;
  techLevel: number;
  chance: number;
}

// ─── Crew ────────────────────────────────────────────────────────────────────

export interface CrewMember {
  nameIndex: number;
  pilot: number;
  fighter: number;
  trader: number;
  engineer: number;
  curSystem: number;
}

// ─── Ship type template ──────────────────────────────────────────────────────

export interface ShipType {
  name: string;
  cargoBays: number;
  weaponSlots: number;
  shieldSlots: number;
  gadgetSlots: number;
  crewQuarters: number;
  fuelTanks: number;
  minTechLevel: number;
  costOfFuel: number;
  price: number;
  bounty: number;
  occurrence: number;
  hullStrength: number;
  police: number;   // Encountered as police with at least this strength (-1 = never)
  pirates: number;  // Encountered as pirate with at least this strength (-1 = never)
  traders: number;  // Encountered as trader with at least this strength (-1 = never)
  repairCosts: number;
  size: number;     // Determines how easy it is to hit this ship
}

// ─── Solar system ────────────────────────────────────────────────────────────

export interface SolarSystem {
  nameIndex: number;
  techLevel: number;
  politics: number;       // Index into Politics[]
  status: number;         // SystemStatus enum value
  x: number;
  y: number;
  specialResources: number;
  size: number;
  qty: number[];          // [MAXTRADEITEM] — quantities of trade items
  countDown: number;      // Countdown for reset of trade items
  visited: boolean;
  special: number;        // Special event index, -1 = none
}

// ─── Trade item template ─────────────────────────────────────────────────────

export interface TradeItem {
  name: string;
  techProduction: number;     // Tech level needed for production
  techUsage: number;          // Tech level needed to use
  techTopProduction: number;  // Tech level which produces this item the most
  priceLowTech: number;       // Medium price at lowest tech level
  priceInc: number;           // Price increase per tech level
  variance: number;           // Max percentage above or below calculated price
  doublePriceStatus: number;  // Price increases considerably when this event occurs
  cheapResource: number;      // When this resource is available, this trade item is cheap
  expensiveResource: number;  // When this resource is available, this trade item is expensive
  minTradePrice: number;      // Minimum price to buy/sell in orbit
  maxTradePrice: number;      // Maximum price to buy/sell in orbit
  roundOff: number;           // Round-off price for trade in orbit
}

// ─── Politics (government type) ──────────────────────────────────────────────

export interface Politics {
  name: string;
  reactionIllegal: number;  // 0 = total acceptance
  strengthPolice: number;   // 0 = no police
  strengthPirates: number;  // 0 = no pirates
  strengthTraders: number;  // 0 = no traders
  minTechLevel: number;
  maxTechLevel: number;
  bribeLevel: number;       // 0 = unbribable / high bribe costs
  drugsOK: boolean;
  firearmsOK: boolean;
  wanted: number;           // Trade item index particularly requested (-1 = none)
}

// ─── Special event ───────────────────────────────────────────────────────────

export interface SpecialEvent {
  title: string;
  questStringID: number;
  price: number;
  occurrence: number;
  justAMessage: boolean;
}

// ─── Police record tier ──────────────────────────────────────────────────────

export interface PoliceRecord {
  name: string;
  minScore: number;
}

// ─── Reputation tier ─────────────────────────────────────────────────────────

export interface Reputation {
  name: string;
  minScore: number;
}

// ─── High score entry ────────────────────────────────────────────────────────

export interface HighScore {
  name: string;
  status: number;     // 0 = killed, 1 = retired, 2 = bought moon
  days: number;
  worth: number;
  difficulty: number;
  forFutureUse: number;
}

// ─── Full save-game state ────────────────────────────────────────────────────

export interface SaveGame {
  credits: number;
  debt: number;
  days: number;
  warpSystem: number;
  selectedShipType: number;
  buyPrice: number[];          // [MAXTRADEITEM]
  sellPrice: number[];         // [MAXTRADEITEM]
  shipPrice: number[];         // [MAXSHIPTYPE]
  galacticChartSystem: number;
  policeKills: number;
  traderKills: number;
  pirateKills: number;
  policeRecordScore: number;
  reputationScore: number;
  autoFuel: boolean;
  autoRepair: boolean;
  clicks: number;
  encounterType: number;
  raided: boolean;
  monsterStatus: number;
  dragonflyStatus: number;
  japoriDiseaseStatus: number;
  moonBought: boolean;
  monsterHull: number;
  nameCommander: string;
  curForm: number;
  ship: Ship;
  opponent: Ship;
  mercenary: CrewMember[];     // [MAXCREWMEMBER+1]
  solarSystem: SolarSystem[];  // [MAXSOLARSYSTEM]
  escapePod: boolean;
  insurance: boolean;
  noClaim: number;
  inspected: boolean;
  alwaysIgnoreTraders: boolean;
  wormhole: number[];          // [MAXWORMHOLE]
  difficulty: number;
  buyingPrice: number[];       // [MAXTRADEITEM]
  artifactOnBoard: boolean;
  reserveMoney: boolean;
  priceDifferences: boolean;
  aplScreen: boolean;
  leaveEmpty: number;
  tribbleMessage: boolean;
  alwaysInfo: boolean;
  alwaysIgnorePolice: boolean;
  alwaysIgnorePirates: boolean;
  textualEncounters: boolean;
  jarekStatus: number;
  invasionStatus: number;
  continuous: boolean;
  attackFleeing: boolean;
  experimentAndWildStatus: number;
  fabricRipProbability: number;
  veryRareEncounter: number;
  reactorStatus: number;
  trackedSystem: number;
  scarabStatus: number;
  alwaysIgnoreTradeInOrbit: boolean;
  alreadyPaidForNewspaper: boolean;
  gameLoaded: boolean;
  shortcut1: number;
  shortcut2: number;
  shortcut3: number;
  shortcut4: number;
  litterWarning: boolean;
  sharePreferences: boolean;
  identifyStartup: boolean;
  rectangularButtonsOn: boolean;
}

// ─── Helper: create an empty Ship ───────────────────────────────────────────

export function createEmptyShip(): Ship {
  return {
    type: 0,
    cargo: new Array(MAXTRADEITEM).fill(0),
    weapon: new Array(MAXWEAPON).fill(-1),
    shield: new Array(MAXSHIELD).fill(-1),
    shieldStrength: new Array(MAXSHIELD).fill(0),
    gadget: new Array(MAXGADGET).fill(-1),
    crew: new Array(MAXCREW).fill(-1),
    fuel: 0,
    hull: 0,
    tribbles: 0,
    forFutureUse: [0, 0, 0, 0],
  };
}
