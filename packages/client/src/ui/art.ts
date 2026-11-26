import type { CardDef } from '@nova/core';
import { CARD_ART } from './cardArt.ts';

/**
 * Painted and rendered art, where it exists. Everything here is optional: a slot without a
 * file falls back to what the game draws itself, so art can arrive package by package.
 * Files come from tools/art/import.py and are named after what they show.
 */
const files = import.meta.glob<string>(
  '../assets/{ships,crates,goods,modules,currency,stations,emblems,archetypes,encounters,banners}/*.webp',
  { eager: true, query: '?url', import: 'default' },
);

const ART: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([path, url]) => [path.split('/assets/')[1]!.replace(/\.\w+$/, ''), url]),
);

/** The file for a slot, for example art('ships', 'lanze'), or undefined if it has not been made yet. */
export const art = (group: string, name: string): string | undefined => ART.get(`${group}/${name}`);

/**
 * What a card shows: its own portrait if it has one. Standard and rare cards without one share
 * the archetype of their faction and role. Everything else keeps the procedural avatar.
 */
export function cardArt(card: CardDef): string | undefined {
  const own = CARD_ART.get(card.id);
  if (own) return own;
  return card.rarity === 'standard' || card.rarity === 'rare' ? art('archetypes', `${card.faction}-${card.role}`) : undefined;
}
