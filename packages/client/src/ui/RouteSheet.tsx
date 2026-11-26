import { CATEGORY_NAME, courseTo, FACTIONS, GOOD_BY_ID, STATION_BY_ID, type CrisisView, type StationId } from '@nova/core';
import { useRef } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFuel } from './icons.tsx';
import { CloseX } from './Spend.tsx';
import { Emblem } from './Emblem.tsx';
import { SectorMap } from './SectorMap.tsx';

/** One line that says everything a captain needs to decide whether a crisis is worth the trip. */
export const crisisLine = (e: CrisisView): string =>
  `${CATEGORY_NAME[e.category]} +${Math.round((e.mult - 1) * 100)} % · Bedarf ${e.demand}, sinkt um ${e.drain} pro Sprung`;

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
  const course = useApp((s) => s.course);
  const setCourse = useApp((s) => s.setCourse);
  const cards = useRef(new Map<StationId, HTMLButtonElement>());
  const path = course && course !== view.location ? courseTo(view.location, course) : [];
  const next = path[0] ?? null;
  const target = course ? STATION_BY_ID.get(course) : undefined;
  const targetCrisis = view.events.find((e) => e.stationId === course);
  const pick = (id: StationId): void => {
    audio.tap();
    if (id === view.location) { setCourse(null); return; }
    setCourse(id);
    // The first jump of the way is one of the cards below: bring it into view.
    const first = courseTo(view.location, id)[0];
    if (first) requestAnimationFrame(() => cards.current.get(first)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  // The jump that follows the course comes first.
  const routes = [...view.routes].sort((a, b) => Number(b.stationId === next) - Number(a.stationId === next));

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(false)}>
      <div className="routes" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => close(false)} />
        <header className="routes__head">
          <div>
            <span className="eyebrow">Sternkarte</span>
            <h3>Wohin, Kapitän?</h3>
          </div>
          <span className="pill"><IconFuel />{view.fuel.amount} / {view.fuel.max}</span>
        </header>
        <SectorMap view={view} course={course} onPick={pick} />
        {target && path.length > 0 && (
          <div className="course">
            <span>
              <b>Kurs: {target.name}</b>
              <small>
                {path.length === 1 ? '1 Sprung' : `${path.length} Sprünge über ${path.slice(0, -1).map((id) => STATION_BY_ID.get(id)!.name).join(', ')}`}
                {path.length > view.fuel.amount ? ` · dein Tank reicht für ${view.fuel.amount}` : ''}
              </small>
              {targetCrisis && <small className="course__crisis">{targetCrisis.name}: {crisisLine(targetCrisis)}. Bei direkter Fahrt bleiben {targetCrisis.onArrival}.</small>}
            </span>
            <button className="link" onClick={() => { audio.tap(); setCourse(null); }}>Löschen</button>
          </div>
        )}
        {view.events.filter((e) => e.stationId !== course && e.stationId !== view.location).map((e) => (
          <button key={e.stationId} className="crisis" onClick={() => pick(e.stationId)}>
            <b>{e.name} auf {STATION_BY_ID.get(e.stationId)!.name}</b>
            <small>{crisisLine(e)} · {e.hops} {e.hops === 1 ? 'Sprung' : 'Sprünge'} entfernt, bei Ankunft noch {e.onArrival}</small>
          </button>
        ))}
        {routes.map((r, i) => {
          const st = STATION_BY_ID.get(r.stationId)!;
          return (
            <button
              key={r.stationId}
              ref={(el) => { if (el) cards.current.set(r.stationId, el); }}
              className={`route${r.event ? ' route--event' : ''}${r.stationId === next ? ' route--course' : ''}`}
              style={{ ['--faction' as string]: FACTION_COLOR[st.faction], animationDelay: `${i * 70}ms` }}
              disabled={busy || empty}
              onClick={() => { audio.tap(); void send({ type: 'Jump', to: r.stationId }); }}
            >
              <span className="route__top">
                <Emblem faction={st.faction} className="emblem--route" />
                <span className="route__title">
                  <b>{st.name}</b>
                  <small>{FACTIONS[st.faction].name} · {st.tagline}</small>
                </span>
                <span className="route__go">Sprung<small>{r.stationId === next && path.length > 1 ? `Kurs · noch ${path.length}` : `${r.fuel} Treibstoff`}</small></span>
              </span>
              {r.event && (
                <span className="route__event">
                  {r.event.name}: {crisisLine(r.event)}
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
            : 'Tippe eine Station auf der Karte an, um einen Kurs zu setzen. Gewinn für 10 Einheiten, hier gekauft und dort verkauft.'}
        </p>
      </div>
    </div>
  );
}
