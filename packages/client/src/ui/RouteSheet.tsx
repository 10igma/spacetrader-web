import { CATEGORY_NAME, courseFuel, courseTo, GOOD_BY_ID, STATION_BY_ID, type CrisisView, type StationId } from '@nova/core';
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
  const course = useApp((s) => s.course);
  const setCourse = useApp((s) => s.setCourse);

  // Without a course the chart proposes the jump that sells best: what is aboard first, then anything.
  const proposal = [...view.routes].sort((a, b) => {
    const worth = (r: typeof a): number => Math.max(0, ...r.hints.map((h) => h.pct + (view.cargo.items[h.goodId] ? 10 : 0)));
    return worth(b) - worth(a);
  })[0];
  const chosen = course && course !== view.location ? course : null;
  const targetId = chosen ?? proposal?.stationId ?? null;
  const target = targetId ? STATION_BY_ID.get(targetId)! : null;
  const path = targetId ? courseTo(view.location, targetId) : [];
  const hop = view.routes.find((r) => r.stationId === path[0]);
  const hopStation = hop ? STATION_BY_ID.get(hop.stationId)! : null;
  const targetCrisis = view.events.find((e) => e.stationId === targetId);
  const targetOrder = view.orders.active.find((o) => o.to === targetId);
  const need = courseFuel(view.location, path);
  const short = hop ? view.fuel.amount < hop.fuel : true;
  const pick = (id: StationId): void => { audio.tap(); setCourse(id === view.location ? null : id); };

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
        <SectorMap view={view} course={chosen} proposed={chosen ? null : targetId} onPick={pick} />
        <div className="legend" aria-hidden="true">
          <span><i className="legend__lane" />1 Treibstoff</span>
          <span><i className="legend__lane legend__lane--express" />Express: 2 Treibstoff</span>
          <span>Station antippen: Ziel wählen</span>
        </div>
        {/* Far places worth a trip, as chips: tap one to set a course. */}
        {(view.events.some((e) => e.stationId !== view.location) || view.orders.active.some((o) => !o.here)) && (
          <div className="targets">
            {view.events.filter((e) => e.stationId !== view.location).map((e) => (
              <button key={e.stationId} className={`target target--crisis${e.stationId === chosen ? ' is-on' : ''}`} onClick={() => pick(e.stationId)}>
                <b>{e.name}</b>{STATION_BY_ID.get(e.stationId)!.name} · +{Math.round((e.mult - 1) * 100)} %
              </button>
            ))}
            {view.orders.active.filter((o) => !o.here).map((o) => (
              <button key={o.id} className={`target target--order target--order-${orderState(o)}${o.to === chosen ? ' is-on' : ''}`} onClick={() => pick(o.to)}>
                <b>Auftrag</b>{STATION_BY_ID.get(o.to)!.name} · noch {o.left}
              </button>
            ))}
          </div>
        )}
        {/* One destination at a time: where to, what it costs, what waits there, and the jump itself. */}
        {target && hop && hopStation && (
          <div className={`dest${chosen ? ' dest--course' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[target.faction] }}>
            <div className="dest__head">
              <Emblem faction={target.faction} className="emblem--route" />
              <span className="dest__title">
                <small className="eyebrow">{chosen ? (path.length > 1 ? 'Kurs' : 'Ziel') : 'Vorschlag'}</small>
                <b>{target.name}</b>
              </span>
              {chosen && <button className="link" onClick={() => { audio.tap(); setCourse(null); }}>Löschen</button>}
            </div>
            {path.length > 1 && (
              <small className={`dest__way${need > view.fuel.amount ? ' is-short' : ''}`}>
                {jumps(path.length)} · {need} Treibstoff{need > view.fuel.amount ? `, im Tank ${view.fuel.amount}` : ''}
              </small>
            )}
            {targetCrisis && <small className="course__crisis">{targetCrisis.name}: {CATEGORY_NAME[targetCrisis.category]} +{Math.round((targetCrisis.mult - 1) * 100)} % · bei Ankunft Bedarf {targetCrisis.onArrival}</small>}
            {targetOrder && <small className={`course__order course__order--${orderState(targetOrder)}`}>Auftrag: {targetOrder.qty} × {GOOD_BY_ID.get(targetOrder.goodId)!.name} · {orderStatus(targetOrder)}</small>}
            <div className="route__risks">
              <Risk label="Zoll" chance={hop.customsChance} />
              <Risk label="Piraten" chance={hop.piratesChance} />
              {hop.wanted > 0 && <span className="risk risk--3">Fahndung <b>{'★'.repeat(hop.wanted)}</b></span>}
            </div>
            {(hop.event || hop.hints.length > 0) && (
              <div className="route__hints">
                {hop.event && hop.stationId !== targetId && <i className="hint hint--event">{hop.event.name}: {CATEGORY_NAME[hop.event.category]} +{Math.round((hop.event.mult - 1) * 100)} %</i>}
                {/* The two best trades are enough to decide. The market shows the rest. */}
                {hop.hints.slice(0, 2).map((h) => {
                  const good = GOOD_BY_ID.get(h.goodId)!;
                  const aboard = (view.cargo.items[h.goodId]?.qty ?? 0) > 0;
                  return (
                    <i key={h.goodId} className={`hint${aboard ? ' hint--aboard' : ''}${h.fence ? ' hint--hot' : ''}`}>
                      {good.name} +{Math.round(h.pct * 100)} %{h.fence ? ' · Hehler' : ''}
                    </i>
                  );
                })}
              </div>
            )}
            <button className="cta jump" disabled={busy || short} onClick={() => { audio.tap(); void send({ type: 'Jump', to: hop.stationId }); }}>
              <span>Sprung</span>
              <small>
                {short
                  ? (view.fuel.nextAt ? `Braucht ${hop.fuel} Treibstoff · nächste Einheit in ${countdown(view.fuel.nextAt - now)}` : `Braucht ${hop.fuel} Treibstoff`)
                  : `${path.length > 1 ? `nach ${hopStation.name} · ` : ''}${hop.fuel > 1 ? 'Express · ' : ''}${hop.fuel} Treibstoff`}
              </small>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
