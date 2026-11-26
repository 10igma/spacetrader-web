import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { applyCommand, createInitialState, holdCap, parseCommand, quote, toClientView, type GameEvent, type GameState, type MarketRow } from './game.ts';
import { seedRng } from './rng.ts';
import { courseTo, GOODS, hopsBetween, LANES, neighbours, STATIONS } from './world.ts';

const T0 = 1_800_000_000_000;
const fresh = (seed = 'trade'): GameState => createInitialState(seed, T0);
const price = (s: GameState, goodId: string): MarketRow => toClientView(s, T0).market.find((m) => m.goodId === goodId)!;
const of = <T extends GameEvent['type']>(events: GameEvent[], type: T): Extract<GameEvent, { type: T }> | undefined =>
  events.find((e): e is Extract<GameEvent, { type: T }> => e.type === type);

/** Jump until an encounter of the wanted kind is pending. */
function untilEncounter(kind: 'pirates' | 'customs', prepare?: (s: GameState) => void): GameState {
  for (let i = 0; i < 400; i++) {
    let s = fresh(`enc-${kind}-${i}`);
    prepare?.(s);
    for (let j = 0; j < CONFIG.fuel.max; j++) {
      const res = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0);
      s = res.state;
      if (s.pending?.kind === kind) return s;
      if (s.pending) break;
    }
  }
  throw new Error(`no ${kind} encounter found`);
}

describe('trading', () => {
  it('buying moves credits into cargo at the quoted total', () => {
    const s = fresh();
    const cost = quote(price(s, 'water'), 'buy', 5);
    const res = applyCommand(s, { type: 'Buy', goodId: 'water', qty: 5 }, T0);
    expect(res.state.wallet.credits).toBe(CONFIG.startCredits - cost);
    expect(res.state.cargo.water).toEqual({ qty: 5, avgCost: cost / 5, heat: 0 });
    expect(res.events).toEqual([{ type: 'Bought', goodId: 'water', qty: 5, cost }]);
  });

  it('large lots move the price: buying gets dearer, selling cheaper, and the market remembers', () => {
    const s = fresh();
    s.wallet.credits = 1_000_000;
    const row = price(s, 'machines');
    expect(quote(row, 'buy', 20)).toBeGreaterThan(row.buy * 20 * 1.05);
    expect(quote(row, 'sell', 20)).toBeLessThan(row.sell * 20 * 0.95);
    const after = applyCommand(s, { type: 'Buy', goodId: 'machines', qty: 20 }, T0).state;
    expect(price(after, 'machines').buy).toBeGreaterThan(row.buy * 1.1);
    // Buying and selling straight back always loses money, at any size.
    for (const qty of [1, 5, 20]) {
      let st = applyCommand(s, { type: 'Buy', goodId: 'machines', qty }, T0).state;
      st = applyCommand(st, { type: 'Sell', goodId: 'machines', qty }, T0).state;
      expect(st.wallet.credits).toBeLessThan(s.wallet.credits);
    }
  });

  it('selling where you bought always loses money (no free loop)', () => {
    for (const g of GOODS) {
      const { buy, sell } = price(fresh(), g.id);
      expect(sell).toBeLessThan(buy);
    }
  });

  it('enforces cargo space, funds and ownership', () => {
    const s = fresh();
    expect(applyCommand(s, { type: 'Buy', goodId: 'water', qty: holdCap(0) + 1 }, T0).events[0])
      .toEqual({ type: 'CommandRejected', reason: 'no_cargo_space' });
    expect(applyCommand(s, { type: 'Buy', goodId: 'art', qty: 20 }, T0).events[0])
      .toEqual({ type: 'CommandRejected', reason: 'not_enough_credits' });
    expect(applyCommand(s, { type: 'Sell', goodId: 'water', qty: 1 }, T0).events[0])
      .toEqual({ type: 'CommandRejected', reason: 'not_in_cargo' });
  });

  it('rejects nonsense quantities', () => {
    const s = fresh();
    for (const qty of [0, -3, 1.5, Number.NaN, 1e9]) {
      expect(applyCommand(s, { type: 'Buy', goodId: 'water', qty }, T0).events[0]?.type).toBe('CommandRejected');
      expect(applyCommand(s, { type: 'Sell', goodId: 'water', qty }, T0).events[0]?.type).toBe('CommandRejected');
    }
  });

  it('profit is revenue minus average cost', () => {
    let s = fresh();
    s = applyCommand(s, { type: 'Buy', goodId: 'ore', qty: 4 }, T0).state;
    const cost = s.cargo.ore!.avgCost;
    s.market[s.location].ore = 0.45; // price spike while docked
    const revenue = quote(price(s, 'ore'), 'sell', 4);
    const res = applyCommand(s, { type: 'Sell', goodId: 'ore', qty: 4 }, T0);
    expect(of(res.events, 'Sold')).toMatchObject({ revenue, profit: Math.round(revenue - cost * 4) });
    expect(res.state.cargo.ore).toBeUndefined();
  });
});

describe('travel', () => {
  it('the sector is one connected chart, and far corners are several jumps apart', () => {
    expect(STATIONS).toHaveLength(12);
    for (const [a, b] of LANES) { expect(a).not.toBe(b); expect(neighbours(a)).toContain(b); expect(neighbours(b)).toContain(a); }
    const spans = STATIONS.flatMap((a) => STATIONS.map((b) => hopsBetween(a.id, b.id)));
    expect(Math.max(...spans)).toBe(4);
    for (const a of STATIONS) {
      expect(neighbours(a.id).length).toBeGreaterThanOrEqual(2);
      for (const b of STATIONS) if (a.id !== b.id) expect(hopsBetween(a.id, b.id)).toBeGreaterThan(0);
    }
    // A course is a chain of lanes that ends at the target.
    const course = courseTo('solace', 'varn');
    expect(course).toHaveLength(4);
    expect(course[course.length - 1]).toBe('varn');
    ['solace', ...course].reduce((at, next) => { expect(neighbours(at as never)).toContain(next); return next; });
    expect(courseTo('meridian', 'meridian')).toEqual([]);
  });

  it('from a station you can jump along its lanes and nowhere else', () => {
    const s = fresh();
    expect(s.routes).toEqual([...neighbours(s.location)]);
    expect(s.routes).not.toContain(s.location);
    const after = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).state;
    const landed = after.pending ? applyCommand(after, { type: 'Encounter', choice: after.pending.kind === 'pirates' ? 'pay' : 'submit' }, T0).state : after;
    expect(landed.routes).toEqual([...neighbours(landed.location)]);
  });

  it('a jump costs fuel and ends at the destination or in an encounter', () => {
    const s = fresh();
    const to = s.routes[0]!;
    const res = applyCommand(s, { type: 'Jump', to }, T0);
    expect(res.state.fuel.amount).toBe(CONFIG.fuel.max - 1);
    expect(res.events[0]).toEqual({ type: 'JumpStarted', from: 'meridian', to });
    if (res.state.pending) expect(res.state.location).toBe('meridian');
    else expect(res.state.location).toBe(to);
  });

  it('rejects unknown routes and empty tanks', () => {
    const s = fresh();
    const elsewhere = STATIONS.find((x) => x.id !== s.location && !s.routes.includes(x.id))!.id;
    expect(applyCommand(s, { type: 'Jump', to: elsewhere }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'no_such_route' });
    s.fuel.amount = 0;
    expect(applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'no_fuel' });
  });

  it('while an encounter is pending, only an encounter choice is accepted', () => {
    const s = untilEncounter('pirates');
    expect(applyCommand(s, { type: 'Buy', goodId: 'water', qty: 1 }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'encounter_pending' });
    expect(applyCommand(s, { type: 'Encounter', choice: 'bribe' }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'invalid_choice' });
    const res = applyCommand(s, { type: 'Encounter', choice: 'pay' }, T0);
    expect(of(res.events, 'EncounterResolved')?.success).toBe(true);
    expect(res.state.pending).toBeNull();
    expect(res.state.location).toBe(s.pending!.to);
  });

  it('customs: clean cargo always passes a scan, contraband can be seized and fined', () => {
    const clean = untilEncounter('customs');
    const pass = applyCommand(clean, { type: 'Encounter', choice: 'submit' }, T0);
    expect(of(pass.events, 'EncounterResolved')).toMatchObject({ success: true, creditsDelta: 0, lost: {} });

    let caught = 0, runs = 0;
    for (let i = 0; i < 300 && runs < 60; i++) {
      let s: GameState;
      try {
        s = untilEncounter('customs', (x) => { x.cargo = { neurostaub: { qty: 6, avgCost: 500, heat: 0 }, water: { qty: 3, avgCost: 20, heat: 0 } }; x.rng.travel[0] += i; });
      } catch { continue; }
      runs++;
      const res = applyCommand(s, { type: 'Encounter', choice: 'submit' }, T0);
      const ev = of(res.events, 'EncounterResolved')!;
      if (!ev.success) {
        caught++;
        expect(ev.lost).toEqual({ neurostaub: 6 });
        expect(res.state.cargo.water?.qty).toBe(3);
        expect(ev.creditsDelta).toBeLessThan(0);
      }
    }
    // Detection without crew is 80 percent.
    expect(caught / runs).toBeGreaterThan(0.6);
  });

  it('shown odds match outcomes (pirate fight, no crew: 45 percent)', () => {
    let wins = 0;
    const n = 3_000;
    const base = untilEncounter('pirates');
    for (let i = 0; i < n; i++) {
      const s = JSON.parse(JSON.stringify(base)) as GameState;
      s.rng.travel = seedRng(`odds-${i}`);
      const res = applyCommand(s, { type: 'Encounter', choice: 'fight' }, T0);
      if (of(res.events, 'EncounterResolved')!.success) wins++;
    }
    const shown = toClientView(base, T0).encounter!.options.find((o) => o.id === 'fight')!.chance;
    expect(shown).toBeCloseTo(CONFIG.encounter.fight.base, 5);
    expect(Math.abs(wins / n - shown)).toBeLessThan(0.04);
  });

  it('is deterministic across a whole session', () => {
    const play = (): GameState => {
      let s = fresh('replay');
      for (let i = 0; i < 12; i++) {
        s = applyCommand(s, { type: 'Buy', goodId: 'hydro', qty: 2 }, T0 + i).state;
        s = applyCommand(s, { type: 'Jump', to: s.routes[i % s.routes.length]! }, T0 + i).state;
        if (s.pending) s = applyCommand(s, { type: 'Encounter', choice: s.pending.kind === 'pirates' ? 'flee' : 'submit' }, T0 + i).state;
        s = applyCommand(s, { type: 'Sell', goodId: 'hydro', qty: 1 }, T0 + i).state;
        s.fuel.amount = CONFIG.fuel.max;
      }
      return s;
    };
    expect(play()).toEqual(play());
  });

  it('a level-up refills the tank', () => {
    const s = fresh();
    s.fuel.amount = 0;
    s.profile.xp = 105; // just short of level 2
    s.cargo = { implants: { qty: 10, avgCost: 1, heat: 0 } };
    const res = applyCommand(s, { type: 'Sell', goodId: 'implants', qty: 10 }, T0);
    expect(of(res.events, 'LevelUp')).toEqual({ type: 'LevelUp', level: 2 });
    expect(res.state.fuel.amount).toBe(CONFIG.fuel.max);
  });

  it('one huge sale cannot buy a pile of levels', () => {
    const s = fresh();
    s.cargo = { aicores: { qty: 20, avgCost: 1, heat: 0 } };
    s.location = 'helixtor';
    const res = applyCommand(s, { type: 'Sell', goodId: 'aicores', qty: 20 }, T0);
    expect(res.state.profile.level).toBe(1);
    expect(res.state.profile.xp).toBeLessThan(80);
  });

  it('every arrival pays courier mail, so an empty wallet is never a dead end', () => {
    const s = fresh();
    s.wallet.credits = 0;
    let st = applyCommand(s, { type: 'Jump', to: s.routes[0]! }, T0).state;
    if (st.pending) st = applyCommand(st, { type: 'Encounter', choice: st.pending.kind === 'pirates' ? 'flee' : 'submit' }, T0).state;
    expect(st.wallet.credits).toBeGreaterThanOrEqual(CONFIG.travel.courierBase);
  });

  it('the hold can be upgraded up to a maximum', () => {
    let s = fresh();
    expect(applyCommand(s, { type: 'UpgradeHold' }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'not_enough_credits' });
    s.wallet.credits = 10_000_000;
    const first = toClientView(s, T0).holdUpgrade!;
    s = applyCommand(s, { type: 'UpgradeHold' }, T0).state;
    expect(toClientView(s, T0).cargo.cap).toBe(first.cap);
    expect(s.wallet.credits).toBe(10_000_000 - first.cost);
    for (let i = 1; i < CONFIG.hold.maxLevel; i++) s = applyCommand(s, { type: 'UpgradeHold' }, T0).state;
    expect(toClientView(s, T0).holdUpgrade).toBeNull();
    expect(applyCommand(s, { type: 'UpgradeHold' }, T0).events[0]).toEqual({ type: 'CommandRejected', reason: 'max_level' });
  });
});

describe('view and wire format', () => {
  it('hides RNG state and prices of other stations', () => {
    const json = JSON.stringify(toClientView(fresh(), T0));
    expect(json).not.toContain('"rng"');
    expect(json).not.toContain('"market":{');
  });

  it('parseCommand only lets well-formed commands through', () => {
    expect(parseCommand({ type: 'Buy', goodId: 'water', qty: 2 })).toEqual({ type: 'Buy', goodId: 'water', qty: 2 });
    expect(parseCommand({ type: 'Buy', goodId: 'gold', qty: 2 })).toBeNull();
    expect(parseCommand({ type: 'Buy', goodId: 'water', qty: '2' })).toBeNull();
    expect(parseCommand({ type: 'Jump', to: 'nowhere' })).toBeNull();
    expect(parseCommand({ type: 'Encounter', choice: 'win' })).toBeNull();
    expect(parseCommand({ type: 'Sell', goodId: 'water', qty: 1, credits: 999999 })).toEqual({ type: 'Sell', goodId: 'water', qty: 1 });
    expect(parseCommand('Jump')).toBeNull();
  });
});
