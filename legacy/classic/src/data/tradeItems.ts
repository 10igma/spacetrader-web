import type { TradeItem } from '../models/types';
import {
  DROUGHT, COLD, CROPFAILURE, WAR, BOREDOM, PLAGUE, LACKOFWORKERS,
  LOTSOFWATER, DESERT, RICHFAUNA, LIFELESS, RICHSOIL, POORSOIL,
  MINERALRICH, MINERALPOOR, ARTISTIC, WARLIKE, LOTSOFHERBS, WEIRDMUSHROOMS,
} from './constants';

export const TRADE_ITEMS: TradeItem[] = [
  { name: 'Water',     techProduction: 0, techUsage: 0, techTopProduction: 2, priceLowTech:   30, priceInc:   +3, variance:   4, doublePriceStatus: DROUGHT,       cheapResource: LOTSOFWATER,    expensiveResource: DESERT,      minTradePrice:   30, maxTradePrice:   50, roundOff:   1 },
  { name: 'Furs',      techProduction: 0, techUsage: 0, techTopProduction: 0, priceLowTech:  250, priceInc:  +10, variance:  10, doublePriceStatus: COLD,          cheapResource: RICHFAUNA,      expensiveResource: LIFELESS,    minTradePrice:  230, maxTradePrice:  280, roundOff:   5 },
  { name: 'Food',      techProduction: 1, techUsage: 0, techTopProduction: 1, priceLowTech:  100, priceInc:   +5, variance:   5, doublePriceStatus: CROPFAILURE,   cheapResource: RICHSOIL,       expensiveResource: POORSOIL,    minTradePrice:   90, maxTradePrice:  160, roundOff:   5 },
  { name: 'Ore',       techProduction: 2, techUsage: 2, techTopProduction: 3, priceLowTech:  350, priceInc:  +20, variance:  10, doublePriceStatus: WAR,           cheapResource: MINERALRICH,    expensiveResource: MINERALPOOR, minTradePrice:  350, maxTradePrice:  420, roundOff:  10 },
  { name: 'Games',     techProduction: 3, techUsage: 1, techTopProduction: 6, priceLowTech:  250, priceInc:  -10, variance:   5, doublePriceStatus: BOREDOM,       cheapResource: ARTISTIC,       expensiveResource: -1,          minTradePrice:  160, maxTradePrice:  270, roundOff:   5 },
  { name: 'Firearms',  techProduction: 3, techUsage: 1, techTopProduction: 5, priceLowTech: 1250, priceInc:  -75, variance: 100, doublePriceStatus: WAR,           cheapResource: WARLIKE,        expensiveResource: -1,          minTradePrice:  600, maxTradePrice: 1100, roundOff:  25 },
  { name: 'Medicine',  techProduction: 4, techUsage: 1, techTopProduction: 6, priceLowTech:  650, priceInc:  -20, variance:  10, doublePriceStatus: PLAGUE,        cheapResource: LOTSOFHERBS,    expensiveResource: -1,          minTradePrice:  400, maxTradePrice:  700, roundOff:  25 },
  { name: 'Machines',  techProduction: 4, techUsage: 3, techTopProduction: 5, priceLowTech:  900, priceInc:  -30, variance:   5, doublePriceStatus: LACKOFWORKERS, cheapResource: -1,             expensiveResource: -1,          minTradePrice:  600, maxTradePrice:  800, roundOff:  25 },
  { name: 'Narcotics', techProduction: 5, techUsage: 0, techTopProduction: 5, priceLowTech: 3500, priceInc: -125, variance: 150, doublePriceStatus: BOREDOM,       cheapResource: WEIRDMUSHROOMS, expensiveResource: -1,          minTradePrice: 2000, maxTradePrice: 3000, roundOff:  50 },
  { name: 'Robots',    techProduction: 6, techUsage: 4, techTopProduction: 7, priceLowTech: 5000, priceInc: -150, variance: 100, doublePriceStatus: LACKOFWORKERS, cheapResource: -1,             expensiveResource: -1,          minTradePrice: 3500, maxTradePrice: 5000, roundOff: 100 },
];
