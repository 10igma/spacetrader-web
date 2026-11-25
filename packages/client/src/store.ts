import type { ClientView, Command, GameEvent, GameService, Pull } from '@nova/core';
import { create } from 'zustand';
import { audio } from './audio/engine.ts';
import { createGameService } from './net/services.ts';

export type Tab = 'station' | 'market' | 'deck' | 'hangar' | 'league';

interface AppState {
  service: GameService;
  view: ClientView | null;
  /** serverTime minus local clock at the moment the view arrived. */
  clockOffset: number;
  started: boolean;
  tab: Tab;
  muted: boolean;
  busy: boolean;
  reveal: Pull[] | null;
  inspect: string | null;
  toast: string | null;
  connect(): Promise<void>;
  send(cmd: Command): Promise<GameEvent[]>;
  begin(): void;
  setTab(tab: Tab): void;
  toggleMute(): void;
  closeReveal(): void;
  setInspect(cardId: string | null): void;
  showToast(text: string): void;
}

let toastTimer: number | undefined;

export const useApp = create<AppState>((set, get) => ({
  service: createGameService(),
  view: null,
  clockOffset: 0,
  started: false,
  tab: 'station',
  muted: false,
  busy: false,
  reveal: null,
  inspect: null,
  toast: null,

  async connect() {
    const view = await get().service.connect();
    set({ view, clockOffset: view.serverTime - Date.now() });
  },

  async send(cmd) {
    if (get().busy) return [];
    set({ busy: true });
    try {
      const { view, events } = await get().service.send(cmd);
      set({ view, clockOffset: view.serverTime - Date.now() });
      for (const ev of events) {
        if (ev.type === 'CrateOpened') set({ reveal: ev.pulls });
        if (ev.type === 'CommandRejected') {
          audio.deny();
          get().showToast(
            ev.reason === 'not_enough_credits' ? 'Nicht genug Credits'
              : ev.reason === 'free_crate_not_ready' ? 'Gratis-Container noch nicht bereit'
                : 'Aktion nicht möglich',
          );
        }
      }
      return events;
    } catch {
      get().showToast('Keine Verbindung zum Server');
      return [];
    } finally {
      set({ busy: false });
    }
  },

  begin() {
    audio.start();
    set({ started: true });
  },
  setTab(tab) { set({ tab }); },
  toggleMute() {
    const muted = !get().muted;
    audio.setMuted(muted);
    set({ muted });
  },
  closeReveal() { set({ reveal: null }); },
  setInspect(cardId) { set({ inspect: cardId }); },
  showToast(text) {
    set({ toast: text });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 2200);
  },
}));

/** Current time on the authoritative clock. */
export const serverNow = (): number => Date.now() + useApp.getState().clockOffset;
