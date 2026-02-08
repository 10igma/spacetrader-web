/**
 * Space Trader 1.2.0 — Zustand game store
 * Central state management for the entire game.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createEmptyShip } from '../models/types';
import { MAXTRADEITEM, MAXWORMHOLE, MAXSHIPTYPE } from '../data/constants';
import { startNewGame, type NewGameParams, type GameState } from '../engine/newGame';
import { determinePrices, buyCargo, sellCargo } from '../engine/trading';
import { currentWorth, getLoan, payBack, payInterest, insuranceMoney, mercenaryMoney } from '../engine/bank';
import { buyFuel, buyRepairs, getFuel, getFuelTanks, getHullStrength, totalCargoBays, filledCargoBays } from '../engine/ship';
import { traderSkill, fighterSkill, pilotSkill, engineerSkill } from '../engine/skills';
import { wormholeExists } from '../engine/galaxy';
import { realDistance, getRandom } from '../utils/math';
import { incDays, shuffleStatus, changeQuantities, getScore } from '../engine/events';
import { generateOpponent } from '../engine/encounters';
import { POLITICS_DATA } from '../data/politics';
import {
  POLICE, PIRATE, TRADER,
  PIRATEATTACK, POLICEATTACK, POLICEINSPECTION, TRADERIGNORE,
} from '../data/constants';

interface GameStore extends GameState {
  // ── Computed ────────────────────────────────────────────────────────────
  initialized: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────
  newGame: (params: NewGameParams) => void;
  setWarpSystem: (systemId: number) => void;
  doWarp: () => void;
  doBuyCargo: (itemIndex: number, amount: number) => void;
  doSellCargo: (itemIndex: number, amount: number) => void;
  doDumpCargo: (itemIndex: number, amount: number) => void;
  doBuyFuel: (amount: number) => void;
  doBuyRepairs: (amount: number) => void;
  doGetLoan: (amount: number) => void;
  doPayBack: (amount: number) => void;
  doBuyInsurance: () => void;
  doStopInsurance: () => void;
  doBuyEscapePod: () => void;
  /** Try to generate an encounter for the current warp destination.
   *  Returns true if an encounter was generated (sets opponent + encounterType). */
  tryEncounter: () => boolean;
  /** Mark the warp destination as visited (immutably). */
  markDestVisited: () => void;

  // ── Getters ─────────────────────────────────────────────────────────────
  getCurrentWorth: () => number;
  getTraderSkill: () => number;
  getFighterSkill: () => number;
  getPilotSkill: () => number;
  getEngineerSkill: () => number;
  getInsuranceMoney: () => number;
  getMercenaryMoney: () => number;
  getTotalCargoBays: () => number;
  getFilledCargoBays: () => number;
  getFuelAmount: () => number;
  getFuelTanksSize: () => number;
  getHullStrengthVal: () => number;
  getScore: (endStatus: number) => number;
}

const defaultState: GameState = {
  credits: 0,
  debt: 0,
  days: 0,
  warpSystem: 0,
  selectedShipType: 0,
  buyPrice: new Array(MAXTRADEITEM).fill(0),
  sellPrice: new Array(MAXTRADEITEM).fill(0),
  shipPrice: new Array(MAXSHIPTYPE).fill(0),
  galacticChartSystem: 0,
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
  monsterHull: 0,
  nameCommander: '',
  ship: createEmptyShip(),
  opponent: createEmptyShip(),
  mercenary: [],
  solarSystem: [],
  escapePod: false,
  insurance: false,
  noClaim: 0,
  inspected: false,
  alwaysIgnoreTraders: false,
  wormhole: new Array(MAXWORMHOLE).fill(0),
  difficulty: 2,
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

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      initialized: false,

      // ── New Game ──────────────────────────────────────────────────────────
      newGame: (params: NewGameParams) => {
        const state = startNewGame(params);
        const { buyPrice, sellPrice } = determinePrices(
          state.mercenary[0].curSystem,
          state.solarSystem,
          state.ship,
          state.mercenary,
          state.difficulty,
          state.policeRecordScore,
          state.jarekStatus,
        );
        set({
          ...state,
          buyPrice,
          sellPrice,
          initialized: true,
        });
      },

      // ── Warp ──────────────────────────────────────────────────────────────
      setWarpSystem: (systemId: number) => set({ warpSystem: systemId }),

      doWarp: () => {
        const s = get();
        const curSystem = s.mercenary[0].curSystem;

        const wormTax = wormholeExists(s.wormhole, curSystem, s.warpSystem)
          ? SHIP_TYPES_REF[s.ship.type].costOfFuel * 25
          : 0;
        let credits = s.credits - wormTax;
        credits -= get().getMercenaryMoney();
        credits -= get().getInsuranceMoney();

        const ship = { ...s.ship };
        for (let i = 0; i < 3; ++i) {
          if (ship.shield[i] < 0) break;
          ship.shieldStrength = [...ship.shieldStrength];
          ship.shieldStrength[i] = SHIELDS_REF[ship.shield[i]].power;
        }

        const solarSystem = s.solarSystem.map((sys, idx) =>
          idx === curSystem ? { ...sys, countDown: 3 + s.difficulty } : sys
        );

        let distance: number;
        let arrivedViaWormhole: boolean;
        if (wormholeExists(s.wormhole, curSystem, s.warpSystem)) {
          distance = 0;
          arrivedViaWormhole = true;
        } else {
          distance = realDistance(solarSystem[curSystem], solarSystem[s.warpSystem]);
          ship.fuel = ship.fuel - Math.min(distance, getFuel(ship));
          arrivedViaWormhole = false;
        }

        const interest = payInterest(credits, s.debt);
        credits = interest.credits;
        const debt = interest.debt;

        const daysResult = incDays(
          1, s.days, s.invasionStatus, s.reactorStatus,
          s.experimentStatus, s.fabricRipProbability, solarSystem,
        );

        let noClaim = s.noClaim;
        if (s.insurance) ++noClaim;

        let monsterHull = Math.floor((s.monsterHull * 105) / 100);
        const monsterMaxHull = 500;
        if (monsterHull > monsterMaxHull) monsterHull = monsterMaxHull;

        let policeRecordScore = s.policeRecordScore;
        if (daysResult.days % 3 === 0) {
          if (policeRecordScore > 0) --policeRecordScore;
        }
        if (policeRecordScore < -5) {
          if (s.difficulty <= 2) ++policeRecordScore;
          else if (daysResult.days % s.difficulty === 0) ++policeRecordScore;
        }

        const mercenary = [...s.mercenary];
        mercenary[0] = { ...mercenary[0], curSystem: s.warpSystem };

        shuffleStatus(solarSystem);
        changeQuantities(solarSystem, s.difficulty);

        const { buyPrice, sellPrice } = determinePrices(
          s.warpSystem, solarSystem, ship, mercenary,
          s.difficulty, policeRecordScore, s.jarekStatus,
        );

        set({
          ship,
          credits,
          debt,
          days: daysResult.days,
          invasionStatus: daysResult.invasionStatus,
          reactorStatus: daysResult.reactorStatus,
          experimentStatus: daysResult.experimentStatus,
          fabricRipProbability: daysResult.fabricRipProbability,
          noClaim,
          monsterHull,
          policeRecordScore,
          mercenary,
          solarSystem,
          buyPrice,
          sellPrice,
          raided: false,
          inspected: false,
          litterWarning: false,
          alreadyPaidForNewspaper: false,
          arrivedViaWormhole,
          clicks: 21,
          possibleToGoThroughRip: true,
        });
      },

      // ── Encounter logic (moved from App.tsx) ──────────────────────────────
      tryEncounter: () => {
        const s = get();
        const destSystem = s.warpSystem;
        const destSys = s.solarSystem[destSystem];
        const pol = POLITICS_DATA[destSys.politics];

        const encounterRoll = getRandom(44 - 2 * s.difficulty);
        if (encounterRoll >= pol.strengthPirates + pol.strengthPolice + pol.strengthTraders) {
          return false;
        }

        let encounterType: number;
        const roll = getRandom(pol.strengthPirates + pol.strengthPolice + pol.strengthTraders);

        if (roll < pol.strengthPolice) {
          encounterType = POLICEINSPECTION;
          if (s.policeRecordScore < -5) encounterType = POLICEATTACK;
        } else if (roll < pol.strengthPolice + pol.strengthPirates) {
          encounterType = PIRATEATTACK;
        } else {
          encounterType = TRADERIGNORE;
        }

        let oppType = POLICE;
        if (encounterType >= PIRATE && encounterType < 20) oppType = PIRATE;
        else if (encounterType >= TRADER && encounterType < 30) oppType = TRADER;

        const opponent = generateOpponent(
          oppType, destSystem, s.solarSystem, [...s.mercenary],
          s.difficulty, s.policeRecordScore, s.reputationScore,
          s.ship, s.credits, s.debt, s.moonBought, s.scarabStatus,
          s.wildStatus, s.buyingPrice,
        );

        set({ opponent, encounterType });
        return true;
      },

      markDestVisited: () => {
        const s = get();
        const destSystem = s.warpSystem;
        const solarSystem = s.solarSystem.map((sys, idx) =>
          idx === destSystem ? { ...sys, visited: true } : sys
        );
        set({ solarSystem });
      },

      // ── Trade ─────────────────────────────────────────────────────────────
      doBuyCargo: (itemIndex: number, amount: number) => {
        const s = get();
        const curSystem = s.solarSystem[s.mercenary[0].curSystem];
        const result = buyCargo(
          itemIndex, amount, s.ship, curSystem,
          s.buyPrice, s.buyingPrice, s.credits,
          s.japoriDiseaseStatus, s.reactorStatus,
          s.leaveEmpty, s.reserveMoney,
          get().getMercenaryMoney(),
          get().getInsuranceMoney(),
          s.debt,
        );
        set({ credits: result.credits });
      },

      doSellCargo: (itemIndex: number, amount: number) => {
        const s = get();
        const result = sellCargo(
          itemIndex, amount, 1, s.ship, s.sellPrice, s.buyingPrice,
          s.credits, s.difficulty, s.policeRecordScore,
          s.reserveMoney, get().getMercenaryMoney(), get().getInsuranceMoney(),
        );
        set({ credits: result.credits, policeRecordScore: result.policeRecordScore });
      },

      doDumpCargo: (itemIndex: number, amount: number) => {
        const s = get();
        const result = sellCargo(
          itemIndex, amount, 2, s.ship, s.sellPrice, s.buyingPrice,
          s.credits, s.difficulty, s.policeRecordScore,
          s.reserveMoney, get().getMercenaryMoney(), get().getInsuranceMoney(),
        );
        set({ credits: result.credits, policeRecordScore: result.policeRecordScore });
      },

      // ── Ship maintenance ──────────────────────────────────────────────────
      doBuyFuel: (amount: number) => {
        const s = get();
        const result = buyFuel(s.ship, amount, s.credits);
        set({ credits: result.credits });
      },

      doBuyRepairs: (amount: number) => {
        const s = get();
        const result = buyRepairs(s.ship, amount, s.credits, s.scarabStatus);
        set({ credits: result.credits });
      },

      // ── Bank ──────────────────────────────────────────────────────────────
      doGetLoan: (amount: number) => {
        const s = get();
        const worth = get().getCurrentWorth();
        const result = getLoan(amount, s.credits, s.debt, s.policeRecordScore, worth);
        set({ credits: result.credits, debt: result.debt });
      },

      doPayBack: (amount: number) => {
        const s = get();
        const result = payBack(amount, s.credits, s.debt);
        set({ credits: result.credits, debt: result.debt });
      },

      doBuyInsurance: () => {
        const s = get();
        if (s.escapePod) set({ insurance: true });
      },

      doStopInsurance: () => {
        set({ insurance: false, noClaim: 0 });
      },

      doBuyEscapePod: () => {
        const s = get();
        if (s.credits >= 2000 && !s.escapePod) {
          set({ credits: s.credits - 2000, escapePod: true });
        }
      },

      // ── Getters ───────────────────────────────────────────────────────────
      getCurrentWorth: () => {
        const s = get();
        return currentWorth(s.ship, s.credits, s.debt, s.moonBought, s.scarabStatus, s.buyingPrice);
      },

      getTraderSkill: () => {
        const s = get();
        return traderSkill(s.ship, s.mercenary, s.difficulty, s.jarekStatus);
      },

      getFighterSkill: () => {
        const s = get();
        return fighterSkill(s.ship, s.mercenary, s.difficulty);
      },

      getPilotSkill: () => {
        const s = get();
        return pilotSkill(s.ship, s.mercenary, s.difficulty);
      },

      getEngineerSkill: () => {
        const s = get();
        return engineerSkill(s.ship, s.mercenary, s.difficulty);
      },

      getInsuranceMoney: () => {
        const s = get();
        return insuranceMoney(s.insurance, s.ship, s.scarabStatus, s.noClaim);
      },

      getMercenaryMoney: () => {
        const s = get();
        return mercenaryMoney(s.ship, s.mercenary, s.wildStatus);
      },

      getTotalCargoBays: () => {
        const s = get();
        return totalCargoBays(s.ship, s.japoriDiseaseStatus, s.reactorStatus);
      },

      getFilledCargoBays: () => {
        const s = get();
        return filledCargoBays(s.ship);
      },

      getFuelAmount: () => {
        const s = get();
        return getFuel(s.ship);
      },

      getFuelTanksSize: () => {
        const s = get();
        return getFuelTanks(s.ship);
      },

      getHullStrengthVal: () => {
        const s = get();
        return getHullStrength(s.ship, s.scarabStatus);
      },

      getScore: (endStatus: number) => {
        const s = get();
        const worth = get().getCurrentWorth();
        return getScore(endStatus, s.days, worth, s.difficulty);
      },
    }),
    {
      name: 'spacetrader-game-state',
      partialize: (state) => {
        // Persist everything except computed getters/actions
        const { initialized, ...rest } = state;
        // Only persist if initialized
        if (!initialized) return {};
        const persisted: Record<string, unknown> = { initialized };
        for (const key of Object.keys(rest)) {
          if (typeof (rest as Record<string, unknown>)[key] !== 'function') {
            persisted[key] = (rest as Record<string, unknown>)[key];
          }
        }
        return persisted;
      },
    },
  ),
);

// Lazy imports to avoid circular dependency issues in the store
import { SHIP_TYPES as SHIP_TYPES_REF } from '../data/shipTypes';
import { SHIELDS as SHIELDS_REF } from '../data/shields';
