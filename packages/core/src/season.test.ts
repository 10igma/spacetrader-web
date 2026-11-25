import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { applyCommand, createInitialState, toClientView, type Command, type GameEvent, type GameState } from './game.ts';
import { dayIndex } from './meta.ts';
import {
  charterReward, leagueMove, leagueReward, seasonIndex, standings, weekday, weekendActive, weekEndsAt, weekIndex, weekStartsAt,
} from './season.ts';

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** A Monday at noon CET. */
const MONDAY = weekStartsAt(weekIndex(1_800_000_000_000) + 1) + 12 * HOUR;
const fresh = (seed = 'season', now = MONDAY): GameState => createInitialState(seed, now);
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (s: GameState, cmd: Command, now = MONDAY) => of(applyCommand(s, cmd, now).events, 'CommandRejected')?.reason;

describe('calendar', () => {
  it('weeks run Monday to Sunday and the weekend event covers Saturday and Sunday', () => {
    expect(weekday(MONDAY)).toBe(0);
    expect(weekStartsAt(weekIndex(MONDAY))).toBe(MONDAY - 12 * HOUR);
    expect(weekEndsAt(MONDAY) - MONDAY).toBe(6.5 * DAY);
    for (let d = 0; d < 7; d++) expect(weekendActive(MONDAY + d * DAY)).toBe(d >= 5);
    expect(weekIndex(MONDAY + 7 * DAY)).toBe(weekIndex(MONDAY) + 1);
    expect(dayIndex(MONDAY + 7 * DAY) - dayIndex(MONDAY)).toBe(7);
  });

  it('a season lasts six weeks', () => {
    const start = weekStartsAt(seasonIndex(MONDAY) * CONFIG.season.weeks + CONFIG.season.weeks);
    expect(seasonIndex(start)).toBe(seasonIndex(start - 1) + 1);
    expect(seasonIndex(start + CONFIG.season.weeks * 7 * DAY - 1)).toBe(seasonIndex(start));
  });
});

describe('charter', () => {
  it('experience moves the charter, and one tap collects every tier reached on the free track', () => {
    let s = fresh();
    expect(rejected(s, { type: 'ClaimCharter' })).toBe('not_claimable');
    s.season.xp = CONFIG.season.xpPerTier * 3 + 10;
    const view = toClientView(s, MONDAY).season;
    expect(view).toMatchObject({ tier: 3, claimable: 3, waitingPremium: 3, premium: false });
    const before = { ...s.wallet };
    const res = applyCommand(s, { type: 'ClaimCharter' }, MONDAY);
    expect(of(res.events, 'CharterClaimed')).toMatchObject({ type: 'CharterClaimed', rewards: 3, crates: 0 });
    const want = [1, 2, 3].map((t) => charterReward(t, 'free'));
    expect(res.state.wallet.credits - before.credits).toBe(want.reduce((a, r) => a + (r.credits ?? 0), 0));
    expect(res.state.wallet.shards - before.shards).toBe(want.reduce((a, r) => a + (r.shards ?? 0), 0));
    expect(res.state.wallet.quanta - before.quanta).toBe(want.reduce((a, r) => a + (r.quanta ?? 0), 0));
    s = res.state;
    expect(rejected(s, { type: 'ClaimCharter' })).toBe('not_claimable');
  });

  it('playing earns charter experience', () => {
    const s = fresh();
    const res = applyCommand(s, { type: 'ClaimFreeCrate' }, MONDAY);
    expect(res.state.season.xp).toBeGreaterThan(0);
    expect(res.state.season.xp).toBe(res.state.profile.xp);
  });

  it('the premium track costs quanta and pays out every tier already reached', () => {
    let s = fresh();
    s.season.xp = CONFIG.season.xpPerTier * 6;
    s = applyCommand(s, { type: 'ClaimCharter' }, MONDAY).state;
    s.wallet.quanta = CONFIG.season.premiumPrice - 1;
    expect(rejected(s, { type: 'BuyCharter' })).toBe('not_enough_quanta');
    s.wallet.quanta = CONFIG.season.premiumPrice;
    s = applyCommand(s, { type: 'BuyCharter' }, MONDAY).state;
    expect(s.wallet.quanta).toBe(0);
    expect(rejected(s, { type: 'BuyCharter' })).toBe('already_owned');
    expect(toClientView(s, MONDAY).season).toMatchObject({ premium: true, claimable: 6, waitingPremium: 0 });
    const res = applyCommand(s, { type: 'ClaimCharter' }, MONDAY);
    expect(of(res.events, 'CharterClaimed')!.rewards).toBe(6);
    const quanta = [1, 2, 3, 4, 5, 6].reduce((a, t) => a + (charterReward(t, 'premium').quanta ?? 0), 0);
    expect(res.state.wallet.quanta).toBe(quanta);
  });

  it('stops at the last tier and every tier pays something on both tracks', () => {
    const s = fresh();
    s.season.xp = CONFIG.season.xpPerTier * 999;
    expect(toClientView(s, MONDAY).season.tier).toBe(CONFIG.season.tiers);
    for (let t = 1; t <= CONFIG.season.tiers; t++) {
      expect(Object.keys(charterReward(t, 'free')).length).toBeGreaterThan(0);
      expect(Object.keys(charterReward(t, 'premium')).length).toBeGreaterThan(0);
    }
  });

  it('a new season starts from zero and forfeits what was not collected', () => {
    const s = fresh();
    s.season.xp = CONFIG.season.xpPerTier * 5;
    s.season.premium = true;
    const next = MONDAY + CONFIG.season.weeks * 7 * DAY;
    expect(toClientView(s, next).season).toMatchObject({ xp: 0, tier: 0, premium: false, claimable: 0 });
    expect(rejected(s, { type: 'ClaimCharter' }, next)).toBe('not_claimable');
  });
});

describe('league', () => {
  it('has thirty entries, one of them you, and rivals that do not depend on your score', () => {
    const s = fresh();
    const a = standings(s.league.seed, s.league.week, 0, 0, MONDAY + 3 * DAY);
    const b = standings(s.league.seed, s.league.week, 0, 9_999_999, MONDAY + 3 * DAY);
    expect(a).toHaveLength(CONFIG.league.size);
    expect(a.filter((x) => x.you)).toHaveLength(1);
    const rivals = (t: typeof a) => t.filter((x) => !x.you).map((x) => `${x.name}:${x.score}`).sort();
    expect(rivals(a)).toEqual(rivals(b));
    expect(b[0]!.you).toBe(true);
    expect(a[a.length - 1]!.you).toBe(true);
  });

  it('rival scores only grow through the week', () => {
    const s = fresh();
    let last = new Map<string, number>();
    for (let h = 0; h <= 7 * 24; h += 6) {
      const table = standings(s.league.seed, s.league.week, 2, 0, weekStartsAt(s.league.week) + h * HOUR);
      for (const row of table.filter((x) => !x.you)) {
        expect(row.score).toBeGreaterThanOrEqual(last.get(row.name) ?? 0);
      }
      last = new Map(table.filter((x) => !x.you).map((x) => [x.name, x.score]));
    }
  });

  it('selling at a profit scores, and a strong week is promoted with a reward to collect', () => {
    let s = fresh();
    s.cargo = { implants: { qty: 10, avgCost: 1, heat: 0 } };
    s = applyCommand(s, { type: 'Sell', goodId: 'implants', qty: 10 }, MONDAY).state;
    expect(s.league.score).toBeGreaterThan(0);
    expect(toClientView(s, MONDAY).league).toMatchObject({ tier: 0, tierName: 'Bronze', score: s.league.score });
    s.league.score = 50_000_000;
    const nextWeek = MONDAY + 7 * DAY;
    const view = toClientView(s, nextWeek).league;
    expect(view).toMatchObject({ tier: 1, tierName: 'Silber', score: 0 });
    expect(view.last).toMatchObject({ rank: 1, moved: 1, tier: 0 });
    const res = applyCommand(s, { type: 'ClaimLeague' }, nextWeek);
    expect(of(res.events, 'LeagueClaimed')).toEqual({ type: 'LeagueClaimed', rank: 1, moved: 1, tier: 1 });
    expect(of(res.events, 'RewardGranted')!.reward).toEqual(leagueReward(1, 0));
    expect(rejected(res.state, { type: 'ClaimLeague' }, nextWeek)).toBe('not_claimable');
  });

  it('a weak week in a higher league is relegated, and a week away changes nothing', () => {
    const weak = fresh();
    weak.league.tier = 2;
    weak.league.score = 100;
    expect(toClientView(weak, MONDAY + 7 * DAY).league).toMatchObject({ tier: 1, last: { moved: -1 } });
    const away = fresh();
    away.league.tier = 2;
    expect(toClientView(away, MONDAY + 21 * DAY).league).toMatchObject({ tier: 2, last: null });
  });

  it('promotion and relegation rules hold at the edges', () => {
    expect(leagueMove(1, 4)).toBe(0);
    expect(leagueMove(30, 0)).toBe(0);
    expect(leagueMove(CONFIG.league.promote, 0)).toBe(1);
    expect(leagueMove(CONFIG.league.promote + 1, 0)).toBe(0);
    expect(leagueMove(CONFIG.league.relegate, 3)).toBe(-1);
    expect(leagueMove(CONFIG.league.relegate - 1, 3)).toBe(0);
    expect(leagueReward(30, 2)).toEqual({});
  });
});

describe('weekend event', () => {
  const SATURDAY = MONDAY + 5 * DAY;

  it('raises customs chances and black-market prices, only at the weekend', () => {
    const s = fresh();
    s.cargo = { neurostaub: { qty: 5, avgCost: 500, heat: 0 } };
    const to = toClientView(s, MONDAY).routes.find((r) => r.customsChance > 0)!.stationId;
    const chance = (now: number) => toClientView(s, now).routes.find((r) => r.stationId === to)!.customsChance;
    expect(chance(SATURDAY)).toBeCloseTo(chance(MONDAY) + CONFIG.weekend.customsBonus, 5);
    const fence = (now: number) => toClientView(s, now).market.find((m) => m.goodId === 'neurostaub')!.sellFactor;
    expect(fence(SATURDAY)).toBeCloseTo(fence(MONDAY) + CONFIG.weekend.fenceBonus, 5);
    const open = (now: number) => toClientView(s, now).market.find((m) => m.goodId === 'water')!.sellFactor;
    expect(open(SATURDAY)).toBe(open(MONDAY));
    expect(toClientView(s, SATURDAY).weekend.active).toBe(true);
    expect(toClientView(s, MONDAY).weekend.active).toBe(false);
  });

  it('jumps earn points at the weekend only, and milestones pay out in order', () => {
    const jump = (st: GameState, now: number): GameState => {
      st = JSON.parse(JSON.stringify(st)) as GameState;
      st.fuel = { amount: CONFIG.fuel.max, updatedAt: now };
      let r = applyCommand(st, { type: 'Jump', to: st.routes[0]! }, now).state;
      if (r.pending) r = applyCommand(r, { type: 'Encounter', choice: r.pending.kind === 'pirates' ? 'pay' : 'submit' }, now).state;
      return r;
    };
    let s = jump(fresh(), MONDAY);
    expect(s.weekend.points).toBe(0);
    s = jump(s, SATURDAY);
    expect(s.weekend.points).toBeGreaterThanOrEqual(CONFIG.weekend.points.jump);
    expect(rejected(s, { type: 'ClaimWeekend' }, SATURDAY)).toBe('not_claimable');
    s.weekend.points = CONFIG.weekend.milestones[1]!;
    expect(toClientView(s, SATURDAY).weekend.claimable).toBe(2);
    const first = applyCommand(s, { type: 'ClaimWeekend' }, SATURDAY);
    expect(of(first.events, 'RewardGranted')!.reward).toEqual(CONFIG.weekend.rewards[0]);
    const second = applyCommand(first.state, { type: 'ClaimWeekend' }, SATURDAY);
    expect(of(second.events, 'RewardGranted')!.reward).toEqual(CONFIG.weekend.rewards[1]);
    expect(rejected(second.state, { type: 'ClaimWeekend' }, SATURDAY)).toBe('not_claimable');
    // Next week the track starts over, and what was not collected is gone.
    expect(toClientView(s, SATURDAY + 7 * DAY).weekend).toMatchObject({ points: 0, claimable: 0 });
  });
});

describe('welcome back', () => {
  it('after three days away a gift waits, with a full tank, once', () => {
    let s = fresh();
    s.fuel.amount = 0;
    expect(toClientView(s, MONDAY + 2 * DAY).comeback).toBeNull();
    expect(rejected(s, { type: 'ClaimComeback' }, MONDAY + 2 * DAY)).toBe('not_claimable');
    const back = MONDAY + CONFIG.comeback.days * DAY;
    expect(toClientView(s, back).comeback).toEqual({ credits: CONFIG.comeback.creditsPerLevel, quanta: CONFIG.comeback.quanta, crate: 'standard' });
    const res = applyCommand(s, { type: 'ClaimComeback' }, back);
    expect(of(res.events, 'RewardGranted')).toBeDefined();
    expect(res.state.fuel.amount).toBe(CONFIG.fuel.max);
    s = res.state;
    expect(rejected(s, { type: 'ClaimComeback' }, back + HOUR)).toBe('not_claimable');
    expect(toClientView(s, back + DAY).comeback).toBeNull();
  });

  it('any command counts as showing up', () => {
    let s = fresh();
    for (let d = 1; d <= 6; d++) s = applyCommand(s, { type: 'ClaimCalendar' }, MONDAY + d * DAY).state;
    expect(s.comeback).toBe(false);
  });
});
