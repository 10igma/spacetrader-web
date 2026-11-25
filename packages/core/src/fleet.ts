import { CARD_BY_ID, type FactionId, type RoleId } from './content.ts';
import { CONFIG } from './config.ts';
import type { Reward } from './meta.ts';
import { nextFloat, type RngState } from './rng.ts';

// ---------------------------------------------------------------------------
// Ships
// ---------------------------------------------------------------------------

export type ShipId = 'sperling' | 'kormoran' | 'lanze' | 'nachtfalter' | 'basilisk' | 'leviathan';

export interface ShipDef {
  id: ShipId;
  name: string;
  cls: string;
  tagline: string;
  price: number;
  /** Captain level needed to buy it. */
  level: number;
  /** Cargo units on top of the base hold. */
  hold: number;
  /** Fuel cells on top of the base tank. */
  fuel: number;
  /** Module slots. */
  slots: number;
  /** Added to the chance of winning a fight, of fleeing or breaking through, and taken off the scan chance. */
  fight: number;
  flee: number;
  stealth: number;
}

export const SHIPS: readonly ShipDef[] = [
  { id: 'sperling', name: 'Sperling', cls: 'Kurier', tagline: 'Klein, ehrlich, abbezahlt', price: 0, level: 1, hold: 0, fuel: 0, slots: 1, fight: 0, flee: 0, stealth: 0 },
  { id: 'kormoran', name: 'Kormoran', cls: 'Frachter', tagline: 'Mehr Bauch als Stolz', price: 45_000, level: 6, hold: 10, fuel: 0, slots: 2, fight: 0, flee: 0, stealth: 0 },
  { id: 'lanze', name: 'Lanze', cls: 'Abfangjäger', tagline: 'Schiesst zuerst, fragt nie', price: 140_000, level: 9, hold: 5, fuel: 1, slots: 3, fight: 0.08, flee: 0.05, stealth: 0 },
  { id: 'nachtfalter', name: 'Nachtfalter', cls: 'Schmugglerjacht', tagline: 'Auf keinem Radar zu Hause', price: 320_000, level: 12, hold: 10, fuel: 1, slots: 3, fight: 0, flee: 0.04, stealth: 0.10 },
  { id: 'basilisk', name: 'Basilisk', cls: 'Blockadebrecher', tagline: 'Gepanzert bis an die Zähne', price: 900_000, level: 15, hold: 20, fuel: 1, slots: 4, fight: 0.06, flee: 0.08, stealth: 0.03 },
  { id: 'leviathan', name: 'Leviathan', cls: 'Schwerfrachter', tagline: 'Ein Hafen, der fliegt', price: 2_800_000, level: 20, hold: 35, fuel: 2, slots: 5, fight: 0.03, flee: 0, stealth: 0 },
];
export const SHIP_BY_ID = new Map(SHIPS.map((s) => [s.id, s]));

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

export type ModuleId = 'shield' | 'drive' | 'jammer' | 'pods' | 'charger' | 'stash';

export interface ModuleDef {
  id: ModuleId;
  name: string;
  /** What one level does, for the shop. `{n}` is the value at that level. */
  effect: string;
  /** Value per level (1 to 3). */
  values: readonly [number, number, number];
  /** Price of level 1, 2 and 3. */
  prices: readonly [number, number, number];
  /** How the value is written: share as percent, or plain units. */
  unit: 'percent' | 'units';
}

export const MODULES: readonly ModuleDef[] = [
  { id: 'shield', name: 'Schildgitter', effect: 'Kampf gegen Piraten +{n}', values: [0.04, 0.07, 0.10], prices: [10_000, 40_000, 200_000], unit: 'percent' },
  { id: 'drive', name: 'Nachbrenner', effect: 'Flucht und Durchbruch +{n}', values: [0.04, 0.07, 0.10], prices: [10_000, 40_000, 200_000], unit: 'percent' },
  { id: 'jammer', name: 'Signalstörer', effect: 'Scan findet Schmuggelware {n} seltener', values: [0.04, 0.07, 0.10], prices: [14_000, 55_000, 260_000], unit: 'percent' },
  { id: 'pods', name: 'Frachtgondeln', effect: 'Laderaum +{n}', values: [4, 8, 12], prices: [12_000, 48_000, 240_000], unit: 'units' },
  { id: 'charger', name: 'Fusionslader', effect: 'Treibstoff lädt {n} schneller', values: [0.10, 0.18, 0.25], prices: [18_000, 70_000, 320_000], unit: 'percent' },
  { id: 'stash', name: 'Schmuggelfach', effect: '{n} Einheiten bleiben beim Zoll unentdeckt', values: [3, 6, 10], prices: [15_000, 60_000, 280_000], unit: 'units' },
];
export const MODULE_BY_ID = new Map(MODULES.map((m) => [m.id, m]));
export const MODULE_MAX = 3;

export interface FleetState {
  owned: ShipId[];
  active: ShipId;
  /** Level per module you own. */
  modules: Partial<Record<ModuleId, number>>;
  /** Modules built into the active ship. Never more than it has slots. */
  fitted: ModuleId[];
}

export const newFleet = (): FleetState => ({ owned: ['sperling'], active: 'sperling', modules: {}, fitted: [] });

/** What the active ship and its fitted modules add up to. */
export interface Rig { hold: number; fuel: number; slots: number; fight: number; flee: number; stealth: number; charge: number; stash: number }

export function rigOf(fleet: FleetState): Rig {
  const ship = SHIP_BY_ID.get(fleet.active)!;
  const value = (id: ModuleId): number => {
    const level = fleet.fitted.includes(id) ? fleet.modules[id] ?? 0 : 0;
    return level > 0 ? MODULE_BY_ID.get(id)!.values[level - 1]! : 0;
  };
  return {
    hold: ship.hold + value('pods'),
    fuel: ship.fuel,
    slots: ship.slots,
    fight: ship.fight + value('shield'),
    flee: ship.flee + value('drive'),
    stealth: ship.stealth + value('jammer'),
    charge: value('charger'),
    stash: value('stash'),
  };
}

// ---------------------------------------------------------------------------
// Convoys: send the crew that is not on the bridge on timed contracts
// ---------------------------------------------------------------------------

export interface ConvoyOffer {
  id: number;
  hours: number;
  /** Crew of this faction and role count for more. */
  faction: FactionId;
  role: RoleId;
  /** Team strength at which success is certain. */
  need: number;
  reward: Reward;
  xp: number;
  taken: boolean;
}

export interface Convoy { offer: ConvoyOffer; cards: string[]; endsAt: number; chance: number }

const FACTION_LIST: readonly FactionId[] = ['helix', 'tessera', 'asche', 'zenit'];
const ROLE_LIST: readonly RoleId[] = ['pilot', 'trader', 'tech', 'gunner', 'smuggler'];

export function rollConvoys(rng: RngState, level: number): ConvoyOffer[] {
  const c = CONFIG.convoy;
  return c.daily.map((kind, id) => {
    const t = c.kinds[kind]!;
    const reward: Reward = { credits: Math.round((t.credits + t.creditsPerLevel * level) / 50) * 50 };
    if (t.shards) reward.shards = t.shards;
    if (t.quanta) reward.quanta = t.quanta;
    return {
      id,
      hours: t.hours,
      faction: FACTION_LIST[Math.floor(nextFloat(rng) * FACTION_LIST.length)]!,
      role: ROLE_LIST[Math.floor(nextFloat(rng) * ROLE_LIST.length)]!,
      // Contracts grow with the captain: better pay, tougher job.
      need: Math.round(t.need * (1 + c.needPerLevel * (level - 1)) * (0.9 + nextFloat(rng) * 0.25)),
      reward,
      xp: t.xp,
      taken: false,
    };
  });
}

/** What one card adds to a convoy. */
export function convoyStrength(offer: Pick<ConvoyOffer, 'faction' | 'role'>, cardId: string, level = 1): number {
  const card = CARD_BY_ID.get(cardId);
  if (!card) return 0;
  const c = CONFIG.convoy;
  const base = card.rating + (level - 1) * CONFIG.cards.statPerLevel;
  return Math.round(base * (card.faction === offer.faction ? c.factionBonus : 1) * (card.role === offer.role ? c.roleBonus : 1));
}

/** The chance shown before sending is the chance that is rolled on return. */
export function convoyChance(offer: Pick<ConvoyOffer, 'faction' | 'role' | 'need'>, cards: readonly string[], levels: Record<string, number> = {}): number {
  const strength = cards.reduce((sum, id) => sum + convoyStrength(offer, id, levels[id] ?? 1), 0);
  return Math.round(Math.min(1, Math.max(CONFIG.convoy.minChance, strength / offer.need)) * 100) / 100;
}

/** A convoy that falls short still brings something home. Cards are never lost. */
export function convoyPayout(offer: ConvoyOffer, success: boolean): { reward: Reward; xp: number } {
  if (success) return { reward: offer.reward, xp: offer.xp };
  const share = CONFIG.convoy.failShare;
  return { reward: { credits: Math.round(((offer.reward.credits ?? 0) * share) / 50) * 50 }, xp: Math.round(offer.xp * share) };
}
