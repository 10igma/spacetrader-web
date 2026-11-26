import { describe, expect, it } from 'vitest';
import { CONFIG } from './config.ts';
import { CARDS } from './content.ts';
import { applyCommand, createInitialState, SEATS, STATE_VERSION, toClientView, type GameState } from './game.ts';
import { afterQuiet, planReminders, REMINDER_DEFAULTS } from './reminders.ts';
import { OLDEST_UPGRADABLE, upgradeSave } from './save.ts';
import { neighbours } from './world.ts';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** A day at 12:00 UTC. */
const NOON = Math.floor(1_800_000_000_000 / DAY) * DAY + 12 * HOUR;
const UTC = { utcOffsetMin: 0 };

describe('save upgrades', () => {
  const played = (): GameState => {
    const s = createInitialState('old', NOON);
    s.wallet = { credits: 54_321, quanta: 77, shards: 12 };
    s.profile = { level: 9, xp: 40 };
    s.collection = { c01: 2, c21: 1 };
    s.hold = 3;
    return s;
  };
  /** The same save as it looked two versions ago, before ships, convoys, cosmetics and season albums. */
  const asVersion8 = (s: GameState): Record<string, unknown> => {
    const old = JSON.parse(JSON.stringify(s)) as Record<string, any>;
    old.version = 8;
    for (const key of ['fleet', 'convoys', 'cosmetics', 'prestige']) delete old[key];
    delete old.season.album;
    delete old.daily.convoys;
    delete old.rng.convoy;
    delete old.rng.season;
    for (const key of ['smuggled', 'convoys', 'bestLeague']) delete old.stats[key];
    return old;
  };

  it('a current save passes through untouched', () => {
    const s = played();
    expect(upgradeSave(s, NOON)).toBe(s);
  });

  it('an older save keeps everything the player owns and gains the new systems empty', () => {
    const s = played();
    const up = upgradeSave(asVersion8(s), NOON)!;
    expect(up.version).toBe(STATE_VERSION);
    expect(up.wallet).toEqual(s.wallet);
    expect(up.profile).toEqual(s.profile);
    expect(up.collection).toEqual(s.collection);
    expect(up.hold).toBe(3);
    expect(up.fleet).toEqual({ owned: ['sperling'], active: 'sperling', modules: {}, fitted: [] });
    expect(up.convoys).toEqual([]);
    expect(up.prestige).toBe(0);
    expect(up.season.album).toBe(0);
    expect(up.stats).toMatchObject({ smuggled: 0, convoys: 0, bestLeague: 0 });
    // The upgraded save plays: the view builds and commands run.
    const view = toClientView(up, NOON);
    expect(view.wallet.credits).toBe(54_321);
    const res = applyCommand(up, { type: 'AutoDeck' }, NOON);
    expect(res.events.some((e) => e.type === 'CommandRejected')).toBe(false);
    expect(SEATS.some((seat) => res.state.deck[seat] !== null)).toBe(true);
    const crate = applyCommand({ ...res.state, crates: { ...res.state.crates, freeStock: 1 } }, { type: 'ClaimFreeCrate' }, NOON);
    expect(crate.events.some((e) => e.type === 'CrateOpened')).toBe(true);
  });

  it('a save from before the sector chart gets lanes instead of random routes, and its old market event is dropped', () => {
    const old = JSON.parse(JSON.stringify(played())) as Record<string, any>;
    old.version = 10;
    old.location = 'kessin';
    old.routes = ['aurel', 'corvus', 'zenit'];
    old.event = { stationId: 'aurel', category: 'luxus', mult: 1.7, jumpsLeft: 2 };
    delete old.events;
    for (const id of ['kreuz', 'eisenfurt', 'nimbus', 'solace']) { delete old.market[id]; delete old.fence[id]; }
    const up = upgradeSave(old, NOON)!;
    expect(up.version).toBe(STATE_VERSION);
    expect(up.events).toEqual([]);
    expect((up as unknown as { event?: unknown }).event).toBeUndefined();
    expect(up.routes).toEqual([...neighbours('kessin')]);
    // The four new stations have markets, and the game plays on.
    expect(Object.keys(up.market)).toHaveLength(12);
    const jumped = applyCommand(up, { type: 'Jump', to: up.routes[0]! }, NOON);
    expect(jumped.events.some((e) => e.type === 'CommandRejected')).toBe(false);
    expect(toClientView(up, NOON).routes.map((r) => r.stationId)).toEqual([...neighbours('kessin')]);
  });

  it('refuses what it cannot carry over', () => {
    const s = played();
    expect(upgradeSave({ ...asVersion8(s), version: OLDEST_UPGRADABLE - 1 }, NOON)).toBeNull();
    expect(upgradeSave({ ...asVersion8(s), version: STATE_VERSION + 1 }, NOON)).toBeNull();
    expect(upgradeSave(null, NOON)).toBeNull();
    expect(upgradeSave('{}', NOON)).toBeNull();
    expect(upgradeSave({ wallet: {} }, NOON)).toBeNull();
  });
});

describe('reminders', () => {
  const busy = (): GameState => {
    const s = createInitialState('remind', NOON);
    for (const c of CARDS.slice(0, 30)) s.collection[c.id] = 1;
    return applyCommand(s, { type: 'AutoDeck' }, NOON).state;
  };
  const kinds = (s: GameState, now = NOON, opts = {}): string[] => planReminders(toClientView(s, now), now, { ...UTC, max: 20, minGapMs: 0, ...opts }).map((r) => r.kind);

  it('quiet hours push a reminder to the morning, in the device time zone', () => {
    const q = { ...REMINDER_DEFAULTS, utcOffsetMin: 0 };
    const midnight = NOON + 12 * HOUR;
    expect(afterQuiet(NOON, q)).toBe(NOON);
    expect(afterQuiet(NOON + 11 * HOUR, q)).toBe(midnight + 8 * HOUR);
    expect(afterQuiet(midnight + 3 * HOUR, q)).toBe(midnight + 8 * HOUR);
    expect(afterQuiet(midnight + 8 * HOUR, q)).toBe(midnight + 8 * HOUR);
    // 21:30 UTC is 23:30 in a zone two hours ahead: quiet there, and morning comes at 06:00 UTC.
    expect(afterQuiet(NOON + 9.5 * HOUR, { ...q, utcOffsetMin: 120 })).toBe(midnight + 6 * HOUR);
  });

  it('a new game has little to say: the next free delivery and the calendar of events', () => {
    const fresh = createInitialState('quiet', NOON);
    expect(kinds(fresh).sort()).toEqual(['freeCrate', 'season', 'weekend']);
  });

  it('points only at things that are really waiting', () => {
    let s = busy();
    const seated = new Set(SEATS.map((seat) => s.deck[seat]));
    const team = Object.keys(s.collection).filter((id) => !seated.has(id)).slice(0, 3);
    s = applyCommand(s, { type: 'SendConvoy', offer: 3, cards: team }, NOON).state;
    s.fuel = { amount: 1, updatedAt: NOON };
    s.crates.freeStock = 0;
    s.crates.freeAt = NOON + HOUR;
    s.streak = { ...s.streak, count: 4, lastDay: s.daily.day - 1 };
    const view = toClientView(s, NOON);
    const plan = planReminders(view, NOON, { ...UTC, max: 20, minGapMs: 0, quietFromHour: 24, quietToHour: 0 });
    const at = (kind: string): number | undefined => plan.find((r) => r.kind === kind)?.at;
    expect(at('convoy')).toBe(NOON + 8 * HOUR);
    expect(at('fuel')).toBe(NOON + (CONFIG.fuel.max - 1) * CONFIG.fuel.regenMs);
    expect(at('fuel')).toBe(view.fuel.fullAt);
    expect(at('freeCrate')).toBe(NOON + HOUR + (CONFIG.crate.freeMax - 1) * CONFIG.crate.freeIntervalMs);
    expect(at('streak')).toBe(view.streak.endsAt - 3 * HOUR);
    // Collected: the reminder is gone with it.
    const home = applyCommand(s, { type: 'ClaimConvoy', slot: 0 }, NOON + 9 * HOUR).state;
    expect(kinds(home, NOON + 9 * HOUR)).not.toContain('convoy');
    s.fuel = { amount: CONFIG.fuel.max, updatedAt: NOON };
    expect(kinds(s)).not.toContain('fuel');
  });

  it('never plans the past, never more than the cap, and never two at the same moment', () => {
    let s = busy();
    s.fuel = { amount: 0, updatedAt: NOON };
    s.crates.freeStock = 0;
    s.crates.freeAt = NOON + 5 * 60_000;
    s.streak = { ...s.streak, count: 4, lastDay: s.daily.day - 1 };
    const seated = new Set(SEATS.map((seat) => s.deck[seat]));
    const team = Object.keys(s.collection).filter((id) => !seated.has(id)).slice(0, 2);
    s = applyCommand(s, { type: 'SendConvoy', offer: 0, cards: team }, NOON).state;
    const later = NOON + 2 * HOUR;
    const plan = planReminders(toClientView(s, later), later, UTC);
    expect(plan.length).toBeLessThanOrEqual(REMINDER_DEFAULTS.max);
    expect(plan.length).toBeGreaterThan(1);
    for (let i = 0; i < plan.length; i++) {
      expect(plan[i]!.at).toBeGreaterThan(later);
      if (i > 0) expect(plan[i]!.at - plan[i - 1]!.at).toBeGreaterThanOrEqual(REMINDER_DEFAULTS.minGapMs);
      const hour = ((plan[i]!.at % DAY) + DAY) % DAY / HOUR;
      expect(hour >= REMINDER_DEFAULTS.quietToHour && hour < REMINDER_DEFAULTS.quietFromHour).toBe(true);
    }
  });
});
