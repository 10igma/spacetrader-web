// Finds offline seeds whose first crate tops out at each rarity (for screenshots).
import { applyCommand, createInitialState, RARITIES, rarityRank } from '../../packages/core/src/index.ts';

const found = new Map<string, string>();
for (let i = 0; found.size < RARITIES.length - 1 && i < 200_000; i++) {
  const seed = `shot${i}`;
  const res = applyCommand(createInitialState(seed, 0), { type: 'ClaimFreeCrate' }, 0);
  const ev = res.events[0];
  if (ev?.type !== 'CrateOpened') continue;
  const top = ev.pulls[ev.pulls.length - 1]!.rarity;
  if (rarityRank(top) >= 1 && !found.has(top)) found.set(top, seed);
}
console.log(Object.fromEntries(found));
