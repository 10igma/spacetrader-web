import { memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { MAXWORMHOLE } from '../data/constants';
import { systemName } from './helpers';
import { realDistance } from '../utils/math';
import { wormholeExists } from '../engine/galaxy';
import { useShallow } from 'zustand/shallow';

const VIEW_RANGE = 20;
const CANVAS = 400;
const SCALE = CANVAS / (VIEW_RANGE * 2);

export default memo(function ShortRangeChart() {
  const {
    solarSystem, mercenary, warpSystem, wormhole,
    getFuelAmount, setWarpSystem,
  } = useGameStore(useShallow((s) => ({
    solarSystem: s.solarSystem,
    mercenary: s.mercenary,
    warpSystem: s.warpSystem,
    wormhole: s.wormhole,
    getFuelAmount: s.getFuelAmount,
    setWarpSystem: s.setWarpSystem,
  })));

  const curSystem = mercenary[0].curSystem;
  const curSys = solarSystem[curSystem];
  const fuel = getFuelAmount();

  const handleClick = (systemId: number) => {
    setWarpSystem(systemId);
  };

  const nearbySystems = solarSystem
    .map((sys, i) => ({ sys, i }))
    .filter(({ sys }) => {
      const dx = Math.abs(sys.x - curSys.x);
      const dy = Math.abs(sys.y - curSys.y);
      return dx <= VIEW_RANGE && dy <= VIEW_RANGE;
    });

  const toSvgX = (x: number) => (x - curSys.x + VIEW_RANGE) * SCALE;
  const toSvgY = (y: number) => (y - curSys.y + VIEW_RANGE) * SCALE;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Short Range Chart</h2>
      <div className="bg-gray-950 border border-gray-700 rounded overflow-hidden">
        <svg viewBox={`0 0 ${CANVAS} ${CANVAS}`} className="w-full" style={{ maxHeight: '70vh' }}>
          <circle
            cx={CANVAS / 2}
            cy={CANVAS / 2}
            r={fuel * SCALE}
            fill="none"
            stroke="rgba(34,211,238,0.3)"
            strokeWidth="1.5"
            strokeDasharray="6 3"
          />

          {Array.from({ length: MAXWORMHOLE }).map((_, i) => {
            const nextI = (i + 1) % MAXWORMHOLE;
            const a = wormhole[i];
            const b = wormhole[nextI];
            const sa = solarSystem[a];
            const sb = solarSystem[b];
            if (!sa || !sb) return null;
            const aInView = Math.abs(sa.x - curSys.x) <= VIEW_RANGE && Math.abs(sa.y - curSys.y) <= VIEW_RANGE;
            const bInView = Math.abs(sb.x - curSys.x) <= VIEW_RANGE && Math.abs(sb.y - curSys.y) <= VIEW_RANGE;
            if (!aInView && !bInView) return null;
            return (
              <line
                key={`wh-${i}`}
                x1={toSvgX(sa.x)}
                y1={toSvgY(sa.y)}
                x2={toSvgX(sb.x)}
                y2={toSvgY(sb.y)}
                stroke="rgba(168,85,247,0.5)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {nearbySystems.map(({ sys, i }) => {
            const isCurrentSys = i === curSystem;
            const isWarp = i === warpSystem;
            const dist = realDistance(curSys, sys);
            const inRange = dist <= fuel || wormholeExists(wormhole, curSystem, i);

            let fill = 'rgb(107,114,128)';
            if (sys.visited) fill = 'rgb(34,197,94)';
            if (isCurrentSys) fill = 'rgb(255,255,255)';
            if (isWarp && !isCurrentSys) fill = 'rgb(251,191,36)';

            const r = isCurrentSys ? 6 : isWarp ? 5 : 4;
            const sx = toSvgX(sys.x);
            const sy = toSvgY(sys.y);

            return (
              <g key={i}>
                {inRange && !isCurrentSys && (
                  <circle cx={sx} cy={sy} r={r + 3} fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
                )}
                <circle
                  cx={sx}
                  cy={sy}
                  r={r}
                  fill={fill}
                  className="cursor-pointer"
                  onClick={() => handleClick(i)}
                />
                <text
                  x={sx}
                  y={sy - r - 4}
                  textAnchor="middle"
                  fill={isCurrentSys ? 'white' : isWarp ? 'rgb(251,191,36)' : 'rgb(156,163,175)'}
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {systemName(sys.nameIndex)}
                </text>
                {!isCurrentSys && (
                  <text
                    x={sx}
                    y={sy + r + 12}
                    textAnchor="middle"
                    fill="rgb(107,114,128)"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {dist}pc
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {warpSystem !== curSystem && (
        <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono flex flex-wrap gap-x-4">
          <span className="text-amber-400">{systemName(solarSystem[warpSystem].nameIndex)}</span>
          <span className="text-gray-400">
            Distance: {realDistance(curSys, solarSystem[warpSystem])} parsecs
          </span>
          {wormholeExists(wormhole, curSystem, warpSystem) && (
            <span className="text-purple-400">Wormhole available!</span>
          )}
          {realDistance(curSys, solarSystem[warpSystem]) > fuel &&
            !wormholeExists(wormhole, curSystem, warpSystem) && (
              <span className="text-red-400">Out of fuel range!</span>
            )}
        </div>
      )}
    </div>
  );
});
