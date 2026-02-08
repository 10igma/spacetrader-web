import { memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { GALAXYWIDTH, GALAXYHEIGHT, MAXWORMHOLE } from '../data/constants';
import { systemName } from './helpers';
import { realDistance } from '../utils/math';
import { useShallow } from 'zustand/shallow';

const SCALE = 4;
const W = GALAXYWIDTH * SCALE;
const H = GALAXYHEIGHT * SCALE;

export default memo(function GalacticChart() {
  const {
    solarSystem, mercenary, warpSystem, wormhole, trackedSystem,
    getFuelAmount, setWarpSystem,
  } = useGameStore(useShallow((s) => ({
    solarSystem: s.solarSystem,
    mercenary: s.mercenary,
    warpSystem: s.warpSystem,
    wormhole: s.wormhole,
    trackedSystem: s.trackedSystem,
    getFuelAmount: s.getFuelAmount,
    setWarpSystem: s.setWarpSystem,
  })));

  const curSystem = mercenary[0].curSystem;
  const curSys = solarSystem[curSystem];
  const fuel = getFuelAmount();

  const handleClick = (systemId: number) => {
    setWarpSystem(systemId);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Galactic Chart</h2>
      <div className="bg-gray-950 border border-gray-700 rounded overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: '70vh' }}
        >
          <circle
            cx={curSys.x * SCALE}
            cy={curSys.y * SCALE}
            r={fuel * SCALE}
            fill="none"
            stroke="rgba(34,211,238,0.25)"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {Array.from({ length: MAXWORMHOLE }).map((_, i) => {
            const nextI = (i + 1) % MAXWORMHOLE;
            const a = wormhole[i];
            const b = wormhole[nextI];
            if (a === undefined || b === undefined) return null;
            const sa = solarSystem[a];
            const sb = solarSystem[b];
            if (!sa || !sb) return null;
            return (
              <line
                key={`wh-${i}`}
                x1={sa.x * SCALE}
                y1={sa.y * SCALE}
                x2={sb.x * SCALE}
                y2={sb.y * SCALE}
                stroke="rgba(168,85,247,0.4)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            );
          })}

          {trackedSystem >= 0 && trackedSystem < solarSystem.length && (
            <line
              x1={curSys.x * SCALE}
              y1={curSys.y * SCALE}
              x2={solarSystem[trackedSystem].x * SCALE}
              y2={solarSystem[trackedSystem].y * SCALE}
              stroke="rgba(251,191,36,0.4)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {solarSystem.map((sys, i) => {
            const isCurrentSys = i === curSystem;
            const isWarp = i === warpSystem;
            const dist = realDistance(curSys, sys);
            const inRange = dist <= fuel;

            let fill = 'rgb(107,114,128)';
            if (sys.visited) fill = 'rgb(34,197,94)';
            if (isCurrentSys) fill = 'rgb(255,255,255)';
            if (isWarp && !isCurrentSys) fill = 'rgb(251,191,36)';

            const r = isCurrentSys ? 4 : isWarp ? 3.5 : 2.5;

            return (
              <g key={i}>
                {inRange && !isCurrentSys && (
                  <circle
                    cx={sys.x * SCALE}
                    cy={sys.y * SCALE}
                    r={r + 2}
                    fill="none"
                    stroke="rgba(34,211,238,0.3)"
                    strokeWidth="0.5"
                  />
                )}
                <circle
                  cx={sys.x * SCALE}
                  cy={sys.y * SCALE}
                  r={r}
                  fill={fill}
                  className="cursor-pointer"
                  onClick={() => handleClick(i)}
                />
                {(isCurrentSys || isWarp) && (
                  <text
                    x={sys.x * SCALE}
                    y={sys.y * SCALE - 7}
                    textAnchor="middle"
                    fill={isCurrentSys ? 'white' : 'rgb(251,191,36)'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {systemName(sys.nameIndex)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {warpSystem !== curSystem && (
        <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono">
          <span className="text-amber-400">{systemName(solarSystem[warpSystem].nameIndex)}</span>
          <span className="text-gray-500 ml-3">
            Distance: {realDistance(curSys, solarSystem[warpSystem])} parsecs
          </span>
          {realDistance(curSys, solarSystem[warpSystem]) > fuel && (
            <span className="text-red-400 ml-3">Out of fuel range!</span>
          )}
        </div>
      )}
    </div>
  );
});
