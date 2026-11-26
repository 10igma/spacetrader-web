import { CONFIG } from './config.ts';
import type { ShipId } from './fleet.ts';

/** What titles and paints look at. All of it is earned by playing and survives a prestige. */
export interface Facts {
  jumps: number;
  profit: number;
  /** Cards of the permanent set. */
  cards: number;
  smuggled: number;
  convoys: number;
  bestLeague: number;
  prestige: number;
  ships: readonly ShipId[];
  /** Seasons whose edition album was completed. */
  seasons: readonly number[];
}

export interface TitleDef { id: string; name: string; hint: string; unlocked: (f: Facts) => boolean }

export const TITLES: readonly TitleDef[] = [
  { id: 'kapitaen', name: 'Kapitän', hint: 'Von Anfang an', unlocked: () => true },
  { id: 'vielflieger', name: 'Vielflieger', hint: '250 Sprünge', unlocked: (f) => f.jumps >= 250 },
  { id: 'grosshaendler', name: 'Grosshändler', hint: '1 Million Handelsgewinn', unlocked: (f) => f.profit >= 1_000_000 },
  { id: 'sammler', name: 'Sammler', hint: '100 Karten der Grundsammlung', unlocked: (f) => f.cards >= 100 },
  { id: 'konvoimeister', name: 'Konvoimeister', hint: '50 erfolgreiche Konvois', unlocked: (f) => f.convoys >= 50 },
  { id: 'geisterfrachter', name: 'Geisterfrachter', hint: '50 Mal mit Schmuggelware durch den Zoll', unlocked: (f) => f.smuggled >= 50 },
  { id: 'goldhaendler', name: 'Goldhändler', hint: 'Gold-Liga erreichen', unlocked: (f) => f.bestLeague >= 2 },
  { id: 'diamantbaron', name: 'Diamantbaron', hint: 'Diamant-Liga erreichen', unlocked: (f) => f.bestLeague >= 4 },
  { id: 'flottenadmiral', name: 'Flottenadmiral', hint: 'Den Leviathan besitzen', unlocked: (f) => f.ships.includes('leviathan') || f.prestige > 0 },
  { id: 'veteran', name: 'Veteran', hint: 'Prestige 1', unlocked: (f) => f.prestige >= 1 },
  { id: 'sektorlegende', name: 'Legende des Sektors', hint: 'Prestige 3', unlocked: (f) => f.prestige >= 3 },
];

/** One title per season theme, earned by completing that season's album. It stays when the season is over. */
const SEASON_TITLES = ['Brecher von Kessin', 'Erbe des Risses', 'Zeuge von Zenit', 'Glutläufer von Varn'];
export const seasonTitleId = (season: number): string => `season:${season}`;
export const seasonTitleName = (season: number): string => SEASON_TITLES[((season % SEASON_TITLES.length) + SEASON_TITLES.length) % SEASON_TITLES.length]!;

/** Every title that exists for this player: the fixed ones, earned season titles, and the running season's as a goal. */
export function titleList(f: Facts, currentSeason: number): { id: string; name: string; hint: string; unlocked: boolean }[] {
  const out = TITLES.map((t) => ({ id: t.id, name: t.name, hint: t.hint, unlocked: t.unlocked(f) }));
  for (const s of new Set([...f.seasons, currentSeason])) {
    out.push({ id: seasonTitleId(s), name: seasonTitleName(s), hint: 'Saison-Album dieser Saison vervollständigen', unlocked: f.seasons.includes(s) });
  }
  return out;
}

export interface PaintDef { id: string; name: string; tone: string | null; price: number | null; hint: string; unlocked: (f: Facts) => boolean }

/** Ship paints. Looks only: no paint changes a number. */
export const PAINTS: readonly PaintDef[] = [
  { id: 'werk', name: 'Werkslack', tone: null, price: null, hint: 'Von Anfang an', unlocked: () => true },
  { id: 'karmin', name: 'Karminrot', tone: '#ff4d6d', price: CONFIG.prestige.paintPrice, hint: 'Im Profil kaufen', unlocked: () => false },
  { id: 'smaragd', name: 'Smaragd', tone: '#3dffa8', price: CONFIG.prestige.paintPrice, hint: 'Im Profil kaufen', unlocked: () => false },
  { id: 'gold', name: 'Liga-Gold', tone: '#ffc24a', price: null, hint: 'Gold-Liga erreichen', unlocked: (f) => f.bestLeague >= 2 },
  { id: 'leere', name: 'Sternenleere', tone: '#8a7dff', price: null, hint: 'Prestige 1', unlocked: (f) => f.prestige >= 1 },
  { id: 'prisma', name: 'Prisma', tone: 'prisma', price: null, hint: 'Ein Saison-Album vervollständigen', unlocked: (f) => f.seasons.length > 0 },
];
export const PAINT_BY_ID = new Map(PAINTS.map((p) => [p.id, p]));
