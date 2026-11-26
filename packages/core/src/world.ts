import type { FactionId } from './content.ts';

export type Category = 'grund' | 'technik' | 'medizin' | 'cyber' | 'daten' | 'waffen' | 'drogen' | 'luxus';

export const CATEGORY_NAME: Record<Category, string> = {
  grund: 'Grundgut',
  technik: 'Technik',
  medizin: 'Medizin',
  cyber: 'Cyberware',
  daten: 'Daten',
  waffen: 'Waffen',
  drogen: 'Droge',
  luxus: 'Luxus',
};

export type GoodId =
  | 'water' | 'hydro' | 'ore' | 'fuelcells'
  | 'machines' | 'reactor' | 'drones' | 'jammers'
  | 'meds' | 'stims'
  | 'prosthetics' | 'neurolinks' | 'boosters' | 'implants'
  | 'starcharts' | 'secrets' | 'blackcode' | 'aicores'
  | 'huntarms' | 'plasma' | 'emp'
  | 'lumen' | 'neurostaub' | 'schlaftau'
  | 'spices' | 'art' | 'artifacts';

/**
 * free: legal everywhere.
 * sanctioned: banned by the factions listed in `bannedIn`.
 * outlawed: banned by every faction that has laws at all.
 */
export type Tier = 'free' | 'sanctioned' | 'outlawed';

export interface GoodDef {
  id: GoodId;
  name: string;
  category: Category;
  base: number;
  /** How hard the price swings. */
  vol: number;
  tier: Tier;
  bannedIn: readonly FactionId[];
}

type Row = [GoodId, string, Category, number, number, Tier, FactionId[]?];

const ROWS: Row[] = [
  ['water', 'Wasser', 'grund', 28, 0.5, 'free'],
  ['hydro', 'Hydrokultur', 'grund', 55, 0.6, 'free'],
  ['ore', 'Erze', 'grund', 95, 0.7, 'free'],
  ['fuelcells', 'Treibstoffzellen', 'grund', 140, 0.7, 'free'],
  ['machines', 'Maschinen', 'technik', 240, 0.8, 'free'],
  ['reactor', 'Reaktorteile', 'technik', 420, 0.9, 'free'],
  ['drones', 'Drohnen', 'technik', 610, 1.0, 'free'],
  ['jammers', 'Störsender', 'technik', 780, 1.3, 'sanctioned', ['zenit', 'asche']],
  ['meds', 'Medikamente', 'medizin', 330, 0.9, 'free'],
  ['stims', 'Stimulanzien', 'medizin', 460, 1.2, 'sanctioned', ['zenit']],
  ['prosthetics', 'Prothesen', 'cyber', 540, 1.0, 'free'],
  ['neurolinks', 'Neuro-Schnittstellen', 'cyber', 820, 1.1, 'free'],
  ['boosters', 'Reflexbooster', 'cyber', 1250, 1.4, 'sanctioned', ['zenit', 'tessera']],
  ['implants', 'Kampfimplantate', 'cyber', 1900, 1.7, 'outlawed'],
  ['starcharts', 'Sternkarten', 'daten', 190, 0.8, 'free'],
  ['secrets', 'Firmengeheimnisse', 'daten', 980, 1.5, 'sanctioned', ['zenit']],
  ['blackcode', 'Schwarzcode', 'daten', 1150, 1.5, 'outlawed'],
  ['aicores', 'KI-Kerne', 'daten', 2600, 1.8, 'outlawed'],
  ['huntarms', 'Jagdwaffen', 'waffen', 380, 1.0, 'sanctioned', ['zenit']],
  ['plasma', 'Plasmagewehre', 'waffen', 1450, 1.4, 'outlawed'],
  ['emp', 'EMP-Sprengköpfe', 'waffen', 2200, 1.6, 'outlawed'],
  ['lumen', 'Lumen', 'drogen', 640, 1.4, 'sanctioned', ['zenit', 'asche']],
  ['neurostaub', 'Neurostaub', 'drogen', 880, 1.6, 'outlawed'],
  ['schlaftau', 'Schlaftau', 'drogen', 1050, 1.6, 'outlawed'],
  ['spices', 'Gewürze', 'luxus', 210, 0.8, 'free'],
  ['art', 'Kunst', 'luxus', 720, 1.2, 'free'],
  ['artifacts', 'Xeno-Artefakte', 'luxus', 1700, 1.6, 'sanctioned', ['tessera', 'zenit']],
];

export const GOODS: readonly GoodDef[] = ROWS.map(([id, name, category, base, vol, tier, bannedIn]) => ({
  id, name, category, base, vol, tier, bannedIn: bannedIn ?? [],
}));
export const GOOD_BY_ID: ReadonlyMap<GoodId, GoodDef> = new Map(GOODS.map((g) => [g.id, g]));

/** The cartel has no customs and no bans: everything trades in the open there. */
export const LAWLESS: readonly FactionId[] = ['helix'];

export function isBanned(good: GoodDef, faction: FactionId): boolean {
  if (LAWLESS.includes(faction)) return false;
  return good.tier === 'outlawed' || (good.tier === 'sanctioned' && good.bannedIn.includes(faction));
}

export type StationId =
  | 'meridian' | 'kessin' | 'helixtor' | 'zenit' | 'varn' | 'lumen' | 'corvus' | 'aurel'
  | 'kreuz' | 'eisenfurt' | 'nimbus' | 'solace';

export interface StationDef {
  id: StationId;
  name: string;
  faction: FactionId;
  tagline: string;
  /** 0 to 3: how often and how hard cargo is checked. */
  customs: number;
  /** 0 to 3: how dangerous the approach is. */
  pirates: number;
  /** Local price multipliers by good or category. Below 1: produced here. Above 1: in demand. */
  mods: Partial<Record<GoodId | Category, number>>;
  /** Place on the sector chart: x from 0 to 100, y from 0 to 110. */
  pos: [number, number];
  /** Parameters for the procedural planet. */
  look: { seed: number; atmo: [number, number, number]; water: [number, number, number]; land: [number, number, number] };
}

export const STATIONS: readonly StationDef[] = [
  {
    id: 'meridian', name: 'Meridian Hoch', faction: 'tessera', tagline: 'Freihandelszone', customs: 1, pirates: 1,
    mods: { grund: 0.8, luxus: 1.15, cyber: 1.25, daten: 1.1 },
    pos: [50, 54],
    look: { seed: 3.0, atmo: [0.16, 0.56, 1.0], water: [0.008, 0.06, 0.11], land: [0.11, 0.085, 0.07] },
  },
  {
    id: 'kessin', name: 'Kessin Tief', faction: 'asche', tagline: 'Werftwelt', customs: 2, pirates: 2,
    mods: { technik: 0.8, ore: 0.75, medizin: 1.3, waffen: 1.35, hydro: 1.3, luxus: 1.1 },
    pos: [24, 76],
    look: { seed: 17.3, atmo: [1.0, 0.42, 0.16], water: [0.09, 0.03, 0.015], land: [0.15, 0.07, 0.04] },
  },
  {
    id: 'helixtor', name: 'Helix-Tor', faction: 'helix', tagline: 'Kartellhafen', customs: 0, pirates: 3,
    // Weapons are cheap everywhere in cartel space: the money is in getting them out of it.
    mods: { drogen: 0.65, daten: 0.8, waffen: 0.75, grund: 1.45, medizin: 1.2, technik: 1.1 },
    pos: [71, 80],
    look: { seed: 41.7, atmo: [1.0, 0.25, 0.7], water: [0.07, 0.01, 0.09], land: [0.10, 0.04, 0.10] },
  },
  {
    id: 'zenit', name: 'Zenit Prime', faction: 'zenit', tagline: 'Konzernwelt', customs: 3, pirates: 0,
    mods: { cyber: 0.72, medizin: 0.78, daten: 1.5, drogen: 1.45, ore: 1.25, luxus: 1.3, waffen: 1.2 },
    pos: [75, 30],
    look: { seed: 58.2, atmo: [0.7, 0.8, 1.0], water: [0.05, 0.07, 0.11], land: [0.16, 0.17, 0.19] },
  },
  {
    id: 'varn', name: 'Varn-Gürtel', faction: 'asche', tagline: 'Minenkolonie', customs: 1, pirates: 2,
    mods: { ore: 0.6, fuelcells: 0.8, water: 1.4, hydro: 1.25, technik: 1.3, drogen: 1.25, medizin: 1.15 },
    pos: [42, 97],
    look: { seed: 73.9, atmo: [1.0, 0.6, 0.3], water: [0.05, 0.035, 0.02], land: [0.17, 0.11, 0.06] },
  },
  {
    id: 'lumen', name: 'Lumen-Reede', faction: 'tessera', tagline: 'Handelsreede', customs: 1, pirates: 1,
    mods: { technik: 0.88, luxus: 0.85, grund: 0.95, cyber: 1.12, medizin: 1.1, waffen: 1.15 },
    pos: [27, 38],
    look: { seed: 92.4, atmo: [0.2, 0.9, 0.8], water: [0.006, 0.08, 0.08], land: [0.06, 0.11, 0.08] },
  },
  {
    id: 'corvus', name: 'Corvus-Schatten', faction: 'helix', tagline: 'Schwarzmarkt', customs: 0, pirates: 3,
    mods: { waffen: 0.65, cyber: 0.8, medizin: 1.4, grund: 1.3, luxus: 1.2, drogen: 0.9 },
    pos: [90, 66],
    look: { seed: 117.1, atmo: [0.6, 0.3, 1.0], water: [0.03, 0.015, 0.08], land: [0.07, 0.05, 0.11] },
  },
  {
    id: 'aurel', name: 'Aurel-Station', faction: 'zenit', tagline: 'Residenzwelt', customs: 3, pirates: 0,
    mods: { luxus: 1.5, drogen: 1.8, waffen: 1.4, hydro: 1.3, technik: 0.9, grund: 1.15, cyber: 1.1 },
    pos: [91, 45],
    look: { seed: 134.6, atmo: [1.0, 0.85, 0.5], water: [0.02, 0.07, 0.10], land: [0.16, 0.14, 0.08] },
  },
  {
    id: 'kreuz', name: 'Tessera-Kreuz', faction: 'tessera', tagline: 'Umschlagplatz', customs: 1, pirates: 1,
    mods: { daten: 0.85, grund: 0.9, technik: 1.2, waffen: 1.1, luxus: 1.05, medizin: 0.95 },
    pos: [46, 18],
    look: { seed: 151.3, atmo: [0.3, 0.75, 1.0], water: [0.01, 0.07, 0.12], land: [0.09, 0.1, 0.08] },
  },
  {
    id: 'eisenfurt', name: 'Eisenfurt', faction: 'asche', tagline: 'Flottenbasis', customs: 2, pirates: 1,
    mods: { waffen: 0.72, technik: 0.92, grund: 1.25, luxus: 1.3, medizin: 1.25, cyber: 1.15 },
    pos: [9, 57],
    look: { seed: 168.8, atmo: [1.0, 0.5, 0.22], water: [0.07, 0.03, 0.02], land: [0.13, 0.08, 0.05] },
  },
  {
    id: 'nimbus', name: 'Nimbus-Riff', faction: 'helix', tagline: 'Schmugglernest', customs: 0, pirates: 2,
    mods: { drogen: 0.75, daten: 0.9, technik: 1.3, waffen: 0.85, grund: 1.2, cyber: 0.9 },
    pos: [66, 101],
    look: { seed: 183.4, atmo: [0.85, 0.3, 0.9], water: [0.05, 0.012, 0.09], land: [0.08, 0.045, 0.11] },
  },
  {
    id: 'solace', name: 'Solace-Labor', faction: 'zenit', tagline: 'Forschungswelt', customs: 2, pirates: 0,
    mods: { medizin: 0.7, cyber: 0.85, daten: 0.82, grund: 1.3, luxus: 1.2, drogen: 1.4, ore: 1.2 },
    pos: [71, 8],
    look: { seed: 199.9, atmo: [0.75, 0.9, 1.0], water: [0.04, 0.08, 0.12], land: [0.17, 0.18, 0.2] },
  },
];
export const STATION_BY_ID: ReadonlyMap<StationId, StationDef> = new Map(STATIONS.map((s) => [s.id, s]));

/** Authored price profile of a station for a good, before compression. */
export const stationMod = (station: StationDef, good: GoodDef): number =>
  station.mods[good.id] ?? station.mods[good.category] ?? 1;

// ---------------------------------------------------------------------------
// The sector: jump lanes between stations. A jump follows one lane.
// ---------------------------------------------------------------------------

/** A hub with four spokes, a ring around it, and two short cuts. Far corners are four jumps apart. */
export const LANES: readonly (readonly [StationId, StationId])[] = [
  ['meridian', 'lumen'], ['meridian', 'kessin'], ['meridian', 'helixtor'], ['meridian', 'zenit'],
  ['lumen', 'kreuz'], ['kreuz', 'solace'], ['solace', 'zenit'], ['zenit', 'aurel'], ['aurel', 'corvus'],
  ['corvus', 'helixtor'], ['helixtor', 'nimbus'], ['nimbus', 'varn'], ['varn', 'kessin'], ['kessin', 'eisenfurt'],
  ['eisenfurt', 'lumen'],
  ['kreuz', 'zenit'], ['aurel', 'helixtor'],
];

const NEIGHBOURS = new Map<StationId, StationId[]>(STATIONS.map((s) => [s.id, []]));
for (const [a, b] of LANES) { NEIGHBOURS.get(a)!.push(b); NEIGHBOURS.get(b)!.push(a); }

/**
 * Express lanes: the four spokes through the hub and the two short cuts across the ring. They save
 * jumps and cost two units of fuel instead of one. The ring is slower and cheaper.
 */
export const EXPRESS: readonly (readonly [StationId, StationId])[] = [
  ['meridian', 'lumen'], ['meridian', 'kessin'], ['meridian', 'helixtor'], ['meridian', 'zenit'],
  ['kreuz', 'zenit'], ['aurel', 'helixtor'],
];
const laneKey = (a: StationId, b: StationId): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
const EXPRESS_KEYS = new Set(EXPRESS.map(([a, b]) => laneKey(a, b)));

export const isExpress = (a: StationId, b: StationId): boolean => EXPRESS_KEYS.has(laneKey(a, b));
/** Fuel for one jump along a lane. */
export const laneFuel = (a: StationId, b: StationId): number => (isExpress(a, b) ? 2 : 1);
/** Fuel for a whole course from a station. */
export const courseFuel = (from: StationId, course: readonly StationId[]): number =>
  course.reduce((sum, next, i) => sum + laneFuel(i === 0 ? from : course[i - 1]!, next), 0);

/** Stations one jump away. */
export const neighbours = (id: StationId): readonly StationId[] => NEIGHBOURS.get(id) ?? [];

/**
 * The way with the fewest jumps from one station to another, without the start. Empty if they are the same.
 * Among ways of the same length it takes the one that burns the least fuel.
 */
export function courseTo(from: StationId, to: StationId): StationId[] {
  if (from === to) return [];
  // Jumps and fuel still needed from every station, counted back from the target.
  const left = new Map<StationId, { hops: number; fuel: number }>([[to, { hops: 0, fuel: 0 }]]);
  let layer: StationId[] = [to];
  while (layer.length > 0 && !left.has(from)) {
    const next: StationId[] = [];
    for (const at of layer) {
      const here = left.get(at)!;
      for (const n of neighbours(at)) {
        const fuel = here.fuel + laneFuel(n, at);
        const known = left.get(n);
        if (!known) { left.set(n, { hops: here.hops + 1, fuel }); next.push(n); }
        else if (known.hops === here.hops + 1 && fuel < known.fuel) known.fuel = fuel;
      }
    }
    layer = next;
  }
  if (!left.has(from)) return [];
  const path: StationId[] = [];
  let at = from;
  while (at !== to) {
    const hops = left.get(at)!.hops;
    let best: StationId | null = null;
    for (const n of neighbours(at)) {
      const l = left.get(n);
      if (!l || l.hops !== hops - 1) continue;
      if (best === null || laneFuel(at, n) + l.fuel < laneFuel(at, best) + left.get(best)!.fuel) best = n;
    }
    at = best!;
    path.push(at);
  }
  return path;
}

/** Jumps between two stations. */
export const hopsBetween = (from: StationId, to: StationId): number => courseTo(from, to).length;

/** What a crisis is called, by what it makes scarce. */
export const CRISIS_NAME: Record<Category, string> = {
  grund: 'Versorgungskrise',
  technik: 'Werftboom',
  medizin: 'Seuche',
  cyber: 'Aufrüstung',
  daten: 'Datenkrieg',
  waffen: 'Krieg',
  drogen: 'Rausch-Welle',
  luxus: 'Festwoche',
};
