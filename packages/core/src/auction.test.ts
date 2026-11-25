import { describe, expect, it } from 'vitest';
import { bidStep, cardValue, lotAt, lotByKey, rivalNow, winningPrice } from './auction.ts';
import { CONFIG } from './config.ts';
import { CARD_BY_ID, CARDS } from './content.ts';
import { applyCommand, createInitialState, parseCommand, toClientView, type Command, type GameEvent, type GameState } from './game.ts';

const MIN = 60_000;
const T0 = 1_800_000_000_000;
const fresh = (seed = 'auction'): GameState => { const s = createInitialState(seed, T0); s.wallet.credits = 50_000_000; return s; };
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (s: GameState, cmd: Command, now = T0) => of(applyCommand(s, cmd, now).events, 'CommandRejected')?.reason;
/** The secret side of a lot. Only tests look at this. */
const secret = (s: GameState, key: string) => lotByKey(s.auction.seed, s.createdAt, key)!;

describe('lots', () => {
  it('eight lots are always on offer, each a real card with a sane estimate', () => {
    const view = toClientView(fresh(), T0 + 5 * MIN);
    expect(view.auction.lots).toHaveLength(CONFIG.auction.slotMinutes.length);
    for (const lot of view.auction.lots) {
      const card = CARD_BY_ID.get(lot.cardId)!;
      expect(lot.estimate).toBe(cardValue(card));
      expect(lot.endsAt).toBeGreaterThan(T0 + 5 * MIN);
      expect(lot.buyNow).toBeGreaterThan(lot.estimate);
      expect(lot.minBid).toBeGreaterThan(lot.price);
    }
  });

  it('the rival limit never reaches the client', () => {
    const s = fresh();
    const json = JSON.stringify(toClientView(s, T0 + MIN));
    expect(json).not.toContain('rivalMax');
    expect(json).not.toContain(s.auction.seed);
    expect(json).not.toContain('"offer":' + String(0)); // listings expose only the current bid
  });

  it('are the same whenever and however often you look, and roll over when their time is up', () => {
    const s = fresh();
    const a = toClientView(s, T0 + MIN).auction.lots.map((l) => `${l.key}:${l.cardId}:${l.endsAt}`);
    const b = toClientView(s, T0 + 2 * MIN).auction.lots.map((l) => `${l.key}:${l.cardId}:${l.endsAt}`);
    expect(a).toEqual(b);
    const later = toClientView(s, T0 + 11 * MIN).auction.lots.map((l) => l.key);
    expect(later[0]).not.toBe(a[0]!.split(':').slice(0, 2).join(':'));
  });

  it('the rival bid only climbs, ends exactly at its limit, and that limit is within the published range', () => {
    const s = fresh();
    for (let slot = 0; slot < 8; slot++) {
      for (let k = 0; k < 40; k++) {
        const lot = lotAt(s.auction.seed, s.createdAt, slot, T0 + k * CONFIG.auction.slotMinutes[slot]! * MIN);
        let last = 0;
        for (let i = 0; i <= 20; i++) {
          const r = rivalNow(lot, lot.startAt + ((lot.endsAt - lot.startAt) * i) / 20);
          expect(r).toBeGreaterThanOrEqual(last);
          last = r;
        }
        expect(last).toBe(lot.rivalMax);
        const share = lot.rivalMax / lot.estimate;
        expect(share).toBeGreaterThanOrEqual(CONFIG.auction.rivalMin - 0.05);
        expect(share).toBeLessThanOrEqual(CONFIG.auction.rivalMin + CONFIG.auction.rivalRange + 0.05);
      }
    }
  });

  it('every card in the set has a value that rises with rarity', () => {
    const avg = (r: string) => { const xs = CARDS.filter((c) => c.rarity === r).map(cardValue); return xs.reduce((a, b) => a + b, 0) / xs.length; };
    expect(avg('rare')).toBeGreaterThan(avg('standard') * 3);
    expect(avg('elite')).toBeGreaterThan(avg('rare') * 3);
    expect(avg('legend')).toBeGreaterThan(avg('elite') * 3);
  });
});

describe('bidding', () => {
  it('holds the whole limit in escrow, and raising costs only the difference', () => {
    let s = fresh();
    const lot = toClientView(s, T0 + MIN).auction.lots[7]!;
    expect(rejected(s, { type: 'PlaceBid', lot: lot.key, max: lot.minBid - 50 }, T0 + MIN)).toBe('bid_too_low');
    expect(rejected(s, { type: 'PlaceBid', lot: '7:999999', max: 1_000_000 }, T0 + MIN)).toBe('no_such_lot');
    s = applyCommand(s, { type: 'PlaceBid', lot: lot.key, max: lot.minBid }, T0 + MIN).state;
    expect(s.wallet.credits).toBe(50_000_000 - lot.minBid);
    const after = toClientView(s, T0 + MIN).auction.lots[7]!;
    expect(after).toMatchObject({ yourMax: lot.minBid, leading: true });
    s = applyCommand(s, { type: 'PlaceBid', lot: lot.key, max: after.minBid + 500 }, T0 + MIN).state;
    expect(s.wallet.credits).toBe(50_000_000 - after.minBid - 500);
    expect(Object.keys(s.auction.bids)).toHaveLength(1);
  });

  it('cannot bid more than you have, or on more lots than allowed', () => {
    const poor = fresh();
    poor.wallet.credits = 10;
    const lots = toClientView(poor, T0 + MIN).auction.lots;
    expect(rejected(poor, { type: 'PlaceBid', lot: lots[0]!.key, max: lots[0]!.minBid }, T0 + MIN)).toBe('not_enough_credits');
    let s = fresh();
    for (let i = 0; i < CONFIG.auction.maxBids; i++) s = applyCommand(s, { type: 'PlaceBid', lot: lots[i]!.key, max: lots[i]!.minBid }, T0 + MIN).state;
    expect(rejected(s, { type: 'PlaceBid', lot: lots[5]!.key, max: lots[5]!.minBid }, T0 + MIN)).toBe('too_many_bids');
  });

  it('a limit above the rival wins the card one step above the rival and returns the rest', () => {
    let s = fresh();
    const lot = toClientView(s, T0 + MIN).auction.lots[0]!;
    const hidden = secret(s, lot.key);
    const max = hidden.rivalMax + 10 * bidStep(hidden.rivalMax);
    const copies = s.collection[lot.cardId] ?? 0;
    s = applyCommand(s, { type: 'PlaceBid', lot: lot.key, max }, T0 + MIN).state;
    // Still leading just before the end, whatever the rival does.
    expect(toClientView(s, hidden.endsAt - 1).auction.lots.find((l) => l.key === lot.key)).toMatchObject({ leading: true });
    const end = toClientView(s, hidden.endsAt);
    const price = winningPrice(hidden, max);
    expect(price).toBe(hidden.rivalMax + bidStep(hidden.rivalMax));
    expect(end.auction.results).toEqual([{ kind: 'won', cardId: lot.cardId, price }]);
    expect(end.collection[lot.cardId]).toBe(copies + 1);
    expect(end.wallet.credits).toBe(50_000_000 - price);
    expect(end.badges.market).toBeGreaterThanOrEqual(1);
    // The next command stores exactly what the view showed.
    const stored = applyCommand(s, { type: 'AckAuctions' }, hidden.endsAt).state;
    expect(stored.wallet.credits).toBe(50_000_000 - price);
    expect(stored.auction.results).toEqual([]);
    expect(stored.auction.bids).toEqual({});
  });

  it('a limit at or below the rival loses and gets everything back', () => {
    let s = fresh();
    // The long lot: its rival is still far below its limit one minute in.
    const lot = toClientView(s, T0 + MIN).auction.lots[7]!;
    const hidden = secret(s, lot.key);
    expect(lot.minBid).toBeLessThanOrEqual(hidden.rivalMax);
    s = applyCommand(s, { type: 'PlaceBid', lot: lot.key, max: lot.minBid }, T0 + MIN).state;
    // Outbid on the way, and told so.
    const mid = toClientView(s, hidden.endsAt - MIN).auction.lots.find((l) => l.key === lot.key)!;
    expect(mid).toMatchObject({ leading: false, yourMax: lot.minBid });
    expect(mid.price).toBeGreaterThan(lot.minBid);
    const end = toClientView(s, hidden.endsAt);
    expect(end.auction.results).toEqual([{ kind: 'lost', cardId: lot.cardId, price: hidden.rivalMax }]);
    expect(end.wallet.credits).toBe(50_000_000);
  });

  it('whoever bids more than the rival range allows always wins, and never pays more than their limit', () => {
    let wins = 0;
    for (let i = 0; i < 60; i++) {
      let s = fresh(`sure-${i}`);
      const lot = toClientView(s, T0 + MIN).auction.lots[i % 8]!;
      const max = Math.ceil(lot.estimate * 1.4);
      s = applyCommand(s, { type: 'PlaceBid', lot: lot.key, max }, T0 + MIN).state;
      const end = toClientView(s, secret(s, lot.key).endsAt);
      const result = end.auction.results[0]!;
      if (result.kind === 'won') wins++;
      expect(result.price).toBeLessThanOrEqual(max);
    }
    expect(wins).toBe(60);
  });

  it('buy now hands the card over at once and returns an open bid', () => {
    let s = fresh();
    const lot = toClientView(s, T0 + MIN).auction.lots[5]!;
    s = applyCommand(s, { type: 'PlaceBid', lot: lot.key, max: lot.minBid }, T0 + MIN).state;
    const res = applyCommand(s, { type: 'BuyNow', lot: lot.key }, T0 + 2 * MIN);
    expect(of(res.events, 'AuctionBought')).toEqual({ type: 'AuctionBought', cardId: lot.cardId, price: lot.buyNow });
    expect(res.state.wallet.credits).toBe(50_000_000 - lot.buyNow);
    expect(res.state.collection[lot.cardId]).toBe(1);
    expect(toClientView(res.state, T0 + 2 * MIN).auction.lots[5]).toMatchObject({ gone: true, yourMax: null });
    expect(rejected(res.state, { type: 'BuyNow', lot: lot.key }, T0 + 2 * MIN)).toBe('no_such_lot');
    expect(rejected(res.state, { type: 'PlaceBid', lot: lot.key, max: 1e7 }, T0 + 2 * MIN)).toBe('no_such_lot');
  });
});

describe('selling', () => {
  it('needs a spare copy, takes the card out of the collection, and limits open listings', () => {
    let s = fresh();
    s.collection = { c11: 1, c12: 4 };
    expect(rejected(s, { type: 'ListCard', cardId: 'c11', min: 1_000, duration: 0 })).toBe('no_spare_copy');
    expect(rejected(s, { type: 'ListCard', cardId: 'c12', min: 10, duration: 0 })).toBe('unknown_command');
    expect(rejected(s, { type: 'ListCard', cardId: 'c12', min: 1_000, duration: 9 })).toBe('unknown_command');
    for (let i = 0; i < CONFIG.auction.maxListings; i++) s = applyCommand(s, { type: 'ListCard', cardId: 'c12', min: 1_000, duration: 0 }, T0).state;
    expect(s.collection.c12).toBe(1);
    expect(toClientView(s, T0).auction.listings).toHaveLength(CONFIG.auction.maxListings);
    s.collection.c12 = 3;
    expect(rejected(s, { type: 'ListCard', cardId: 'c12', min: 1_000, duration: 0 })).toBe('too_many_listings');
  });

  it('sells for the best offer minus the fee when it meets the asking price, otherwise the card returns', () => {
    const value = cardValue(CARD_BY_ID.get('c12')!);
    let sold = 0, unsold = 0;
    for (let i = 0; i < 80; i++) {
      let s = fresh(`sell-${i}`);
      s.collection = { c12: 2 };
      const high = i % 2 === 1;
      const min = high ? value * 3 : 100;
      s = applyCommand(s, { type: 'ListCard', cardId: 'c12', min, duration: 1 }, T0).state;
      const offer = s.auction.listings[0]!.offer;
      const end = toClientView(s, T0 + CONFIG.auction.listMinutes[1]! * MIN);
      const result = end.auction.results[0]!;
      if (high) {
        unsold++;
        expect(result).toEqual({ kind: 'unsold', cardId: 'c12', price: 0 });
        expect(end.collection.c12).toBe(2);
        expect(end.wallet.credits).toBe(50_000_000);
        expect(end.wallet.shards).toBe(0); // a returning card pays no shards
      } else {
        sold++;
        const net = Math.round(offer * (1 - CONFIG.auction.fee));
        expect(result).toEqual({ kind: 'sold', cardId: 'c12', price: net });
        expect(end.wallet.credits).toBe(50_000_000 + net);
        expect(offer / value).toBeGreaterThan(CONFIG.auction.offerMin - 0.05);
        expect(offer / value).toBeLessThan(CONFIG.auction.offerMin + CONFIG.auction.offerRange + 0.05);
      }
    }
    expect(sold).toBe(40);
    expect(unsold).toBe(40);
  });

  it('the best offer does not depend on the asking price', () => {
    const a = fresh('same'); a.collection = { c12: 2 };
    const b = fresh('same'); b.collection = { c12: 2 };
    const la = applyCommand(a, { type: 'ListCard', cardId: 'c12', min: 100, duration: 2 }, T0).state.auction.listings[0]!;
    const lb = applyCommand(b, { type: 'ListCard', cardId: 'c12', min: 9_000_000, duration: 2 }, T0).state.auction.listings[0]!;
    expect(la.offer).toBe(lb.offer);
  });
});

describe('wire format', () => {
  it('parses auction commands and rejects malformed ones', () => {
    expect(parseCommand({ type: 'PlaceBid', lot: '3:42', max: 5000 })).toEqual({ type: 'PlaceBid', lot: '3:42', max: 5000 });
    expect(parseCommand({ type: 'PlaceBid', lot: '3:42; drop', max: 5000 })).toBeNull();
    expect(parseCommand({ type: 'PlaceBid', lot: '3:42', max: '5000' })).toBeNull();
    expect(parseCommand({ type: 'BuyNow', lot: '0:1', price: 1 })).toEqual({ type: 'BuyNow', lot: '0:1' });
    expect(parseCommand({ type: 'ListCard', cardId: 'c12', min: 100, duration: 1, offer: 1e9 })).toEqual({ type: 'ListCard', cardId: 'c12', min: 100, duration: 1 });
    expect(parseCommand({ type: 'AckAuctions' })).toEqual({ type: 'AckAuctions' });
  });

  it('rejects absurd bids', () => {
    const s = fresh();
    const lot = toClientView(s, T0 + MIN).auction.lots[0]!;
    for (const max of [Number.NaN, -5, 1.5, 1e12]) expect(rejected(s, { type: 'PlaceBid', lot: lot.key, max }, T0 + MIN)).toBeDefined();
  });
});
