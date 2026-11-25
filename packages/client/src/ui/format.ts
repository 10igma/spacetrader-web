import type { FactionId, Mission, Rarity, Reward } from '@nova/core';

const nf = new Intl.NumberFormat('de-CH');
export const num = (n: number): string => nf.format(n);

export function countdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (x: number): string => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export const RARITY_LABEL: Record<Rarity, string> = {
  standard: 'Standard',
  rare: 'Selten',
  elite: 'Elite',
  legend: 'Legende',
  singularity: 'Singularität',
};

/** Linear RGB-ish colours for the stage rift, matching the CSS rarity tokens. */
export const RARITY_RGB: Record<Rarity, [number, number, number]> = {
  standard: [0.55, 0.65, 0.78],
  rare: [0.15, 0.5, 1.0],
  elite: [0.62, 0.3, 1.0],
  legend: [1.0, 0.66, 0.16],
  singularity: [1.0, 0.25, 0.75],
};

export const FACTION_COLOR: Record<FactionId, string> = {
  helix: '#ff4fa3',
  tessera: '#3be3ff',
  asche: '#ff8a3c',
  zenit: '#a9bfff',
};

export function rewardText(r: Reward): string {
  const parts: string[] = [];
  if (r.credits) parts.push(`${num(r.credits)} Credits`);
  if (r.shards) parts.push(`${num(r.shards)} Splitter`);
  if (r.quanta) parts.push(`${num(r.quanta)} Quanten`);
  if (r.freeze) parts.push(r.freeze === 1 ? 'Urlaubsschein' : `${r.freeze} Urlaubsscheine`);
  if (r.crate) parts.push(r.crate === 'premium' ? 'Premium-Container' : 'Container');
  return parts.join(' + ');
}

export function missionText(m: Mission): string {
  switch (m.kind) {
    case 'jumps': return `Mache ${m.target} Sprünge`;
    case 'profit': return `Erziele ${num(m.target)} Credits Gewinn`;
    case 'sellUnits': return `Verkaufe ${m.target} Einheiten`;
    case 'buyUnits': return `Kaufe ${m.target} Einheiten`;
    case 'hotUnits': return `Verkaufe ${m.target} Einheiten heikle Ware`;
    case 'fightWin': return 'Gewinne einen Kampf gegen Piraten';
    case 'openCrate': return `Öffne ${m.target} Container`;
    case 'customsPass': return 'Komm durch eine Zollkontrolle';
  }
}

export function duration(ms: number): string {
  const min = Math.round(ms / 60_000);
  return min >= 60 ? `${Math.round(min / 60)} Std.` : `${min} Min.`;
}

export const BONUS_LABEL = { nav: 'NAV', hdl: 'HDL', tec: 'TEC', kmp: 'KMP', smg: 'TARN' } as const;

export const pct = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))} %`;

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
