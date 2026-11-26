import { CARD_BY_ID, CONFIG, seatStat, SEATS, type ClientView, type RoleId } from '@nova/core';

/** What a card is worth in a seat, before chemistry: its stat, less if it is not its role. */
const worth = (cardId: string, seat: RoleId, level: number): number => {
  const card = CARD_BY_ID.get(cardId);
  return card ? Math.round(seatStat(card, seat, level) * (card.role === seat ? 1 : CONFIG.deck.offRole)) : 0;
};

/**
 * Seats where a card from the reserve would do better than who sits there now, and by how much.
 * Only free cards count: not the ones in other seats, not the ones away on a convoy.
 */
export function seatUpgrades(view: Pick<ClientView, 'deck' | 'collection' | 'cardLevels' | 'convoys'>): Partial<Record<RoleId, number>> {
  const seated = new Set(SEATS.map((s) => view.deck.seats[s]?.cardId).filter((id): id is string => !!id));
  const free = Object.keys(view.collection).filter((id) => view.collection[id] && !seated.has(id) && !view.convoys.busy.includes(id));
  const out: Partial<Record<RoleId, number>> = {};
  for (const seat of SEATS) {
    const current = view.deck.seats[seat]?.cardId;
    const now = current ? worth(current, seat, view.cardLevels[current] ?? 1) : 0;
    const best = Math.max(0, ...free.map((id) => worth(id, seat, view.cardLevels[id] ?? 1)));
    if (best > now) out[seat] = best - now;
  }
  return out;
}
