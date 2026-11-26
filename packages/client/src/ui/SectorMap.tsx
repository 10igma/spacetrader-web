import { courseTo, isExpress, LANES, neighbours, STATIONS, type ClientView, type StationId } from '@nova/core';
import { orderState } from './Orders.tsx';
import { FACTION_COLOR } from './format.ts';

type Pt = [number, number];

/** The edge of charted space: an ellipse around all stations, as a polygon. */
const RIM: Pt[] = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  return [50 + Math.cos(a) * 53, 55 + Math.sin(a) * 58];
});

/** Keep the part of a polygon that is nearer to p than to q. */
function clip(poly: Pt[], p: Pt, q: Pt): Pt[] {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const nx = q[0] - p[0], ny = q[1] - p[1];
  const side = (a: Pt): number => (a[0] - mx) * nx + (a[1] - my) * ny;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!;
    const sa = side(a), sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const k = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}

/** Every station's territory: the part of space that is nearer to it than to any other. */
const CELLS = new Map<StationId, string>(STATIONS.map((s) => {
  let cell = RIM;
  for (const o of STATIONS) if (o.id !== s.id) cell = clip(cell, s.pos, o.pos);
  return [s.id, cell.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')];
}));

const POS = new Map(STATIONS.map((s) => [s.id, s.pos]));
const pct = (x: number): string => `+${Math.round((x - 1) * 100)} %`;

/**
 * The sector chart. Territories are tinted by faction, lanes are the jumps you can make,
 * and a crisis pulses where it happens. Tap a station to set a course for it.
 */
export function SectorMap({ view, course, onPick }: { view: ClientView; course: StationId | null; onPick: (id: StationId) => void }) {
  const here = view.location;
  const near = new Set(neighbours(here));
  const path = course && course !== here ? [here, ...courseTo(here, course)] : [];
  const onPath = (a: StationId, b: StationId): boolean => path.some((p, i) => (p === a && path[i + 1] === b) || (p === b && path[i + 1] === a));
  const crisisAt = new Map(view.events.map((e) => [e.stationId, e]));
  const orderAt = new Map(view.orders.active.map((o) => [o.to, o]));

  return (
    <svg className="sector" viewBox="-5 -6 110 124" role="img" aria-label="Sternkarte des Sektors">
      {STATIONS.map((s) => (
        <polygon
          key={s.id} points={CELLS.get(s.id)}
          className={`sector__cell${s.id === here ? ' is-here' : ''}${s.id === course ? ' is-target' : ''}`}
          style={{ ['--tone' as string]: FACTION_COLOR[s.faction] }}
        />
      ))}
      {LANES.map(([a, b]) => {
        const p = POS.get(a)!, q = POS.get(b)!;
        const cls = onPath(a, b) ? ' is-course' : a === here || b === here ? ' is-open' : '';
        // Express lanes are drawn as a wide track under the lane: fewer jumps, two units of fuel.
        return (
          <g key={`${a}-${b}`}>
            {isExpress(a, b) && <line className={`sector__express${cls}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />}
            <line className={`sector__lane${cls}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
          </g>
        );
      })}
      {STATIONS.map((s) => {
        const [x, y] = s.pos;
        const crisis = crisisAt.get(s.id);
        const order = orderAt.get(s.id);
        const tag = crisis || s.id === here ? y - 9.2 : y - 5.6;
        const anchor = x > 82 ? 'end' : x < 18 ? 'start' : 'middle';
        const tx = x > 82 ? x + 3 : x < 18 ? x - 3 : x;
        return (
          <g
            key={s.id}
            className={`sector__node${s.id === here ? ' is-here' : near.has(s.id) ? ' is-near' : ''}${s.id === course ? ' is-target' : ''}`}
            style={{ ['--tone' as string]: FACTION_COLOR[s.faction] }}
            onClick={() => onPick(s.id)}
          >
            {crisis && <circle className="sector__crisis" cx={x} cy={y} r="5" />}
            {s.id === here && <circle className="sector__pulse" cx={x} cy={y} r="4.2" />}
            {order && <rect className={`sector__order sector__order--${orderState(order)}`} x={x - 3.4} y={y - 3.4} width="6.8" height="6.8" transform={`rotate(45 ${x} ${y})`} />}
            <circle className="sector__dot" cx={x} cy={y} r={s.id === here ? 2.6 : 2.1} />
            <text className="sector__name" x={tx} y={y + 6.4} textAnchor={anchor}>{s.name}</text>
            {crisis && <text className="sector__flag" x={tx} y={y - 5.6} textAnchor={anchor}>{crisis.name} {pct(crisis.mult)}</text>}
            {s.id === here && !crisis && <text className="sector__you" x={tx} y={y - 5.6} textAnchor={anchor}>Du bist hier</text>}
            {order && <text className={`sector__due sector__due--${orderState(order)}`} x={tx} y={tag} textAnchor={anchor}>{order.here ? 'Auftrag hier' : `Auftrag · noch ${order.left}`}</text>}
            {/* A fingertip is bigger than a dot. */}
            <circle className="sector__hit" cx={x} cy={y} r="8" />
          </g>
        );
      })}
    </svg>
  );
}
