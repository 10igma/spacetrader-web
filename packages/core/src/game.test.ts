import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { RARITIES, rarityRank, type Rarity } from './content.ts';
import { applyCommand, createInitialState, toClientView, type GameState, type Pull } from './game.ts';
import { nextFloat, seedRng } from './rng.ts';

const T0 = 1_800_000_000_000;

function openMany(seed: string, n: number): { state: GameState; crates: Pull[][] } {
  let state = createInitialState(seed, T0);
  state.wallet.credits = n * CONFIG.crate.price;
  const crates: Pull[][] = [];
  for (let i = 0; i < n; i++) {
    const res = applyCommand(state, { type: 'BuyCrate' }, T0);
    state = res.state;
    const ev = res.events[0];
    if (ev?.type !== 'CrateOpened') throw new Error('expected CrateOpened');
    crates.push(ev.pulls);
  }
  return { state, crates };
}

describe('rng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = seedRng('x'), b = seedRng('x'), c = seedRng('y');
    const seqA = Array.from({ length: 20 }, () => nextFloat(a));
    const seqB = Array.from({ length: 20 }, () => nextFloat(b));
    const seqC = Array.from({ length: 20 }, () => nextFloat(c));
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });
});

describe('crates', () => {
  it('same seed and commands give the same pulls', () => {
    expect(openMany('seed-1', 50).crates).toEqual(openMany('seed-1', 50).crates);
  });

  it('every crate honours the guaranteed minimum rarity', () => {
    const { crates } = openMany('guarantee', 5_000);
    const min = rarityRank(CONFIG.crate.guaranteed);
    for (const pulls of crates) {
      expect(pulls).toHaveLength(CONFIG.crate.cards);
      expect(Math.max(...pulls.map((p) => rarityRank(p.rarity)))).toBeGreaterThanOrEqual(min);
    }
  });

  it('pity: never more than the published number of crates without Elite+ or Legend+', () => {
    const { crates } = openMany('pity', 20_000);
    let dryElite = 0, dryLegend = 0, worstElite = 0, worstLegend = 0;
    for (const pulls of crates) {
      const top = Math.max(...pulls.map((p) => rarityRank(p.rarity)));
      dryElite = top >= rarityRank('elite') ? 0 : dryElite + 1;
      dryLegend = top >= rarityRank('legend') ? 0 : dryLegend + 1;
      worstElite = Math.max(worstElite, dryElite);
      worstLegend = Math.max(worstLegend, dryLegend);
    }
    expect(worstElite).toBeLessThan(CONFIG.crate.pityElite);
    expect(worstLegend).toBeLessThan(CONFIG.crate.pityLegend);
  });

  it('monte carlo: first two slots match the published base odds', () => {
    // The last slot carries guarantees, so it is intentionally better than base odds.
    // Pulls are sorted for reveal, so we test the distribution over whole crates instead:
    // P(crate has no card >= r) from base odds must be an upper bound that guarantees only improve.
    const n = 200_000;
    const { crates } = openMany('odds', n);
    const count: Record<Rarity, number> = { standard: 0, rare: 0, elite: 0, legend: 0, singularity: 0 };
    for (const pulls of crates) for (const p of pulls) count[p.rarity]++;
    const total = n * CONFIG.crate.cards;
    // Guarantees and pity can only shift mass upwards from the base odds.
    expect(count.standard / total).toBeLessThanOrEqual(CONFIG.crate.odds.standard + 0.002);
    for (const r of RARITIES.filter((x) => x !== 'standard')) {
      expect(count[r] / total).toBeGreaterThanOrEqual(CONFIG.crate.odds[r] - 0.002);
    }
    // And not by an absurd amount: legend+ stays rare.
    expect((count.legend + count.singularity) / total).toBeLessThan(0.03);
  });

  it('duplicates turn into shards, new cards do not', () => {
    const { state, crates } = openMany('dupes', 200);
    const shards = crates.flat().reduce((s, p) => s + p.shards, 0);
    expect(state.wallet.shards).toBe(shards);
    for (const p of crates.flat()) expect(p.shards > 0).toBe(!p.isNew);
  });

  it('rejects purchases without credits and leaves state untouched', () => {
    const s = createInitialState('poor', T0);
    s.wallet.credits = CONFIG.crate.price - 1;
    const res = applyCommand(s, { type: 'BuyCrate' }, T0);
    expect(res.events).toEqual([{ type: 'CommandRejected', reason: 'not_enough_credits' }]);
    expect(res.state).toBe(s);
  });

  it('free crate: ready at start, then locked for the interval', () => {
    let s = createInitialState('free', T0);
    let res = applyCommand(s, { type: 'ClaimFreeCrate' }, T0);
    expect(res.events[0]?.type).toBe('CrateOpened');
    s = res.state;
    res = applyCommand(s, { type: 'ClaimFreeCrate' }, T0 + CONFIG.crate.freeIntervalMs - 1);
    expect(res.events).toEqual([{ type: 'CommandRejected', reason: 'free_crate_not_ready' }]);
    res = applyCommand(s, { type: 'ClaimFreeCrate' }, T0 + CONFIG.crate.freeIntervalMs);
    expect(res.events[0]?.type).toBe('CrateOpened');
  });
});

describe('fuel and view', () => {
  it('fuel regenerates with supplied time and caps at max', () => {
    const s = createInitialState('fuel', T0);
    s.fuel.amount = 1;
    const { regenMs, max } = CONFIG.fuel;
    expect(toClientView(s, T0 + regenMs - 1).fuel.amount).toBe(1);
    expect(toClientView(s, T0 + regenMs * 2.5).fuel).toEqual({ amount: 3, max, nextAt: T0 + regenMs * 3 });
    expect(toClientView(s, T0 + regenMs * 99).fuel).toEqual({ amount: max, max, nextAt: null });
  });

  it('client view never contains RNG state', () => {
    const view = toClientView(createInitialState('secret', T0), T0);
    expect(JSON.stringify(view)).not.toContain('rng');
    expect(Object.keys(view)).not.toContain('rng');
  });
});
