import { FEATURES, type Feature } from '@nova/core';
import { useEffect } from 'react';
import { create } from 'zustand';
import { useApp } from '../store.ts';

/**
 * Which parts of the game are shown. The rules decide that by level (features.ts in the core).
 * Here is only what belongs to the device: which of the open parts the player has looked at,
 * so a new one can carry a mark until it has been visited once.
 */
const KEY = 'nova.seen';
/** Walkthrough scripts that are about something else can open everything at once. */
const OPEN = typeof location !== 'undefined' && new URLSearchParams(location.search).has('open');
const ALL = Object.fromEntries(FEATURES.map((f) => [f, true])) as Record<Feature, boolean>;

function load(): Feature[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Feature[]) : null;
  } catch {
    return null;
  }
}
function save(seen: Feature[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch { /* private mode: marks last for the session */ }
}

const useSeen = create<{ seen: Feature[] | null; adopt(unlocks: Record<Feature, boolean>): void; mark(feature: Feature): void }>((set, get) => ({
  seen: load(),
  // First start on this device: whatever is already open is nothing new to this player.
  adopt(unlocks) {
    if (get().seen !== null) return;
    const seen = FEATURES.filter((f) => unlocks[f]);
    save(seen);
    set({ seen });
  },
  mark(feature) {
    const seen = get().seen ?? [];
    if (seen.includes(feature)) return;
    save([...seen, feature]);
    set({ seen: [...seen, feature] });
  },
}));

export function useUnlocks(): Record<Feature, boolean> {
  const unlocks = useApp((s) => s.view!.unlocks);
  const adopt = useSeen((s) => s.adopt);
  useEffect(() => { adopt(unlocks); }, [adopt, unlocks]);
  return OPEN ? ALL : unlocks;
}

/** True for a part that has opened and has not been looked at yet. */
export function useFresh(): (...features: Feature[]) => boolean {
  const unlocks = useApp((s) => s.view!.unlocks);
  const seen = useSeen((s) => s.seen);
  return (...features) => !OPEN && seen !== null && features.some((f) => unlocks[f] && !seen.includes(f));
}

/** Call where a part is on screen: it stops being new. */
export function useSeenNow(feature: Feature | null): void {
  const mark = useSeen((s) => s.mark);
  const open = useApp((s) => (feature ? s.view!.unlocks[feature] : false));
  useEffect(() => { if (feature && open) mark(feature); }, [feature, open, mark]);
}

/** What a part is called and where to find it, for the level-up moment. */
export const FEATURE_TEXT: Record<Feature, { name: string; where: string }> = {
  deck: { name: 'Deck', where: 'deine Crew an Bord' },
  daily: { name: 'Aufträge', where: 'neuer Tab: Tagesaufträge, Kalender, Glücksrad' },
  posts: { name: 'Handelsposten', where: 'auf der Station' },
  shop: { name: 'Shop', where: 'im Hangar' },
  orders: { name: 'Frachtbörse', where: 'auf der Station: Lieferaufträge mit Frist' },
  yard: { name: 'Werft', where: 'im Hangar: Schiffe und Module' },
  season: { name: 'Saison-Charter', where: 'unter Aufträge' },
  salvage: { name: 'Bergungs-Auktion', where: 'ab und zu am Dock' },
  auction: { name: 'Auktionshaus', where: 'im Markt' },
  league: { name: 'Wochenliga', where: 'unter Aufträge' },
  convoys: { name: 'Konvois', where: 'im Deck: die Reserve fliegt Aufträge' },
};
