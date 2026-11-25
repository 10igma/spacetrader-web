import type { Shield } from '../models/types';
import { ESHIELDPOWER, RSHIELDPOWER, LSHIELDPOWER } from './constants';

export const SHIELDS: Shield[] = [
  { name: 'Energy shield',     power: ESHIELDPOWER,  price:  5000, techLevel: 5, chance: 70 },
  { name: 'Reflective shield', power: RSHIELDPOWER,  price: 20000, techLevel: 6, chance: 30 },
  // Cannot be bought
  { name: 'Lightning shield',  power: LSHIELDPOWER,  price: 45000, techLevel: 8, chance:  0 },
];
