import { CATEGORY_NAME, courseFuel, courseTo, GOOD_BY_ID, STATION_BY_ID, type CrisisView, type StationId } from '@nova/core';
import { useRef } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFuel } from './icons.tsx';
import { CloseX } from './Spend.tsx';
import { Emblem } from './Emblem.tsx';
import { jumps, orderState, orderStatus } from './Orders.tsx';
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
  const targetOrder = view.orders.active.find((o) => o.to === course);
  const need = courseFuel(view.location, path);
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
        <div className="legend" aria-hidden="true">
          <span><i className="legend__lane" />1 Treibstoff</span>
          <span><i className="legend__lane legend__lane--express" />Express: 2 Treibstoff</span>
          <span>Station antippen: Kurs setzen</span>
        </div>
        {/* Far places worth a trip, as chips: tap one to set a course. */}
        {(view.events.some((e) => e.stationId !== view.location) || view.orders.active.some((o) => !o.here)) && (
          <div className="targets">
            {view.events.filter((e) => e.stationId !== view.location).map((e) => (
              <button key={e.stationId} className={`target target--crisis${e.stationId === course ? ' is-on' : ''}`} onClick={() => pick(e.stationId)}>
                <b>{e.name}</b>{STATION_BY_ID.get(e.stationId)!.name} · +{Math.round((e.mult - 1) * 100)} %
              </button>
            ))}
            {view.orders.active.filter((o) => !o.here).map((o) => (
              <button key={o.id} className={`target target--order target--order-${orderState(o)}${o.to === course ? ' is-on' : ''}`} onClick={() => pick(o.to)}>
                <b>Auftrag</b>{STATION_BY_ID.get(o.to)!.name} · noch {o.left}
              </button>
            ))}
          </div>
        )}
        {target && path.length > 0 && (
          <div className="course">
            <span>
              <b>Kurs: {target.name}</b>
              <small className={need > view.fuel.amount ? 'is-short' : ''}>
                {jumps(path.length)} · {need} Treibstoff{need > view.fuel.amount ? `, im Tank ${view.fuel.amount}` : ''}
              </small>
              {targetCrisis && <small className="course__crisis">{targetCrisis.name}: {CATEGORY_NAME[targetCrisis.category]} +{Math.round((targetCrisis.mult - 1) * 100)} % · bei Ankunft Bedarf {targetCrisis.onArrival}</small>}
              {targetOrder && <small className={`course__order course__order--${orderState(targetOrder)}`}>Auftrag: {targetOrder.qty} × {GOOD_BY_ID.get(targetOrder.goodId)!.name} · {orderStatus(targetOrder)}</small>}
            </span>
            <button className="link" onClick={() => { audio.tap(); setCourse(null); }}>Löschen</button>
          </div>
        )}
        {routes.map((r, i) => {
          const st = STATION_BY_ID.get(r.stationId)!;
          return (
            <button
              key={r.stationId}
              ref={(el) => { if (el) cards.current.set(r.stationId, el); }}
              className={`route${r.event ? ' route--event' : ''}${r.stationId === next ? ' route--course' : ''}`}
              style={{ ['--faction' as string]: FACTION_COLOR[st.faction], animationDelay: `${i * 70}ms` }}
              disabled={busy || view.fuel.amount < r.fuel}
              onClick={() => { audio.tap(); void send({ type: 'Jump', to: r.stationId }); }}
            >
              <span className="route__top">
                <Emblem faction={st.faction} className="emblem--route" />
                <span className="route__title">
                  <b>{st.name}</b>
                  <small className="route__risks">
                    <Risk label="Zoll" chance={r.customsChance} />
                    <Risk label="Piraten" chance={r.piratesChance} />
                    {r.wanted > 0 && <span className="risk risk--3">Fahndung <b>{'★'.repeat(r.wanted)}</b></span>}
                  </small>
                </span>
                <span className="route__go">Sprung<small>{view.fuel.amount < r.fuel ? `braucht ${r.fuel} Treibstoff` : `${r.stationId === next && path.length > 1 ? 'Kurs · ' : r.fuel > 1 ? 'Express · ' : ''}${r.fuel} Treibstoff`}</small></span>
              </span>
              {(r.event || r.hints.length > 0) && (
                <span className="route__hints">
                  {r.event && <i className="hint hint--event">{r.event.name}: {CATEGORY_NAME[r.event.category]} +{Math.round((r.event.mult - 1) * 100)} %</i>}
                  {/* The two best trades are enough to decide. The market shows the rest. */}
                  {r.hints.slice(0, 2).map((h) => {
                    const good = GOOD_BY_ID.get(h.goodId)!;
                    const aboard = (view.cargo.items[h.goodId]?.qty ?? 0) > 0;
                    return (
                      <i key={h.goodId} className={`hint${aboard ? ' hint--aboard' : ''}${h.fence ? ' hint--hot' : ''}`}>
                        {good.name} +{Math.round(h.pct * 100)} %{h.fence ? ' · Hehler' : ''}
                      </i>
                    );
                  })}
                </span>
              )}
            </button>
          );
        })}
        {empty && view.fuel.nextAt && <p className="routes__note">Tank leer. Nächste Einheit in {countdown(view.fuel.nextAt - now)}.</p>}
      </div>
    </div>
  );
}
