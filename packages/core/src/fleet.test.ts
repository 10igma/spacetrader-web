import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CARDS, CARDS_BY_FACTION } from './content.ts';
import { convoyChance, convoyPayout, convoyStrength, MODULES, rigOf, SHIP_BY_ID, SHIPS } from './fleet.ts';
import { applyCommand, createInitialState, parseCommand, SEATS, toClientView, type Command, type GameEvent, type GameState } from './game.ts';
import { minutesCost } from './meta.ts';
import { seedRng } from './rng.ts';
import { GOODS, isBanned, STATIONS } from './world.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const T0 = 1_800_000_000_000;
const fresh = (seed = 'fleet'): GameState => createInitialState(seed, T0);
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (s: GameState, cmd: Command, now = T0) => of(applyCommand(s, cmd, now).events, 'CommandRejected')?.reason;
const run = (s: GameState, cmd: Command, now = T0): GameState => {
  const res = applyCommand(s, cmd, now);
  expect(of(res.events, 'CommandRejected')?.reason).toBeUndefined();
  return res.state;
};
const rich = (seed?: string): GameState => {
  const s = fresh(seed);
  s.wallet.credits = 10_000_000;
  s.profile.level = 30;
  return s;
};

describe('ships', () => {
  it('the catalogue is a ladder: every ship costs more and needs a higher level than the one before', () => {
    for (let i = 1; i < SHIPS.length; i++) {
      expect(SHIPS[i]!.price).toBeGreaterThan(SHIPS[i - 1]!.price);
      expect(SHIPS[i]!.level).toBeGreaterThan(SHIPS[i - 1]!.level);
    }
    expect(fresh().fleet).toEqual({ owned: ['sperling'], active: 'sperling', modules: {}, fitted: [] });
  });

  it('buying needs level and credits, takes the price and moves you in', () => {
    const s = fresh();
    const kormoran = SHIP_BY_ID.get('kormoran')!;
    s.wallet.credits = kormoran.price;
    expect(rejected(s, { type: 'BuyShip', ship: 'kormoran' })).toBe('level_too_low');
    s.profile.level = kormoran.level;
    s.wallet.credits = kormoran.price - 1;
    expect(rejected(s, { type: 'BuyShip', ship: 'kormoran' })).toBe('not_enough_credits');
    s.wallet.credits = kormoran.price;
    const before = toClientView(s, T0);
    const res = applyCommand(s, { type: 'BuyShip', ship: 'kormoran' }, T0);
    expect(res.state.wallet.credits).toBe(0);
    expect(res.state.fleet).toMatchObject({ owned: ['sperling', 'kormoran'], active: 'kormoran' });
    expect(of(res.events, 'ShipSelected')).toBeDefined();
    const after = toClientView(res.state, T0);
    expect(after.cargo.cap).toBe(before.cargo.cap + kormoran.hold);
    expect(rejected(res.state, { type: 'BuyShip', ship: 'kormoran' })).toBe('already_owned');
  });

  it('a bigger tank shows up in the view and a level-up fills it', () => {
    let s = rich();
    s = run(s, { type: 'BuyShip', ship: 'leviathan' });
    const max = CONFIG.fuel.max + SHIP_BY_ID.get('leviathan')!.fuel;
    expect(toClientView(s, T0).fuel.max).toBe(max);
    // Fuel does not appear from nowhere on the move.
    expect(s.fuel.amount).toBe(CONFIG.fuel.max);
    expect(toClientView(s, T0 + DAY).fuel.amount).toBe(max);
  });

  it('you can only fly what you own, and cargo has to fit', () => {
    let s = rich();
    expect(rejected(s, { type: 'SelectShip', ship: 'basilisk' })).toBe('not_owned');
    s = run(s, { type: 'BuyShip', ship: 'leviathan' });
    expect(rejected(s, { type: 'SelectShip', ship: 'leviathan' })).toBe('invalid_choice');
    const cap = toClientView(s, T0).cargo.cap;
    s.cargo = { water: { qty: cap, avgCost: 10, heat: 0 } };
    expect(rejected(s, { type: 'SelectShip', ship: 'sperling' })).toBe('no_cargo_space');
    s.cargo = {};
    s = run(s, { type: 'SelectShip', ship: 'sperling' });
    expect(s.fleet.active).toBe('sperling');
    // Back in the small ship the tank is small again.
    expect(s.fuel.amount).toBeLessThanOrEqual(CONFIG.fuel.max);
  });

  it('the server only accepts known ships and modules', () => {
    expect(parseCommand({ type: 'BuyShip', ship: 'deathstar' })).toBeNull();
    expect(parseCommand({ type: 'BuyShip', ship: 'lanze' })).toEqual({ type: 'BuyShip', ship: 'lanze' });
    expect(parseCommand({ type: 'BuyModule', module: 'cloak' })).toBeNull();
    expect(parseCommand({ type: 'SendConvoy', offer: 0, cards: ['c01', 7] })).toBeNull();
    expect(parseCommand({ type: 'ClaimConvoy', slot: '0' })).toBeNull();
  });
});

describe('modules', () => {
  it('fit themselves while a slot is free, and only fitted modules count', () => {
    let s = rich();
    s = run(s, { type: 'BuyModule', module: 'pods' });
    expect(s.fleet.fitted).toEqual(['pods']);
    expect(rigOf(s.fleet).hold).toBe(MODULES.find((m) => m.id === 'pods')!.values[0]);
    // The Sperling has one slot.
    s = run(s, { type: 'BuyModule', module: 'shield' });
    expect(s.fleet.fitted).toEqual(['pods']);
    expect(rigOf(s.fleet).fight).toBe(0);
    expect(rejected(s, { type: 'FitModule', module: 'shield' })).toBe('no_free_slot');
    expect(rejected(s, { type: 'FitModule', module: 'jammer' })).toBe('not_owned');
    s = run(s, { type: 'UnfitModule', module: 'pods' });
    s = run(s, { type: 'FitModule', module: 'shield' });
    expect(rigOf(s.fleet)).toMatchObject({ hold: 0, fight: 0.04 });
  });

  it('have three levels with rising prices', () => {
    let s = rich();
    const def = MODULES.find((m) => m.id === 'jammer')!;
    for (let level = 1; level <= 3; level++) {
      const before = s.wallet.credits;
      s = run(s, { type: 'BuyModule', module: 'jammer' });
      expect(before - s.wallet.credits).toBe(def.prices[level - 1]);
      expect(rigOf(s.fleet).stealth).toBeCloseTo(def.values[level - 1]!, 5);
    }
    expect(rejected(s, { type: 'BuyModule', module: 'jammer' })).toBe('max_level');
    s.wallet.credits = 0;
    expect(rejected(s, { type: 'BuyModule', module: 'pods' })).toBe('not_enough_credits');
  });

  it('a smaller ship keeps only as many modules as it has slots, and cargo pods cannot come out under a full hold', () => {
    let s = rich();
    s = run(s, { type: 'BuyShip', ship: 'lanze' });
    for (const m of ['pods', 'shield', 'drive'] as const) s = run(s, { type: 'BuyModule', module: m });
    expect(s.fleet.fitted).toEqual(['pods', 'shield', 'drive']);
    s.cargo = { water: { qty: toClientView(s, T0).cargo.cap, avgCost: 10, heat: 0 } };
    expect(rejected(s, { type: 'UnfitModule', module: 'pods' })).toBe('no_cargo_space');
    s.cargo = {};
    s = run(s, { type: 'SelectShip', ship: 'sperling' });
    expect(s.fleet.fitted).toEqual(['pods']);
  });

  it('the charger shortens the wait for fuel', () => {
    let s = rich();
    s.fuel = { amount: 0, updatedAt: T0 };
    expect(toClientView(s, T0).fuel.nextAt).toBe(T0 + CONFIG.fuel.regenMs);
    s = run(s, { type: 'BuyModule', module: 'charger' });
    s.fuel = { amount: 0, updatedAt: T0 };
    expect(toClientView(s, T0).fuel.nextAt).toBe(T0 + CONFIG.fuel.regenMs * 0.9);
  });

  it('ship and modules move the odds of an encounter that are shown and rolled', () => {
    const station = STATIONS.find((x) => x.id !== fresh().location)!;
    const chance = (s: GameState, kind: 'pirates' | 'customs', id: string): number => {
      s.pending = { to: station.id, kind };
      return toClientView(s, T0).encounter!.options.find((o) => o.id === id)!.chance;
    };
    const plain = rich();
    let s = rich();
    s = run(s, { type: 'BuyShip', ship: 'basilisk' });
    for (const m of ['shield', 'drive', 'jammer'] as const) s = run(s, { type: 'BuyModule', module: m });
    const hull = SHIP_BY_ID.get('basilisk')!;
    expect(chance(s, 'pirates', 'fight')).toBeCloseTo(chance(plain, 'pirates', 'fight') + hull.fight + 0.04, 5);
    expect(chance(s, 'pirates', 'flee')).toBeCloseTo(chance(plain, 'pirates', 'flee') + hull.flee + 0.04, 5);
    expect(chance(s, 'customs', 'breakThrough')).toBeCloseTo(chance(plain, 'customs', 'breakThrough') + hull.flee + 0.04, 5);
    // Scans only matter with banned cargo on board.
    const banned = GOODS.find((g) => isBanned(g, station.faction))!;
    plain.cargo = { [banned.id]: { qty: 5, avgCost: 10, heat: 0 } };
    s.cargo = { [banned.id]: { qty: 5, avgCost: 10, heat: 0 } };
    expect(chance(s, 'customs', 'submit')).toBeCloseTo(chance(plain, 'customs', 'submit') + hull.stealth + 0.04, 5);
  });

  it('the stash keeps its units through a failed scan, most valuable first', () => {
    const station = STATIONS.find((x) => x.id !== fresh().location && GOODS.filter((g) => isBanned(g, x.faction)).length >= 2)!;
    const banned = GOODS.filter((g) => isBanned(g, station.faction)).sort((a, b) => b.base - a.base);
    const [dear, cheap] = [banned[0]!, banned[banned.length - 1]!];
    let caught = 0;
    for (let i = 0; i < 40 && caught < 3; i++) {
      let s = rich();
      s = run(s, { type: 'BuyModule', module: 'stash' });
      s.cargo = { [dear.id]: { qty: 2, avgCost: 10, heat: 0 }, [cheap.id]: { qty: 5, avgCost: 10, heat: 0 }, water: { qty: 4, avgCost: 10, heat: 0 } };
      s.pending = { to: station.id, kind: 'customs' };
      s.rng.travel = seedRng(`stash${i}`);
      const res = applyCommand(s, { type: 'Encounter', choice: 'submit' }, T0);
      const ev = of(res.events, 'EncounterResolved')!;
      if (ev.success) continue;
      caught += 1;
      // Level 1 hides three units: both dear ones and one cheap one.
      expect(ev.hidden).toBe(3);
      expect(res.state.cargo[dear.id]?.qty).toBe(2);
      expect(res.state.cargo[cheap.id]?.qty).toBe(1);
      expect(ev.lost).toEqual({ [cheap.id]: 4 });
      expect(res.state.cargo.water?.qty).toBe(4);
    }
    expect(caught).toBe(3);
  });
});

describe('convoys', () => {
  const crewed = (seed = 'convoy'): GameState => {
    const s = fresh(seed);
    for (const c of CARDS.slice(0, 40)) s.collection[c.id] = 1;
    return applyCommand(s, { type: 'AutoDeck' }, T0).state;
  };
  const reserve = (s: GameState): string[] => {
    const seated = new Set(SEATS.map((seat) => s.deck[seat]));
    const away = new Set(s.convoys.flatMap((c) => c.cards));
    return Object.keys(s.collection).filter((id) => !seated.has(id) && !away.has(id));
  };

  it('contracts ask for more and pay more as the captain levels up', () => {
    const low = fresh('grow');
    const high = fresh('grow');
    high.profile.level = 20;
    // Today's contracts were drawn at the start. Tomorrow's see the level.
    const a = toClientView(low, T0 + DAY).convoys.offers;
    const b = toClientView(high, T0 + DAY).convoys.offers;
    for (let i = 0; i < a.length; i++) {
      expect(b[i]!.need).toBeGreaterThan(a[i]!.need * 1.5);
      expect(b[i]!.reward.credits!).toBeGreaterThan(a[i]!.reward.credits! * 3);
    }
  });

  it('four contracts a day, new ones tomorrow', () => {
    const s = fresh();
    const today = toClientView(s, T0).convoys.offers;
    expect(today.map((o) => o.hours)).toEqual([1, 1, 4, 8]);
    expect(today.every((o) => !o.taken && o.need > 0 && (o.reward.credits ?? 0) > 0)).toBe(true);
    const tomorrow = toClientView(s, T0 + DAY).convoys.offers;
    expect(tomorrow).not.toEqual(today);
  });

  it('crew of the right faction and role counts for more, and the chance is strength over need', () => {
    const card = CARDS_BY_FACTION.helix[0]!;
    const plain = convoyStrength({ faction: 'zenit', role: card.role === 'pilot' ? 'trader' : 'pilot' }, card.id);
    expect(plain).toBe(card.rating);
    expect(convoyStrength({ faction: 'helix', role: card.role }, card.id)).toBe(Math.round(card.rating * CONFIG.convoy.factionBonus * CONFIG.convoy.roleBonus));
    expect(convoyStrength({ faction: 'zenit', role: 'pilot' }, card.id, 3)).toBeGreaterThan(convoyStrength({ faction: 'zenit', role: 'pilot' }, card.id, 1));
    const offer = { faction: 'zenit' as const, role: card.role === 'pilot' ? 'trader' as const : 'pilot' as const, need: card.rating * 2 };
    expect(convoyChance(offer, [card.id])).toBe(0.5);
    expect(convoyChance({ ...offer, need: 10 }, [card.id])).toBe(1);
    expect(convoyChance({ ...offer, need: 100_000 }, [card.id])).toBe(CONFIG.convoy.minChance);
  });

  it('only free reserve crew can go: owned, not on the bridge, not already away, no card twice', () => {
    const s = crewed();
    const team = reserve(s).slice(0, 3);
    const seated = s.deck.pilot!;
    expect(rejected(s, { type: 'SendConvoy', offer: 0, cards: [] })).toBe('invalid_team');
    expect(rejected(s, { type: 'SendConvoy', offer: 0, cards: [team[0]!, team[0]!] })).toBe('invalid_team');
    expect(rejected(s, { type: 'SendConvoy', offer: 0, cards: reserve(s).slice(0, CONFIG.convoy.crew + 1) })).toBe('invalid_team');
    expect(rejected(s, { type: 'SendConvoy', offer: 0, cards: ['c999'] })).toBe('card_not_owned');
    expect(rejected(s, { type: 'SendConvoy', offer: 0, cards: [seated] })).toBe('card_busy');
    expect(rejected(s, { type: 'SendConvoy', offer: 9, cards: team })).toBe('no_such_contract');
    const res = applyCommand(s, { type: 'SendConvoy', offer: 0, cards: team }, T0);
    const sent = of(res.events, 'ConvoySent')!;
    const view = toClientView(res.state, T0).convoys;
    expect(sent.chance).toBe(convoyChance(view.offers[0]!, team, res.state.cardLevels));
    expect(view.running[0]).toMatchObject({ cards: team, endsAt: T0 + HOUR, done: false, chance: sent.chance });
    expect(view.offers[0]!.taken).toBe(true);
    expect(view.busy).toEqual(team);
    expect(rejected(res.state, { type: 'SendConvoy', offer: 0, cards: reserve(res.state).slice(0, 1) })).toBe('no_such_contract');
    expect(rejected(res.state, { type: 'SendConvoy', offer: 1, cards: [team[0]!] })).toBe('card_busy');
  });

  it('crew that is away cannot take a seat, and auto-deck leaves them out', () => {
    let s = crewed();
    const best = s.deck.pilot!;
    s = run(s, { type: 'SetSeat', seat: 'pilot', cardId: null });
    s = run(s, { type: 'SendConvoy', offer: 0, cards: [best] });
    expect(rejected(s, { type: 'SetSeat', seat: 'pilot', cardId: best })).toBe('card_busy');
    s = run(s, { type: 'AutoDeck' });
    expect(SEATS.map((seat) => s.deck[seat])).not.toContain(best);
    expect(s.deck.pilot).not.toBeNull();
  });

  it('two convoys at a time', () => {
    let s = crewed();
    for (let i = 0; i < CONFIG.convoy.slots; i++) s = run(s, { type: 'SendConvoy', offer: i, cards: reserve(s).slice(0, 2) });
    expect(rejected(s, { type: 'SendConvoy', offer: CONFIG.convoy.slots, cards: reserve(s).slice(0, 2) })).toBe('no_free_slot');
  });

  it('pays on return, not before, and survives the change of day', () => {
    let s = crewed();
    s = run(s, { type: 'SendConvoy', offer: 3, cards: reserve(s).slice(0, 3) });
    const end = T0 + 8 * HOUR;
    expect(rejected(s, { type: 'ClaimConvoy', slot: 0 }, end - 1)).toBe('slot_not_ready');
    expect(rejected(s, { type: 'ClaimConvoy', slot: 1 }, end)).toBe('no_such_slot');
    const late = T0 + 2 * DAY;
    expect(toClientView(s, late).convoys.running[0]).toMatchObject({ done: true, rushCost: 0 });
    expect(toClientView(s, late).badges.deck).toBeGreaterThanOrEqual(1);
    const offer = s.convoys[0]!.offer;
    const res = applyCommand(s, { type: 'ClaimConvoy', slot: 0 }, late);
    const back = of(res.events, 'ConvoyReturned')!;
    expect(back).toMatchObject(convoyPayout(offer, back.success));
    expect(res.state.wallet.credits - s.wallet.credits).toBe(back.reward.credits);
    expect(res.state.convoys).toEqual([]);
    expect(Object.keys(res.state.collection)).toEqual(Object.keys(s.collection));
  });

  it('succeeds as often as the chance on screen says, and a failure still pays a share', () => {
    const base = crewed();
    // One card alone on the long contract: far from certain.
    const weakest = reserve(base).sort((a, b) => convoyStrength(base.daily.convoys[3]!, b) - convoyStrength(base.daily.convoys[3]!, a))[0]!;
    const sent = run(base, { type: 'SendConvoy', offer: 3, cards: [weakest] });
    const chance = sent.convoys[0]!.chance;
    expect(chance).toBeGreaterThan(CONFIG.convoy.minChance);
    expect(chance).toBeLessThan(0.6);
    let wins = 0;
    const n = 1_500;
    for (let i = 0; i < n; i++) {
      const s = JSON.parse(JSON.stringify(sent)) as GameState;
      s.rng.convoy = seedRng(`roll${i}`);
      const res = applyCommand(s, { type: 'ClaimConvoy', slot: 0 }, T0 + 9 * HOUR);
      const back = of(res.events, 'ConvoyReturned')!;
      if (back.success) wins += 1;
      else {
        expect(back.reward).toEqual({ credits: Math.round(((sent.convoys[0]!.offer.reward.credits ?? 0) * CONFIG.convoy.failShare) / 50) * 50 });
        expect(res.state.collection[weakest]).toBe(1);
      }
    }
    expect(wins / n).toBeGreaterThan(chance - 0.04);
    expect(wins / n).toBeLessThan(chance + 0.04);
  });

  it('rushing costs quanta by the time left', () => {
    let s = crewed();
    s = run(s, { type: 'SendConvoy', offer: 2, cards: reserve(s).slice(0, 3) });
    const now = T0 + HOUR;
    const cost = minutesCost(3 * HOUR);
    expect(toClientView(s, now).convoys.running[0]!.rushCost).toBe(cost);
    s.wallet.quanta = cost - 1;
    expect(rejected(s, { type: 'RushConvoy', slot: 0 }, now)).toBe('not_enough_quanta');
    s.wallet.quanta = cost;
    s = run(s, { type: 'RushConvoy', slot: 0 }, now);
    expect(s.wallet.quanta).toBe(0);
    expect(rejected(s, { type: 'RushConvoy', slot: 0 }, now)).toBe('not_claimable');
    expect(of(applyCommand(s, { type: 'ClaimConvoy', slot: 0 }, now).events, 'ConvoyReturned')).toBeDefined();
  });
});
