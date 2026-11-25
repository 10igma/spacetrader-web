/**
 * Space Trader 1.2.0 — New game initialization
 * Ported from StartNewGame() in Traveler.c
 */

import type { Ship, SolarSystem, CrewMember } from '../models/types';
import { createEmptyShip } from '../models/types';
import {
  MAXSOLARSYSTEM, MAXCREWMEMBER, MAXTRADEITEM,
  KRAVATSYSTEM,
} from '../data/constants';
import { SHIP_TYPES } from '../data/shipTypes';
import { getRandom } from '../utils/math';
import { sqrDistance, sqr } from '../utils/math';
import { randomSkill } from './skills';
import { generateGalaxy } from './galaxy';

export interface NewGameParams {
  commanderName: string;
  difficulty: number;
  pilotSkill: number;
  fighterSkill: number;
  traderSkill: number;
  engineerSkill: number;
}

export interface GameState {
  credits: number;
  debt: number;
  days: number;
  warpSystem: number;
  selectedShipType: number;
  buyPrice: number[];
  sellPrice: number[];
  shipPrice: number[];
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
  ship: Ship;
  opponent: Ship;
  mercenary: CrewMember[];
  solarSystem: SolarSystem[];
  escapePod: boolean;
  insurance: boolean;
  noClaim: number;
  inspected: boolean;
  alwaysIgnoreTraders: boolean;
  wormhole: number[];
  difficulty: number;
  buyingPrice: number[];
  artifactOnBoard: boolean;
  reserveMoney: boolean;
  priceDifferences: boolean;
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
  litterWarning: boolean;
  wildStatus: number;
  experimentStatus: number;
  canSuperWarp: boolean;
  possibleToGoThroughRip: boolean;
  arrivedViaWormhole: boolean;
}

/**
 * Start a new game. Returns the complete initial game state.
 * Ported from StartNewGame() in Traveler.c.
 */
export function startNewGame(params: NewGameParams): GameState {
  const { commanderName, difficulty } = params;

  // Generate galaxy
  const { solarSystems, wormholes } = generateGalaxy(difficulty);

  // Initialize mercenary list
  const mercenaries: CrewMember[] = [];

  // Commander (index 0)
  mercenaries.push({
    nameIndex: 0,
    pilot: params.pilotSkill,
    fighter: params.fighterSkill,
    trader: params.traderSkill,
    engineer: params.engineerSkill,
    curSystem: 0,
  });

  // Generate mercenaries 1..MAXCREWMEMBER
  let i = 1;
  while (i <= MAXCREWMEMBER) {
    const merc: CrewMember = {
      nameIndex: i,
      pilot: 0,
      fighter: 0,
      trader: 0,
      engineer: 0,
      curSystem: getRandom(MAXSOLARSYSTEM),
    };

    let redo = false;
    for (let j = 1; j < i; ++j) {
      if (mercenaries[j] && mercenaries[j].curSystem === merc.curSystem) {
        redo = true;
        break;
      }
    }
    if (merc.curSystem === KRAVATSYSTEM) redo = true;
    if (redo) continue;

    merc.pilot = randomSkill();
    merc.fighter = randomSkill();
    merc.trader = randomSkill();
    merc.engineer = randomSkill();

    mercenaries.push(merc);
    ++i;
  }

  // Zeethibal (MAXCREWMEMBER-1) — special mercenary, system 255
  mercenaries[MAXCREWMEMBER - 1].curSystem = 255;

  // Find starting system
  let curSystem = 0;
  for (let attempt = 0; attempt < 200; ++attempt) {
    curSystem = getRandom(MAXSOLARSYSTEM);
    const sys = solarSystems[curSystem];
    if (sys.special >= 0) continue;
    if (attempt < 100 && (sys.techLevel <= 0 || sys.techLevel >= 6)) continue;

    // Make sure at least 3 systems are reachable
    let reachable = 0;
    for (let j = 0; j < MAXSOLARSYSTEM; ++j) {
      if (j === curSystem) continue;
      if (sqrDistance(solarSystems[j], sys) <= sqr(SHIP_TYPES[1].fuelTanks)) {
        ++reachable;
        if (reachable >= 3) break;
      }
    }
    if (reachable >= 3) break;
  }

  mercenaries[0].curSystem = curSystem;

  // Initialize ship (Gnat with pulse laser)
  const ship = createEmptyShip();
  ship.type = 1; // Gnat
  ship.weapon[0] = 0; // Pulse laser
  ship.crew[0] = 0; // Commander
  ship.fuel = SHIP_TYPES[ship.type].fuelTanks;
  ship.hull = SHIP_TYPES[ship.type].hullStrength;

  // Space monster hull
  const monsterHull = SHIP_TYPES[10].hullStrength; // Space monster ship type index

  return {
    credits: 1000,
    debt: 0,
    days: 0,
    warpSystem: curSystem,
    selectedShipType: 0,
    buyPrice: new Array(MAXTRADEITEM).fill(0),
    sellPrice: new Array(MAXTRADEITEM).fill(0),
    shipPrice: new Array(MAXSOLARSYSTEM > 10 ? 10 : MAXSOLARSYSTEM).fill(0),
    galacticChartSystem: curSystem,
    policeKills: 0,
    traderKills: 0,
    pirateKills: 0,
    policeRecordScore: 0,
    reputationScore: 0,
    autoFuel: false,
    autoRepair: false,
    clicks: 0,
    encounterType: 0,
    raided: false,
    monsterStatus: 0,
    dragonflyStatus: 0,
    japoriDiseaseStatus: 0,
    moonBought: false,
    monsterHull,
    nameCommander: commanderName || 'Shelby',
    ship,
    opponent: createEmptyShip(),
    mercenary: mercenaries,
    solarSystem: solarSystems,
    escapePod: false,
    insurance: false,
    noClaim: 0,
    inspected: false,
    alwaysIgnoreTraders: false,
    wormhole: wormholes,
    difficulty,
    buyingPrice: new Array(MAXTRADEITEM).fill(0),
    artifactOnBoard: false,
    reserveMoney: false,
    priceDifferences: false,
    leaveEmpty: 0,
    tribbleMessage: false,
    alwaysInfo: false,
    alwaysIgnorePolice: false,
    alwaysIgnorePirates: false,
    textualEncounters: false,
    jarekStatus: 0,
    invasionStatus: 0,
    continuous: false,
    attackFleeing: false,
    experimentAndWildStatus: 0,
    fabricRipProbability: 0,
    veryRareEncounter: 0,
    reactorStatus: 0,
    trackedSystem: -1,
    scarabStatus: 0,
    alwaysIgnoreTradeInOrbit: false,
    alreadyPaidForNewspaper: false,
    gameLoaded: false,
    litterWarning: false,
    wildStatus: 0,
    experimentStatus: 0,
    canSuperWarp: false,
    possibleToGoThroughRip: false,
    arrivedViaWormhole: false,
  };
}
