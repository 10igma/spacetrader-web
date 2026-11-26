import type { FactionId } from '@nova/core';
import { art } from './art.ts';
import { FACTION_COLOR } from './format.ts';

/** A faction's mark, drawn in the faction's colour. Nothing is shown until the art exists. */
export function Emblem({ faction, className = '' }: { faction: FactionId; className?: string }) {
  const src = art('emblems', faction);
  if (!src) return null;
  return <i className={`emblem ${className}`} style={{ ['--img' as string]: `url("${src}")`, ['--tone' as string]: FACTION_COLOR[faction] }} aria-hidden="true" />;
}

const LEAGUE_ART = ['bronze', 'silber', 'gold', 'platin', 'diamant'];
/** The badge of a league tier, or undefined until the art exists. */
export const leagueBadge = (tier: number): string | undefined => art('emblems', LEAGUE_ART[tier] ?? 'bronze');
