/**
 * Shared UI helper data — names, labels, lookups
 */

import { SOLAR_SYSTEM_NAMES } from '../data/solarSystems';
import { POLITICS_DATA } from '../data/politics';
import { TechLevelNames, SystemSizeNames } from '../data/constants';
import {
  PSYCHOPATHSCORE, VILLAINSCORE, CRIMINALSCORE, DUBIOUSSCORE,
  CLEANSCORE, LAWFULSCORE, TRUSTEDSCORE, HELPERSCORE, HEROSCORE,
  MOSTLYHARMLESSREP, POORREP, AVERAGESCORE,
  ABOVEAVERAGESCORE, COMPETENTREP, DANGEROUSREP, DEADLYREP, ELITESCORE,
  UNEVENTFUL, WAR, PLAGUE, DROUGHT, BOREDOM, COLD, CROPFAILURE, LACKOFWORKERS,
  NOSPECIALRESOURCES, MINERALRICH, MINERALPOOR, DESERT, LOTSOFWATER,
  RICHSOIL, POORSOIL, RICHFAUNA, LIFELESS, WEIRDMUSHROOMS,
  LOTSOFHERBS, ARTISTIC, WARLIKE,
} from '../data/constants';

export function systemName(index: number): string {
  return SOLAR_SYSTEM_NAMES[index] ?? `System ${index}`;
}

export function govName(politicsIndex: number): string {
  return POLITICS_DATA[politicsIndex]?.name ?? 'Unknown';
}

export function techName(level: number): string {
  return TechLevelNames[level] ?? `Tech ${level}`;
}

export function sizeName(size: number): string {
  return SystemSizeNames[size] ?? `Size ${size}`;
}

export function policeRecordName(score: number): string {
  if (score >= HEROSCORE) return 'Hero';
  if (score >= HELPERSCORE) return 'Helper';
  if (score >= TRUSTEDSCORE) return 'Trusted';
  if (score >= LAWFULSCORE) return 'Lawful';
  if (score >= CLEANSCORE) return 'Clean';
  if (score >= DUBIOUSSCORE) return 'Dubious';
  if (score >= CRIMINALSCORE) return 'Criminal';
  if (score >= VILLAINSCORE) return 'Villain';
  if (score >= PSYCHOPATHSCORE) return 'Psychopath';
  return 'Psychopath';
}

export function reputationName(score: number): string {
  if (score >= ELITESCORE) return 'Elite';
  if (score >= DEADLYREP) return 'Deadly';
  if (score >= DANGEROUSREP) return 'Dangerous';
  if (score >= COMPETENTREP) return 'Competent';
  if (score >= ABOVEAVERAGESCORE) return 'Above Average';
  if (score >= AVERAGESCORE) return 'Average';
  if (score >= POORREP) return 'Poor';
  if (score >= MOSTLYHARMLESSREP) return 'Mostly Harmless';
  return 'Harmless';
}

export function statusName(status: number): string {
  switch (status) {
    case UNEVENTFUL: return 'Uneventful';
    case WAR: return 'War';
    case PLAGUE: return 'Plague';
    case DROUGHT: return 'Drought';
    case BOREDOM: return 'Boredom';
    case COLD: return 'Cold';
    case CROPFAILURE: return 'Crop Failure';
    case LACKOFWORKERS: return 'Lack of Workers';
    default: return 'Unknown';
  }
}

export function resourceName(res: number): string {
  switch (res) {
    case NOSPECIALRESOURCES: return 'Nothing special';
    case MINERALRICH: return 'Mineral rich';
    case MINERALPOOR: return 'Mineral poor';
    case DESERT: return 'Desert';
    case LOTSOFWATER: return 'Lots of water';
    case RICHSOIL: return 'Rich soil';
    case POORSOIL: return 'Poor soil';
    case RICHFAUNA: return 'Rich fauna';
    case LIFELESS: return 'Lifeless';
    case WEIRDMUSHROOMS: return 'Weird mushrooms';
    case LOTSOFHERBS: return 'Lots of herbs';
    case ARTISTIC: return 'Artistic';
    case WARLIKE: return 'Warlike';
    default: return 'Unknown';
  }
}

export function formatCredits(amount: number): string {
  return amount.toLocaleString() + ' cr.';
}
