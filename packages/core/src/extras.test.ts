import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CARD_BY_ID } from './content.ts';
import { applyCommand, createInitialState, parseCommand, toClientView, type Command, type GameEvent, type GameState } from './game.ts';
import { manifestCandidates, postCap, postPerHour } from './meta.ts';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const T0 = Math.floor(1_800_000_000_000 / DAY) * DAY + 11 * HOUR;
const fresh = (seed = 'extras'): GameState => createInitialState(seed, T0);
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (s: GameState, cmd: Command, now = T0) => of(applyCommand(s, cmd, now).events, 'CommandRejected')?.reason;
const rich = (seed?: string): GameState => { const s = fresh(seed); s.wallet.credits = 1e9; s.wallet.quanta = 1e6; return s; };

describe('trading posts', () => {
  it('cost credits, take time to build, then earn per hour up to a storage cap', () => {
    let s = fresh();
    expect(rejected(s, { type: 'BuildPost' })).toBe('not_enough_credits');
    s = rich();
    const next = toClientView(s, T0).posts.next!;
    expect(next).toMatchObject({ level: 1, cost: CONFIG.posts.cost[0], buildMs: CONFIG.posts.buildMs[0] });
    s = applyCommand(s, { type: 'BuildPost' }, T0).state;
    expect(s.wallet.credits).toBe(1e9 - CONFIG.posts.cost[0]!);
    const build = CONFIG.posts.buildMs[0]!;
    // Under construction: nothing accrues, and it cannot be upgraded.
    expect(toClientView(s, T0 + build - 1).posts.list[0]).toMatchObject({ level: 1, stored: 0, readyAt: T0 + build });
    expect(rejected(s, { type: 'BuildPost' }, T0 + build - 1)).toBe('slot_busy');
    expect(rejected(s, { type: 'CollectPosts' }, T0 + build - 1)).toBe('not_claimable');
    // Running: income per hour, then the cap.
    expect(toClientView(s, T0 + build + 2 * HOUR).posts.list[0]).toMatchObject({ stored: 2 * postPerHour(1), readyAt: null });
    const full = toClientView(s, T0 + build + 100 * HOUR).posts.list[0]!;
    expect(full).toMatchObject({ stored: postCap(1), fullAt: null });
    expect(postCap(1)).toBe(postPerHour(1) * CONFIG.posts.storageHours);
    expect(toClientView(s, T0 + build + 100 * HOUR).badges.station).toBe(1);
  });

  it('collecting pays out what is stored and starts the clock again', () => {
    let s = applyCommand(rich(), { type: 'BuildPost' }, T0).state;
    const later = T0 + CONFIG.posts.buildMs[0]! + 3 * HOUR;
    const before = s.wallet.credits;
    const res = applyCommand(s, { type: 'CollectPosts' }, later);
    expect(of(res.events, 'PostsCollected')).toEqual({ type: 'PostsCollected', amount: 3 * postPerHour(1) });
    expect(res.state.wallet.credits).toBe(before + 3 * postPerHour(1));
    s = res.state;
    expect(rejected(s, { type: 'CollectPosts' }, later)).toBe('not_claimable');
    expect(toClientView(s, later + HOUR).posts.stored).toBe(postPerHour(1));
  });

  it('upgrades keep what is stored, pause production while building, and can be rushed with quanta', () => {
    let s = applyCommand(rich(), { type: 'BuildPost' }, T0).state;
    const t1 = T0 + CONFIG.posts.buildMs[0]! + 2 * HOUR;
    s = applyCommand(s, { type: 'BuildPost' }, t1).state;
    expect(s.posts.meridian).toMatchObject({ level: 2 });
    const view = toClientView(s, t1 + 10 * 60_000).posts.list[0]!;
    expect(view.stored).toBe(2 * postPerHour(1));
    expect(view.speedUpCost).toBeGreaterThan(0);
    const quanta = s.wallet.quanta;
    const rushed = applyCommand(s, { type: 'SpeedUpPost', stationId: 'meridian' }, t1 + 10 * 60_000);
    expect(rushed.state.wallet.quanta).toBe(quanta - view.speedUpCost);
    expect(toClientView(rushed.state, t1 + 10 * 60_000 + HOUR).posts.list[0]!.stored).toBe(2 * postPerHour(1) + postPerHour(2));
    expect(rejected(rushed.state, { type: 'SpeedUpPost', stationId: 'meridian' }, t1 + HOUR)).toBe('slot_not_ready');
    expect(rejected(s, { type: 'SpeedUpPost', stationId: 'kessin' }, t1)).toBe('slot_not_ready');
  });

  it('stops at the top level', () => {
    let s = rich();
    let now = T0;
    for (let i = 0; i < CONFIG.posts.maxLevel; i++) {
      s = applyCommand(s, { type: 'BuildPost' }, now).state;
      now += CONFIG.posts.buildMs[i]! + 1;
    }
    expect(toClientView(s, now).posts.next).toBeNull();
    expect(rejected(s, { type: 'BuildPost' }, now)).toBe('max_level');
  });
});

describe('wheel', () => {
  it('one spin per day, with prizes drawn at the published weights', () => {
    const counts = CONFIG.wheel.map(() => 0);
    const n = 6_000;
    for (let i = 0; i < n; i++) {
      const s = fresh(`wheel-${i}`);
      const res = applyCommand(s, { type: 'SpinWheel' }, T0);
      const ev = of(res.events, 'WheelSpun')!;
      counts[ev.index]!++;
      expect(of(res.events, 'RewardGranted')!.reward).toEqual(ev.reward);
      if (i === 0) {
        expect(rejected(res.state, { type: 'SpinWheel' })).toBe('not_claimable');
        expect(rejected(res.state, { type: 'SpinWheel' }, T0 + DAY)).toBeUndefined();
      }
    }
    const total = CONFIG.wheel.reduce((a, s) => a + s.weight, 0);
    expect(total).toBe(100);
    CONFIG.wheel.forEach((seg, i) => expect(Math.abs(counts[i]! / n - seg.weight / total)).toBeLessThan(0.02));
  });

  it('the view shows exactly the prizes a spin can pay at your level', () => {
    const s = fresh();
    s.profile.level = 7;
    const view = toClientView(s, T0).daily.wheel;
    expect(view.available).toBe(true);
    expect(view.segments[0]!.reward).toEqual({ credits: 400 * 7 });
    expect(view.segments.map((x) => x.weight)).toEqual(CONFIG.wheel.map((x) => x.weight));
  });
});

describe('daily shop', () => {
  it('offers five things per day, one marked down, each buyable once', () => {
    let s = rich('shop');
    const offers = toClientView(s, T0).daily.offers;
    expect(offers).toHaveLength(5);
    expect(offers.filter((o) => o.listPrice !== undefined)).toHaveLength(1);
    const deal = offers.find((o) => o.listPrice !== undefined)!;
    expect(deal.price).toBeLessThan(deal.listPrice!);
    expect(offers.filter((o) => o.kind === 'card').every((o) => CARD_BY_ID.has(o.cardId!))).toBe(true);

    const i = offers.findIndex((o) => o.kind === 'card');
    const res = applyCommand(s, { type: 'BuyOffer', index: i }, T0);
    expect(res.state.collection[offers[i]!.cardId!]).toBe(1);
    expect(res.state.wallet.credits).toBe(1e9 - offers[i]!.price);
    s = res.state;
    expect(rejected(s, { type: 'BuyOffer', index: i })).toBe('not_claimable');
    expect(rejected(s, { type: 'BuyOffer', index: 9 })).toBe('not_claimable');

    const q = offers.findIndex((o) => o.kind === 'quanta');
    expect(applyCommand(s, { type: 'BuyOffer', index: q }, T0).state.wallet.quanta).toBe(s.wallet.quanta + CONFIG.shop.quanta.amount);
    // Tomorrow there are new offers.
    expect(toClientView(s, T0 + DAY).daily.offers.every((o) => !o.bought)).toBe(true);
  });

  it('cannot be bought without the credits', () => {
    const s = fresh();
    s.wallet.credits = 0;
    expect(rejected(s, { type: 'BuyOffer', index: 0 })).toBe('not_enough_credits');
  });
});

describe('manifests', () => {
  it('only spare copies count, cheapest first, and the last copy is never taken', () => {
    const s = fresh();
    s.collection = { c01: 3, c11: 2, c20: 1, c17: 2 };
    expect(manifestCandidates({ need: 4, reward: {}, done: false }, s.collection)).toEqual(['c01', 'c01', 'c11', 'c17']);
    expect(manifestCandidates({ need: 1, minRarity: 'elite', reward: {}, done: false }, s.collection)).toEqual(['c17']);
    expect(manifestCandidates({ need: 1, faction: 'asche', reward: {}, done: false }, s.collection)).toEqual([]);
  });

  it('handing in pays the reward once and consumes the copies', () => {
    let s = fresh();
    s.collection = { c01: 3, c11: 2, c17: 2 };
    s.daily.manifests = [
      { need: 3, reward: { shards: 80 }, done: false },
      { need: 2, minRarity: 'legend', reward: { quanta: 99 }, done: false },
    ];
    expect(toClientView(s, T0).daily.manifests.map((m) => m.have)).toEqual([4, 0]);
    expect(rejected(s, { type: 'SubmitManifest', index: 1 })).toBe('not_claimable');
    const res = applyCommand(s, { type: 'SubmitManifest', index: 0 }, T0);
    expect(of(res.events, 'ManifestDone')!.cardIds).toEqual(['c01', 'c01', 'c11']);
    expect(res.state.collection).toEqual({ c01: 1, c11: 1, c17: 2 });
    expect(res.state.wallet.shards).toBe(s.wallet.shards + 80);
    s = res.state;
    expect(rejected(s, { type: 'SubmitManifest', index: 0 })).toBe('not_claimable');
  });
});

describe('salvage', () => {
  it('appears at some docks and pays out at the published weights', () => {
    const n = 4_000;
    const counts: Record<string, number> = {};
    let paid = 0, back = 0;
    for (let i = 0; i < n; i++) {
      const s = rich(`salv-${i}`);
      s.salvage = { price: 1_000, weight: 0, origin: 'asche' };
      const view = toClientView(s, T0).salvage!;
      expect(view.outcomes.map((o) => o.weight)).toEqual(CONFIG.salvage.outcomes.map((o) => o.weight));
      const res = applyCommand(s, { type: 'BuySalvage' }, T0);
      const ev = of(res.events, 'SalvageOpened')!;
      counts[ev.kind] = (counts[ev.kind] ?? 0) + 1;
      paid += 1_000;
      back += ev.credits;
      // The result matches what the odds sheet promised for that outcome.
      const promised = view.outcomes.find((o) => o.kind === ev.kind)!;
      expect({ credits: ev.credits, shards: ev.shards }).toEqual({ credits: promised.credits, shards: promised.shards });
      expect(res.state.salvage).toBeNull();
      if (i === 0) expect(rejected(res.state, { type: 'BuySalvage' })).toBe('not_claimable');
    }
    for (const o of CONFIG.salvage.outcomes) expect(Math.abs((counts[o.kind] ?? 0) / n - o.weight / 100)).toBeLessThan(0.025);
    // In credits alone it loses money on average: the crates and shards are the lure, and the sheet says so.
    expect(back / paid).toBeGreaterThan(0.6);
    expect(back / paid).toBeLessThan(0.95);
  });
});

describe('wire format', () => {
  it('parses the new commands', () => {
    expect(parseCommand({ type: 'BuildPost', level: 5 })).toEqual({ type: 'BuildPost' });
    expect(parseCommand({ type: 'SpeedUpPost', stationId: 'kessin' })).toEqual({ type: 'SpeedUpPost', stationId: 'kessin' });
    expect(parseCommand({ type: 'SpeedUpPost', stationId: 'moon' })).toBeNull();
    expect(parseCommand({ type: 'BuyOffer', index: 2 })).toEqual({ type: 'BuyOffer', index: 2 });
    expect(parseCommand({ type: 'BuyOffer', index: -1 })).toBeNull();
    expect(parseCommand({ type: 'SubmitManifest', index: 0, cardIds: ['c24'] })).toEqual({ type: 'SubmitManifest', index: 0 });
    expect(parseCommand({ type: 'SpinWheel', index: 7 })).toEqual({ type: 'SpinWheel' });
  });
});
