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
  // Legende (zweite Welle)
  ['c25', 'Ilse Marrow', 'Hüterin der Tiefe', 'tech', 'asche', 'legend', 92, [78, 80, 98, 84]],
  ['c26', 'Dax Verhoeven', 'Der Makler', 'trader', 'zenit', 'legend', 93, [76, 99, 88, 66]],
  ['c27', 'Sera Quill', 'Nullsignatur', 'smuggler', 'zenit', 'legend', 91, [93, 92, 82, 70]],
  ['c28', 'Okon Rhee', 'Kometenreiter', 'pilot', 'helix', 'legend', 94, [99, 78, 80, 86]],
  ['c29', 'Marisol Kade', 'Zunftmeisterin', 'tech', 'tessera', 'legend', 92, [80, 86, 97, 72]],
  // Singularität (zweite)
  ['c30', 'MUTTER', 'Die Stimme hinter Helix', 'trader', 'helix', 'singularity', 99, [94, 99, 97, 93]],
];

// ---------------------------------------------------------------------------
// Generated crew. The hand-written cards above are the faces of the set; the
// rest fills every faction and role to the same depth so albums are regular.
// Generation is deterministic, so ids and names are stable across builds.
// ---------------------------------------------------------------------------

const FIRST = ['Ada', 'Bex', 'Calder', 'Dunya', 'Elio', 'Fenna', 'Garrick', 'Hale', 'Imre', 'Juno', 'Kato', 'Lys', 'Maren', 'Nilo', 'Orla', 'Piet', 'Quen', 'Rada', 'Soren', 'Tamsin', 'Ulla', 'Vito', 'Wren', 'Xander', 'Yara', 'Zeno', 'Anouk', 'Bram', 'Cira', 'Dov', 'Esme', 'Falk', 'Greta', 'Hugo', 'Inez', 'Joss', 'Kira', 'Lars', 'Mila', 'Nox'];
const LAST = ['Ardent', 'Bellweather', 'Corvane', 'Draeger', 'Eskil', 'Farrow', 'Gant', 'Holloway', 'Isaksen', 'Jarrah', 'Kestrel', 'Lindqvist', 'Maddox', 'Navarro', 'Oduya', 'Prenn', 'Quarles', 'Rusk', 'Stroud', 'Tallis', 'Umber', 'Vance', 'Wolcott', 'Yarrow', 'Zabel', 'Ashby', 'Brandl', 'Cato', 'Dessau', 'Eames', 'Frisk', 'Gault', 'Hark', 'Ivers', 'Juhl', 'Korr', 'Lund', 'Mertz', 'Nyberg', 'Oster'];
const EPITHETS: Record<RoleId, string[]> = {
  pilot: ['Frachtpilot', 'Kurierfliegerin', 'Schlepperkapitän', 'Lotsin', 'Rennpilot', 'Testfliegerin', 'Sprungnavigator', 'Gleiterass'],
  trader: ['Zwischenhändler', 'Maklerin', 'Zahlmeister', 'Auktionatorin', 'Feilscher', 'Kontoristin', 'Einkäufer', 'Börsenläuferin'],
  tech: ['Bordtechniker', 'Reaktorwartin', 'Systemflicker', 'Scannerbauerin', 'Hüllenschweisser', 'Signaltechnikerin', 'Drohnenwart', 'Kühlmeisterin'],
  gunner: ['Bordschütze', 'Geschützführerin', 'Wachsoldat', 'Entermeisterin', 'Söldner', 'Leibwächterin', 'Kanonenlader', 'Waffenwartin'],
  smuggler: ['Schieber', 'Kontaktfrau', 'Fälscher', 'Schleuserin', 'Hehlerbote', 'Nachtläuferin', 'Papiermacher', 'Lagergeist'],
};
/** Cards per faction and role, by rarity. Legends and singularities are hand-written only. */
const QUOTA: Partial<Record<Rarity, number>> = { standard: 3, rare: 2, elite: 1 };
const RATING: Record<Rarity, [number, number]> = { standard: [50, 64], rare: [68, 78], elite: [81, 88], legend: [91, 95], singularity: [99, 99] };

function generateCrew(existing: Row[]): Row[] {
  let seed = 0x5e71;
  const rnd = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const used = new Set(existing.map((r) => r[1]));
  const out: Row[] = [];
  let n = 0;
  for (const faction of ['tessera', 'asche', 'helix', 'zenit'] as FactionId[]) {
    for (const role of ['pilot', 'trader', 'tech', 'gunner', 'smuggler'] as RoleId[]) {
      for (const rarity of ['standard', 'rare', 'elite'] as Rarity[]) {
        const have = existing.filter((r) => r[4] === faction && r[3] === role && r[5] === rarity).length;
        for (let i = have; i < (QUOTA[rarity] ?? 0); i++) {
          let name = '';
          do { name = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`; } while (used.has(name));
          used.add(name);
          const [lo, hi] = RATING[rarity];
          const rating = lo + Math.floor(rnd() * (hi - lo + 1));
          const main = Math.min(99, rating + 8 + Math.floor(rnd() * 7));
          const side = (): number => Math.max(30, rating - 5 - Math.floor(rnd() * 20));
          const stats: [number, number, number, number] =
            role === 'pilot' ? [main, side(), side(), side()]
              : role === 'trader' ? [side(), main, side(), side()]
                : role === 'tech' ? [side(), side(), main, side()]
                  : role === 'gunner' ? [side(), side(), side(), main]
                    : [Math.min(99, rating + 3 + Math.floor(rnd() * 5)), Math.min(99, rating + 3 + Math.floor(rnd() * 5)), side(), side()];
          const epithets = EPITHETS[role];
          out.push([`g${String(++n).padStart(3, '0')}`, name, epithets[Math.floor(rnd() * epithets.length)]!, role, faction, rarity, rating, stats]);
        }
      }
    }
  }
  return out;
}

ROWS.push(...generateCrew(ROWS));

export const CARDS: readonly CardDef[] = ROWS.map(
  ([id, name, epithet, role, faction, rarity, rating, [nav, hdl, tec, kmp]]) => ({
    id, name, epithet, role, faction, rarity, rating, stats: { nav, hdl, tec, kmp },
  }),
);

export const CARD_BY_ID: ReadonlyMap<string, CardDef> = new Map(CARDS.map((c) => [c.id, c]));

export const CARDS_BY_FACTION: Record<FactionId, readonly CardDef[]> = {
  helix: CARDS.filter((c) => c.faction === 'helix'),
  tessera: CARDS.filter((c) => c.faction === 'tessera'),
  asche: CARDS.filter((c) => c.faction === 'asche'),
  zenit: CARDS.filter((c) => c.faction === 'zenit'),
};

export const CARDS_BY_RARITY: Record<Rarity, readonly CardDef[]> = {
  standard: CARDS.filter((c) => c.rarity === 'standard'),
  rare: CARDS.filter((c) => c.rarity === 'rare'),
  elite: CARDS.filter((c) => c.rarity === 'elite'),
  legend: CARDS.filter((c) => c.rarity === 'legend'),
  singularity: CARDS.filter((c) => c.rarity === 'singularity'),
};
