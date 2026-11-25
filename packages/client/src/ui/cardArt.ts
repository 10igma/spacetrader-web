/**
 * Illustrated portraits, where they exist. A card without a file here falls
 * back to the procedural hologram avatar, so art can arrive card by card.
 * File name is the card id: src/assets/cards/c21.webp
 */
const files = import.meta.glob<string>('../assets/cards/*.{webp,jpg,png}', { eager: true, query: '?url', import: 'default' });

export const CARD_ART: ReadonlyMap<string, string> = new Map(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace(/\.\w+$/, ''), url]),
);
