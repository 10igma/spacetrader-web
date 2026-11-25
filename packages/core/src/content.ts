export type Rarity = 'standard' | 'rare' | 'elite' | 'legend' | 'singularity';
export const RARITIES: readonly Rarity[] = ['standard', 'rare', 'elite', 'legend', 'singularity'];
export const rarityRank = (r: Rarity): number => RARITIES.indexOf(r);

export type FactionId = 'helix' | 'tessera' | 'asche' | 'zenit';
export type RoleId = 'pilot' | 'trader' | 'tech' | 'gunner' | 'smuggler';

export interface CardDef {
  id: string;
  name: string;
  epithet: string;
  role: RoleId;
  faction: FactionId;
  rarity: Rarity;
  rating: number;
  /** Navigation, Handel, Technik, Kampf */
  stats: { nav: number; hdl: number; tec: number; kmp: number };
}

export const FACTIONS: Record<FactionId, { name: string; short: string }> = {
  helix: { name: 'Helix-Kartell', short: 'HLX' },
  tessera: { name: 'Freie Gilde Tessera', short: 'TSR' },
  asche: { name: 'Aschenorden', short: 'ASH' },
  zenit: { name: 'Zenit-Konsortium', short: 'ZNT' },
};

export const ROLES: Record<RoleId, { name: string; short: string }> = {
  pilot: { name: 'Pilotin', short: 'PIL' },
  trader: { name: 'Händler', short: 'HDL' },
  tech: { name: 'Technik', short: 'TEC' },
  gunner: { name: 'Kanonier', short: 'KAN' },
  smuggler: { name: 'Schmuggel', short: 'SMG' },
};

type Row = [string, string, string, RoleId, FactionId, Rarity, number, [number, number, number, number]];

const ROWS: Row[] = [
  // Standard
  ['c01', 'Jorun Pael', 'Dockarbeiter', 'trader', 'tessera', 'standard', 52, [41, 58, 49, 38]],
  ['c02', 'Mika Dross', 'Frachtpilotin', 'pilot', 'tessera', 'standard', 55, [62, 44, 47, 40]],
  ['c03', 'Teo Karsk', 'Schrauber', 'tech', 'asche', 'standard', 51, [38, 40, 61, 45]],
  ['c04', 'Ansa Whel', 'Geschützhilfe', 'gunner', 'asche', 'standard', 54, [42, 35, 46, 63]],
  ['c05', 'Rix Tomasi', 'Kurier', 'smuggler', 'helix', 'standard', 56, [57, 55, 40, 44]],
  ['c06', 'Dana Oulu', 'Buchhalterin', 'trader', 'zenit', 'standard', 58, [36, 66, 52, 31]],
  ['c07', 'Pell Varga', 'Navigator', 'pilot', 'zenit', 'standard', 57, [65, 48, 50, 36]],
  ['c08', 'Sen Abara', 'Lagermeisterin', 'trader', 'helix', 'standard', 53, [40, 60, 44, 42]],
  ['c09', 'Ottil Grane', 'Bordmechaniker', 'tech', 'tessera', 'standard', 59, [45, 43, 68, 41]],
  ['c10', 'Kei Larsen', 'Söldner', 'gunner', 'helix', 'standard', 60, [48, 37, 45, 70]],
  // Selten
  ['c11', 'Ilya Varn', 'Blockadebrecherin', 'pilot', 'tessera', 'rare', 72, [81, 60, 58, 62]],
  ['c12', 'Bram Okoro', 'Preisflüsterer', 'trader', 'zenit', 'rare', 74, [52, 84, 66, 45]],
  ['c13', 'Nessa Quist', 'Reaktorärztin', 'tech', 'asche', 'rare', 71, [55, 57, 82, 54]],
  ['c14', 'Tovak Brandt', 'Breitseite', 'gunner', 'asche', 'rare', 73, [58, 44, 60, 85]],
  ['c15', 'Lio Sarrat', 'Doppelboden', 'smuggler', 'helix', 'rare', 75, [74, 77, 55, 60]],
  ['c16', 'Yuna Ferro', 'Signaljägerin', 'tech', 'zenit', 'rare', 70, [63, 59, 80, 48]],
  // Elite
  ['c17', 'Sable Meridian', 'Die Unverzollte', 'smuggler', 'helix', 'elite', 84, [86, 88, 70, 72]],
  ['c18', 'Cmdr. Asko Thane', 'Eiserne Hand', 'gunner', 'asche', 'elite', 85, [70, 58, 74, 94]],
  ['c19', 'Dr. Mirelle Koss', 'Architektin', 'tech', 'zenit', 'elite', 83, [66, 72, 93, 60]],
  ['c20', 'Raffa Delacroix', 'Sternenläufer', 'pilot', 'tessera', 'elite', 86, [95, 70, 71, 74]],
  // Legende
  ['c21', 'Vesper Nakai', 'Königin der Routen', 'trader', 'tessera', 'legend', 93, [80, 98, 84, 70]],
  ['c22', 'Kazimir Voss', 'Der letzte Admiral', 'gunner', 'asche', 'legend', 94, [84, 72, 82, 99]],
  ['c23', 'Oriel Santhe', 'Geist von Helix', 'smuggler', 'helix', 'legend', 92, [94, 93, 78, 81]],
  // Singularität
  ['c24', 'ECHO-9', 'Erwachter Schiffsgeist', 'pilot', 'zenit', 'singularity', 99, [99, 96, 99, 92]],
];

export const CARDS: readonly CardDef[] = ROWS.map(
  ([id, name, epithet, role, faction, rarity, rating, [nav, hdl, tec, kmp]]) => ({
    id, name, epithet, role, faction, rarity, rating, stats: { nav, hdl, tec, kmp },
  }),
);

export const CARD_BY_ID: ReadonlyMap<string, CardDef> = new Map(CARDS.map((c) => [c.id, c]));

export const CARDS_BY_RARITY: Record<Rarity, readonly CardDef[]> = {
  standard: CARDS.filter((c) => c.rarity === 'standard'),
  rare: CARDS.filter((c) => c.rarity === 'rare'),
  elite: CARDS.filter((c) => c.rarity === 'elite'),
  legend: CARDS.filter((c) => c.rarity === 'legend'),
  singularity: CARDS.filter((c) => c.rarity === 'singularity'),
};
