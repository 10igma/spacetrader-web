import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CARDS } from './content.ts';
import { applyCommand, createInitialState, deckInfo, parseCommand, toClientView, type GameEvent, type GameState } from './game.ts';
import { CRISIS_NAME, GOOD_BY_ID, GOODS, hopsBetween, isBanned, STATIONS } from './world.ts';

const T0 = 1_800_000_000_000;
const fresh = (seed = 'smug'): GameState => createInitialState(seed, T0);
const row = (s: GameState, goodId: string) => toClientView(s, T0).market.find((m) => m.goodId === goodId)!;
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
const rejected = (events: GameEvent[]) => of(events, 'CommandRejected')?.reason;

/** Put the ship in front of customs at `to` with the given cargo. */
function atCustoms(to: GameState['location'], cargo: GameState['cargo'], seed = 'c'): GameState {
  const s = fresh(seed);
  s.cargo = cargo;
  s.pending = { to, kind: 'customs' };
  return s;
}

describe('law', () => {
  it('free goods are legal everywhere, outlawed goods everywhere but in cartel space', () => {
    for (const g of GOODS) {
      for (const f of ['tessera', 'asche', 'zenit'] as const) {
        if (g.tier === 'free') expect(isBanned(g, f)).toBe(false);
        if (g.tier === 'outlawed') expect(isBanned(g, f)).toBe(true);
        if (g.tier === 'sanctioned') expect(isBanned(g, f)).toBe(g.bannedIn.includes(f));
      }
      expect(isBanned(g, 'helix')).toBe(false);
    }
  });

  it('every sanctioned good is banned somewhere and legal somewhere', () => {
    for (const g of GOODS.filter((x) => x.tier === 'sanctioned')) {
      expect(g.bannedIn.length).toBeGreaterThan(0);
      expect(g.bannedIn.length).toBeLessThan(3);
    }
  });

  it('customs only seizes what the destination faction bans', () => {
    // Lumen is banned by Zenit and Asche, legal in Tessera.
    const cargo = { lumen: { qty: 4, avgCost: 100, heat: 0 }, neurostaub: { qty: 2, avgCost: 100, heat: 0 } };
    let seizedLumen = 0;
    for (let i = 0; i < 40; i++) {
      const tessera = applyCommand(atCustoms('lumen', cargo, `t${i}`), { type: 'Encounter', choice: 'submit' }, T0);
      const ev = of(tessera.events, 'EncounterResolved')!;
      expect(ev.lost.lumen).toBeUndefined();
      const zenit = applyCommand(atCustoms('zenit', cargo, `z${i}`), { type: 'Encounter', choice: 'submit' }, T0);
      if (of(zenit.events, 'EncounterResolved')!.lost.lumen) seizedLumen++;
    }
    expect(seizedLumen).toBeGreaterThan(20);
  });
});

describe('fence', () => {
  it('banned goods trade through the fence at worse prices', () => {
    const s = fresh();
    const g = GOOD_BY_ID.get('neurostaub')!;
    const here = row(s, 'neurostaub'); // Meridian is Tessera: neurostaub is banned
    expect(here.channel).toBe('fence');
    expect(row(s, 'water').channel).toBe('open');
    const list = here.level * g.base;
    expect(here.buy).toBeGreaterThan(list * 1.1);
    expect(here.sell).toBeLessThan(list * 0.9);
    expect(here.sell).toBeGreaterThan(list * 0.8);
  });

  it('has limited volume that refills over jumps, and closes when you are too hot', () => {
    let s = fresh();
    s.wallet.credits = 1_000_000;
    // Room for more than the fence will move.
    s.hold = 4;
    const cap = CONFIG.smuggling.fenceCap;
    expect(rejected(applyCommand(s, { type: 'Buy', goodId: 'neurostaub', qty: cap + 1 }, T0).events)).toBe('fence_limit');
    s = applyCommand(s, { type: 'Buy', goodId: 'neurostaub', qty: cap }, T0).state;
    expect(toClientView(s, T0).fence.left).toBe(0);
    expect(rejected(applyCommand(s, { type: 'Sell', goodId: 'neurostaub', qty: 1 }, T0).events)).toBe('fence_limit');
    // Open-market goods are unaffected.
    expect(of(applyCommand(s, { type: 'Buy', goodId: 'water', qty: 2 }, T0).events, 'Bought')).toBeDefined();

    const hot = fresh();
    hot.wanted.tessera.level = CONFIG.smuggling.fenceClosedAtWanted;
    expect(rejected(applyCommand(hot, { type: 'Buy', goodId: 'neurostaub', qty: 1 }, T0).events)).toBe('fence_closed');
    expect(toClientView(hot, T0).fence.closed).toBe(true);
  });
});

describe('hot cargo', () => {
  it('heat rises per jump for goods that are banned somewhere, raising price and risk', () => {
    let s = fresh('heat');
    s.cargo = { neurostaub: { qty: 5, avgCost: 500, heat: 0 }, water: { qty: 5, avgCost: 20, heat: 0 } };
    const before = toClientView(s, T0).routes[0]!.customsChance;
    for (let i = 0; i < 3; i++) {
      s.fuel.amount = CONFIG.fuel.max;
      s = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).state;
      if (s.pending) s = applyCommand(s, { type: 'Encounter', choice: s.pending.kind === 'pirates' ? 'pay' : 'bribe' }, T0).state;
    }
    if (s.cargo.neurostaub) expect(s.cargo.neurostaub.heat).toBe(3);
    expect(s.cargo.water?.heat ?? 0).toBe(0);

    const cold = fresh('heat2');
    cold.cargo = { neurostaub: { qty: 5, avgCost: 500, heat: 0 } };
    const warm = fresh('heat2');
    warm.cargo = { neurostaub: { qty: 5, avgCost: 500, heat: 4 } };
    expect(row(warm, 'neurostaub').sell).toBeGreaterThan(row(cold, 'neurostaub').sell * 1.25);
    const to = cold.routes.find((r) => STATIONS.find((x) => x.id === r)!.customs > 0)!;
    const chance = (st: GameState) => toClientView(st, T0).routes.find((r) => r.stationId === to)!.customsChance;
    expect(chance(warm)).toBeGreaterThan(chance(cold));
    expect(before).toBeGreaterThanOrEqual(0);
  });

  it('buying fresh units cools a lot down', () => {
    let s = fresh();
    s.location = 'helixtor';
    s.wallet.credits = 100_000;
    s.cargo = { neurostaub: { qty: 2, avgCost: 500, heat: 4 } };
    s = applyCommand(s, { type: 'Buy', goodId: 'neurostaub', qty: 6 }, T0).state;
    expect(s.cargo.neurostaub).toMatchObject({ qty: 8, heat: 1 });
  });
});

describe('wanted level', () => {
  const cargo = { neurostaub: { qty: 3, avgCost: 500, heat: 0 } };

  it('rises when caught, more when a break-through fails, and running a blockade is always noticed', () => {
    let caught = 0, brokeOk = 0, brokeFail = 0;
    for (let i = 0; i < 80; i++) {
      const submit = applyCommand(atCustoms('zenit', cargo, `w${i}`), { type: 'Encounter', choice: 'submit' }, T0);
      const ev = of(submit.events, 'EncounterResolved')!;
      expect(submit.state.wanted.zenit.level).toBe(ev.success ? 0 : 1);
      if (!ev.success) { caught++; expect(submit.state.stats.caught).toBe(1); }

      const run = applyCommand(atCustoms('zenit', cargo, `w${i}`), { type: 'Encounter', choice: 'breakThrough' }, T0);
      const rv = of(run.events, 'EncounterResolved')!;
      expect(run.state.wanted.zenit.level).toBe(rv.success ? 1 : 2);
      expect(rv.wantedDelta).toBe(rv.success ? 1 : 2);
      if (rv.success) brokeOk++; else brokeFail++;
    }
    expect(caught).toBeGreaterThan(40);
    expect(brokeOk).toBeGreaterThan(5);
    expect(brokeFail).toBeGreaterThan(20);
  });

  it('makes customs more likely and fines higher', () => {
    const calm = fresh('wl');
    const hot = fresh('wl');
    const to = calm.routes.find((r) => STATIONS.find((x) => x.id === r)!.customs > 0)!;
    hot.wanted[STATIONS.find((x) => x.id === to)!.faction].level = 3;
    const chance = (s: GameState) => toClientView(s, T0).routes.find((r) => r.stationId === to)!.customsChance;
    expect(chance(hot)).toBeCloseTo(chance(calm) + 3 * CONFIG.wanted.customsPerStar, 5);
  });

  it('cools off over jumps and can be bought off', () => {
    let s = fresh('cool');
    s.wanted.asche = { level: 2, cool: CONFIG.wanted.coolJumps };
    for (let i = 0; i < CONFIG.wanted.coolJumps; i++) {
      s.fuel.amount = CONFIG.fuel.max;
      s = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).state;
      if (s.pending) s = applyCommand(s, { type: 'Encounter', choice: s.pending.kind === 'pirates' ? 'pay' : 'submit' }, T0).state;
    }
    expect(s.wanted.asche.level).toBe(1);

    const p = fresh('pay');
    p.wallet.credits = 5_000;
    p.wanted.tessera.level = 2;
    expect(toClientView(p, T0).payOff).toBe(2 * CONFIG.wanted.payOffPerStar);
    const res = applyCommand(p, { type: 'PayOff' }, T0);
    expect(res.state.wanted.tessera.level).toBe(1);
    expect(res.state.wallet.credits).toBe(p.wallet.credits - 2 * CONFIG.wanted.payOffPerStar);
    expect(rejected(applyCommand(fresh(), { type: 'PayOff' }, T0).events)).toBe('not_wanted');
  });
});

describe('deck', () => {
  const own = (s: GameState, ...ids: string[]): void => { for (const id of ids) s.collection[id] = 1; };

  it('an empty deck gives no bonus', () => {
    expect(deckInfo(fresh().deck).bonus).toEqual({ nav: 0, hdl: 0, tec: 0, kmp: 0, smg: 0 });
  });

  it('a card counts fully in its own role and less elsewhere', () => {
    const s = fresh();
    own(s, 'c20'); // Raffa Delacroix, pilot, nav 95
    const onRole = applyCommand(s, { type: 'SetSeat', seat: 'pilot', cardId: 'c20' }, T0).state;
    const offRole = applyCommand(s, { type: 'SetSeat', seat: 'gunner', cardId: 'c20' }, T0).state;
    expect(deckInfo(onRole.deck).seats.pilot).toMatchObject({ value: 95, onRole: true });
    expect(deckInfo(offRole.deck).seats.gunner).toMatchObject({ value: Math.round(74 * CONFIG.deck.offRole), onRole: false });
  });

  it('same-faction crew builds chemistry', () => {
    const s = fresh();
    own(s, 'c20', 'c21', 'c11', 'c18'); // three Tessera, one Asche
    let st = applyCommand(s, { type: 'SetSeat', seat: 'pilot', cardId: 'c20' }, T0).state;
    const solo = deckInfo(st.deck).seats.pilot!.value;
    st = applyCommand(st, { type: 'SetSeat', seat: 'trader', cardId: 'c21' }, T0).state;
    st = applyCommand(st, { type: 'SetSeat', seat: 'smuggler', cardId: 'c11' }, T0).state;
    st = applyCommand(st, { type: 'SetSeat', seat: 'gunner', cardId: 'c18' }, T0).state;
    const info = deckInfo(st.deck);
    expect(info.seats.pilot).toMatchObject({ links: 2 });
    expect(info.seats.gunner).toMatchObject({ links: 0 });
    expect(info.seats.pilot!.value).toBeGreaterThan(solo);
    expect(info.chem).toBe(Math.round((6 / 20) * 100));
  });

  it('a card can only sit in one seat, and only owned cards can be seated', () => {
    const s = fresh();
    own(s, 'c20');
    let st = applyCommand(s, { type: 'SetSeat', seat: 'pilot', cardId: 'c20' }, T0).state;
    st = applyCommand(st, { type: 'SetSeat', seat: 'trader', cardId: 'c20' }, T0).state;
    expect(st.deck).toMatchObject({ pilot: null, trader: 'c20' });
    expect(rejected(applyCommand(s, { type: 'SetSeat', seat: 'pilot', cardId: 'c24' }, T0).events)).toBe('card_not_owned');
    expect(rejected(applyCommand(s, { type: 'SetSeat', seat: 'pilot', cardId: 'nope' }, T0).events)).toBe('card_not_owned');
  });

  it('auto deck seats every specialist in their role when the whole set is owned', () => {
    const s = fresh();
    own(s, ...CARDS.map((c) => c.id));
    const st = applyCommand(s, { type: 'AutoDeck' }, T0).state;
    const info = deckInfo(st.deck);
    expect(new Set(Object.values(st.deck)).size).toBe(5);
    for (const seat of ['pilot', 'trader', 'tech', 'gunner'] as const) expect(info.seats[seat]!.value).toBeGreaterThanOrEqual(97);
  });

  it('new cards from a crate take the empty seat of their role', () => {
    const res = applyCommand(fresh('seat'), { type: 'ClaimFreeCrate' }, T0);
    const pulls = of(res.events, 'CrateOpened')!.pulls;
    const seated = Object.values(res.state.deck).filter(Boolean);
    expect(seated.length).toBeGreaterThan(0);
    for (const id of seated) expect(pulls.some((p) => p.cardId === id)).toBe(true);
  });

  it('the deck changes the odds the player is shown', () => {
    const base = fresh('odds');
    base.pending = { to: 'kessin', kind: 'pirates' };
    const strong = fresh('odds');
    strong.pending = { to: 'kessin', kind: 'pirates' };
    strong.collection = { c22: 1 };
    strong.deck.gunner = 'c22'; // Kazimir Voss, kmp 99
    const fight = (s: GameState) => toClientView(s, T0).encounter!.options.find((o) => o.id === 'fight')!.chance;
    expect(fight(base)).toBeCloseTo(CONFIG.encounter.fight.base, 5);
    expect(fight(strong)).toBeCloseTo(CONFIG.encounter.fight.base + CONFIG.encounter.fight.crew * ((99 - 40) / 60), 5);
  });
});

describe('crises', () => {
  const wander = (seed: string, jumps: number, each: (s: GameState, before: GameState) => void): void => {
    let s = fresh(seed);
    for (let i = 0; i < jumps; i++) {
      s.fuel.amount = CONFIG.fuel.max;
      const before = s;
      s = applyCommand(s, { type: 'Jump', to: s.routes[i % s.routes.length]! }, T0).state;
      if (s.pending) s = applyCommand(s, { type: 'Encounter', choice: s.pending.kind === 'pirates' ? 'pay' : 'submit' }, T0).state;
      each(s, before);
    }
  };

  it('start far away, raise their category there and say how long the demand will last', () => {
    let started = 0;
    wander('ev', 120, (s, before) => {
      expect(s.events.length).toBeLessThanOrEqual(CONFIG.marketEvent.max);
      expect(new Set(s.events.map((e) => e.stationId)).size).toBe(s.events.length);
      for (const e of s.events) {
        const fresh = !before.events.some((x) => x.stationId === e.stationId && x.category === e.category);
        if (!fresh) continue;
        started++;
        const hops = hopsBetween(s.location, e.stationId);
        expect(hops).toBeGreaterThanOrEqual(CONFIG.marketEvent.minHops);
        expect(e.mult).toBeGreaterThanOrEqual(CONFIG.marketEvent.multMin);
        // A direct run arrives while there is still demand.
        expect(e.demand - e.drain * hops).toBeGreaterThan(0);
        const view = toClientView(s, T0).events.find((x) => x.stationId === e.stationId)!;
        expect(view).toMatchObject({ hops, onArrival: e.demand - e.drain * hops, name: CRISIS_NAME[e.category] });
      }
    });
    expect(started).toBeGreaterThan(8);
  });

  it('the demand drops by the announced amount with every jump, and the crisis ends when it is met', () => {
    let checked = 0;
    let ended = 0;
    wander('drain', 120, (s, before) => {
      for (const old of before.events) {
        const now = s.events.find((x) => x.stationId === old.stationId && x.category === old.category);
        if (now) { expect(now.demand).toBe(old.demand - old.drain); checked++; } else { expect(old.demand - old.drain).toBeLessThanOrEqual(0); ended++; }
      }
    });
    expect(checked).toBeGreaterThan(20);
    expect(ended).toBeGreaterThan(3);
  });

  it('your own delivery counts against the demand and can end the crisis', () => {
    const s = fresh('deliver');
    const good = GOODS.find((g) => g.category === 'waffen' && !isBanned(g, STATIONS.find((x) => x.id === s.location)!.faction))!;
    s.events = [{ stationId: s.location, category: 'waffen', mult: 1.8, demand: 10, drain: 5 }];
    s.cargo = { [good.id]: { qty: 20, avgCost: 10, heat: 0 } };
    const calm = { ...s, events: [] };
    const price = (st: GameState) => toClientView(st, T0).market.find((r) => r.goodId === good.id)!.sell;
    expect(price(s) / price(calm)).toBeCloseTo(1.8, 1);
    const first = applyCommand(s, { type: 'Sell', goodId: good.id, qty: 4 }, T0);
    expect(first.state.events[0]!.demand).toBe(6);
    const second = applyCommand(first.state, { type: 'Sell', goodId: good.id, qty: 6 }, T0);
    expect(second.state.events).toEqual([]);
    expect(second.events.find((e) => e.type === 'MarketEventEnded')).toMatchObject({ byYou: true, category: 'waffen' });
    // The next unit sells at the ordinary price again.
    expect(price(second.state)).toBeLessThan(price(first.state) * 0.75);
  });
});

describe('wire format', () => {
  it('parses deck and pay-off commands and rejects malformed ones', () => {
    expect(parseCommand({ type: 'SetSeat', seat: 'pilot', cardId: 'c01' })).toEqual({ type: 'SetSeat', seat: 'pilot', cardId: 'c01' });
    expect(parseCommand({ type: 'SetSeat', seat: 'pilot', cardId: null })).toEqual({ type: 'SetSeat', seat: 'pilot', cardId: null });
    expect(parseCommand({ type: 'SetSeat', seat: 'captain', cardId: 'c01' })).toBeNull();
    expect(parseCommand({ type: 'SetSeat', seat: 'pilot', cardId: 7 })).toBeNull();
    expect(parseCommand({ type: 'PayOff', amount: 0 })).toEqual({ type: 'PayOff' });
    expect(parseCommand({ type: 'AutoDeck' })).toEqual({ type: 'AutoDeck' });
  });
});
