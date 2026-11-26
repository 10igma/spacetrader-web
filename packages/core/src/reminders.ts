import type { ClientView } from './game.ts';

/**
 * Reminders a device may show while the game is closed. This only plans them:
 * what to show and when. Whether any is shown is the player's choice, and
 * every one of them points at something that is really waiting.
 */
export type ReminderKind = 'convoy' | 'crate' | 'freeCrate' | 'fuel' | 'posts' | 'streak' | 'weekend' | 'season';

export interface Reminder { kind: ReminderKind; at: number }

export interface ReminderOptions {
  /** Device clock minus UTC, in minutes. */
  utcOffsetMin: number;
  /** No reminder between these local hours. Anything that would fall there waits for the morning. */
  quietFromHour: number;
  quietToHour: number;
  /** At most this many reminders are planned ahead. */
  max: number;
  /** Reminders closer together than this are one moment: the first one stands. */
  minGapMs: number;
}

export const REMINDER_DEFAULTS: Omit<ReminderOptions, 'utcOffsetMin'> = { quietFromHour: 22, quietToHour: 8, max: 6, minGapMs: 45 * 60_000 };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Move a moment out of the quiet hours, to the next morning. */
export function afterQuiet(at: number, o: Pick<ReminderOptions, 'utcOffsetMin' | 'quietFromHour' | 'quietToHour'>): number {
  const local = at + o.utcOffsetMin * 60_000;
  const dayStart = Math.floor(local / DAY) * DAY;
  const hour = (local - dayStart) / HOUR;
  if (hour >= o.quietFromHour) return dayStart + DAY + o.quietToHour * HOUR - o.utcOffsetMin * 60_000;
  if (hour < o.quietToHour) return dayStart + o.quietToHour * HOUR - o.utcOffsetMin * 60_000;
  return at;
}

export function planReminders(view: ClientView, now: number, options: Pick<ReminderOptions, 'utcOffsetMin'> & Partial<ReminderOptions>): Reminder[] {
  const o: ReminderOptions = { ...REMINDER_DEFAULTS, ...options };
  const raw: Reminder[] = [];
  const add = (kind: ReminderKind, at: number | null | undefined): void => { if (at != null && Number.isFinite(at)) raw.push({ kind, at }); };

  // Convoys: when the last one is home, so one visit collects them all.
  const away = view.convoys.running.filter((c) => !c.done);
  if (away.length > 0) add('convoy', Math.max(...away.map((c) => c.endsAt)));
  // A crate that is being unsealed.
  const unlocking = view.slots.filter((s) => s.state === 'unlocking' && s.readyAt !== null);
  if (unlocking.length > 0) add('crate', Math.max(...unlocking.map((s) => s.readyAt!)));
  // Free deliveries: when the stock is full and nothing more arrives.
  const free = view.crates.free;
  if (free.nextAt !== null) add('freeCrate', free.nextAt + Math.max(0, free.max - free.stock - 1) * free.intervalMs);
  // A full tank.
  add('fuel', view.fuel.fullAt);
  // Trading posts: when the first storage is full and stops earning.
  const filling = view.posts.list.map((p) => p.fullAt).filter((t): t is number => t !== null);
  if (filling.length > 0) add('posts', Math.min(...filling));
  // A streak that ends tonight unless the player jumps: three hours before the day ends.
  if (view.streak.count > 0 && view.streak.status === 'atRisk') add('streak', view.streak.endsAt - 3 * HOUR);
  // The weekend event, on its first morning.
  if (!view.weekend.active) add('weekend', view.weekend.startsAt + 10 * HOUR);
  // The last day of a season, if something of it is still open.
  if (!view.seasonAlbum.complete || view.season.claimable > 0) add('season', view.season.endsAt - DAY);

  const planned = raw
    .map((r) => ({ kind: r.kind, at: afterQuiet(r.at, o) }))
    .filter((r) => r.at > now + 60_000)
    .sort((a, b) => a.at - b.at);
  const out: Reminder[] = [];
  for (const r of planned) {
    if (out.length >= o.max) break;
    const last = out[out.length - 1];
    if (last && r.at - last.at < o.minGapMs) continue;
    out.push(r);
  }
  return out;
}
