import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CARD_BY_ID, CARDS, CARDS_BY_FACTION } from './content.ts';
import { applyCommand, createInitialState, deckInfo, parseCommand, toClientView, type Command, type GameEvent, type GameState } from './game.ts';
import { dayEndsAt, dayIndex, upgradeCost } from './meta.ts';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** Noon on some day, so tests have room on both sides of midnight. */
const T0 = Math.floor(1_800_000_000_000 / DAY) * DAY + 11 * HOUR;
const fresh = (seed = 'meta'): GameState => createInitialState(seed, T0);
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (s: GameState, cmd: Command, now = T0) => of(applyCommand(s, cmd, now).events, 'CommandRejected')?.reason;

/** One jump, resolving any encounter the cheap way. */
function jump(s: GameState, now: number): GameState {
  s = JSON.parse(JSON.stringify(s)) as GameState;
  s.fuel.amount = CONFIG.fuel.max;
  s.fuel.updatedAt = now;
  let st = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, now).state;
  if (st.pending) st = applyCommand(st, { type: 'Encounter', choice: st.pending.kind === 'pirates' ? 'pay' : 'submit' }, now).state;
  return st;
}

describe('card set', () => {
  it('has 130 unique cards, evenly spread over factions and roles', () => {
    expect(CARDS).toHaveLength(130);
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(130);
    expect(new Set(CARDS.map((c) => c.name)).size).toBe(130);
    for (const f of ['helix', 'tessera', 'asche', 'zenit'] as const) {
      for (const r of ['pilot', 'trader', 'tech', 'gunner', 'smuggler'] as const) {
        const cards = CARDS_BY_FACTION[f].filter((c) => c.role === r);
        expect(cards.filter((c) => c.rarity === 'standard')).toHaveLength(3);
        expect(cards.filter((c) => c.rarity === 'rare')).toHaveLength(2);
        expect(cards.filter((c) => c.rarity === 'elite')).toHaveLength(1);
      }
    }
    for (const c of CARDS) for (const v of Object.values(c.stats)) { expect(v).toBeGreaterThanOrEqual(30); expect(v).toBeLessThanOrEqual(99); }
  });
});

describe('card levels', () => {
  it('upgrading costs shards, raises seat values and stops at the cap', () => {
    let s = fresh();
    s.collection = { c20: 1 };
    s.deck.pilot = 'c20';
    const card = CARD_BY_ID.get('c20')!;
    expect(rejected(s, { type: 'UpgradeCard', cardId: 'c20' })).toBe('not_enough_shards');
    expect(rejected(s, { type: 'UpgradeCard', cardId: 'c21' })).toBe('card_not_owned');
    s.wallet.shards = 100_000;
    const before = deckInfo(s.deck, s.cardLevels).seats.pilot!.value;
    let spent = 0;
    for (let level = 1; level < CONFIG.cards.maxLevel; level++) {
      spent += upgradeCost(card, level)!;
      s = applyCommand(s, { type: 'UpgradeCard', cardId: 'c20' }, T0).state;
    }
    expect(s.cardLevels.c20).toBe(CONFIG.cards.maxLevel);
    expect(s.wallet.shards).toBe(100_000 - spent);
    expect(deckInfo(s.deck, s.cardLevels).seats.pilot!.value).toBe(before + (CONFIG.cards.maxLevel - 1) * CONFIG.cards.statPerLevel);
    expect(rejected(s, { type: 'UpgradeCard', cardId: 'c20' })).toBe('max_level');
  });
});

describe('crate shop', () => {
  it('standard crates get dearer with every purchase of the day, and there is a hard limit', () => {
    let s = fresh();
    s.wallet.credits = 1e9;
    const { price, priceGrowth, dailyLimit } = CONFIG.crate.tiers.standard;
    let spent = 0;
    for (let i = 0; i < dailyLimit; i++) {
      const offer = toClientView(s, T0).crates.tiers.standard;
      expect(offer).toMatchObject({ currency: 'credits', price: price * priceGrowth ** i, leftToday: dailyLimit - i });
      spent += offer.price;
      s = applyCommand(s, { type: 'BuyCrate', tier: 'standard' }, T0).state;
    }
    expect(s.wallet.credits).toBe(1e9 - spent);
    expect(rejected(s, { type: 'BuyCrate', tier: 'standard' })).toBe('daily_limit');
    // A new day: base price and full allowance again.
    expect(toClientView(s, T0 + DAY).crates.tiers.standard).toMatchObject({ price, leftToday: dailyLimit });
    expect(rejected(s, { type: 'BuyCrate', tier: 'standard' }, T0 + DAY)).toBeUndefined();
  });

  it('premium crates cost quanta, not credits', () => {
    const s = fresh();
    s.wallet.credits = 1e9;
    s.wallet.quanta = CONFIG.crate.tiers.premium.price - 1;
    expect(rejected(s, { type: 'BuyCrate', tier: 'premium' })).toBe('not_enough_quanta');
    s.wallet.quanta += 1;
    const res = applyCommand(s, { type: 'BuyCrate', tier: 'premium' }, T0);
    expect(res.state.wallet).toMatchObject({ credits: 1e9, quanta: 0 });
    expect(rejected(res.state, { type: 'BuyCrate', tier: 'premium' })).toBe('daily_limit');
  });
});

describe('forging', () => {
  it('turns shards into a specific missing card, once', () => {
    const s = fresh();
    expect(rejected(s, { type: 'ForgeCard', cardId: 'c21' })).toBe('not_enough_shards');
    s.wallet.shards = CONFIG.cards.forge.legend + 10;
    const res = applyCommand(s, { type: 'ForgeCard', cardId: 'c21' }, T0);
    expect(res.state.collection.c21).toBe(1);
    expect(res.state.wallet.shards).toBe(10);
    expect(res.state.deck.trader).toBe('c21'); // takes the empty seat of its role
    expect(rejected(res.state, { type: 'ForgeCard', cardId: 'c21' })).toBe('already_owned');
    expect(rejected(s, { type: 'ForgeCard', cardId: 'nope' })).toBe('card_not_owned');
  });
});

describe('crate slots', () => {
  const withSlots = (...tiers: ('standard' | 'premium')[]): GameState => {
    const s = fresh();
    s.slots = tiers.map((tier) => ({ tier, readyAt: null }));
    return s;
  };

  it('a sealed crate must be unsealed, one at a time, before it opens', () => {
    let s = withSlots('standard', 'premium');
    const wait = CONFIG.crate.tiers.standard.unlockMs;
    expect(rejected(s, { type: 'OpenSlot', slot: 0 })).toBe('slot_not_ready');
    expect(rejected(s, { type: 'StartUnlock', slot: 5 })).toBe('no_such_slot');
    s = applyCommand(s, { type: 'StartUnlock', slot: 0 }, T0).state;
    expect(toClientView(s, T0).slots.map((x) => x.state)).toEqual(['unlocking', 'sealed']);
    expect(rejected(s, { type: 'StartUnlock', slot: 1 })).toBe('slot_busy');
    expect(rejected(s, { type: 'OpenSlot', slot: 0 }, T0 + wait - 1)).toBe('slot_not_ready');
    expect(toClientView(s, T0 + wait).slots[0]!.state).toBe('ready');
    expect(toClientView(s, T0 + wait).badges.hangar).toBeGreaterThanOrEqual(1);
    const res = applyCommand(s, { type: 'OpenSlot', slot: 0 }, T0 + wait);
    expect(of(res.events, 'CrateOpened')).toMatchObject({ source: 'slot', tier: 'standard' });
    expect(res.state.slots).toEqual([{ tier: 'premium', readyAt: null }]);
    // Now the next one may start.
    expect(rejected(res.state, { type: 'StartUnlock', slot: 0 }, T0 + wait)).toBeUndefined();
  });

  it('speeding up costs quanta in proportion to the time left, and the last minutes are free', () => {
    let s = withSlots('premium');
    s = applyCommand(s, { type: 'StartUnlock', slot: 0 }, T0).state;
    const total = CONFIG.crate.tiers.premium.unlockMs;
    const full = toClientView(s, T0).slots[0]!.speedUpCost;
    const half = toClientView(s, T0 + total / 2).slots[0]!.speedUpCost;
    expect(full).toBe(Math.ceil(total / 60_000 / CONFIG.crate.speedUpMinutesPerQuantum));
    expect(half).toBe(Math.ceil(full / 2));
    expect(toClientView(s, T0 + total - CONFIG.crate.speedUpFreeMs).slots[0]!.speedUpCost).toBe(0);
    const poor = JSON.parse(JSON.stringify(s)) as GameState;
    poor.wallet.quanta = full - 1;
    expect(rejected(poor, { type: 'SpeedUp', slot: 0 })).toBe('not_enough_quanta');
    const res = applyCommand(s, { type: 'SpeedUp', slot: 0 }, T0);
    expect(res.state.wallet.quanta).toBe(s.wallet.quanta - full);
    expect(toClientView(res.state, T0).slots[0]!.state).toBe('ready');
  });

  it('a full hangar loses new loot', () => {
    const s = withSlots('standard', 'standard', 'standard', 'standard');
    s.calendar.step = 6; // day 7 of the calendar pays a premium crate
    const res = applyCommand(s, { type: 'ClaimCalendar' }, T0);
    expect(of(res.events, 'CrateLost')).toEqual({ type: 'CrateLost', tier: 'premium' });
    expect(res.state.slots).toHaveLength(CONFIG.crate.slots);
  });
});

describe('days', () => {
  it('a day is 24 hours and ends at midnight CET', () => {
    expect(dayIndex(T0)).toBe(dayIndex(T0 + 11 * HOUR));
    expect(dayIndex(T0 + 12 * HOUR)).toBe(dayIndex(T0) + 1);
    expect(dayEndsAt(T0) - T0).toBe(12 * HOUR);
  });
});

describe('daily missions', () => {
  it('each day brings three different missions, the same for state and view', () => {
    const s = fresh();
    const today = toClientView(s, T0).daily.missions;
    expect(today).toHaveLength(CONFIG.daily.missions);
    expect(new Set(today.map((m) => m.kind)).size).toBe(CONFIG.daily.missions);
    expect(s.daily.missions).toEqual(today);
    const tomorrow = toClientView(s, T0 + DAY).daily.missions;
    // The view of tomorrow matches what the state rolls when a command arrives tomorrow.
    const st = applyCommand(s, { type: 'ClaimCalendar' }, T0 + DAY).state;
    expect(st.daily.missions).toEqual(tomorrow);
  });

  it('progress comes from play, rewards from claiming, and the chest from finishing all three', () => {
    let s = fresh('mission');
    s.daily.missions = [
      { kind: 'jumps', target: 2, progress: 0, claimed: false, reward: { credits: 500 } },
      { kind: 'buyUnits', target: 3, progress: 0, claimed: false, reward: { shards: 40 } },
      { kind: 'openCrate', target: 1, progress: 0, claimed: false, reward: { quanta: 6 } },
    ];
    expect(rejected(s, { type: 'ClaimMission', index: 0 })).toBe('not_claimable');
    expect(rejected(s, { type: 'ClaimChest' })).toBe('not_claimable');
    s = applyCommand(s, { type: 'Buy', goodId: 'water', qty: 3 }, T0).state;
    s = applyCommand(s, { type: 'ClaimFreeCrate' }, T0).state;
    s = jump(jump(s, T0), T0);
    const view = toClientView(s, T0);
    expect(view.daily.missions.map((m) => m.progress)).toEqual([2, 3, 1]);
    expect(view.badges.daily).toBeGreaterThanOrEqual(4); // three missions, the chest (and the calendar)

    const credits = s.wallet.credits;
    const res = applyCommand(s, { type: 'ClaimMission', index: 0 }, T0);
    expect(res.state.wallet.credits).toBe(credits + 500);
    expect(rejected(res.state, { type: 'ClaimMission', index: 0 })).toBe('not_claimable');

    const chest = applyCommand(res.state, { type: 'ClaimChest' }, T0);
    expect(of(chest.events, 'CrateEarned')).toEqual({ type: 'CrateEarned', tier: CONFIG.daily.chest.crate });
    expect(chest.state.wallet.quanta).toBe(res.state.wallet.quanta + CONFIG.daily.chest.quanta);
    expect(rejected(chest.state, { type: 'ClaimChest' })).toBe('not_claimable');
  });

  it('unclaimed missions are gone the next day', () => {
    const s = fresh();
    s.daily.missions[0]!.progress = s.daily.missions[0]!.target;
    expect(rejected(s, { type: 'ClaimMission', index: 0 }, T0 + DAY)).toBe('not_claimable');
  });
});

describe('login calendar', () => {
  it('pays once per day and walks through seven steps', () => {
    let s = fresh();
    const seen: string[] = [];
    for (let d = 0; d < 8; d++) {
      const now = T0 + d * DAY;
      expect(toClientView(s, now).calendar).toMatchObject({ step: d, claimable: true });
      const res = applyCommand(s, { type: 'ClaimCalendar' }, now);
      seen.push(JSON.stringify(of(res.events, 'RewardGranted')!.reward));
      s = res.state;
      expect(rejected(s, { type: 'ClaimCalendar' }, now + HOUR)).toBe('not_claimable');
    }
    expect(seen.slice(0, 7)).toEqual(CONFIG.calendar.map((r) => JSON.stringify(r)));
    expect(seen[7]).toBe(seen[0]);
    expect(s.streak.freezes).toBe(1); // step five hands out a streak freeze
  });
});

describe('streak', () => {
  it('grows by one per day played and raises sale prices', () => {
    let s = fresh('streak');
    expect(toClientView(s, T0).streak).toMatchObject({ count: 0, status: 'none', bonus: 0 });
    const base = toClientView(s, T0).market[0]!.sellFactor;
    for (let d = 0; d < 3; d++) {
      s = jump(s, T0 + d * DAY);
      s = jump(s, T0 + d * DAY + HOUR); // a second jump the same day changes nothing
      expect(toClientView(s, T0 + d * DAY + HOUR).streak).toMatchObject({ count: d + 1, status: 'safe' });
    }
    const view = toClientView(s, T0 + 2 * DAY + HOUR);
    expect(view.saleBonus.streak).toBeCloseTo(3 * CONFIG.streak.bonusPerDay, 10);
    // Same crew, same station type of channel: the only change is the streak.
    s.location = 'meridian';
    expect(toClientView(s, T0 + 2 * DAY + HOUR).market[0]!.sellFactor).toBeGreaterThan(base);
  });

  it('is at risk the next day, breaks after a missed day, and a freeze saves it', () => {
    let s = jump(jump(fresh('risk'), T0), T0 + DAY);
    expect(toClientView(s, T0 + 2 * DAY).streak).toMatchObject({ count: 2, status: 'atRisk' });
    expect(toClientView(s, T0 + 3 * DAY).streak).toMatchObject({ count: 0, status: 'broken', bonus: 0 });
    const lost = applyCommand({ ...s, fuel: { amount: 5, updatedAt: T0 + 3 * DAY } }, { type: 'Jump', to: s.routes[0]! }, T0 + 3 * DAY);
    expect(of(lost.events, 'StreakChanged')).toEqual({ type: 'StreakChanged', count: 1, kind: 'lost', previous: 2 });

    s.streak.freezes = 1;
    expect(toClientView(s, T0 + 3 * DAY).streak).toMatchObject({ count: 2, status: 'frozen' });
    const saved = applyCommand({ ...s, fuel: { amount: 5, updatedAt: T0 + 3 * DAY } }, { type: 'Jump', to: s.routes[0]! }, T0 + 3 * DAY);
    expect(of(saved.events, 'StreakChanged')).toEqual({ type: 'StreakChanged', count: 3, kind: 'saved', previous: 2 });
    expect(saved.state.streak.freezes).toBe(0);
    // Two missed days need two freezes.
    expect(toClientView(s, T0 + 4 * DAY).streak.status).toBe('broken');
  });

  it('freezes can be bought with quanta up to a limit', () => {
    let s = fresh();
    s.wallet.quanta = CONFIG.streak.freezePrice * 2 + 5;
    s = applyCommand(s, { type: 'BuyFreeze' }, T0).state;
    s = applyCommand(s, { type: 'BuyFreeze' }, T0).state;
    expect(s.streak.freezes).toBe(CONFIG.streak.maxFreezes);
    expect(s.wallet.quanta).toBe(5);
    expect(rejected(s, { type: 'BuyFreeze' })).toBe('max_level');
    const poor = fresh();
    poor.wallet.quanta = 0;
    expect(rejected(poor, { type: 'BuyFreeze' })).toBe('not_enough_quanta');
  });
});

describe('albums', () => {
  it('milestones unlock with the share of a faction collected and pay out once each', () => {
    let s = fresh();
    const cards = CARDS_BY_FACTION.tessera;
    expect(rejected(s, { type: 'ClaimAlbum', faction: 'tessera' })).toBe('not_claimable');
    for (const c of cards.slice(0, Math.ceil(cards.length * 0.5))) s.collection[c.id] = 1;
    expect(toClientView(s, T0).albums.tessera).toMatchObject({ claimed: 0, claimable: true, complete: false });
    expect(toClientView(s, T0).badges.deck).toBe(1);
    s = applyCommand(s, { type: 'ClaimAlbum', faction: 'tessera' }, T0).state; // 25 percent
    const second = applyCommand(s, { type: 'ClaimAlbum', faction: 'tessera' }, T0); // 50 percent
    expect(of(second.events, 'CrateEarned')).toBeDefined();
    s = second.state;
    expect(rejected(s, { type: 'ClaimAlbum', faction: 'tessera' })).toBe('not_claimable');
    expect(toClientView(s, T0).albums.tessera.next?.pct).toBe(0.75);
  });

  it('a complete album gives a permanent sale bonus', () => {
    let s = fresh();
    for (const c of CARDS_BY_FACTION.asche) s.collection[c.id] = 1;
    expect(toClientView(s, T0).saleBonus.album).toBe(0);
    for (let i = 0; i < CONFIG.album.milestones.length; i++) s = applyCommand(s, { type: 'ClaimAlbum', faction: 'asche' }, T0).state;
    expect(toClientView(s, T0).saleBonus.album).toBeCloseTo(CONFIG.album.bonusPerAlbum, 10);
    expect(toClientView(s, T0).albums.asche).toMatchObject({ complete: true, next: null, claimable: false });
  });
});

describe('wire format', () => {
  it('accepts the new commands only when well formed', () => {
    expect(parseCommand({ type: 'BuyCrate', tier: 'premium' })).toEqual({ type: 'BuyCrate', tier: 'premium' });
    expect(parseCommand({ type: 'BuyCrate', tier: 'mythic' })).toBeNull();
    expect(parseCommand({ type: 'BuyCrate' })).toBeNull();
    expect(parseCommand({ type: 'OpenSlot', slot: 1 })).toEqual({ type: 'OpenSlot', slot: 1 });
    expect(parseCommand({ type: 'OpenSlot', slot: -1 })).toBeNull();
    expect(parseCommand({ type: 'SpeedUp', slot: 1.5 })).toBeNull();
    expect(parseCommand({ type: 'ClaimMission', index: '0' })).toBeNull();
    expect(parseCommand({ type: 'ClaimAlbum', faction: 'empire' })).toBeNull();
    expect(parseCommand({ type: 'UpgradeCard', cardId: 'c01', level: 5 })).toEqual({ type: 'UpgradeCard', cardId: 'c01' });
  });
});
