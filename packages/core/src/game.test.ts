import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { RARITIES, rarityRank, type Rarity } from './content.ts';
import { applyCommand, createInitialState, toClientView, type GameState, type Pull } from './game.ts';
import { effectiveOdds } from './meta.ts';

const STD = CONFIG.crate.tiers.standard;
import { nextFloat, seedRng } from './rng.ts';

const T0 = 1_800_000_000_000;

function openMany(seed: string, n: number): { state: GameState; crates: Pull[][] } {
  let state = createInitialState(seed, T0);
  state.wallet.credits = n * STD.price;
  const crates: Pull[][] = [];
  for (let i = 0; i < n; i++) {
    state.daily.bought.standard = 0; // these tests are about odds, not about the daily limit
    const res = applyCommand(state, { type: 'BuyCrate', tier: 'standard' }, T0);
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
    const min = rarityRank(STD.floor);
    for (const pulls of crates) {
      expect(pulls).toHaveLength(STD.cards);
      expect(Math.max(...pulls.map((p) => rarityRank(p.rarity)))).toBeGreaterThanOrEqual(min);
    }
  });

  it('pity: never more than the published number of crates without Elite+ or Legend+', () => {
    const { crates } = openMany('pity', 10_000);
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

  it('monte carlo: the published odds are a floor for what players get', () => {
    // Published odds include the upgrade moment. Guarantees and pity can only shift mass upwards.
    const n = 60_000;
    const { crates } = openMany('odds', n);
    const count: Record<Rarity, number> = { standard: 0, rare: 0, elite: 0, legend: 0, singularity: 0 };
    for (const pulls of crates) for (const p of pulls) count[p.rarity]++;
    const total = n * STD.cards;
    const published = effectiveOdds('standard');
    expect(Object.values(published).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(count.standard / total).toBeLessThanOrEqual(published.standard + 0.003);
    for (const r of RARITIES.filter((x) => x !== 'standard')) {
      expect(count[r] / total).toBeGreaterThanOrEqual(published[r] - 0.003);
    }
    expect((count.legend + count.singularity) / total).toBeLessThan(0.03);
  }, 30_000);

  it('upgrade moment: some cards rise one rarity, at the configured rate, never into Singularity', () => {
    const { crates } = openMany('bump', 20_000);
    const pulls = crates.flat();
    const bumped = pulls.filter((p) => p.upgradedFrom);
    for (const p of bumped) {
      expect(rarityRank(p.rarity)).toBe(rarityRank(p.upgradedFrom!) + 1);
      expect(p.rarity).not.toBe('singularity');
    }
    expect(bumped.length / pulls.length).toBeGreaterThan(CONFIG.crate.bumpChance * 0.85);
    expect(bumped.length / pulls.length).toBeLessThan(CONFIG.crate.bumpChance * 1.15);
  }, 30_000);

  it('premium crates hold more cards and always an Elite or better', () => {
    let s = createInitialState('premium', T0);
    s.wallet.quanta = 1e9;
    for (let i = 0; i < 300; i++) {
      s.daily.bought.premium = 0;
      const res = applyCommand(s, { type: 'BuyCrate', tier: 'premium' }, T0);
      s = res.state;
      const ev = res.events[0];
      if (ev?.type !== 'CrateOpened') throw new Error('expected CrateOpened');
      expect(ev.pulls).toHaveLength(CONFIG.crate.tiers.premium.cards);
      expect(Math.max(...ev.pulls.map((p) => rarityRank(p.rarity)))).toBeGreaterThanOrEqual(rarityRank('elite'));
    }
    // Opening crates earns XP, and every level-up pays a few quanta back.
    expect(s.wallet.quanta).toBe(1e9 - 300 * CONFIG.crate.tiers.premium.price + (s.profile.level - 1) * CONFIG.levelUpQuanta);
  });

  it('duplicates turn into shards, new cards do not', () => {
    const { state, crates } = openMany('dupes', 200);
    const shards = crates.flat().reduce((s, p) => s + p.shards, 0);
    expect(state.wallet.shards).toBe(shards);
    for (const p of crates.flat()) expect(p.shards > 0).toBe(!p.isNew);
  });

  it('rejects purchases without credits and leaves state untouched', () => {
    const s = createInitialState('poor', T0);
    s.wallet.credits = STD.price - 1;
    const res = applyCommand(s, { type: 'BuyCrate', tier: 'standard' }, T0);
    expect(res.events).toEqual([{ type: 'CommandRejected', reason: 'not_enough_credits' }]);
    expect(res.state).toBe(s);
  });

  it('free crates: one at the start, then one per interval, piling up only to the limit', () => {
    const { freeIntervalMs: iv, freeMax } = CONFIG.crate;
    let s = createInitialState('free', T0);
    let res = applyCommand(s, { type: 'ClaimFreeCrate' }, T0);
    expect(res.events[0]?.type).toBe('CrateOpened');
    s = res.state;
    expect(applyCommand(s, { type: 'ClaimFreeCrate' }, T0 + iv - 1).events).toEqual([{ type: 'CommandRejected', reason: 'free_crate_not_ready' }]);
    expect(toClientView(s, T0 + iv - 1).crates.free).toMatchObject({ stock: 0, max: freeMax, nextAt: T0 + iv });
    expect(toClientView(s, T0 + iv).crates.free.stock).toBe(1);
    // Away for a week: still only the limit is waiting.
    const later = T0 + 7 * 24 * 3_600_000;
    expect(toClientView(s, later).crates.free).toMatchObject({ stock: freeMax, max: freeMax, nextAt: null });
    res = applyCommand(s, { type: 'ClaimFreeCrate' }, later);
    s = res.state;
    // Taking one starts the timer again from now, not from the past.
    expect(toClientView(s, later).crates.free).toMatchObject({ stock: freeMax - 1, max: freeMax, nextAt: later + iv });
  });
});

describe('fuel and view', () => {
  it('fuel regenerates with supplied time and caps at max', () => {
    const s = createInitialState('fuel', T0);
    s.profile.level = CONFIG.fuel.freeBelowLevel;
    s.fuel.amount = 1;
    const { regenMs, max } = CONFIG.fuel;
    expect(toClientView(s, T0 + regenMs - 1).fuel.amount).toBe(1);
    expect(toClientView(s, T0 + regenMs * 2.5).fuel).toMatchObject({ amount: 3, max, nextAt: T0 + regenMs * 3 });
    expect(toClientView(s, T0 + regenMs * 99).fuel).toMatchObject({ amount: max, max, nextAt: null });
  });

  it('a new captain flies for free until shop, posts and yard are open', () => {
    let s = createInitialState('rookie', T0);
    expect(toClientView(s, T0).fuel).toMatchObject({ amount: CONFIG.fuel.max, nextAt: null, freeUntil: CONFIG.fuel.freeBelowLevel });
    // Far more jumps than a tank holds, and it stays full.
    for (let i = 0; i < CONFIG.fuel.max * 2 && s.profile.level < CONFIG.fuel.freeBelowLevel; i++) {
      s = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).state;
      if (s.pending) s = applyCommand(s, { type: 'Encounter', choice: s.pending.kind === 'pirates' ? 'pay' : 'submit' }, T0).state;
      if (s.profile.level < CONFIG.fuel.freeBelowLevel) expect(s.fuel.amount).toBe(CONFIG.fuel.max);
    }
    expect(s.stats.jumps).toBeGreaterThan(CONFIG.fuel.max);
    // From that level on the tank counts, and whoever starts over after prestige pays from the first jump.
    s.profile.level = CONFIG.fuel.freeBelowLevel;
    expect(toClientView(s, T0).fuel.freeUntil).toBeNull();
    const paid = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).state;
    expect(paid.fuel.amount).toBeLessThan(CONFIG.fuel.max);
    const veteran = createInitialState('veteran', T0);
    veteran.prestige = 1;
    expect(toClientView(veteran, T0).fuel.freeUntil).toBeNull();
  });

  it('client view never contains RNG state', () => {
    const view = toClientView(createInitialState('secret', T0), T0);
    expect(JSON.stringify(view)).not.toContain('rng');
    expect(Object.keys(view)).not.toContain('rng');
  });
});
