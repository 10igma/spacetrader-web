import type { ShipType } from '../models/types';
import { MAXRANGE } from './constants';

// Ported from Global.c — Shiptype[MAXSHIPTYPE+EXTRASHIPS]
// Fields: name, cargoBays, weaponSlots, shieldSlots, gadgetSlots, crewQuarters,
//         fuelTanks, minTechLevel, costOfFuel, price, bounty, occurrence,
//         hullStrength, police, pirates, traders, repairCosts, size
export const SHIP_TYPES: ShipType[] = [
  { name: 'Flea',          cargoBays: 10, weaponSlots: 0, shieldSlots: 0, gadgetSlots: 0, crewQuarters: 1, fuelTanks: MAXRANGE, minTechLevel: 4, costOfFuel:  1, price:   2000, bounty:   5, occurrence:  2, hullStrength:  25, police: -1, pirates: -1, traders:  0, repairCosts: 1, size: 0 },
  { name: 'Gnat',          cargoBays: 15, weaponSlots: 1, shieldSlots: 0, gadgetSlots: 1, crewQuarters: 1, fuelTanks: 14,       minTechLevel: 5, costOfFuel:  2, price:  10000, bounty:  50, occurrence: 28, hullStrength: 100, police:  0, pirates:  0, traders:  0, repairCosts: 1, size: 1 },
  { name: 'Firefly',       cargoBays: 20, weaponSlots: 1, shieldSlots: 1, gadgetSlots: 1, crewQuarters: 1, fuelTanks: 17,       minTechLevel: 5, costOfFuel:  3, price:  25000, bounty:  75, occurrence: 20, hullStrength: 100, police:  0, pirates:  0, traders:  0, repairCosts: 1, size: 1 },
  { name: 'Mosquito',      cargoBays: 15, weaponSlots: 2, shieldSlots: 1, gadgetSlots: 1, crewQuarters: 1, fuelTanks: 13,       minTechLevel: 5, costOfFuel:  5, price:  30000, bounty: 100, occurrence: 20, hullStrength: 100, police:  0, pirates:  1, traders:  0, repairCosts: 1, size: 1 },
  { name: 'Bumblebee',     cargoBays: 25, weaponSlots: 1, shieldSlots: 2, gadgetSlots: 2, crewQuarters: 2, fuelTanks: 15,       minTechLevel: 5, costOfFuel:  7, price:  60000, bounty: 125, occurrence: 15, hullStrength: 100, police:  1, pirates:  1, traders:  0, repairCosts: 1, size: 2 },
  { name: 'Beetle',        cargoBays: 50, weaponSlots: 0, shieldSlots: 1, gadgetSlots: 1, crewQuarters: 3, fuelTanks: 14,       minTechLevel: 5, costOfFuel: 10, price:  80000, bounty:  50, occurrence:  3, hullStrength:  50, police: -1, pirates: -1, traders:  0, repairCosts: 1, size: 2 },
  { name: 'Hornet',        cargoBays: 20, weaponSlots: 3, shieldSlots: 2, gadgetSlots: 1, crewQuarters: 2, fuelTanks: 16,       minTechLevel: 6, costOfFuel: 15, price: 100000, bounty: 200, occurrence:  6, hullStrength: 150, police:  2, pirates:  3, traders:  1, repairCosts: 2, size: 3 },
  { name: 'Grasshopper',   cargoBays: 30, weaponSlots: 2, shieldSlots: 2, gadgetSlots: 3, crewQuarters: 3, fuelTanks: 15,       minTechLevel: 6, costOfFuel: 15, price: 150000, bounty: 300, occurrence:  2, hullStrength: 150, police:  3, pirates:  4, traders:  2, repairCosts: 3, size: 3 },
  { name: 'Termite',       cargoBays: 60, weaponSlots: 1, shieldSlots: 3, gadgetSlots: 2, crewQuarters: 3, fuelTanks: 13,       minTechLevel: 7, costOfFuel: 20, price: 225000, bounty: 300, occurrence:  2, hullStrength: 200, police:  4, pirates:  5, traders:  3, repairCosts: 4, size: 4 },
  { name: 'Wasp',          cargoBays: 35, weaponSlots: 3, shieldSlots: 2, gadgetSlots: 2, crewQuarters: 3, fuelTanks: 14,       minTechLevel: 7, costOfFuel: 20, price: 300000, bounty: 500, occurrence:  2, hullStrength: 200, police:  5, pirates:  6, traders:  4, repairCosts: 5, size: 4 },
  // --- Non-buyable ships below ---
  { name: 'Space monster', cargoBays:  0, weaponSlots: 3, shieldSlots: 0, gadgetSlots: 0, crewQuarters: 1, fuelTanks:  1,       minTechLevel: 8, costOfFuel:  1, price: 500000, bounty:   0, occurrence:  0, hullStrength: 500, police:  8, pirates:  8, traders:  8, repairCosts: 1, size: 4 },
  { name: 'Dragonfly',     cargoBays:  0, weaponSlots: 2, shieldSlots: 3, gadgetSlots: 2, crewQuarters: 1, fuelTanks:  1,       minTechLevel: 8, costOfFuel:  1, price: 500000, bounty:   0, occurrence:  0, hullStrength:  10, police:  8, pirates:  8, traders:  8, repairCosts: 1, size: 1 },
  { name: 'Mantis',        cargoBays:  0, weaponSlots: 3, shieldSlots: 1, gadgetSlots: 3, crewQuarters: 3, fuelTanks:  1,       minTechLevel: 8, costOfFuel:  1, price: 500000, bounty:   0, occurrence:  0, hullStrength: 300, police:  8, pirates:  8, traders:  8, repairCosts: 1, size: 2 },
  { name: 'Scarab',        cargoBays: 20, weaponSlots: 2, shieldSlots: 0, gadgetSlots: 0, crewQuarters: 2, fuelTanks:  1,       minTechLevel: 8, costOfFuel:  1, price: 500000, bounty:   0, occurrence:  0, hullStrength: 400, police:  8, pirates:  8, traders:  8, repairCosts: 1, size: 3 },
  { name: 'Bottle',        cargoBays:  0, weaponSlots: 0, shieldSlots: 0, gadgetSlots: 0, crewQuarters: 0, fuelTanks:  1,       minTechLevel: 8, costOfFuel:  1, price:    100, bounty:   0, occurrence:  0, hullStrength:  10, police:  8, pirates:  8, traders:  8, repairCosts: 1, size: 1 },
];
