import { memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { MERCENARY_NAMES } from '../data/solarSystems';
import { SHIP_TYPES } from '../data/shipTypes';
import { MAXCREW, MAXCREWMEMBER } from '../data/constants';
import { systemName } from './helpers';
import { useShallow } from 'zustand/shallow';

export default memo(function PersonnelScreen() {
  const { ship, mercenary, solarSystem, nameCommander } = useGameStore(useShallow((s) => ({
    ship: s.ship,
    mercenary: s.mercenary,
    solarSystem: s.solarSystem,
    nameCommander: s.nameCommander,
  })));

  const curSystemId = mercenary[0].curSystem;
  const curSystem = solarSystem[curSystemId];
  const shipType = SHIP_TYPES[ship.type];

  const currentCrew: number[] = [];
  for (let i = 0; i < MAXCREW; i++) {
    if (ship.crew[i] >= 0) currentCrew.push(ship.crew[i]);
  }

  const available = mercenary
    .map((m, i) => ({ merc: m, index: i }))
    .filter(({ merc, index }) =>
      index > 0 &&
      index < MAXCREWMEMBER &&
      merc.curSystem === curSystemId &&
      !currentCrew.includes(index),
    );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">
        Personnel — {systemName(curSystem.nameIndex)}
      </h2>

      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">
          Current Crew ({currentCrew.length}/{shipType.crewQuarters})
        </h3>
        {currentCrew.map((crewId) => {
          const m = mercenary[crewId];
          const isCommander = crewId === 0;
          return (
            <div key={crewId} className="flex justify-between items-center py-2 border-b border-gray-800">
              <div>
                <span className={`font-mono text-sm ${isCommander ? 'text-amber-400' : 'text-green-400'}`}>
                  {isCommander ? nameCommander : MERCENARY_NAMES[m.nameIndex] ?? `Merc #${crewId}`}
                  {isCommander && ' (Commander)'}
                </span>
                <div className="text-xs text-gray-500 font-mono">
                  P:{m.pilot} F:{m.fighter} T:{m.trader} E:{m.engineer}
                </div>
              </div>
              {!isCommander && (
                <span className="text-gray-500 text-xs font-mono">
                  Cost: {(m.pilot + m.fighter + m.trader + m.engineer) * 3} cr/day
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Available for Hire</h3>
        {available.length === 0 ? (
          <p className="text-gray-500 text-sm font-mono">No mercenaries available at this system.</p>
        ) : (
          available.map(({ merc, index }) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-800">
              <div>
                <span className="text-green-400 font-mono text-sm">
                  {MERCENARY_NAMES[merc.nameIndex] ?? `Merc #${index}`}
                </span>
                <div className="text-xs text-gray-500 font-mono">
                  P:{merc.pilot} F:{merc.fighter} T:{merc.trader} E:{merc.engineer}
                </div>
              </div>
              <div className="text-right">
                <span className="text-amber-400 text-xs font-mono block">
                  {(merc.pilot + merc.fighter + merc.trader + merc.engineer) * 3} cr/day
                </span>
                {currentCrew.length < shipType.crewQuarters ? (
                  <span className="text-gray-500 text-xs font-mono">
                    (Hire not implemented yet)
                  </span>
                ) : (
                  <span className="text-red-400 text-xs font-mono">No open quarters</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
