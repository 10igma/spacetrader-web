import { useGameStore } from '../state/gameStore';
import { GALAXYWIDTH, GALAXYHEIGHT, MAXWORMHOLE } from '../data/constants';
import { systemName } from './helpers';
import { realDistance } from '../utils/math';

const SCALE = 4;
const W = GALAXYWIDTH * SCALE;
const H = GALAXYHEIGHT * SCALE;

export default function GalacticChart() {
  const s = useGameStore();
  const curSystem = s.mercenary[0].curSystem;
  const curSys = s.solarSystem[curSystem];
  const fuel = s.getFuelAmount();
  const warpSystem = s.warpSystem;

  const handleClick = (systemId: number) => {
    s.setWarpSystem(systemId);
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
          {/* Fuel range circle */}
          <circle
            cx={curSys.x * SCALE}
            cy={curSys.y * SCALE}
            r={fuel * SCALE}
            fill="none"
            stroke="rgba(34,211,238,0.25)"
            strokeWidth="1"
            strokeDasharray="4 2"
          />

          {/* Wormhole lines */}
          {Array.from({ length: MAXWORMHOLE }).map((_, i) => {
            const nextI = (i + 1) % MAXWORMHOLE;
            const a = s.wormhole[i];
            const b = s.wormhole[nextI];
            if (a === undefined || b === undefined) return null;
            const sa = s.solarSystem[a];
            const sb = s.solarSystem[b];
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

          {/* Tracked system indicator */}
          {s.trackedSystem >= 0 && s.trackedSystem < s.solarSystem.length && (
            <line
              x1={curSys.x * SCALE}
              y1={curSys.y * SCALE}
              x2={s.solarSystem[s.trackedSystem].x * SCALE}
              y2={s.solarSystem[s.trackedSystem].y * SCALE}
              stroke="rgba(251,191,36,0.4)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Systems */}
          {s.solarSystem.map((sys, i) => {
            const isCurrentSys = i === curSystem;
            const isWarp = i === warpSystem;
            const dist = realDistance(curSys, sys);
            const inRange = dist <= fuel;

            let fill = 'rgb(107,114,128)'; // gray unvisited
            if (sys.visited) fill = 'rgb(34,197,94)'; // green visited
            if (isCurrentSys) fill = 'rgb(255,255,255)'; // white current
            if (isWarp && !isCurrentSys) fill = 'rgb(251,191,36)'; // amber selected

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

      {/* Selected system info */}
      {warpSystem !== curSystem && (
        <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm font-mono">
          <span className="text-amber-400">{systemName(s.solarSystem[warpSystem].nameIndex)}</span>
          <span className="text-gray-500 ml-3">
            Distance: {realDistance(curSys, s.solarSystem[warpSystem])} parsecs
          </span>
          {realDistance(curSys, s.solarSystem[warpSystem]) > fuel && (
            <span className="text-red-400 ml-3">Out of fuel range!</span>
          )}
        </div>
      )}
    </div>
  );
}
