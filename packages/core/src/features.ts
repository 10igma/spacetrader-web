import { CONFIG } from './config.ts';

/** The parts of the game a captain grows into. Station, market and the container bay are there from the start. */
export type Feature = 'deck' | 'daily' | 'posts' | 'shop' | 'orders' | 'yard' | 'season' | 'salvage' | 'auction' | 'league' | 'convoys';

/** Level at which each part opens. The deck is not here: it opens with the first crew, see `unlocksOf`. */
export const FEATURE_LEVEL: Readonly<Record<Exclude<Feature, 'deck'>, number>> = { ...CONFIG.unlock, orders: CONFIG.order.level };

export const FEATURES = ['deck', ...Object.keys(FEATURE_LEVEL)] as readonly Feature[];

/** What opens exactly at this level, in the order of the table. */
export const featuresAt = (level: number): Feature[] =>
  (Object.keys(FEATURE_LEVEL) as Exclude<Feature, 'deck'>[]).filter((f) => FEATURE_LEVEL[f] === level);

/**
 * What a captain has access to. Prestige sets the level back to one but takes nothing away:
 * whoever has been through it once keeps everything open.
 */
export function unlocksOf(level: number, cratesOpened: number, prestige: number): Record<Feature, boolean> {
  const all = prestige > 0;
  const out = { deck: all || cratesOpened > 0 || level >= 2 } as Record<Feature, boolean>;
  for (const f of Object.keys(FEATURE_LEVEL) as Exclude<Feature, 'deck'>[]) out[f] = all || level >= FEATURE_LEVEL[f];
  return out;
}
