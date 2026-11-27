import { CARD_BY_ID, CONFIG, forgeCost, STATION_BY_ID, upgradeCost, type FactionId } from '@nova/core';
import { useEffect } from 'react';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/index.ts';
import { useApp, type Tab } from '../store.ts';
import { BottomNav } from './BottomNav.tsx';
import { Deck } from './Deck.tsx';
import { Hangar } from './Hangar.tsx';
import { HoloCard } from './HoloCard.tsx';
import { Hub } from './Hub.tsx';
import { Daily } from './Daily.tsx';
import { Market } from './Market.tsx';
import { Milestone } from './Milestone.tsx';
import { num } from './format.ts';
import { Reveal } from './Reveal.tsx';
import { RouteSheet } from './RouteSheet.tsx';
import { ProfileSheet } from './Profile.tsx';
import { CloseX } from './Spend.tsx';
import { SettingsSheet } from './Settings.tsx';
import { PostSheet, SalvageSheet, WheelSheet } from './Sheets.tsx';
import { OrderSheet } from './Orders.tsx';
import { Splash } from './Splash.tsx';
import { TopBar } from './TopBar.tsx';
import { Travel } from './Travel.tsx';
import { VfxCanvas } from './VfxCanvas.tsx';

const FACTION_RGB: Record<FactionId, [number, number, number]> = {
  tessera: [0.18, 0.85, 1.0],
  asche: [1.0, 0.44, 0.16],
  helix: [0.95, 0.25, 0.72],
  zenit: [0.72, 0.82, 1.0],
};

/** Where the planet sits behind each screen (screen widths, y up). */
const PLANET: Record<Tab, [number, number, number]> = {
  station: [0.3, 0.52, 0.62],
  market: [0.75, 0.2, 0.9],
  deck: [0.62, 1.05, 0.5],
  hangar: [-0.62, 0.95, 0.55],
  daily: [0.0, 1.35, 0.7],
};

export function App() {
  const view = useApp((s) => s.view);
  const started = useApp((s) => s.started);
  const tab = useApp((s) => s.tab);
  const reveal = useApp((s) => s.reveal);
  const travel = useApp((s) => s.travel);
  const routesOpen = useApp((s) => s.routesOpen);
  const sale = useApp((s) => s.sale);
  const milestone = useApp((s) => s.milestone);
  const sheet = useApp((s) => s.sheet);
  const location = view?.location;
  const inspect = useApp((s) => s.inspect);
  const toast = useApp((s) => s.toast);
  const connect = useApp((s) => s.connect);
  const setInspect = useApp((s) => s.setInspect);
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);

  useEffect(() => { void connect(); }, [connect]);
  // The planet and subtle nebula tint behind the UI always match the docked station.
  useEffect(() => {
    if (location && !travel) {
      const st = STATION_BY_ID.get(location)!;
      stage.setWorld(st.look);
      stage.setFaction(FACTION_RGB[st.faction]);
    }
  }, [location, travel]);
  useEffect(() => {
    if (travel) return; // the travel scene owns the stage while it runs
    if (started) stage.setPlanet(...PLANET[tab]);
    else stage.setPlanet(0.0, -1.12, 0.85);
  }, [tab, started, travel]);
  // Throttle background WebGL when an opaque modal/sheet covers most of the screen.
  useEffect(() => {
    stage.setDimmed(Boolean(routesOpen || sheet || inspect || milestone));
  }, [routesOpen, sheet, inspect, milestone]);
  // Desktop Escape key closes any open overlay or sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      const s = useApp.getState();
      if (s.inspect) s.setInspect(null);
      else if (s.sheet) s.setSheet(null);
      else if (s.routesOpen) s.setRoutesOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!started || !view) return <Splash ready={view !== null} />;

  const inspected = inspect ? CARD_BY_ID.get(inspect) : undefined;

  return (
    <div className={`app${reveal || travel ? ' is-revealing' : ''}${tab !== 'station' ? ' app--inner' : ''}`}>
      <TopBar />
      <main className="app__main" key={tab}>
        {tab === 'station' && <Hub />}
        {tab === 'hangar' && <Hangar />}
        {tab === 'deck' && <Deck />}
        {tab === 'market' && <Market />}
        {tab === 'daily' && <Daily />}
      </main>
      <BottomNav />

      {inspected && (
        <div className="overlay overlay--dim" onClick={() => { audio.tap(); setInspect(null); }}>
          <CloseX onClick={() => setInspect(null)} />
          <div onClick={(e) => e.stopPropagation()}>
            <HoloCard card={inspected} interactive={!!view.collection[inspected.id]} locked={!view.collection[inspected.id]} level={view.cardLevels[inspected.id] ?? 1} />
          </div>
          {(() => {
            const owned = !!view.collection[inspected.id];
            const level = view.cardLevels[inspected.id] ?? 1;
            const expired = !owned && inspected.season !== undefined && inspected.season !== view.season.index;
            const cost = owned ? upgradeCost(inspected, level) : forgeCost(inspected);
            const act = (): void => { audio.tap(); void send({ type: owned ? 'UpgradeCard' : 'ForgeCard', cardId: inspected.id }); };
            return (
              <div className="upcard" onClick={(e) => e.stopPropagation()}>
                {owned
                  ? <span>Stufe <b>{level}</b> / {CONFIG.cards.maxLevel} · jede Stufe +{CONFIG.cards.statPerLevel} auf alle Werte</span>
                  : expired ? <span>Diese Karte gab es nur in ihrer Saison. Sie ist nicht mehr zu bekommen.</span>
                    : inspected.season !== undefined ? <span>Saison-Edition: fällt nur diese Saison aus Containern (rund {Math.round(view.seasonAlbum.cardShare * 100)} % der seltenen und besseren Karten) oder lässt sich jetzt schmieden.</span>
                      : <span>Fehlt in deiner Sammlung. Du findest sie in Containern oder schmiedest sie aus Splittern.</span>}
                {expired ? null : cost === null ? <em>Maximal aufgewertet</em> : (
                  <button className="mission__btn" disabled={busy || view.wallet.shards < cost} onClick={act}>
                    {owned ? 'Aufwerten' : 'Schmieden'} · {num(cost)} Splitter
                  </button>
                )}
                <small>Du hast {num(view.wallet.shards)} Splitter</small>
              </div>
            );
          })()}
        </div>
      )}
      {routesOpen && !travel && <RouteSheet />}
      {sheet === 'posts' && !travel && <PostSheet />}
      {sheet === 'wheel' && <WheelSheet />}
      {milestone && !travel && !reveal && <Milestone key={`moment-${milestone.id}`} />}
      {sheet === 'profile' && !travel && <ProfileSheet />}
      {sheet === 'settings' && <SettingsSheet />}
      {sheet === 'salvage' && !travel && <SalvageSheet />}
      {sheet === 'orders' && !travel && <OrderSheet />}
      {reveal && <Reveal pulls={reveal} />}
      {travel && <Travel travel={travel} />}
      {sale && (
        <div key={`sale-${sale.id}`} className={`salepop salepop--${sale.size} ${sale.profit >= 0 ? 'is-up' : 'is-down'}`} aria-live="polite">
          <small>{sale.label}</small>
          <b>{sale.profit >= 0 ? '+' : '−'}{num(Math.abs(sale.profit))}</b>
        </div>
      )}
      {toast && <div className={`toast toast--${toast.tone}`} role="status">{toast.text}</div>}
      <VfxCanvas />
    </div>
  );
}
