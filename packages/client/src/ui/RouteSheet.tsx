import { CATEGORY_NAME, FACTIONS, GOOD_BY_ID, STATION_BY_ID } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFuel } from './icons.tsx';
import { CloseX } from './Spend.tsx';

const Risk = ({ label, chance }: { label: string; chance: number }) => (
  <span className={`risk risk--${chance >= 0.4 ? 3 : chance >= 0.2 ? 2 : chance > 0 ? 1 : 0}`}>
    {label} <b>{Math.round(chance * 100)} %</b>
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
        <CloseX onClick={() => close(false)} />
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
              className={`route${r.event ? ' route--event' : ''}`}
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
              {r.event && (
                <span className="route__event">
                  Knappheit: {CATEGORY_NAME[r.event.category]} +{Math.round((r.event.mult - 1) * 100)} % · noch {r.event.jumpsLeft} {r.event.jumpsLeft === 1 ? 'Sprung' : 'Sprünge'}
                </span>
              )}
              <span className="route__risks">
                <Risk label="Zoll" chance={r.customsChance} />
                <Risk label="Piraten" chance={r.piratesChance} />
                {r.wanted > 0 && <span className="risk risk--3">Fahndung <b>{'★'.repeat(r.wanted)}</b></span>}
              </span>
              <span className="route__hints">
                {r.hints.length === 0 && <i className="hint hint--none">Keine lohnende Ware von hier</i>}
                {r.hints.map((h) => {
                  const good = GOOD_BY_ID.get(h.goodId)!;
                  const aboard = (view.cargo.items[h.goodId]?.qty ?? 0) > 0;
                  return (
                    <i key={h.goodId} className={`hint${aboard ? ' hint--aboard' : ''}${h.fence ? ' hint--hot' : ''}`}>
                      {good.name} +{Math.round(h.pct * 100)} %{h.fence ? ' · Hehler' : ''}
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
            : 'Gewinn für 10 Einheiten, hier gekauft und dort verkauft. Preise bewegen sich während des Sprungs.'}
        </p>
      </div>
    </div>
  );
}
