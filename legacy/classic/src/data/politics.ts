import type { Politics } from '../models/types';
import { FOOD, ORE, GAMES, ROBOTS, MACHINERY, FIREARMS, MEDICINE, WATER, NARCOTICS } from './constants';

export const POLITICS_DATA: Politics[] = [
  { name: 'Anarchy',          reactionIllegal: 0, strengthPolice: 0, strengthPirates: 7, strengthTraders: 1, minTechLevel: 0, maxTechLevel: 5, bribeLevel: 7, drugsOK: true,  firearmsOK: true,  wanted: FOOD },
  { name: 'Capitalist State', reactionIllegal: 2, strengthPolice: 3, strengthPirates: 2, strengthTraders: 7, minTechLevel: 4, maxTechLevel: 7, bribeLevel: 1, drugsOK: true,  firearmsOK: true,  wanted: ORE },
  { name: 'Communist State',  reactionIllegal: 6, strengthPolice: 6, strengthPirates: 4, strengthTraders: 4, minTechLevel: 1, maxTechLevel: 5, bribeLevel: 5, drugsOK: true,  firearmsOK: true,  wanted: -1 },
  { name: 'Confederacy',      reactionIllegal: 5, strengthPolice: 4, strengthPirates: 3, strengthTraders: 5, minTechLevel: 1, maxTechLevel: 6, bribeLevel: 3, drugsOK: true,  firearmsOK: true,  wanted: GAMES },
  { name: 'Corporate State',  reactionIllegal: 2, strengthPolice: 6, strengthPirates: 2, strengthTraders: 7, minTechLevel: 4, maxTechLevel: 7, bribeLevel: 2, drugsOK: true,  firearmsOK: true,  wanted: ROBOTS },
  { name: 'Cybernetic State', reactionIllegal: 0, strengthPolice: 7, strengthPirates: 7, strengthTraders: 5, minTechLevel: 6, maxTechLevel: 7, bribeLevel: 0, drugsOK: false, firearmsOK: false, wanted: ORE },
  { name: 'Democracy',        reactionIllegal: 4, strengthPolice: 3, strengthPirates: 2, strengthTraders: 5, minTechLevel: 3, maxTechLevel: 7, bribeLevel: 2, drugsOK: true,  firearmsOK: true,  wanted: GAMES },
  { name: 'Dictatorship',     reactionIllegal: 3, strengthPolice: 4, strengthPirates: 5, strengthTraders: 3, minTechLevel: 0, maxTechLevel: 7, bribeLevel: 2, drugsOK: true,  firearmsOK: true,  wanted: -1 },
  { name: 'Fascist State',    reactionIllegal: 7, strengthPolice: 7, strengthPirates: 7, strengthTraders: 1, minTechLevel: 4, maxTechLevel: 7, bribeLevel: 0, drugsOK: false, firearmsOK: true,  wanted: MACHINERY },
  { name: 'Feudal State',     reactionIllegal: 1, strengthPolice: 1, strengthPirates: 6, strengthTraders: 2, minTechLevel: 0, maxTechLevel: 3, bribeLevel: 6, drugsOK: true,  firearmsOK: true,  wanted: FIREARMS },
  { name: 'Military State',   reactionIllegal: 7, strengthPolice: 7, strengthPirates: 0, strengthTraders: 6, minTechLevel: 2, maxTechLevel: 7, bribeLevel: 0, drugsOK: false, firearmsOK: true,  wanted: ROBOTS },
  { name: 'Monarchy',         reactionIllegal: 3, strengthPolice: 4, strengthPirates: 3, strengthTraders: 4, minTechLevel: 0, maxTechLevel: 5, bribeLevel: 4, drugsOK: true,  firearmsOK: true,  wanted: MEDICINE },
  { name: 'Pacifist State',   reactionIllegal: 7, strengthPolice: 2, strengthPirates: 1, strengthTraders: 5, minTechLevel: 0, maxTechLevel: 3, bribeLevel: 1, drugsOK: true,  firearmsOK: false, wanted: -1 },
  { name: 'Socialist State',  reactionIllegal: 4, strengthPolice: 2, strengthPirates: 5, strengthTraders: 3, minTechLevel: 0, maxTechLevel: 5, bribeLevel: 6, drugsOK: true,  firearmsOK: true,  wanted: -1 },
  { name: 'State of Satori',  reactionIllegal: 0, strengthPolice: 1, strengthPirates: 1, strengthTraders: 1, minTechLevel: 0, maxTechLevel: 1, bribeLevel: 0, drugsOK: false, firearmsOK: false, wanted: -1 },
  { name: 'Technocracy',      reactionIllegal: 1, strengthPolice: 6, strengthPirates: 3, strengthTraders: 6, minTechLevel: 4, maxTechLevel: 7, bribeLevel: 2, drugsOK: true,  firearmsOK: true,  wanted: WATER },
  { name: 'Theocracy',        reactionIllegal: 5, strengthPolice: 6, strengthPirates: 1, strengthTraders: 4, minTechLevel: 0, maxTechLevel: 4, bribeLevel: 0, drugsOK: true,  firearmsOK: true,  wanted: NARCOTICS },
];
