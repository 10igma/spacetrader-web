import type { Gadget } from '../models/types';

export const GADGETS: Gadget[] = [
  { name: '5 extra cargo bays',  price:   2500, techLevel: 4, chance: 35 },
  { name: 'Auto-repair system',  price:   7500, techLevel: 5, chance: 20 },
  { name: 'Navigating system',   price:  15000, techLevel: 6, chance: 20 },
  { name: 'Targeting system',    price:  25000, techLevel: 6, chance: 20 },
  { name: 'Cloaking device',     price: 100000, techLevel: 7, chance:  5 },
  // Cannot be bought
  { name: 'Fuel compactor',      price:  30000, techLevel: 8, chance:  0 },
];
