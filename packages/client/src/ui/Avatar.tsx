import type { CardDef } from '@nova/core';
import { useId } from 'react';
import { FACTION_COLOR, hashString } from './format.ts';

/**
 * Procedural hologram portrait. Helmets instead of faces: consistent with the
 * art direction, cheap, and every card gets a distinct silhouette from its id.
 */
export function Avatar({ card }: { card: CardDef }) {
  const uid = useId().replace(/:/g, '');
  const h = hashString(card.id);
  const color = FACTION_COLOR[card.faction];
  const synthetic = card.rarity === 'singularity';
  const helmet = synthetic ? 3 : h % 3;
  const visor = synthetic ? 3 : (h >>> 3) % 3;
  const crest = (h >>> 6) % 3;

  return (
    <svg className="avatar" viewBox="-26 -14 200 230" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2740" /><stop offset="1" stopColor="#070b16" />
        </linearGradient>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4b6b" /><stop offset=".5" stopColor="#141c30" /><stop offset="1" stopColor="#0a0f1c" />
        </linearGradient>
        <linearGradient id={`${uid}v`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={color} stopOpacity=".55" /><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor={color} stopOpacity=".55" />
        </linearGradient>
        <radialGradient id={`${uid}g`} cx=".5" cy=".38" r=".6">
          <stop offset="0" stopColor={color} stopOpacity=".5" /><stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}f`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
        <filter id={`${uid}f2`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2" /></filter>
        <pattern id={`${uid}p`} width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".16" /></pattern>
      </defs>

      <rect x="-26" y="-14" width="200" height="230" fill={`url(#${uid}g)`} />
      {/* faction sigil */}
      <g stroke={color} strokeWidth="1" fill="none" opacity=".35">
        <circle cx="100" cy="92" r="78" strokeDasharray="2 6" />
        <circle cx="100" cy="92" r="64" />
        {crest === 0 && <path d="M100 20v144M28 92h144" />}
        {crest === 1 && <path d="M100 28l55 96H45z" />}
        {crest === 2 && <path d="M46 46l108 92M154 46L46 138" />}
      </g>

      {/* shoulders */}
      <path d="M8 230c4-44 34-66 92-66s88 22 92 66z" fill={`url(#${uid}b)`} stroke="#4a5d82" strokeWidth="1.2" />
      <path d="M40 230c6-28 22-44 60-44s54 16 60 44" fill="none" stroke={color} strokeWidth="1.4" opacity=".7" />
      <path d="M62 176l14 22M138 176l-14 22" stroke="#5d7198" strokeWidth="1.2" />
      <rect x="84" y="138" width="32" height="34" rx="6" fill="#0c1220" stroke="#3b4c6e" />

      {/* helmet */}
      {helmet === 0 && <path d="M54 92c0-34 20-58 46-58s46 24 46 58c0 30-18 58-46 58s-46-28-46-58z" fill={`url(#${uid}s)`} stroke="#6f86b3" strokeWidth="1.4" />}
      {helmet === 1 && <path d="M56 60l22-26h44l22 26 4 52-22 36H74l-22-36z" fill={`url(#${uid}s)`} stroke="#6f86b3" strokeWidth="1.4" />}
      {helmet === 2 && <path d="M100 30c34 0 52 26 50 64-1 22-6 40-18 54H68c-12-14-17-32-18-54-2-38 16-64 50-64z" fill={`url(#${uid}s)`} stroke="#6f86b3" strokeWidth="1.4" />}
      {helmet === 3 && <g><circle cx="100" cy="90" r="54" fill={`url(#${uid}s)`} stroke="#9fb5e6" strokeWidth="1.4" /><circle cx="100" cy="90" r="44" fill="none" stroke={color} strokeWidth=".8" strokeDasharray="1 5" /></g>}
      <path d="M100 34v20M72 44l6 12M128 44l-6 12" stroke="#7d93bf" strokeWidth="1" opacity=".6" />

      {/* visor: blurred glow below, sharp shape on top */}
      {[true, false].map((glow) => (
        <g key={String(glow)} filter={glow ? `url(#${uid}f)` : undefined} opacity={glow ? 0.9 : 1}>
          {visor === 0 && <path d="M62 84c12-8 64-8 76 0l-4 20c-16 8-52 8-68 0z" fill={glow ? color : `url(#${uid}v)`} />}
          {visor === 1 && <path d="M64 80h72v12h-28v36H92V92H64z" fill={glow ? color : `url(#${uid}v)`} />}
          {visor === 2 && <g fill={glow ? color : `url(#${uid}v)`}><path d="M62 82l32 6v12l-30-4z" /><path d="M138 82l-32 6v12l30-4z" /></g>}
          {visor === 3 && <g fill="none" stroke={glow ? color : '#fff'} strokeWidth={glow ? 8 : 3}><circle cx="100" cy="90" r="20" /><circle cx="100" cy="90" r="5" fill={glow ? color : '#fff'} /></g>}
        </g>
      ))}
      <path d="M70 124h20M110 124h20M82 134h36" stroke="#55698f" strokeWidth="1.2" />
      <circle cx="146" cy="108" r="2.5" fill={color} />

      {/* rim light from the faction colour, top left */}
      <path d="M58 98c-4-32 12-58 38-63" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity=".85" filter={`url(#${uid}f2)`} />
      <path d="M14 222c6-34 26-50 56-55" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
      <rect x="-26" y="-14" width="200" height="230" fill={`url(#${uid}p)`} />
    </svg>
  );
}
