import type { FactionId } from './content.ts';

export type GoodId =
  | 'water' | 'hydro' | 'ore' | 'machines' | 'meds' | 'prosthetics'
  | 'neurostaub' | 'blackcode' | 'plasma' | 'implants';

export interface GoodDef {
  id: GoodId;
  name: string;
  category: string;
  base: number;
  /** How hard the price swings. */
  vol: number;
  contraband: boolean;
}

export const GOODS: readonly GoodDef[] = [
  { id: 'water', name: 'Wasser', category: 'Grundgut', base: 28, vol: 0.5, contraband: false },
  { id: 'hydro', name: 'Hydrokultur', category: 'Grundgut', base: 55, vol: 0.6, contraband: false },
  { id: 'ore', name: 'Erze', category: 'Grundgut', base: 95, vol: 0.7, contraband: false },
  { id: 'machines', name: 'Maschinen', category: 'Technik', base: 240, vol: 0.8, contraband: false },
  { id: 'meds', name: 'Medikamente', category: 'Medizin', base: 330, vol: 0.9, contraband: false },
  { id: 'prosthetics', name: 'Prothesen', category: 'Cyberware', base: 540, vol: 1.0, contraband: false },
  { id: 'neurostaub', name: 'Neurostaub', category: 'Droge', base: 880, vol: 1.6, contraband: true },
  { id: 'blackcode', name: 'Schwarzcode', category: 'Daten', base: 1150, vol: 1.5, contraband: true },
  { id: 'plasma', name: 'Plasmagewehre', category: 'Waffen', base: 1450, vol: 1.4, contraband: true },
  { id: 'implants', name: 'Kampfimplantate', category: 'Cyberware', base: 1900, vol: 1.7, contraband: true },
];
export const GOOD_BY_ID: ReadonlyMap<GoodId, GoodDef> = new Map(GOODS.map((g) => [g.id, g]));

export type StationId = 'meridian' | 'kessin' | 'helixtor' | 'zenit' | 'varn' | 'lumen' | 'corvus' | 'aurel';

export interface StationDef {
  id: StationId;
  name: string;
  faction: FactionId;
  tagline: string;
  /** 0 to 3: how often and how hard cargo is checked. */
  customs: number;
  /** 0 to 3: how dangerous the approach is. */
  pirates: number;
  /** Local price multipliers. Below 1: produced here. Above 1: in demand. */
  mods: Partial<Record<GoodId, number>>;
  /** Parameters for the procedural planet. */
  look: { seed: number; atmo: [number, number, number]; water: [number, number, number]; land: [number, number, number] };
}

export const STATIONS: readonly StationDef[] = [
  {
    id: 'meridian', name: 'Meridian Hoch', faction: 'tessera', tagline: 'Freihandelszone', customs: 1, pirates: 1,
    mods: { water: 0.8, hydro: 0.7, prosthetics: 1.3, machines: 1.05, neurostaub: 1.1, blackcode: 1.2 },
    look: { seed: 3.0, atmo: [0.16, 0.56, 1.0], water: [0.008, 0.06, 0.11], land: [0.11, 0.085, 0.07] },
  },
  {
    id: 'kessin', name: 'Kessin Tief', faction: 'asche', tagline: 'Werftwelt', customs: 2, pirates: 2,
    mods: { ore: 0.75, machines: 0.8, meds: 1.35, plasma: 1.45, hydro: 1.3 },
    look: { seed: 17.3, atmo: [1.0, 0.42, 0.16], water: [0.09, 0.03, 0.015], land: [0.15, 0.07, 0.04] },
  },
  {
    id: 'helixtor', name: 'Helix-Tor', faction: 'helix', tagline: 'Kartellhafen', customs: 0, pirates: 3,
    mods: { neurostaub: 0.6, blackcode: 0.75, implants: 0.9, water: 1.5, hydro: 1.4, meds: 1.2 },
    look: { seed: 41.7, atmo: [1.0, 0.25, 0.7], water: [0.07, 0.01, 0.09], land: [0.10, 0.04, 0.10] },
  },
  {
    id: 'zenit', name: 'Zenit Prime', faction: 'zenit', tagline: 'Konzernwelt', customs: 3, pirates: 0,
    mods: { prosthetics: 0.7, meds: 0.75, blackcode: 1.7, implants: 1.6, neurostaub: 1.5, ore: 1.25 },
    look: { seed: 58.2, atmo: [0.7, 0.8, 1.0], water: [0.05, 0.07, 0.11], land: [0.16, 0.17, 0.19] },
  },
  {
    id: 'varn', name: 'Varn-Gürtel', faction: 'asche', tagline: 'Minenkolonie', customs: 1, pirates: 2,
    mods: { ore: 0.6, water: 1.4, machines: 1.35, hydro: 1.25, plasma: 1.2 },
    look: { seed: 73.9, atmo: [1.0, 0.6, 0.3], water: [0.05, 0.035, 0.02], land: [0.17, 0.11, 0.06] },
  },
  {
    id: 'lumen', name: 'Lumen-Reede', faction: 'tessera', tagline: 'Handelsreede', customs: 1, pirates: 1,
    mods: { machines: 0.85, hydro: 0.9, prosthetics: 1.15, ore: 1.15, meds: 1.1 },
    look: { seed: 92.4, atmo: [0.2, 0.9, 0.8], water: [0.006, 0.08, 0.08], land: [0.06, 0.11, 0.08] },
  },
  {
    id: 'corvus', name: 'Corvus-Schatten', faction: 'helix', tagline: 'Schwarzmarkt', customs: 0, pirates: 3,
    mods: { plasma: 0.65, implants: 0.7, neurostaub: 0.85, meds: 1.4, water: 1.3 },
    look: { seed: 117.1, atmo: [0.6, 0.3, 1.0], water: [0.03, 0.015, 0.08], land: [0.07, 0.05, 0.11] },
  },
  {
    id: 'aurel', name: 'Aurel-Station', faction: 'zenit', tagline: 'Residenzwelt', customs: 3, pirates: 0,
    mods: { neurostaub: 1.9, plasma: 1.5, hydro: 1.3, prosthetics: 1.2, water: 1.2, machines: 0.9 },
    look: { seed: 134.6, atmo: [1.0, 0.85, 0.5], water: [0.02, 0.07, 0.10], land: [0.16, 0.14, 0.08] },
  },
];
export const STATION_BY_ID: ReadonlyMap<StationId, StationDef> = new Map(STATIONS.map((s) => [s.id, s]));
