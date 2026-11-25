import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { applyCommand, createInitialState, parseCommand, toClientView, type GameEvent, type GameState } from './game.ts';
import { seedRng } from './rng.ts';
import { GOODS, STATIONS } from './world.ts';

const T0 = 1_800_000_000_000;
const fresh = (seed = 'trade'): GameState => createInitialState(seed, T0);
const price = (s: GameState, goodId: string): { buy: number; sell: number } =>
  toClientView(s, T0).market.find((m) => m.goodId === goodId)!;
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
  it('buying moves credits into cargo at the listed price', () => {
    const s = fresh();
    const { buy } = price(s, 'water');
    const res = applyCommand(s, { type: 'Buy', goodId: 'water', qty: 5 }, T0);
    expect(res.state.wallet.credits).toBe(CONFIG.startCredits - buy * 5);
    expect(res.state.cargo.water).toEqual({ qty: 5, avgCost: buy });
    expect(res.events).toEqual([{ type: 'Bought', goodId: 'water', qty: 5, cost: buy * 5 }]);
  });

  it('selling where you bought always loses money (no free loop)', () => {
    for (const g of GOODS) {
      const { buy, sell } = price(fresh(), g.id);
      expect(sell).toBeLessThan(buy);
    }
  });

  it('enforces cargo space, funds and ownership', () => {
    const s = fresh();
    expect(applyCommand(s, { type: 'Buy', goodId: 'water', qty: CONFIG.cargoCap + 1 }, T0).events[0])
      .toEqual({ type: 'CommandRejected', reason: 'no_cargo_space' });
    expect(applyCommand(s, { type: 'Buy', goodId: 'implants', qty: 20 }, T0).events[0])
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
    s.market[s.location].ore = 0.4; // price spike while docked
    const { sell } = price(s, 'ore');
    const res = applyCommand(s, { type: 'Sell', goodId: 'ore', qty: 4 }, T0);
    expect(of(res.events, 'Sold')).toMatchObject({ revenue: sell * 4, profit: Math.round((sell - cost) * 4) });
    expect(res.state.cargo.ore).toBeUndefined();
  });
});

describe('travel', () => {
  it('offers distinct routes away from the current station', () => {
    const s = fresh();
    expect(s.routes).toHaveLength(CONFIG.routesOffered);
    expect(new Set(s.routes).size).toBe(CONFIG.routesOffered);
    expect(s.routes).not.toContain(s.location);
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
        s = untilEncounter('customs', (x) => { x.cargo = { neurostaub: { qty: 6, avgCost: 500 }, water: { qty: 3, avgCost: 20 } }; x.rng.travel[0] += i; });
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
        s = applyCommand(s, { type: 'Jump', to: s.routes[i % 3]! }, T0 + i).state;
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
    s.cargo = { implants: { qty: 10, avgCost: 1 } };
    const res = applyCommand(s, { type: 'Sell', goodId: 'implants', qty: 10 }, T0);
    expect(of(res.events, 'LevelUp')).toBeDefined();
    expect(res.state.fuel.amount).toBe(CONFIG.fuel.max);
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
