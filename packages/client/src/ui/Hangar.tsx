import { CONFIG, RARITIES } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, num, RARITY_LABEL } from './format.ts';
import { useServerNow } from './hooks.ts';
import { Credits } from './icons.tsx';

function Crate() {
  return (
    <div className="crate" aria-hidden="true">
      <div className="crate__glow" />
      <svg viewBox="0 0 240 240">
        <defs>
          <linearGradient id="crT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#35486e" /><stop offset="1" stopColor="#16203a" /></linearGradient>
          <linearGradient id="crL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1c2946" /><stop offset="1" stopColor="#0a101f" /></linearGradient>
          <linearGradient id="crR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#111a30" /><stop offset="1" stopColor="#060a14" /></linearGradient>
        </defs>
        <path d="M120 22l88 46-88 46-88-46z" fill="url(#crT)" stroke="#6f8cc4" strokeWidth="1.5" />
        <path d="M32 68l88 46v104l-88-46z" fill="url(#crL)" stroke="#4d6696" strokeWidth="1.5" />
        <path d="M208 68l-88 46v104l88-46z" fill="url(#crR)" stroke="#3b5080" strokeWidth="1.5" />
        <g className="crate__seams" fill="none" strokeWidth="2.5" strokeLinecap="round">
          <path d="M120 114v104" />
          <path d="M32 120l88 46 88-46" />
          <path d="M76 45l88 46M164 45l-88 46" />
        </g>
        <g fill="none" stroke="#8fb0ee" strokeWidth="1" opacity=".5">
          <path d="M48 92l56 29M48 104l40 21M192 92l-56 29M192 104l-40 21" />
          <path d="M48 176l56 29M192 176l-56 29" />
        </g>
        <circle className="crate__core" cx="120" cy="166" r="9" />
      </svg>
    </div>
  );
}

export function Hangar() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const [odds, setOdds] = useState(false);
  const freeIn = view.crates.nextFreeAt - now;
  const free = freeIn <= 0;
  const { pityElite, pityLegend } = view.crates;

  const open = (type: 'ClaimFreeCrate' | 'BuyCrate') => (): void => { audio.tap(); void send({ type }); };

  return (
    <section className="hangar">
      <header className="screenhead">
        <span className="eyebrow">Hangar</span>
        <h2>Frachtcontainer</h2>
      </header>

      <Crate />

      <div className="pity">
        <div className="meter meter--elite">
          <div className="meter__row"><span>Elite garantiert in</span><b>{pityElite.max - pityElite.current}</b></div>
          <div className="meter__bar"><i style={{ width: `${(pityElite.current / pityElite.max) * 100}%` }} /></div>
        </div>
        <div className="meter meter--legend">
          <div className="meter__row"><span>Legende garantiert in</span><b>{pityLegend.max - pityLegend.current}</b></div>
          <div className="meter__bar"><i style={{ width: `${(pityLegend.current / pityLegend.max) * 100}%` }} /></div>
        </div>
      </div>

      {free ? (
        <button className="cta cta--gold" disabled={busy} onClick={open('ClaimFreeCrate')}>
          <span>Gratis öffnen</span>
          <small>{CONFIG.crate.cards} Karten · mindestens 1 Selten</small>
        </button>
      ) : (
        <button className="cta" disabled={busy} onClick={open('BuyCrate')}>
          <span>Öffnen <i className="price"><Credits />{num(view.crates.price)}</i></span>
          <small>{CONFIG.crate.cards} Karten · mindestens 1 Selten</small>
        </button>
      )}
      <div className="hangar__sub">
        {free
          ? <button className="link" disabled={busy} onClick={open('BuyCrate')}>Kaufen für {num(view.crates.price)} Credits</button>
          : <span>Nächster Gratis-Container in <b>{countdown(freeIn)}</b></span>}
        <button className="link" onClick={() => { audio.tap(); setOdds(true); }}>Quoten</button>
      </div>

      {odds && (
        <div className="overlay overlay--dim" onClick={() => setOdds(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h3>Quoten pro Karte</h3>
            <table>
              <tbody>
                {RARITIES.map((r) => (
                  <tr key={r} className={`odds odds--${r}`}>
                    <td><i />{RARITY_LABEL[r]}</td>
                    <td>{(CONFIG.crate.odds[r] * 100).toLocaleString('de-CH', { maximumFractionDigits: 1 })} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Jeder Container enthält mindestens eine Karte der Stufe Selten. Spätestens jeder {CONFIG.crate.pityElite}. Container
              enthält eine Elite oder besser, spätestens jeder {CONFIG.crate.pityLegend}. eine Legende oder besser. Doppelte Karten
              werden zu Splittern.
            </p>
            <button className="cta cta--ghost" onClick={() => setOdds(false)}><span>Schliessen</span></button>
          </div>
        </div>
      )}
    </section>
  );
}
