import { createInitialState, STATE_VERSION, type GameState } from './game.ts';
import { neighbours, STATION_BY_ID, type StationId } from './world.ts';

/** Saves older than this are too far from today's rules to be worth carrying over. */
export const OLDEST_UPGRADABLE = 8;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Everything the save has stays. Whatever it lacks comes from the template. */
function fill(saved: Record<string, unknown>, template: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(template)) {
    const have = saved[key];
    if (have === undefined) saved[key] = value;
    else if (isRecord(have) && isRecord(value)) fill(have, value);
  }
}

/**
 * Bring a save from an older version of the rules up to date. New systems
 * start empty, nothing the player owns is touched. Returns null if the save
 * cannot be carried over, so the caller starts a fresh game.
 */
export function upgradeSave(raw: unknown, now: number): GameState | null {
  if (!isRecord(raw) || typeof raw.version !== 'number') return null;
  if (raw.version === STATE_VERSION) return raw as unknown as GameState;
  if (raw.version > STATE_VERSION || raw.version < OLDEST_UPGRADABLE) return null;
  const saved = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  // The template is a new game: its values are the natural "nothing yet" for every system.
  const template = createInitialState(`upgrade:${String(saved.createdAt ?? now)}`, now) as unknown as Record<string, unknown>;
  fill(saved, template);
  // Before version 11 there was one market event and three random routes. The sector has lanes now.
  if ((raw.version as number) < 11) {
    delete saved.event;
    saved.events = [];
    const at = saved.location as StationId;
    saved.routes = [...neighbours(STATION_BY_ID.has(at) ? at : 'meridian')];
  }
  // Orders came with version 12. The board fills at the next station.
  if ((raw.version as number) < 12) saved.orders = { offers: [], active: [], seq: 0 };
  // Rivals came with version 13. Crises that are already running keep their steady drain and have none.
  if ((raw.version as number) < 13 && Array.isArray(saved.events)) for (const e of saved.events as { rivals?: unknown[] }[]) e.rivals ??= [];
  saved.version = STATE_VERSION;
  return saved as unknown as GameState;
}
