import {
  applyCommand, createInitialState, STATE_VERSION, toClientView,
  type ClientView, type Command, type CommandResult, type GameService, type GameState,
} from '@nova/core';

const SAVE_KEY = 'nova.save';
const TOKEN_KEY = 'nova.session';

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private mode: play without persistence */ }
}

/**
 * Offline host: the same core the server runs, executed in the client.
 * Convenient for development and the preview build, and trivially cheatable.
 * It exists so screens never need to know which side of the wire rules run on.
 */
export class LocalGameService implements GameService {
  readonly mode = 'local' as const;
  private state!: GameState;

  async connect(): Promise<ClientView> {
    const now = Date.now();
    const saved = storageGet(SAVE_KEY);
    let state: GameState | null = null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        if (parsed.version === STATE_VERSION) state = parsed;
      } catch { /* corrupt save: start fresh */ }
    }
    // Dev aid for the offline host only: ?seed=x starts a fresh, reproducible game.
    const seed = new URLSearchParams(location.search).get('seed');
    if (seed) state = null;
    this.state = state ?? createInitialState(seed ?? crypto.randomUUID(), now);
    return toClientView(this.state, now);
  }

  async send(cmd: Command): Promise<CommandResult> {
    const now = Date.now();
    const result = applyCommand(this.state, cmd, now);
    this.state = result.state;
    storageSet(SAVE_KEY, JSON.stringify(this.state));
    return { view: toClientView(this.state, now), events: result.events };
  }
}

/** Thin client for the authoritative server. Holds no rules and no dice. */
export class RemoteGameService implements GameService {
  readonly mode = 'remote' as const;
  private token: string | null = storageGet(TOKEN_KEY);

  constructor(private readonly baseUrl: string) {}

  private async call<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
    const res = await fetch(this.baseUrl + path, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
    });
    return { status: res.status, body: (await res.json()) as T };
  }

  async connect(): Promise<ClientView> {
    if (this.token) {
      const res = await this.call<{ view: ClientView }>('/state');
      if (res.status === 200) return res.body.view;
    }
    this.token = null;
    const res = await this.call<{ token: string; view: ClientView }>('/session', { method: 'POST' });
    this.token = res.body.token;
    storageSet(TOKEN_KEY, this.token);
    return res.body.view;
  }

  async send(cmd: Command): Promise<CommandResult> {
    const res = await this.call<CommandResult>('/command', { method: 'POST', body: JSON.stringify(cmd) });
    if (res.status !== 200) throw new Error(`server rejected request (${res.status})`);
    return res.body;
  }
}

export function createGameService(): GameService {
  const url = new URLSearchParams(location.search).get('server') ?? import.meta.env.VITE_SERVER_URL;
  return url ? new RemoteGameService(url.replace(/\/$/, '')) : new LocalGameService();
}
