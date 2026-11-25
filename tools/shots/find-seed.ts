// Finds offline seeds for screenshots: first crate topping out at each rarity, and one with an upgrade moment.
import { applyCommand, createInitialState, RARITIES, rarityRank } from '../../packages/core/src/index.ts';

const found = new Map<string, string>();
for (let i = 0; found.size < RARITIES.length && i < 400_000; i++) {
  const seed = `shot${i}`;
  const res = applyCommand(createInitialState(seed, 0), { type: 'ClaimFreeCrate' }, 0);
  const ev = res.events.find((e) => e.type === 'CrateOpened');
  if (ev?.type !== 'CrateOpened') continue;
  const last = ev.pulls[ev.pulls.length - 1]!;
  if (rarityRank(last.rarity) >= 1 && !found.has(last.rarity)) found.set(last.rarity, seed);
  if (last.upgradedFrom && rarityRank(last.rarity) >= 2 && !found.has('bump')) found.set('bump', seed);
}
console.log(Object.fromEntries(found));
