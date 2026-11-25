import { CARD_BY_ID } from '@nova/core';
import { useEffect } from 'react';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/index.ts';
import { useApp, type Tab } from '../store.ts';
import { BottomNav } from './BottomNav.tsx';
import { Deck } from './Deck.tsx';
import { Hangar } from './Hangar.tsx';
import { HoloCard } from './HoloCard.tsx';
import { Hub } from './Hub.tsx';
import { Locked } from './Locked.tsx';
import { Reveal } from './Reveal.tsx';
import { Splash } from './Splash.tsx';
import { TopBar } from './TopBar.tsx';

/** Where the planet sits behind each screen (screen widths, y up). */
const PLANET: Record<Tab, [number, number, number]> = {
  station: [0.3, 0.52, 0.62],
  market: [0.75, 0.2, 0.9],
  deck: [0.62, 1.05, 0.5],
  hangar: [-0.62, 0.95, 0.55],
  league: [0.0, 1.35, 0.7],
};

export function App() {
  const view = useApp((s) => s.view);
  const started = useApp((s) => s.started);
  const tab = useApp((s) => s.tab);
  const reveal = useApp((s) => s.reveal);
  const inspect = useApp((s) => s.inspect);
  const toast = useApp((s) => s.toast);
  const connect = useApp((s) => s.connect);
  const setInspect = useApp((s) => s.setInspect);

  useEffect(() => { void connect(); }, [connect]);
  useEffect(() => {
    if (started) stage.setPlanet(...PLANET[tab]);
    else stage.setPlanet(0.0, -1.12, 0.85);
  }, [tab, started]);

  if (!started || !view) return <Splash ready={view !== null} />;

  const inspected = inspect ? CARD_BY_ID.get(inspect) : undefined;

  return (
    <div className={`app${reveal ? ' is-revealing' : ''}`}>
      <TopBar />
      <main className="app__main" key={tab}>
        {tab === 'station' && <Hub />}
        {tab === 'hangar' && <Hangar />}
        {tab === 'deck' && <Deck />}
        {tab === 'market' && <Locked title="Markt" text="Handel, Schmuggel und Auktionshaus" phase="Phase 2 und 3" />}
        {tab === 'league' && <Locked title="Liga" text="Wochenwertung mit Auf- und Abstieg" phase="Phase 4" />}
      </main>
      <BottomNav />

      {inspected && (
        <div className="overlay overlay--dim" onClick={() => { audio.tap(); setInspect(null); }}>
          <div onClick={(e) => e.stopPropagation()}>
            <HoloCard card={inspected} interactive />
          </div>
          <p className="overlay__hint">Karte bewegen · Tippen zum Schliessen</p>
        </div>
      )}
      {reveal && <Reveal pulls={reveal} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
