import { FACTIONS, GOOD_BY_ID, STATION_BY_ID } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFuel } from './icons.tsx';

const Risk = ({ label, level }: { label: string; level: number }) => (
  <span className={`risk risk--${level}`}>
    {label}
    <span className="risk__pips">{[0, 1, 2].map((i) => <i key={i} className={i < level ? 'on' : ''} />)}</span>
  </span>
);

export function RouteSheet() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const close = useApp((s) => s.setRoutesOpen);
  const now = useServerNow();
  const empty = view.fuel.amount < 1;

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(false)}>
      <div className="routes" onClick={(e) => e.stopPropagation()}>
        <header className="routes__head">
          <div>
            <span className="eyebrow">Sprungziel wählen</span>
            <h3>Wohin, Kapitän?</h3>
          </div>
          <span className="pill"><IconFuel />{view.fuel.amount} / {view.fuel.max}</span>
        </header>
        {view.routes.map((r, i) => {
          const st = STATION_BY_ID.get(r.stationId)!;
          return (
            <button
              key={r.stationId}
              className="route"
              style={{ ['--faction' as string]: FACTION_COLOR[st.faction], animationDelay: `${i * 70}ms` }}
              disabled={busy || empty}
              onClick={() => { audio.tap(); void send({ type: 'Jump', to: r.stationId }); }}
            >
              <span className="route__top">
                <span>
                  <b>{st.name}</b>
                  <small>{FACTIONS[st.faction].name} · {st.tagline}</small>
                </span>
                <span className="route__go">Sprung<small>{r.fuel} Treibstoff</small></span>
              </span>
              <span className="route__risks">
                <Risk label="Zoll" level={r.customs} />
                <Risk label="Piraten" level={r.pirates} />
              </span>
              <span className="route__hints">
                {r.hints.length === 0 && <i className="hint">Keine lohnende Ware von hier</i>}
                {r.hints.map((h) => {
                  const good = GOOD_BY_ID.get(h.goodId)!;
                  const aboard = (view.cargo.items[h.goodId]?.qty ?? 0) > 0;
                  return (
                    <i key={h.goodId} className={`hint${aboard ? ' hint--aboard' : ''}${good.contraband ? ' hint--hot' : ''}`}>
                      {good.name} +{Math.round(h.pct * 100)} %
                    </i>
                  );
                })}
              </span>
            </button>
          );
        })}
        <p className="routes__note">
          {empty && view.fuel.nextAt
            ? `Tank leer. Nächste Einheit in ${countdown(view.fuel.nextAt - now)}. Ein Stufenaufstieg füllt den Tank.`
            : 'Aufschläge gelten für Ware, die du hier kaufst. Preise bewegen sich während des Sprungs.'}
        </p>
      </div>
    </div>
  );
}
