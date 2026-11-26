import { MODULE_BY_ID, SHIP_BY_ID } from '@nova/core';
import type { ClientView, Command, GameEvent, GameService, Pull, RejectReason, Reward, SalvageKind, StationId } from '@nova/core';
import { create } from 'zustand';
import { audio } from './audio/engine.ts';
import { rewardText } from './ui/format.ts';
import { createGameService } from './net/services.ts';

export type Tab = 'station' | 'market' | 'deck' | 'hangar' | 'daily';

/** A jump in progress, as far as the presentation is concerned. */
export interface Travel {
  from: StationId;
  to: StationId;
  /** Set once the server has resolved an encounter. */
  outcome: Extract<GameEvent, { type: 'EncounterResolved' }> | null;
  /** True when we reconnected into a pending encounter and skip the launch. */
  resumed: boolean;
  /** Courier pay on arrival, once known. */
  courier: number;
}

export interface SalePop { id: number; profit: number; revenue: number }
export type Sheet = 'posts' | 'wheel' | 'salvage' | 'profile' | null;

const REJECT_TEXT: Record<RejectReason, string> = {
  not_enough_credits: 'Nicht genug Credits',
  free_crate_not_ready: 'Gratis-Container noch nicht bereit',
  no_cargo_space: 'Laderaum voll',
  not_in_cargo: 'Nicht an Bord',
  no_fuel: 'Tank leer',
  no_such_route: 'Route nicht verfügbar',
  encounter_pending: 'Erst die Begegnung klären',
  no_encounter: 'Keine Begegnung offen',
  invalid_choice: 'Diese Wahl gibt es hier nicht',
  unknown_command: 'Aktion nicht möglich',
  fence_limit: 'So viel nimmt der Hehler heute nicht',
  fence_closed: 'Der Hehler hat dichtgemacht: Fahndung zu hoch',
  card_not_owned: 'Karte nicht in der Sammlung',
  not_wanted: 'Hier liegt nichts gegen dich vor',
  max_level: 'Bereits am Maximum',
  no_such_slot: 'Diesen Platz gibt es nicht',
  slot_busy: 'Es wird schon ein Container entsiegelt',
  slot_not_ready: 'Noch nicht entsiegelt',
  not_enough_quanta: 'Nicht genug Quanten',
  not_enough_shards: 'Nicht genug Splitter',
  not_claimable: 'Noch nicht abholbar',
  daily_limit: 'Für heute ausverkauft',
  no_such_lot: 'Diese Auktion ist vorbei',
  bid_too_low: 'Gebot zu niedrig: Der Preis ist inzwischen gestiegen',
  too_many_bids: 'Zu viele offene Gebote',
  too_many_listings: 'Alle Angebotsplätze sind belegt',
  no_spare_copy: 'Davon hast du kein Duplikat',
  already_owned: 'Das hast du schon',
  level_too_low: 'Deine Stufe reicht dafür noch nicht',
  season_over: 'Diese Karte gab es nur in ihrer Saison',
  not_owned: 'Das besitzt du nicht',
  no_free_slot: 'Kein freier Platz',
  card_busy: 'Diese Karte ist gerade im Einsatz',
  invalid_team: 'Diese Crew kann so nicht los',
  no_such_contract: 'Dieser Auftrag ist vergeben',
};

interface AppState {
  service: GameService;
  view: ClientView | null;
  /** serverTime minus local clock at the moment the view arrived. */
  clockOffset: number;
  started: boolean;
  tab: Tab;
  hangarMode: 'crates' | 'yard';
  deckMode: 'bridge' | 'convoys';
  muted: boolean;
  busy: boolean;
  reveal: Pull[] | null;
  travel: Travel | null;
  routesOpen: boolean;
  sale: SalePop | null;
  sheet: Sheet;
  /** Result of the last spin, decided by the game service. The wheel only plays it back. */
  wheel: { index: number; reward: Reward } | null;
  salvageResult: { kind: SalvageKind; credits: number; shards: number } | null;
  inspect: string | null;
  toast: { text: string; tone: 'bad' | 'good' } | null;
  connect(): Promise<void>;
  send(cmd: Command): Promise<GameEvent[]>;
  begin(): void;
  setTab(tab: Tab): void;
  setHangarMode(mode: 'crates' | 'yard'): void;
  setDeckMode(mode: 'bridge' | 'convoys'): void;
  toggleMute(): void;
  closeReveal(): void;
  endTravel(): void;
  setRoutesOpen(open: boolean): void;
  setSheet(sheet: Sheet): void;
  setInspect(cardId: string | null): void;
  showToast(text: string, tone?: 'bad' | 'good'): void;
}

let toastTimer: number | undefined;
/** Several things can happen in one command: show them one after another. */
const toastQueue: { text: string; tone: 'bad' | 'good' }[] = [];
let saleId = 0;

export const useApp = create<AppState>((set, get) => ({
  service: createGameService(),
  view: null,
  clockOffset: 0,
  started: false,
  tab: 'station',
  hangarMode: 'crates',
  deckMode: 'bridge',
  muted: false,
  busy: false,
  reveal: null,
  travel: null,
  routesOpen: false,
  sale: null,
  sheet: null,
  wheel: null,
  salvageResult: null,
  inspect: null,
  toast: null,

  async connect() {
    const view = await get().service.connect();
    set({ view, clockOffset: view.serverTime - Date.now() });
    // Reconnected in the middle of an encounter: pick the scene up where it stopped.
    if (view.encounter) set({ travel: { from: view.location, to: view.encounter.to, outcome: null, resumed: true, courier: 0 } });
  },

  async send(cmd) {
    if (get().busy) return [];
    set({ busy: true });
    try {
      const { view, events } = await get().service.send(cmd);
      set({ view, clockOffset: view.serverTime - Date.now() });
      // Wheel and salvage show their own result: no toast may give it away early.
      // A charter claim sums up many rewards in one line.
      const staged = events.some((e) => e.type === 'WheelSpun' || e.type === 'SalvageOpened' || e.type === 'CharterClaimed' || e.type === 'ConvoyReturned');
      for (const ev of events) {
        if (staged && (ev.type === 'RewardGranted' || ev.type === 'CrateEarned')) continue;
        if (ev.type === 'WheelSpun') set({ wheel: { index: ev.index, reward: ev.reward } });
        if (ev.type === 'SalvageOpened') set({ salvageResult: { kind: ev.kind, credits: ev.credits, shards: ev.shards } });
        if (ev.type === 'PostBuilt') get().showToast(ev.level === 1 ? 'Handelsposten im Bau' : `Ausbau auf Stufe ${ev.level} läuft`, 'good');
        if (ev.type === 'PostsCollected') { audio.coins(ev.amount); set({ sale: { id: ++saleId, profit: ev.amount, revenue: ev.amount } }); }
        if (ev.type === 'OfferBought') { audio.coins(300); get().showToast('Gekauft', 'good'); }
        if (ev.type === 'ManifestDone') get().showToast('Manifest erfüllt', 'good');
        if (ev.type === 'BidPlaced') get().showToast('Gebot steht', 'good');
        if (ev.type === 'AuctionBought') { audio.reveal(2); get().showToast('Gekauft: Karte ist in deiner Sammlung', 'good'); }
        if (ev.type === 'CardListed') get().showToast('Angebot läuft', 'good');
        if (ev.type === 'CharterClaimed') { audio.coins(2000); get().showToast([rewardText(ev.total), ev.crates > 0 ? `${ev.crates} Container` : ''].filter(Boolean).join(' + ') || `${ev.rewards} Belohnungen abgeholt`, 'good'); }
        if (ev.type === 'ShipBought') { audio.reveal(3); get().showToast(`${SHIP_BY_ID.get(ev.ship)!.name} gehört dir`, 'good'); }
        if (ev.type === 'ModuleBought') { audio.coins(800); get().showToast(`${MODULE_BY_ID.get(ev.module)!.name} Stufe ${ev.level}`, 'good'); }
        if (ev.type === 'ConvoySent') get().showToast(`Konvoi unterwegs · Chance ${Math.round(ev.chance * 100)} %`, 'good');
        if (ev.type === 'ConvoyReturned') {
          if (ev.success) audio.coins(ev.reward.credits ?? 500);
          get().showToast(ev.success ? `Konvoi erfolgreich: ${rewardText(ev.reward)}` : `Konvoi gescheitert: nur ${rewardText(ev.reward)}`, ev.success ? 'good' : 'bad');
        }
        if (ev.type === 'SeasonAlbumClaimed' && ev.complete) { audio.reveal(4); get().showToast('Saison-Edition komplett: Titel und Lack Prisma freigeschaltet', 'good'); }
        if (ev.type === 'PaintBought') { audio.coins(600); get().showToast('Neue Lackierung aufgetragen', 'good'); }
        if (ev.type === 'Prestiged') { audio.reveal(4); set({ tab: 'station', sheet: null }); get().showToast(`Prestige ${ev.rank}: Ein neuer Anfang, für immer stärker`, 'good'); }
        if (ev.type === 'CharterBought') { audio.reveal(3); get().showToast('Premium-Charter aktiv', 'good'); }
        if (ev.type === 'LeagueClaimed' && ev.moved !== 0) get().showToast(ev.moved > 0 ? 'Aufgestiegen' : 'Abgestiegen', ev.moved > 0 ? 'good' : 'bad');
        if (ev.type === 'CrateOpened') set({ reveal: ev.pulls });
        if (ev.type === 'JumpStarted') set({ travel: { from: ev.from, to: ev.to, outcome: null, resumed: false, courier: 0 }, routesOpen: false });
        if (ev.type === 'Arrived') {
          const travel = get().travel;
          if (travel) set({ travel: { ...travel, courier: ev.courier } });
        }
        if (ev.type === 'HoldUpgraded') get().showToast(`Laderaum ausgebaut: ${ev.cap} Einheiten`, 'good');
        if (ev.type === 'WantedChanged' && !get().travel) get().showToast(ev.level === 0 ? 'Fahndung eingestellt' : `Fahndung gesenkt auf ${ev.level}`, 'good');
        if (ev.type === 'EncounterResolved') {
          const travel = get().travel;
          if (travel) set({ travel: { ...travel, outcome: ev } });
        }
        if (ev.type === 'Sold') {
          audio.coins(ev.revenue);
          set({ sale: { id: ++saleId, profit: ev.profit, revenue: ev.revenue } });
        }
        if (ev.type === 'LevelUp') get().showToast(`Stufe ${ev.level} erreicht · Tank gefüllt`, 'good');
        if (ev.type === 'RewardGranted') { audio.coins(500); get().showToast(`Erhalten: ${rewardText(ev.reward)}`, 'good'); }
        if (ev.type === 'CrateEarned') get().showToast(ev.tier === 'premium' ? 'Premium-Container im Hangar' : 'Container im Hangar', 'good');
        if (ev.type === 'CrateLost') get().showToast('Hangar voll: Container verloren');
        if (ev.type === 'CardForged') { audio.reveal(2); get().showToast('Karte geschmiedet', 'good'); }
        if (ev.type === 'CardUpgraded') { audio.reveal(1); get().showToast(`Aufgewertet auf Stufe ${ev.level}`, 'good'); }
        if (ev.type === 'StreakChanged') {
          if (ev.kind === 'lost') get().showToast(`Serie gerissen (war ${ev.previous} Tage)`);
          else if (ev.kind === 'saved') get().showToast(`Urlaubsschein eingelöst: Serie ${ev.count} Tage`, 'good');
          else get().showToast(`Serie: ${ev.count} ${ev.count === 1 ? 'Tag' : 'Tage'}`, 'good');
        }
        if (ev.type === 'CommandRejected') {
          audio.deny();
          get().showToast(REJECT_TEXT[ev.reason]);
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
  setHangarMode(hangarMode) { set({ hangarMode }); },
  setDeckMode(deckMode) { set({ deckMode }); },
  toggleMute() {
    const muted = !get().muted;
    audio.setMuted(muted);
    set({ muted });
  },
  closeReveal() { set({ reveal: null }); },
  endTravel() { set({ travel: null, tab: 'market' }); },
  setRoutesOpen(open) { set({ routesOpen: open }); },
  setSheet(sheet) { set(sheet === null ? { sheet, wheel: null, salvageResult: null } : { sheet }); },
  setInspect(cardId) { set({ inspect: cardId }); },
  showToast(text, tone = 'bad') {
    toastQueue.push({ text, tone });
    if (get().toast) return;
    const next = (): void => {
      const item = toastQueue.shift();
      set({ toast: item ?? null });
      window.clearTimeout(toastTimer);
      if (item) toastTimer = window.setTimeout(next, toastQueue.length > 0 ? 1500 : 2400);
    };
    next();
  },
}));

/** Current time on the authoritative clock. */
export const serverNow = (): number => Date.now() + useApp.getState().clockOffset;
