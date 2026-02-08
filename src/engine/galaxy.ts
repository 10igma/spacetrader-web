/**
 * Space Trader 1.2.0 — Galaxy generation
 * Ported from StartNewGame() in Traveler.c
 */

import type { SolarSystem } from '../models/types';
import {
  MAXSOLARSYSTEM, MAXWORMHOLE, MAXTECHLEVEL, MAXPOLITICS, MAXRESOURCES,
  MAXSIZE, MAXSTATUS, MAXSPECIALEVENT, ENDFIXED,
  GALAXYWIDTH, GALAXYHEIGHT, MINDISTANCE, CLOSEDISTANCE,
  UNEVENTFUL,
  MONSTERKILLED, FLYBARATAS, FLYMELINA, FLYREGULAS,
  DRAGONFLYDESTROYED, MEDICINEDELIVERY, MOONBOUGHT,
  JAREKGETSOUT, WILDGETSOUT, SCARABDESTROYED,
  GETREACTOR, REACTORDELIVERED, ALIENINVASION, GEMULONRESCUED,
  EXPERIMENT, EXPERIMENTSTOPPED, ARTIFACTDELIVERY,
  ALIENARTIFACT, SCARAB, MOONFORSALE,
  ACAMARSYSTEM, BARATASSYSTEM, MELINASYSTEM, REGULASSYSTEM,
  ZALKONSYSTEM, JAPORISYSTEM, UTOPIASYSTEM, DEVIDIASYSTEM,
  KRAVATSYSTEM, GEMULONSYSTEM, DALEDSYSTEM, NIXSYSTEM,
  MAXTRADEITEM,
} from '../data/constants';
import { POLITICS_DATA } from '../data/politics';
import { SPECIAL_EVENTS } from '../data/specialEvents';
import { getRandom } from '../utils/math';
import { sqrDistance, realDistance, sqr } from '../utils/math';
import { initializeTradeItems } from './trading';

/**
 * Generate the full galaxy: 120 solar systems with positions,
 * tech levels, politics, special resources, wormholes, special events.
 * Returns { solarSystems, wormholes }.
 */
export function generateGalaxy(difficulty: number): {
  solarSystems: SolarSystem[];
  wormholes: number[];
} {
  const solarSystems: SolarSystem[] = [];
  const wormholes: number[] = new Array(MAXWORMHOLE).fill(0);

  // Initialize solar systems
  let i = 0;
  while (i < MAXSOLARSYSTEM) {
    const sys: SolarSystem = {
      nameIndex: i,
      techLevel: 0,
      politics: 0,
      status: UNEVENTFUL,
      x: 0,
      y: 0,
      specialResources: 0,
      size: 0,
      qty: new Array(MAXTRADEITEM).fill(0),
      countDown: 0,
      visited: false,
      special: -1,
    };

    if (i < MAXWORMHOLE) {
      // Place wormhole systems somewhat centrally
      sys.x = Math.floor(
        ((CLOSEDISTANCE >> 1) - getRandom(CLOSEDISTANCE)) +
        ((GALAXYWIDTH * (1 + 2 * (i % 3))) / 6),
      );
      sys.y = Math.floor(
        ((CLOSEDISTANCE >> 1) - getRandom(CLOSEDISTANCE)) +
        ((GALAXYHEIGHT * (i < 3 ? 1 : 3)) / 4),
      );
      wormholes[i] = i;
    } else {
      sys.x = 1 + getRandom(GALAXYWIDTH - 2);
      sys.y = 1 + getRandom(GALAXYHEIGHT - 2);
    }

    let closeFound = false;
    let redo = false;

    if (i >= MAXWORMHOLE) {
      for (let j = 0; j < i; ++j) {
        if (sqrDistance(solarSystems[j], sys) <= sqr(MINDISTANCE + 1)) {
          redo = true;
          break;
        }
        if (sqrDistance(solarSystems[j], sys) < sqr(CLOSEDISTANCE)) {
          closeFound = true;
        }
      }
    }
    if (redo) continue;
    if (i >= MAXWORMHOLE && !closeFound) continue;

    sys.techLevel = getRandom(MAXTECHLEVEL);
    sys.politics = getRandom(MAXPOLITICS);
    if (POLITICS_DATA[sys.politics].minTechLevel > sys.techLevel) continue;
    if (POLITICS_DATA[sys.politics].maxTechLevel < sys.techLevel) continue;

    if (getRandom(5) >= 3) {
      sys.specialResources = 1 + getRandom(MAXRESOURCES - 1);
    } else {
      sys.specialResources = 0;
    }

    sys.size = getRandom(MAXSIZE);

    if (getRandom(100) < 15) {
      sys.status = 1 + getRandom(MAXSTATUS - 1);
    } else {
      sys.status = UNEVENTFUL;
    }

    sys.nameIndex = i;
    sys.special = -1;
    sys.countDown = 0;
    sys.visited = false;

    solarSystems.push(sys);

    // Initialize trade items for this system
    initializeTradeItems(solarSystems, i, difficulty);

    ++i;
  }

  // Randomize system locations (swap positions to avoid alphabetical clustering)
  for (let ii = 0; ii < MAXSOLARSYSTEM; ++ii) {
    let d = 0;
    while (d < MAXWORMHOLE) {
      if (wormholes[d] === ii) break;
      ++d;
    }
    const j = getRandom(MAXSOLARSYSTEM);
    // Check if j is a wormhole target
    let jIsWormhole = false;
    for (let w = 0; w < MAXWORMHOLE; ++w) {
      if (wormholes[w] === j) { jIsWormhole = true; break; }
    }
    if (jIsWormhole) continue;

    const x = solarSystems[ii].x;
    const y = solarSystems[ii].y;
    solarSystems[ii].x = solarSystems[j].x;
    solarSystems[ii].y = solarSystems[j].y;
    solarSystems[j].x = x;
    solarSystems[j].y = y;
    if (d < MAXWORMHOLE) wormholes[d] = j;
  }

  // Randomize wormhole order
  for (let ii = 0; ii < MAXWORMHOLE; ++ii) {
    const j = getRandom(MAXWORMHOLE);
    const x = wormholes[ii];
    wormholes[ii] = wormholes[j];
    wormholes[j] = x;
  }

  // ── Place fixed special events ─────────────────────────────────────────
  solarSystems[ACAMARSYSTEM].special = MONSTERKILLED;
  solarSystems[BARATASSYSTEM].special = FLYBARATAS;
  solarSystems[MELINASYSTEM].special = FLYMELINA;
  solarSystems[REGULASSYSTEM].special = FLYREGULAS;
  solarSystems[ZALKONSYSTEM].special = DRAGONFLYDESTROYED;
  solarSystems[JAPORISYSTEM].special = MEDICINEDELIVERY;
  solarSystems[UTOPIASYSTEM].special = MOONBOUGHT;
  solarSystems[DEVIDIASYSTEM].special = JAREKGETSOUT;
  solarSystems[KRAVATSYSTEM].special = WILDGETSOUT;

  // Assign Scarab wormhole endpoint
  let freeWormhole = false;
  let k = 0;
  let j = getRandom(MAXWORMHOLE);
  while (
    solarSystems[wormholes[j]].special !== -1 &&
    wormholes[j] !== GEMULONSYSTEM &&
    wormholes[j] !== DALEDSYSTEM &&
    wormholes[j] !== NIXSYSTEM &&
    k < 20
  ) {
    j = getRandom(MAXWORMHOLE);
    k++;
  }
  if (k < 20) {
    freeWormhole = true;
    solarSystems[wormholes[j]].special = SCARABDESTROYED;
  }

  // Reactor quest
  let bestDist = 999;
  let bestSystem = -1;
  for (let ii = 0; ii < MAXSOLARSYSTEM; ++ii) {
    const dist = realDistance(solarSystems[NIXSYSTEM], solarSystems[ii]);
    if (dist >= 70 && dist < bestDist && solarSystems[ii].special < 0 &&
      ii !== GEMULONSYSTEM && ii !== DALEDSYSTEM) {
      bestSystem = ii;
      bestDist = dist;
    }
  }
  if (bestSystem >= 0) {
    solarSystems[bestSystem].special = GETREACTOR;
    solarSystems[NIXSYSTEM].special = REACTORDELIVERED;
  }

  // Artifact delivery
  let found = false;
  for (let ii = 0; ii < MAXSOLARSYSTEM && !found; ++ii) {
    const d = 1 + getRandom(MAXSOLARSYSTEM - 1);
    if (solarSystems[d].special < 0 && solarSystems[d].techLevel >= MAXTECHLEVEL - 1 &&
      d !== GEMULONSYSTEM && d !== DALEDSYSTEM) {
      solarSystems[d].special = ARTIFACTDELIVERY;
      found = true;
    }
  }
  if (!found) {
    // If no valid system found, disable the quest
    SPECIAL_EVENTS[ALIENARTIFACT].occurrence = 0;
  }

  // Alien invasion quest
  bestDist = 999;
  bestSystem = -1;
  for (let ii = 0; ii < MAXSOLARSYSTEM; ++ii) {
    const dist = realDistance(solarSystems[GEMULONSYSTEM], solarSystems[ii]);
    if (dist >= 70 && dist < bestDist && solarSystems[ii].special < 0 &&
      ii !== DALEDSYSTEM && ii !== GEMULONSYSTEM) {
      bestSystem = ii;
      bestDist = dist;
    }
  }
  if (bestSystem >= 0) {
    solarSystems[bestSystem].special = ALIENINVASION;
    solarSystems[GEMULONSYSTEM].special = GEMULONRESCUED;
  }

  // Experiment quest
  bestDist = 999;
  bestSystem = -1;
  for (let ii = 0; ii < MAXSOLARSYSTEM; ++ii) {
    const dist = realDistance(solarSystems[DALEDSYSTEM], solarSystems[ii]);
    if (dist >= 70 && dist < bestDist && solarSystems[ii].special < 0) {
      bestSystem = ii;
      bestDist = dist;
    }
  }
  if (bestSystem >= 0) {
    solarSystems[bestSystem].special = EXPERIMENT;
    solarSystems[DALEDSYSTEM].special = EXPERIMENTSTOPPED;
  }

  // Place random special events
  for (let ev = MOONFORSALE; ev < MAXSPECIALEVENT - ENDFIXED; ++ev) {
    for (let occ = 0; occ < SPECIAL_EVENTS[ev].occurrence; ++occ) {
      let redo = true;
      while (redo) {
        const d = 1 + getRandom(MAXSOLARSYSTEM - 1);
        if (solarSystems[d].special < 0) {
          if (freeWormhole || ev !== SCARAB) {
            solarSystems[d].special = ev;
          }
          redo = false;
        }
      }
    }
  }

  return { solarSystems, wormholes };
}

// ── Wormhole check ───────────────────────────────────────────────────────

/**
 * Returns true if there exists a wormhole from a to b.
 * If b < 0, returns true if there's any wormhole from a.
 * Ported from WormholeExists() in Traveler.c.
 */
export function wormholeExists(
  wormholes: number[],
  a: number,
  b: number,
): boolean {
  let i = 0;
  while (i < MAXWORMHOLE) {
    if (wormholes[i] === a) break;
    ++i;
  }
  if (i < MAXWORMHOLE) {
    if (b < 0) return true;
    if (i < MAXWORMHOLE - 1) {
      if (wormholes[i + 1] === b) return true;
    } else if (wormholes[0] === b) {
      return true;
    }
  }
  return false;
}
