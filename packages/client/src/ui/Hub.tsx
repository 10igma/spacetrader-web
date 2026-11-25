import { CARDS } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconDeck, IconFuel, IconHangar } from './icons.tsx';

// Placeholder flavour until the market simulation exists (Phase 2).
const TICKER = [
  ['Cyberware', '+18 %', 'up'],
  ['Neurostaub', '−6 %', 'down'],
  ['Razzia auf Kessin Tief', 'Zoll verschärft', 'warn'],
  ['Plasmagewehre', 'knapp', 'up'],
  ['Schwarzcode', '+31 %', 'up'],
  ['Hydrokultur', '−2 %', 'down'],
] as const;

export function Hub() {
  const view = useApp((s) => s.view)!;
  const setTab = useApp((s) => s.setTab);
  const now = useServerNow();
  const freeIn = view.crates.nextFreeAt - now;
  const owned = Object.keys(view.collection).length;
  const go = (tab: 'hangar' | 'deck') => (): void => { audio.tap(); setTab(tab); };

  return (
    <section className="hub">
      <header className="hub__loc">
        <span className="eyebrow">Sektor Tessera · Freihandelszone</span>
        <h1>Meridian Hoch</h1>
        <div className="chips">
          <span className="chip chip--ok">Zoll lax</span>
          <span className="chip chip--hot">Cyberware gefragt</span>
        </div>
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          {[...TICKER, ...TICKER].map(([name, value, kind], i) => (
            <span key={i} className={`ticker__item ticker__item--${kind}`}><b>{name}</b>{value}</span>
          ))}
        </div>
      </div>

      <div className="hub__grow" />

      <div className="tiles">
        <button className={`tile${freeIn <= 0 ? ' tile--ready' : ''}`} onClick={go('hangar')}>
          <span className="tile__icon"><IconHangar /></span>
          <span className="tile__label">Gratis-Container</span>
          <span className="tile__value">{freeIn <= 0 ? 'Bereit' : countdown(freeIn)}</span>
        </button>
        <div className="tile">
          <span className="tile__icon"><IconFuel /></span>
          <span className="tile__label">Treibstoff</span>
          <span className="pips">
            {Array.from({ length: view.fuel.max }, (_, i) => <i key={i} className={i < view.fuel.amount ? 'on' : ''} />)}
          </span>
        </div>
        <button className="tile" onClick={go('deck')}>
          <span className="tile__icon"><IconDeck /></span>
          <span className="tile__label">Sammlung</span>
          <span className="tile__value">{owned}<small> / {CARDS.length}</small></span>
        </button>
      </div>

      <button className="cta" onClick={go('hangar')}>
        <span>Zum Hangar</span>
        <small>Container öffnen</small>
      </button>
      <p className="hub__note">Technik-Vorschau · Handel und Sprünge folgen in Phase 1 und 2</p>
    </section>
  );
}
