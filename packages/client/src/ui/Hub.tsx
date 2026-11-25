import { FACTIONS, GOOD_BY_ID, STATION_BY_ID } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFuel, IconHangar, IconMarket } from './icons.tsx';

const CUSTOMS = ['Kein Zoll', 'Zoll lax', 'Zoll wachsam', 'Zoll streng'];

export function Hub() {
  const view = useApp((s) => s.view)!;
  const setTab = useApp((s) => s.setTab);
  const openRoutes = useApp((s) => s.setRoutesOpen);
  const now = useServerNow();
  const station = STATION_BY_ID.get(view.location)!;
  const freeIn = view.crates.nextFreeAt - now;
  const go = (tab: 'hangar' | 'market') => (): void => { audio.tap(); setTab(tab); };

  // The ticker is the live local market, strongest deviations first.
  const movers = [...view.market].sort((a, b) => Math.abs(b.level - 1) - Math.abs(a.level - 1));
  const wanted = [...view.market].sort((a, b) => b.level - a.level)[0]!;

  return (
    <section className="hub" style={{ ['--faction' as string]: FACTION_COLOR[station.faction] }}>
      <header className="hub__loc">
        <span className="eyebrow">{FACTIONS[station.faction].name} · {station.tagline}</span>
        <h1>{station.name}</h1>
        <div className="chips">
          <span className={`chip ${station.customs >= 2 ? 'chip--hot' : 'chip--ok'}`}>{CUSTOMS[station.customs]}</span>
          <span className="chip chip--hot">{GOOD_BY_ID.get(wanted.goodId)!.name} gefragt</span>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          {[...movers, ...movers].map((m, i) => (
            <span key={i} className={`ticker__item ticker__item--${m.level >= 1 ? 'up' : 'down'}`}>
              <b>{GOOD_BY_ID.get(m.goodId)!.name}</b>{m.level >= 1 ? '+' : '−'}{Math.abs(Math.round((m.level - 1) * 100))} %
            </span>
          ))}
        </div>
      </div>

      <div className="hub__grow" />

      <div className="tiles">
        <button className="tile" onClick={go('market')}>
          <span className="tile__icon"><IconMarket /></span>
          <span className="tile__label">Laderaum</span>
          <span className="tile__value">{view.cargo.used}<small> / {view.cargo.cap}</small></span>
        </button>
        <div className="tile">
          <span className="tile__icon"><IconFuel /></span>
          <span className="tile__label">{view.fuel.nextAt ? `+1 in ${countdown(view.fuel.nextAt - now)}` : 'Treibstoff'}</span>
          <span className="pips">
            {Array.from({ length: view.fuel.max }, (_, i) => <i key={i} className={i < view.fuel.amount ? 'on' : ''} />)}
          </span>
        </div>
        <button className={`tile${freeIn <= 0 ? ' tile--ready' : ''}`} onClick={go('hangar')}>
          <span className="tile__icon"><IconHangar /></span>
          <span className="tile__label">Gratis-Container</span>
          <span className="tile__value">{freeIn <= 0 ? 'Bereit' : countdown(freeIn)}</span>
        </button>
      </div>

      <button className="cta" onClick={() => { audio.tap(); openRoutes(true); }}>
        <span>Route wählen</span>
        <small>{view.routes.length} Ziele in Reichweite</small>
      </button>
    </section>
  );
}
