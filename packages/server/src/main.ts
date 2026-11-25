/**
 * Authoritative game server (skeleton).
 *
 * The server owns state, clock and dice. Clients send commands and receive a
 * filtered view plus events. Nothing a modified client sends can change an
 * outcome: unknown or invalid commands are rejected by the same core rules
 * that the offline build uses.
 *
 * Deliberately missing in this skeleton (see docs/redesign/01-architektur.md):
 * accounts and login, persistent storage, rate limiting, TLS termination.
 * Sessions live in memory and are lost on restart.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { applyCommand, createInitialState, parseCommand, toClientView, type GameState } from '@nova/core';

const PORT = Number(process.env.PORT ?? 8787);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN ?? '*';
const MAX_BODY = 4 * 1024;

const sessions = new Map<string, GameState>();

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': ALLOW_ORIGIN,
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new Error('body too large');
    chunks.push(chunk as Buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
}

function sessionOf(req: IncomingMessage): { token: string; state: GameState } | null {
  const token = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1];
  const state = token ? sessions.get(token) : undefined;
  return token && state ? { token, state } : null;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'OPTIONS') return send(res, 204, null);

    if (req.method === 'POST' && url.pathname === '/session') {
      const now = Date.now();
      const token = randomUUID();
      // The seed is generated here and never sent anywhere.
      const state = createInitialState(randomBytes(16).toString('hex'), now);
      sessions.set(token, state);
      return send(res, 200, { token, view: toClientView(state, now) });
    }

    if (req.method === 'GET' && url.pathname === '/state') {
      const s = sessionOf(req);
      if (!s) return send(res, 401, { error: 'no_session' });
      return send(res, 200, { view: toClientView(s.state, Date.now()) });
    }

    if (req.method === 'POST' && url.pathname === '/command') {
      const s = sessionOf(req);
      if (!s) return send(res, 401, { error: 'no_session' });
      const cmd = parseCommand(await readJson(req));
      if (!cmd) return send(res, 400, { error: 'invalid_command' });
      const now = Date.now();
      const result = applyCommand(s.state, cmd, now);
      sessions.set(s.token, result.state);
      return send(res, 200, { view: toClientView(result.state, now), events: result.events });
    }

    return send(res, 404, { error: 'not_found' });
  } catch {
    return send(res, 400, { error: 'bad_request' });
  }
});

server.listen(PORT, () => console.log(`nova server listening on :${PORT}`));
