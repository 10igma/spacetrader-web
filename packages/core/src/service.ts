import type { ClientView, Command, GameEvent } from './game.ts';

export interface CommandResult {
  view: ClientView;
  events: GameEvent[];
}

/**
 * The one boundary between presentation and rules. The client only ever talks
 * to this interface. Behind it sits either an in-process host (offline dev
 * build) or the real server. Screens cannot tell the difference.
 */
export interface GameService {
  readonly mode: 'local' | 'remote';
  connect(): Promise<ClientView>;
  send(cmd: Command): Promise<CommandResult>;
}
