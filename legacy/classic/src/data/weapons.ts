import type { Weapon } from '../models/types';
import { PULSELASERPOWER, BEAMLASERPOWER, MILITARYLASERPOWER, MORGANLASERPOWER } from './constants';

export const WEAPONS: Weapon[] = [
  { name: 'Pulse laser',    power: PULSELASERPOWER,    price:  2000, techLevel: 5, chance: 50 },
  { name: 'Beam laser',     power: BEAMLASERPOWER,     price: 12500, techLevel: 6, chance: 35 },
  { name: 'Military laser',  power: MILITARYLASERPOWER, price: 35000, techLevel: 7, chance: 15 },
  // Cannot be bought
  { name: "Morgan's laser",  power: MORGANLASERPOWER,   price: 50000, techLevel: 8, chance:  0 },
];
