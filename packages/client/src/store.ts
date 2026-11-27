import { CATEGORY_NAME, CRISIS_NAME, MODULE_BY_ID, STATION_BY_ID } from '@nova/core';
import { setHaptics } from './native/haptics.ts';
import { askForReminders, syncReminders } from './native/reminders.ts';
import { loadSettings, saveSettings, type DeviceSettings } from './native/settings.ts';
import { askForMotion } from './native/shell.ts';
import type { ClientView, Command, GameEvent, GameService, Pull, RejectReason, Reward, SalvageKind, StationId } from '@nova/core';
import { create } from 'zustand';
import { audio } from './audio/engine.ts';
import { num, rewardText } from './ui/format.ts';
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
  courier: number; /** Deposits of orders that ran out of jumps on this jump. */ depositLost: number;
  /** The streak moved on this jump: shown on arrival. */
  streak: { count: number; kind: 'started' | 'extended' | 'saved' } | null;
}

export interface SalePop { id: number; profit: number; revenue: number; label: string; size: 's' | 'm' | 'l' }
/** The few moments that get the whole screen. */
export type MilestoneMoment = { id: number } & (
  | { kind: 'level'; level: number }
  | { kind: 'ship'; ship: string }
  | { kind: 'league'; tier: number; tierName: string; rank: number }
  | { kind: 'album' }
  | { kind: 'charter' }
  | { kind: 'prestige'; rank: number }
);
type MomentInput = MilestoneMoment extends infer M ? (M extends { id: number } ? Omit<M, 'id'> : never) : never;
export type Sheet = 'posts' | 'wheel' | 'salvage' | 'profile' | 'settings' | 'orders' | null;

const REJECT_TEXT: Record<RejectReason, string> = {
  not_enough_credits: 'Nicht genug Credits',
  free_crate_not_ready: 'Gratis-Container noch nicht bereit',
  no_cargo_space: 'Laderaum voll',
  not_in_cargo: 'Nicht an Bord',
  no_fuel: 'Zu wenig Treibstoff',
  no_such_order: 'Diesen Auftrag gibt es nicht mehr',
  too_many_orders: 'Mehr Lieferaufträge kannst du nicht gleichzeitig halten',
  sold_out: 'Ausverkauft: Die Station wartet selbst auf diese Ware',
  not_here: 'Der Auftrag gilt für eine andere Station',
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
  hangarMode: 'crates' | 'shop' | 'yard';
  deckMode: 'bridge' | 'collection' | 'convoys';
  muted: boolean;
  busy: boolean;
  reveal: Pull[] | null;
  /** The crate the cards come out of, or null when a card arrives on its own. */
  revealCrate: 'standard' | 'premium' | null;
  travel: Travel | null;
  routesOpen: boolean;
  /** Where the captain is headed, possibly several jumps away. A plan on this device, not a rule. */
  course: StationId | null;
  setCourse(target: StationId | null): void;
  sale: SalePop | null;
  milestone: MilestoneMoment | null;
  celebrate(moment: MomentInput): void;
  nextMilestone(): void;
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
  setHangarMode(mode: 'crates' | 'shop' | 'yard'): void;
  setDeckMode(mode: 'bridge' | 'collection' | 'convoys'): void;
  toggleMute(): void;
  closeReveal(): void;
  endTravel(): void;
  setRoutesOpen(open: boolean): void;
  setSheet(sheet: Sheet): void;
  setInspect(cardId: string | null): void;
  /** Device choices: haptics and reminders. */
  settings: DeviceSettings;
  setHapticsOn(on: boolean): void;
  /** Turning reminders on asks the system for permission. Resolves to whether they are on now. */
  setRemindersOn(on: boolean): Promise<boolean>;
  /** Android back button: close what is on top. False when nothing was open. */
  back(): boolean;
  /** Time has passed while the app was away: fetch the game as it stands now. */
  refresh(): Promise<void>;
  showToast(text: string, tone?: 'bad' | 'good'): void;
}

let toastTimer: number | undefined;
/** Several things can happen in one command: show them one after another. */
const toastQueue: { text: string; tone: 'bad' | 'good' }[] = [];
let saleId = 0;
let momentId = 0;
const momentQueue: MilestoneMoment[] = [];
/** A win is felt relative to what you have: the same 500 is a triumph on day one and a rounding error on day thirty. */
const saleSize = (profit: number, credits: number): 's' | 'm' | 'l' => {
  const share = Math.abs(profit) / Math.max(1, credits);
  return share >= 0.1 ? 'l' : share >= 0.01 ? 'm' : 's';
};

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
  revealCrate: null,
  travel: null,
  routesOpen: false,
  course: null,
  setCourse(course) { set({ course }); },
  sale: null,
  milestone: null,
  celebrate(moment) {
    // Walkthrough scripts that are about something else can switch the big moments off.
    if (new URLSearchParams(location.search).has('calm')) return;
    const m = { ...moment, id: ++momentId } as MilestoneMoment;
    if (get().milestone) momentQueue.push(m); else set({ milestone: m });
  },
  nextMilestone() { set({ milestone: momentQueue.shift() ?? null }); },
  sheet: null,
  wheel: null,
  salvageResult: null,
  inspect: null,
  toast: null,

  async connect() {
    const view = await get().service.connect();
    set({ view, clockOffset: view.serverTime - Date.now() });
    // Reconnected in the middle of an encounter: pick the scene up where it stopped.
    if (view.encounter) set({ travel: { from: view.location, to: view.encounter.to, outcome: null, resumed: true, courier: 0, streak: null, depositLost: 0 } });
  },

  async send(cmd) {
    if (get().busy) return [];
    set({ busy: true });
    try {
      const { view, events } = await get().service.send(cmd);
      set({ view, clockOffset: view.serverTime - Date.now() });
      syncReminders(view, get().settings.reminders);
      // Arrived where the course led: the plan is done.
      if (get().course === view.location) set({ course: null });
      // Wheel and salvage show their own result: no toast may give it away early.
      // A charter claim sums up many rewards in one line.
      const staged = events.some((e) => e.type === 'WheelSpun' || e.type === 'SalvageOpened' || e.type === 'CharterClaimed' || e.type === 'ConvoyReturned');
      for (const ev of events) {
        if (staged && (ev.type === 'RewardGranted' || ev.type === 'CrateEarned')) continue;
        if (ev.type === 'WheelSpun') set({ wheel: { index: ev.index, reward: ev.reward } });
        if (ev.type === 'SalvageOpened') set({ salvageResult: { kind: ev.kind, credits: ev.credits, shards: ev.shards } });
        if (ev.type === 'PostBuilt') get().showToast(ev.level === 1 ? 'Handelsposten im Bau' : `Ausbau auf Stufe ${ev.level} läuft`, 'good');
        if (ev.type === 'PostsCollected') { audio.coins(ev.amount); set({ sale: { id: ++saleId, profit: ev.amount, revenue: ev.amount, label: 'Posten-Ertrag', size: saleSize(ev.amount, view.wallet.credits) } }); }
        if (ev.type === 'OfferBought') { audio.coins(300); get().showToast('Gekauft', 'good'); }
        if (ev.type === 'ManifestDone') get().showToast('Manifest erfüllt', 'good');
        if (ev.type === 'BidPlaced') get().showToast('Gebot steht', 'good');
        if (ev.type === 'AuctionBought') { audio.reveal(2); get().showToast('Gekauft: Karte ist in deiner Sammlung', 'good'); }
        if (ev.type === 'CardListed') get().showToast('Angebot läuft', 'good');
        if (ev.type === 'CharterClaimed') { audio.coins(2000); get().showToast([rewardText(ev.total), ev.crates > 0 ? `${ev.crates} Container` : ''].filter(Boolean).join(' + ') || `${ev.rewards} Belohnungen abgeholt`, 'good'); }
        if (ev.type === 'ShipBought') get().celebrate({ kind: 'ship', ship: ev.ship });
        if (ev.type === 'ModuleBought') { audio.coins(800); get().showToast(`${MODULE_BY_ID.get(ev.module)!.name} Stufe ${ev.level}`, 'good'); }
        if (ev.type === 'ConvoySent') get().showToast(`Konvoi unterwegs · Chance ${Math.round(ev.chance * 100)} %`, 'good');
        if (ev.type === 'ConvoyReturned') {
          if (ev.success) audio.coins(ev.reward.credits ?? 500);
          get().showToast(ev.success ? `Konvoi erfolgreich: ${rewardText(ev.reward)}` : `Konvoi gescheitert: nur ${rewardText(ev.reward)}`, ev.success ? 'good' : 'bad');
        }
        if (ev.type === 'SeasonAlbumClaimed' && ev.complete) get().celebrate({ kind: 'album' });
        if (ev.type === 'PaintBought') { audio.coins(600); get().showToast('Neue Lackierung aufgetragen', 'good'); }
        if (ev.type === 'Prestiged') { set({ tab: 'station', sheet: null }); get().celebrate({ kind: 'prestige', rank: ev.rank }); }
        if (ev.type === 'MarketEventStarted') get().showToast(`${CRISIS_NAME[ev.event.category]} auf ${STATION_BY_ID.get(ev.event.stationId)!.name}: ${CATEGORY_NAME[ev.event.category]} gefragt`, 'good');
        if (ev.type === 'MarketEventEnded') get().showToast(ev.byYou ? `Bedarf gedeckt: ${CRISIS_NAME[ev.category]} auf ${STATION_BY_ID.get(ev.stationId)!.name} ist vorbei` : `${CRISIS_NAME[ev.category]} auf ${STATION_BY_ID.get(ev.stationId)!.name} vorbei: Andere haben geliefert`, ev.byYou ? 'good' : 'bad');
        if (ev.type === 'OrderAccepted') get().showToast(`Lieferauftrag angenommen: ${STATION_BY_ID.get(ev.order.to)!.name} in ${ev.order.left} Sprüngen`, 'good');
        if (ev.type === 'OrderDelivered') {
          audio.coins(Math.max(ev.profit, ev.revenue / 4));
          set({ sale: { id: ++saleId, profit: ev.profit, revenue: ev.revenue, label: 'Lieferauftrag erfüllt', size: saleSize(ev.profit, view.wallet.credits) } });
        }
        if (ev.type === 'OrderFailed') {
          // The rules settle it when the jump starts. The player hears of it on arrival, on the arrival card.
          const travel = get().travel;
          if (travel) set({ travel: { ...travel, depositLost: travel.depositLost + ev.order.deposit } });
          else { audio.deny(); get().showToast(`Lieferauftrag ${STATION_BY_ID.get(ev.order.to)!.name} geplatzt: Pfand ${num(ev.order.deposit)} verloren`); }
        }
        if (ev.type === 'CharterBought') get().celebrate({ kind: 'charter' });
        if (ev.type === 'LeagueClaimed' && ev.moved > 0) get().celebrate({ kind: 'league', tier: view.league.tier, tierName: view.league.tierName, rank: ev.rank });
        if (ev.type === 'LeagueClaimed' && ev.moved < 0) get().showToast('Abgestiegen');
        if (ev.type === 'CrateOpened') set({ reveal: ev.pulls, revealCrate: ev.source === 'reward' ? null : ev.tier });
        if (ev.type === 'JumpStarted') set({ travel: { from: ev.from, to: ev.to, outcome: null, resumed: false, courier: 0, streak: null, depositLost: 0 }, routesOpen: false });
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
          // The sound follows the profit, not the turnover: a sale at a loss does not jingle.
          if (ev.profit > 0) audio.coins(ev.profit);
          set({ sale: { id: ++saleId, profit: ev.profit, revenue: ev.revenue, label: ev.profit >= 0 ? 'Gewinn' : 'Verlust', size: saleSize(ev.profit, view.wallet.credits) } });
        }
        if (ev.type === 'LevelUp') get().celebrate({ kind: 'level', level: ev.level });
        if (ev.type === 'RewardGranted') { audio.coins(500); get().showToast(`Erhalten: ${rewardText(ev.reward)}`, 'good'); }
        if (ev.type === 'CrateEarned') get().showToast(ev.tier === 'premium' ? 'Premium-Container im Hangar' : 'Container im Hangar', 'good');
        if (ev.type === 'CrateLost') get().showToast('Hangar voll: Container verloren');
        if (ev.type === 'CardForged') { audio.reveal(2); get().showToast('Karte geschmiedet', 'good'); }
        if (ev.type === 'CardUpgraded') { audio.reveal(1); get().showToast(`Aufgewertet auf Stufe ${ev.level}`, 'good'); }
        if (ev.type === 'StreakChanged') {
          if (ev.kind === 'lost') get().showToast(`Serie gerissen (war ${ev.previous} Tage)`);
          else {
            const travel = get().travel;
            // On a jump the arrival card shows it. Anywhere else a toast does.
            if (travel) set({ travel: { ...travel, streak: { count: ev.count, kind: ev.kind } } });
            else if (ev.kind === 'saved') get().showToast(`Urlaubsschein eingelöst: Serie ${ev.count} Tage`, 'good');
            else get().showToast(`Serie: ${ev.count} ${ev.count === 1 ? 'Tag' : 'Tage'}`, 'good');
          }
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
  setTab(tab) {
    // Cards shimmer when the device tilts. iOS only allows that after asking, and only from a tap like this one.
    if (tab === 'deck' || tab === 'hangar') askForMotion();
    set({ tab });
  },
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
  setInspect(cardId) {
    // Cards tilt with the device. iOS only allows that after asking, and only from a tap like this one.
    if (cardId) askForMotion();
    set({ inspect: cardId });
  },
  settings: loadSettings(),
  setHapticsOn(on) {
    const settings = { ...get().settings, haptics: on };
    setHaptics(on);
    saveSettings(settings);
    set({ settings });
  },
  async setRemindersOn(on) {
    const granted = on ? await askForReminders() : false;
    const settings = { ...get().settings, reminders: granted };
    saveSettings(settings);
    set({ settings });
    const view = get().view;
    if (view) syncReminders(view, granted, true);
    return granted;
  },
  back() {
    const s = get();
    // Reveals and encounters are moments the game owns: back does not skip them.
    if (s.reveal || s.travel) return true;
    if (s.inspect) { set({ inspect: null }); return true; }
    if (s.sheet) { set({ sheet: null }); return true; }
    if (s.routesOpen) { set({ routesOpen: false }); return true; }
    if (s.tab !== 'station') { set({ tab: 'station' }); return true; }
    return false;
  },
  async refresh() {
    if (!get().started || get().busy || get().travel) return;
    try {
      const view = await get().service.connect();
      set({ view, clockOffset: view.serverTime - Date.now() });
    } catch { /* offline: the last view stays */ }
  },
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
