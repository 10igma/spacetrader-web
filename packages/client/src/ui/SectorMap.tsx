import { courseTo, isExpress, LANES, neighbours, STATIONS, type ClientView, type StationId } from '@nova/core';
import { orderState } from './Orders.tsx';
import { FACTION_COLOR } from './format.ts';

/** The chart's frame in its own units. */
const BOX = { x: -5, y: -6, w: 110, h: 124 };
/** A faint grid, like on a printed chart. */
const GRID = [
  ...[17, 39, 61, 83].map((x) => `M${x} ${BOX.y}V${BOX.y + BOX.h}`),
  ...[16, 38, 60, 82, 104].map((y) => `M${BOX.x} ${y}H${BOX.x + BOX.w}`),
].join('');

const POS = new Map(STATIONS.map((s) => [s.id, s.pos]));
const pct = (x: number): string => `+${Math.round((x - 1) * 100)} %`;

/**
 * The sector chart: the real places, kept tidy. No borders: every station sits in a soft glow of
 * its faction. Lanes are solid lines, express lanes a double track. What you can reach from here is
 * bright and says what it costs, the rest steps back. Tap a station to set a course for it.
 */
export function SectorMap({ view, course, proposed = null, onPick }: { view: ClientView; course: StationId | null; /** The jump the chart suggests while no course is set. */ proposed?: StationId | null; onPick: (id: StationId) => void }) {
  const here = view.location;
  const near = new Set(neighbours(here));
  const path = course && course !== here ? [here, ...courseTo(here, course)] : [];
  const onPath = (a: StationId, b: StationId): boolean => path.some((p, i) => (p === a && path[i + 1] === b) || (p === b && path[i + 1] === a));
  const crisisAt = new Map(view.events.map((e) => [e.stationId, e]));
  const orderAt = new Map(view.orders.active.map((o) => [o.to, o]));
  // Rivals on their way to a crisis: drawn on the lane they take next, pointing where they go.
  const rivals = view.events.flatMap((e) => e.rivals.map((r, i) => {
    const next = courseTo(r.at, e.stationId)[0] ?? e.stationId;
    const p = POS.get(r.at)!, q = POS.get(next)!;
    const k = 0.26 + (i % 3) * 0.1;
    return { key: `${e.stationId}-${r.name}`, x: p[0] + (q[0] - p[0]) * k, y: p[1] + (q[1] - p[1]) * k, angle: (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI, eta: r.eta };
  }));
  const hereAt = POS.get(here)!;
  const bright = (id: StationId): boolean => id === here || near.has(id) || id === course || path.includes(id) || crisisAt.has(id) || orderAt.has(id);
  // Name plates: under the station where there is room, otherwise above, right or left of it.
  // Stations that matter now are placed first, so they get the best spot.
  type Box = { x: number; y: number; w: number; h: number };
  const hits = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const dots: (Box & { id: StationId })[] = STATIONS.map((s) => ({ id: s.id, x: s.pos[0] - 3.6, y: s.pos[1] - 3.6, w: 7.2, h: 7.2 }));
  // Room for "Du bist hier" above your own station: no other plate may sit there.
  dots.push({ id: here, x: hereAt[0] - 10, y: hereAt[1] - 9.6, w: 20, h: 5 });
  const plates = new Map<StationId, Box & { side: 'below' | 'above' | 'right' | 'left' }>();
  for (const s of [...STATIONS].sort((a, b) => Number(bright(b.id)) - Number(bright(a.id)))) {
    const [x, y] = s.pos;
    const w = s.name.length * (bright(s.id) ? 1.95 : 1.8) + 4, h = 5.4;
    const clampX = (cx: number): number => Math.max(BOX.x + 1, Math.min(BOX.x + BOX.w - w - 1, cx));
    const options = [
      { side: 'below' as const, x: clampX(x - w / 2), y: y + 4.2 },
      { side: 'above' as const, x: clampX(x - w / 2), y: y - 4.2 - h },
      { side: 'right' as const, x: clampX(x + 4.6), y: y - h / 2 },
      { side: 'left' as const, x: clampX(x - 4.6 - w), y: y - h / 2 },
    ];
    const free = options.find((o) => {
      const box = { x: o.x, y: o.y, w, h };
      return ![...plates.values()].some((p) => hits(box, p)) && !dots.some((d) => d.id !== s.id && hits(box, d));
    }) ?? options[0]!;
    plates.set(s.id, { ...free, w, h });
  }

  return (
    <svg className="sector" viewBox={`${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}`} role="img" aria-label="Sternkarte des Sektors">
      <defs><filter id="sector-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7" /></filter></defs>
      {STATIONS.map((s) => <circle key={s.id} className="sector__glow" cx={s.pos[0]} cy={s.pos[1]} r="15" fill={FACTION_COLOR[s.faction]} filter="url(#sector-glow)" />)}
      <path className="sector__grid" d={GRID} />
      {LANES.map(([a, b]) => {
        const p = POS.get(a)!, q = POS.get(b)!;
        const cls = onPath(a, b) ? ' is-course' : a === here || b === here ? ' is-open' : '';
        const express = isExpress(a, b);
        // An express lane is a double track: fewer jumps, two units of fuel.
        return (
          <g key={`${a}-${b}`}>
            {express && <line className={`sector__express${cls}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />}
            <line className={`sector__lane${express ? ' is-express' : ''}${cls}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
          </g>
        );
      })}
      {/* What each lane from here costs, written on the lane. */}
      {view.routes.map((r) => {
        const q = POS.get(r.stationId)!;
        const x = hereAt[0] + (q[0] - hereAt[0]) * 0.6, y = hereAt[1] + (q[1] - hereAt[1]) * 0.6;
        return (
          <g key={r.stationId} className={`sector__fuel${view.fuel.amount < r.fuel ? ' is-short' : ''}`}>
            <circle cx={x} cy={y} r="3" />
            <text x={x} y={y + 1.25} textAnchor="middle">{r.fuel}</text>
          </g>
        );
      })}
      {rivals.map((r) => (
        <g key={r.key} className="sector__rival" transform={`translate(${r.x.toFixed(1)} ${r.y.toFixed(1)}) rotate(${r.angle.toFixed(0)})`}>
          <path d="M2.4 0 L-1.6 1.7 L-0.7 0 L-1.6 -1.7 Z" />
        </g>
      ))}
      {STATIONS.map((s) => {
        const [x, y] = s.pos;
        const crisis = crisisAt.get(s.id);
        const order = orderAt.get(s.id);
        const plate = plates.get(s.id)!;
        const tx = plate.x + plate.w / 2;
        // Flags go on the side the plate left free.
        const flagY = plate.side === 'above' ? y + 7.6 : y - 5.8;
        const step = plate.side === 'above' ? 3.6 : -3.6;
        const tag = crisis && (s.id === here || order) ? flagY + step : flagY;
        const flagX = plate.side === 'above' || plate.side === 'below' ? tx : x;
        return (
          <g
            key={s.id}
            className={`sector__node${s.id === here ? ' is-here' : near.has(s.id) ? ' is-near' : ''}${s.id === course ? ' is-target' : ''}${s.id === proposed ? ' is-proposed' : ''}${bright(s.id) ? '' : ' is-far'}`}
            style={{ ['--tone' as string]: FACTION_COLOR[s.faction] }}
            onClick={() => onPick(s.id)}
          >
            {crisis && <circle className="sector__crisis" cx={x} cy={y} r="5" />}
            {s.id === here && <circle className="sector__pulse" cx={x} cy={y} r="4.2" />}
            {s.id === proposed && <circle className="sector__proposed" cx={x} cy={y} r="4.6" />}
            {order && <rect className={`sector__order sector__order--${orderState(order)}`} x={x - 3.6} y={y - 3.6} width="7.2" height="7.2" transform={`rotate(45 ${x} ${y})`} />}
            <circle className="sector__dot" cx={x} cy={y} r={s.id === here ? 3 : near.has(s.id) ? 2.7 : 2.1} />
            <rect className="sector__plate" x={plate.x} y={plate.y} width={plate.w} height={plate.h} rx="2.7" />
            <text className="sector__name" x={tx} y={plate.y + 3.9} textAnchor="middle">{s.name}</text>
            {crisis && <text className="sector__flag" x={flagX} y={flagY} textAnchor="middle">{crisis.name} {pct(crisis.mult)}</text>}
            {s.id === here && !crisis && <text className="sector__you" x={flagX} y={flagY} textAnchor="middle">Du bist hier</text>}
            {order && <text className={`sector__due sector__due--${orderState(order)}`} x={flagX} y={tag} textAnchor="middle">{order.here ? 'Auftrag hier' : `Auftrag · noch ${order.left}`}</text>}
            {/* A fingertip is bigger than a dot. */}
            <circle className="sector__hit" cx={x} cy={y} r="8" />
          </g>
        );
      })}
    </svg>
  );
}
