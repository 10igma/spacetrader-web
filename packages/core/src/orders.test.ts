import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { applyCommand, createInitialState, parseCommand, STATE_VERSION, toClientView, type GameEvent, type GameState, type Order } from './game.ts';
import { upgradeSave } from './save.ts';
import { courseTo, GOOD_BY_ID, hopsBetween, isBanned, neighbours, STATION_BY_ID, stationMod, type StationId } from './world.ts';

const T0 = 1_800_000_000_000;
/** A captain past the first levels, docked one jump on so the board is filled. */
const fresh = (seed = 'orders'): GameState => {
  let s = createInitialState(seed, T0);
  s.profile.level = CONFIG.order.level;
  s.wallet.credits = 1_000_000;
  s.fuel.amount = 99;
  let res = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0);
  while (res.state.pending) res = applyCommand(res.state, { type: 'Encounter', choice: res.state.pending.kind === 'pirates' ? 'pay' : 'submit' }, T0);
  s = res.state;
  s.wallet.credits = 1_000_000;
  s.fuel.amount = 99;
  return s;
};
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);

/** One jump, giving in to whoever stops the ship. Returns everything that happened. */
function hop(s: GameState, to: StationId): { state: GameState; events: GameEvent[] } {
  let res = applyCommand(s, { type: 'Jump', to }, T0);
  const events = [...res.events];
  while (res.state.pending) {
    res = applyCommand(res.state, { type: 'Encounter', choice: res.state.pending.kind === 'pirates' ? 'pay' : 'submit' }, T0);
    events.push(...res.events);
  }
  expect(res.state.location).toBe(to);
  return { state: res.state, events };
}
const accept = (s: GameState, order: Order) => applyCommand(s, { type: 'AcceptOrder', id: order.id }, T0);
const load = (s: GameState, order: Order, cost = 1): void => { s.cargo[order.goodId] = { qty: order.qty, avgCost: cost, heat: 0 }; };

describe('delivery orders', () => {
  it('every station has a board: far places asking for what they do not make, above their market price', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const s = fresh(seed);
      const cfg = CONFIG.order;
      expect(s.orders.offers).toHaveLength(cfg.offers);
      expect(new Set(s.orders.offers.map((o) => o.to)).size).toBe(cfg.offers);
      for (const o of s.orders.offers) {
        const hops = hopsBetween(s.location, o.to);
        const station = STATION_BY_ID.get(o.to)!;
        const good = GOOD_BY_ID.get(o.goodId)!;
        expect(o.from).toBe(s.location);
        expect(hops).toBeGreaterThanOrEqual(cfg.minHops);
        expect(hops).toBeLessThanOrEqual(cfg.maxHops);
        expect(o.left).toBeGreaterThanOrEqual(hops + cfg.slackMin);
        expect(o.left).toBeLessThanOrEqual(hops + cfg.slackMin + cfg.slackRange);
        // Always legal to load where the order hangs. An ordinary order is legal at its destination and for something wanted there.
        expect(isBanned(good, STATION_BY_ID.get(s.location)!.faction)).toBe(false);
        expect(isBanned(good, station.faction)).toBe(!!o.hot);
        if (!o.hot) expect(stationMod(station, good)).toBeGreaterThanOrEqual(1);
        expect(o.qty).toBeGreaterThanOrEqual(3);
        expect(o.qty).toBeLessThanOrEqual(toClientView(s, T0).cargo.cap);
        expect(o.deposit).toBe(Math.round(o.qty * o.pay * cfg.deposit));
      }
      // The view says what the same lot would fetch on the open market there: the order pays more.
      for (const o of toClientView(s, T0).orders.offers) {
        expect(o.total).toBe(o.qty * o.pay);
        expect(o.total).toBeGreaterThan(o.market);
        expect(o.here).toBe(false);
      }
    }
  });

  it('the board opens at a level where a captain can afford a lot, and says what loading here costs', () => {
    const rookie = createInitialState('rookie', T0);
    expect(rookie.orders.offers).toEqual([]);
    expect(toClientView(rookie, T0).orders).toMatchObject({ offers: [], active: [], level: CONFIG.order.level, max: CONFIG.order.maxActive });
    const s = fresh();
    for (const o of toClientView(s, T0).orders.offers) {
      expect(o.buyHere).toBeGreaterThan(0);
      // Loaded where the order hangs and delivered, every offer earns.
      expect(o.total).toBeGreaterThan(o.buyHere!);
    }
    load(s, s.orders.offers[0]!);
    expect(toClientView(s, T0).orders.offers[0]!.buyHere).toBeNull();
  });

  it('some orders are for contraband: banned where it is wanted, legal where it hangs, and better paid', () => {
    let hot = 0, plain = 0;
    for (let i = 0; i < 60; i++) {
      const s = fresh(`hot-${i}`);
      for (const o of s.orders.offers) { if (o.hot) hot++; else plain++; }
      const o = s.orders.offers.find((x) => x.hot);
      if (!o) continue;
      const good = GOOD_BY_ID.get(o.goodId)!;
      expect(good.tier).not.toBe('free');
      // The view carries the flag, and loading here is an ordinary purchase.
      const view = toClientView(s, T0).orders.offers.find((x) => x.id === o.id)!;
      expect(view.hot).toBe(true);
      expect(view.buyHere).toBeGreaterThan(0);
      expect(toClientView(s, T0).market.find((m) => m.goodId === o.goodId)!.channel).toBe('open');
      // It delivers like any other order, past the fence and its limit.
      let st = accept(s, o).state;
      load(st, o, 10);
      for (const next of courseTo(st.location, o.to)) st = hop(st, next).state;
      const lot = st.cargo[o.goodId];
      // Customs may have taken it on the way: that is the risk the bonus pays for.
      if (!lot || lot.qty < o.qty || !st.orders.active.some((x) => x.id === o.id)) continue;
      const res = applyCommand(st, { type: 'DeliverOrder', id: o.id }, T0);
      expect(of(res.events, 'OrderDelivered')).toMatchObject({ revenue: o.qty * o.pay });
    }
    expect(hot).toBeGreaterThan(10);
    // Roughly the configured share, where a suitable good exists.
    expect(hot / (hot + plain)).toBeGreaterThan(0.1);
    expect(hot / (hot + plain)).toBeLessThan(CONFIG.order.hotChance + 0.1);
  });

  it('accepting costs the deposit, and two at a time is the limit', () => {
    const s = fresh();
    const [a, b, c] = s.orders.offers as [Order, Order, Order];
    const first = accept(s, a);
    expect(first.state.wallet.credits).toBe(s.wallet.credits - a.deposit);
    expect(first.state.orders.active.map((o) => o.id)).toEqual([a.id]);
    expect(first.state.orders.offers.map((o) => o.id)).toEqual([b.id, c.id]);
    expect(of(first.events, 'OrderAccepted')!.order.id).toBe(a.id);
    const second = accept(first.state, b);
    expect(accept(second.state, c).events[0]).toEqual({ type: 'CommandRejected', reason: 'too_many_orders' });
    expect(accept(second.state, a).events[0]).toEqual({ type: 'CommandRejected', reason: 'no_such_order' });
    const poor = fresh();
    poor.wallet.credits = a.deposit - 1;
    expect(accept(poor, poor.orders.offers[0]!).events[0]).toEqual({ type: 'CommandRejected', reason: 'not_enough_credits' });
  });

  it('delivering in time pays the fixed price and returns the deposit', () => {
    let s = fresh();
    const order = s.orders.offers[0]!;
    s = accept(s, order).state;
    load(s, order, 10);
    expect(applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'not_here' });
    for (const next of courseTo(s.location, order.to)) s = hop(s, next).state;
    const view = toClientView(s, T0).orders.active[0]!;
    expect(view).toMatchObject({ here: true, hops: 0, have: order.qty });
    expect(view.left).toBeGreaterThanOrEqual(CONFIG.order.slackMin);
    const before = s.wallet.credits;
    const profitBefore = s.stats.profit;
    const res = applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0);
    expect(res.state.wallet.credits).toBe(before + order.qty * order.pay + order.deposit);
    expect(res.state.cargo[order.goodId]).toBeUndefined();
    expect(res.state.orders.active).toEqual([]);
    expect(res.state.stats.profit).toBe(profitBefore + order.qty * (order.pay - 10));
    expect(of(res.events, 'OrderDelivered')).toMatchObject({ revenue: order.qty * order.pay, profit: order.qty * (order.pay - 10) });
  });

  it('needs the whole lot in the hold', () => {
    let s = fresh();
    const order = s.orders.offers[0]!;
    s = accept(s, order).state;
    for (const next of courseTo(s.location, order.to)) s = hop(s, next).state;
    expect(applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'not_in_cargo' });
    s.cargo[order.goodId] = { qty: order.qty - 1, avgCost: 1, heat: 0 };
    expect(applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'not_in_cargo' });
  });

  it('the last jump still counts: arriving with zero jumps left delivers', () => {
    let s = fresh();
    const order = s.orders.offers[0]!;
    s = accept(s, order).state;
    s.orders.active[0]!.left = hopsBetween(s.location, order.to);
    load(s, order);
    for (const next of courseTo(s.location, order.to)) s = hop(s, next).state;
    expect(s.orders.active[0]!.left).toBe(0);
    expect(of(applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0).events, 'OrderDelivered')).toBeDefined();
  });

  it('out of jumps and not there: the order fails and the deposit is gone', () => {
    let s = fresh();
    const order = s.orders.offers[0]!;
    s = accept(s, order).state;
    const credits = s.wallet.credits;
    // Wander between the start and a neighbour that is no closer to the destination.
    const home = s.location;
    const side = neighbours(home).find((n) => n !== order.to && hopsBetween(n, order.to) >= hopsBetween(home, order.to)) ?? neighbours(home)[0]!;
    let failed: GameEvent | undefined;
    for (let i = 0; i < order.left && !failed; i++) {
      const res = hop(s, s.location === home ? side : home);
      s = res.state;
      failed = of(res.events, 'OrderFailed');
      if (i < order.left - 1) expect(failed).toBeUndefined();
    }
    expect(failed).toMatchObject({ order: { id: order.id } });
    expect(s.orders.active).toEqual([]);
    expect(applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'no_such_order' });
    // Nothing came back: the wallet only saw courier pay and whatever the road cost.
    expect(s.wallet.credits).toBeLessThan(credits + order.deposit + order.left * 10_000);
  });

  it('the station that ordered has none of the good to sell', () => {
    let s = fresh();
    const order = s.orders.offers[0]!;
    s = accept(s, order).state;
    for (const next of courseTo(s.location, order.to)) s = hop(s, next).state;
    expect(applyCommand(s, { type: 'Buy', goodId: order.goodId, qty: 1 }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'sold_out' });
    load(s, order);
    s = applyCommand(s, { type: 'DeliverOrder', id: order.id }, T0).state;
    expect(of(applyCommand(s, { type: 'Buy', goodId: order.goodId, qty: 1 }, T0).events, 'Bought')).toBeDefined();
  });

  it('offers stay behind when you leave, and a place you already serve does not ask twice', () => {
    let s = fresh();
    const order = s.orders.offers[0]!;
    const left = s.orders.offers.map((o) => o.id);
    s = accept(s, order).state;
    for (let i = 0; i < 6; i++) {
      s.orders.active[0]!.left = 9;
      s = hop(s, s.routes[i % s.routes.length]!).state;
      expect(s.orders.offers.every((o) => !left.includes(o.id) && o.to !== order.to && o.from === s.location)).toBe(true);
    }
  });

  it('commands parse, and saves from before orders start with an empty board', () => {
    expect(parseCommand({ type: 'AcceptOrder', id: 3 })).toEqual({ type: 'AcceptOrder', id: 3 });
    expect(parseCommand({ type: 'DeliverOrder', id: 3 })).toEqual({ type: 'DeliverOrder', id: 3 });
    expect(parseCommand({ type: 'AcceptOrder', id: '3' })).toBeNull();
    const old = JSON.parse(JSON.stringify(fresh())) as Record<string, unknown>;
    delete old.orders;
    delete (old.rng as Record<string, unknown>).order;
    old.version = 11;
    const up = upgradeSave(old, T0)!;
    expect(up.version).toBe(STATE_VERSION);
    expect(up.orders).toEqual({ offers: [], active: [], seq: 0 });
    expect(hop(up, up.routes[0]!).state.orders.offers.length).toBeGreaterThan(0);
  });
});
