import { CATEGORY_NAME, GOOD_BY_ID, STATION_BY_ID, type ClientView, type StationId } from '@nova/core';
import { Emblem } from './Emblem.tsx';
import { FACTION_COLOR } from './format.ts';

/** Four places for cards around the centre, by bearing: upper left, upper right, lower right, lower left. */
const SLOTS = [{ a: -135, x: 26.5, y: 19 }, { a: -45, x: 73.5, y: 19 }, { a: 45, x: 73.5, y: 81 }, { a: 135, x: 26.5, y: 81 }];
const turn = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180);

/** Give every neighbour the free place that lies closest to its real direction, so the cards never overlap. */
function place(bearings: number[]): { x: number; y: number }[] {
  let best: number[] = [], bestCost = Infinity;
  const walk = (i: number, used: number[], cost: number): void => {
    if (cost >= bestCost) return;
    if (i === bearings.length) { best = [...used]; bestCost = cost; return; }
    for (let s = 0; s < SLOTS.length; s++) if (!used.includes(s)) walk(i + 1, [...used, s], cost + turn(bearings[i]!, SLOTS[s]!.a));
  };
  walk(0, [], 0);
  return best.map((s) => ({ x: SLOTS[s]!.x, y: SLOTS[s]!.y }));
}

/**
 * Close range: only the places one jump away, large, each with what the jump costs and what sells
 * there. This is the view for the question asked most often: where do I go now? The whole sector is
 * one tap away, on the switch above.
 */
export function NearMap({ view, target, proposed, onPick }: {
  view: ClientView;
  /** The neighbour the course leads through, or the one that was picked. */
  target: StationId | null;
  proposed: StationId | null;
  onPick: (id: StationId) => void;
}) {
  const here = STATION_BY_ID.get(view.location)!;
  // Each neighbour keeps the direction it has on the chart, as far as the cards allow.
  const bearings = view.routes.map((r) => {
    const s = STATION_BY_ID.get(r.stationId)!;
    return (Math.atan2(s.pos[1] - here.pos[1], s.pos[0] - here.pos[0]) * 180) / Math.PI;
  });
  const spots = place(bearings);

  return (
    <div className="near" role="group" aria-label="Nahbereich: Ziele in einem Sprung">
      <svg className="near__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {view.routes.map((r, i) => (
          <g key={r.stationId}>
            {r.fuel > 1 && <line className={`near__track${r.stationId === target ? ' is-target' : ''}`} x1="50" y1="50" x2={spots[i]!.x} y2={spots[i]!.y} />}
            <line className={`near__lane${r.fuel > 1 ? ' is-express' : ''}${r.stationId === target ? ' is-target' : ''}`} x1="50" y1="50" x2={spots[i]!.x} y2={spots[i]!.y} />
          </g>
        ))}
      </svg>
      <div className="near__here" style={{ ['--faction' as string]: FACTION_COLOR[here.faction] }}>
        <i />
        <b>{here.name}</b>
      </div>
      {view.routes.map((r, i) => {
        const st = STATION_BY_ID.get(r.stationId)!;
        const order = view.orders.active.find((o) => o.to === r.stationId);
        // One line that decides: what is aboard and sells there first, then the best trade.
        const aboard = r.hints.find((h) => view.cargo.items[h.goodId]);
        const hint = aboard ?? r.hints[0];
        const short = view.fuel.amount < r.fuel;
        return (
          <button
            key={r.stationId}
            className={`near__card${r.stationId === target ? ' is-target' : r.stationId === proposed ? ' is-proposed' : ''}${short ? ' is-short' : ''}`}
            style={{ left: `${spots[i]!.x}%`, top: `${spots[i]!.y}%`, ['--faction' as string]: FACTION_COLOR[st.faction] }}
            onClick={() => onPick(r.stationId)}
          >
            <span className="near__top">
              <Emblem faction={st.faction} className="emblem--near" />
              <b>{st.name}</b>
              <i className="near__fuel" aria-label={`${r.fuel} Treibstoff`}>{r.fuel}</i>
            </span>
            {r.event ? <small className="near__event">{r.event.name}: {CATEGORY_NAME[r.event.category]} +{Math.round((r.event.mult - 1) * 100)} %</small>
              : order ? <small className="near__order">Auftrag: {order.qty} × {GOOD_BY_ID.get(order.goodId)!.name}</small>
                : hint ? <small className={`near__hint${aboard ? ' is-aboard' : ''}${hint.fence ? ' is-hot' : ''}`}>{GOOD_BY_ID.get(hint.goodId)!.name} +{Math.round(hint.pct * 100)} %</small>
                  : <small className="near__none">Keine lohnende Ware</small>}
          </button>
        );
      })}
    </div>
  );
}
