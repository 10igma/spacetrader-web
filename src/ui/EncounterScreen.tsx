import { useState, useCallback } from 'react';
import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import { executeAttack, attemptFlee, totalShieldStrength } from '../engine/combat';
import {
  POLICE, PIRATE, TRADER, MAXTRADEITEM,
  POLICEINSPECTION,
} from '../data/constants';

interface EncounterScreenProps {
  onEncounterEnd: () => void;
}

type EncounterPhase = 'intro' | 'combat' | 'victory' | 'fled' | 'defeated';

export default function EncounterScreen({ onEncounterEnd }: EncounterScreenProps) {
  const s = useGameStore();
  const [log, setLog] = useState<string[]>([]);
  const [phase, setPhase] = useState<EncounterPhase>('intro');
  const [playerFleeing, setPlayerFleeing] = useState(false);

  const opponent = s.opponent;
  const oppShipType = SHIP_TYPES[opponent.type];
  const playerShipType = SHIP_TYPES[s.ship.type];

  const encounterType = s.encounterType;
  let encounterLabel = 'Unknown Ship';
  if (encounterType >= POLICE && encounterType < 10) encounterLabel = 'Police';
  else if (encounterType >= PIRATE && encounterType < 20) encounterLabel = 'Pirate';
  else if (encounterType >= TRADER && encounterType < 30) encounterLabel = 'Trader';
  else if (encounterType >= 30) encounterLabel = 'Special';

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev, msg]);
  }, []);

  const doAttack = () => {
    setPhase('combat');
    // Player attacks opponent
    const result = executeAttack(
      s.ship, opponent, false, false,
      s.mercenary, s.difficulty, s.reactorStatus, s.scarabStatus,
    );

    if (result.hit) {
      addLog(`Your ${playerShipType.name} hits the ${oppShipType.name}!`);
      if (result.shipDestroyed) {
        addLog(`The ${encounterLabel}'s ${oppShipType.name} is destroyed!`);
        setPhase('victory');
        return;
      }
    } else {
      addLog(`You miss the ${oppShipType.name}.`);
    }

    // Opponent attacks player
    const oppResult = executeAttack(
      opponent, s.ship, playerFleeing, true,
      s.mercenary, s.difficulty, s.reactorStatus, s.scarabStatus,
    );

    if (oppResult.hit) {
      addLog(`The ${encounterLabel} hits your ${playerShipType.name}!`);
      if (oppResult.shipDestroyed) {
        addLog('Your ship has been destroyed!');
        setPhase('defeated');
        return;
      }
    } else {
      addLog(`The ${encounterLabel} misses you.`);
    }

    addLog(`Hull: ${s.ship.hull}/${playerShipType.hullStrength} | Enemy: ${opponent.hull}/${oppShipType.hullStrength}`);
  };

  const doFlee = () => {
    setPhase('combat');
    setPlayerFleeing(true);

    const escaped = attemptFlee(s.ship, opponent, s.mercenary, s.difficulty);
    if (escaped) {
      addLog('You managed to escape!');
      setPhase('fled');
      return;
    }

    addLog('Failed to escape!');

    // Opponent attacks while we flee
    const oppResult = executeAttack(
      opponent, s.ship, true, true,
      s.mercenary, s.difficulty, s.reactorStatus, s.scarabStatus,
    );

    if (oppResult.hit) {
      addLog(`The ${encounterLabel} hits your ${playerShipType.name} as you flee!`);
      if (oppResult.shipDestroyed) {
        addLog('Your ship has been destroyed!');
        setPhase('defeated');
        return;
      }
    } else {
      addLog(`The ${encounterLabel} misses as you flee.`);
    }

    addLog(`Hull: ${s.ship.hull}/${playerShipType.hullStrength}`);
  };

  const doSurrender = () => {
    // Lose cargo
    addLog('You surrender...');
    if (encounterType >= PIRATE && encounterType < 20) {
      addLog('The pirates loot your cargo hold!');
      for (let i = 0; i < MAXTRADEITEM; i++) {
        s.ship.cargo[i] = 0;
      }
    }
    setPhase('defeated');
  };

  const doIgnore = () => {
    addLog('You ignore the encounter and continue on your way.');
    setPhase('fled');
  };

  const doSubmit = () => {
    addLog('You submit to inspection...');
    // Check for illegal goods
    const hasNarcotics = s.ship.cargo[8] > 0;
    const hasFirearms = s.ship.cargo[5] > 0;
    if (hasNarcotics || hasFirearms) {
      addLog('The police find illegal goods! They confiscate them and fine you.');
      s.ship.cargo[8] = 0;
      s.ship.cargo[5] = 0;
    } else {
      addLog('The police find nothing illegal. You are free to go.');
    }
    setPhase('fled');
  };

  const isPolice = encounterType >= POLICE && encounterType < 10;
  const isPirate = encounterType >= PIRATE && encounterType < 20;
  const isTrader = encounterType >= TRADER && encounterType < 30;
  const isInspection = encounterType === POLICEINSPECTION;

  const shieldsStr = totalShieldStrength(opponent);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-red-400 font-mono">
        ⚠ Encounter: {encounterLabel}
      </h2>

      {/* Encounter display */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player ship */}
        <div className="bg-gray-900 border border-cyan-700 rounded p-3">
          <h3 className="text-cyan-400 font-mono text-sm mb-2">Your {playerShipType.name}</h3>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Hull</span>
              <span className={s.ship.hull < playerShipType.hullStrength / 3 ? 'text-red-400' : 'text-green-400'}>
                {s.ship.hull}/{playerShipType.hullStrength}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${s.ship.hull / playerShipType.hullStrength > 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${(s.ship.hull / playerShipType.hullStrength) * 100}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Shields</span>
              <span className="text-blue-400">{totalShieldStrength(s.ship)}</span>
            </div>
          </div>
        </div>

        {/* Opponent ship */}
        <div className="bg-gray-900 border border-red-700 rounded p-3">
          <h3 className="text-red-400 font-mono text-sm mb-2">{encounterLabel}'s {oppShipType.name}</h3>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-400">Hull</span>
              <span className={opponent.hull < oppShipType.hullStrength / 3 ? 'text-red-400' : 'text-green-400'}>
                {opponent.hull}/{oppShipType.hullStrength}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${opponent.hull / oppShipType.hullStrength > 0.5 ? 'bg-red-500' : 'bg-red-300'}`}
                style={{ width: `${(opponent.hull / oppShipType.hullStrength) * 100}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Shields</span>
              <span className="text-blue-400">{shieldsStr}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Combat log */}
      <div className="bg-gray-950 border border-gray-700 rounded p-3 h-40 overflow-y-auto">
        {log.length === 0 ? (
          <p className="text-gray-500 text-sm font-mono">
            {isInspection
              ? 'Police request to inspect your cargo.'
              : isPirate
              ? `A ${oppShipType.name} approaches with hostile intent!`
              : isTrader
              ? `A trader in a ${oppShipType.name} is nearby.`
              : `A ${encounterLabel} ship approaches.`}
          </p>
        ) : (
          log.map((msg, i) => (
            <p key={i} className="text-green-300 text-sm font-mono py-0.5">
              {'> '}{msg}
            </p>
          ))
        )}
      </div>

      {/* Action buttons */}
      {(phase === 'intro' || phase === 'combat') && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={doAttack}
            className="py-3 bg-red-800 hover:bg-red-700 text-red-200 font-mono font-bold rounded"
          >
            ⚔ ATTACK
          </button>
          <button
            onClick={doFlee}
            className="py-3 bg-amber-800 hover:bg-amber-700 text-amber-200 font-mono font-bold rounded"
          >
            🚀 FLEE
          </button>
          {isPirate && (
            <button
              onClick={doSurrender}
              className="py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-mono font-bold rounded"
            >
              🏳 SURRENDER
            </button>
          )}
          {isPolice && isInspection && (
            <button
              onClick={doSubmit}
              className="py-3 bg-blue-800 hover:bg-blue-700 text-blue-200 font-mono font-bold rounded"
            >
              📋 SUBMIT
            </button>
          )}
          {isTrader && (
            <button
              onClick={doIgnore}
              className="py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-mono font-bold rounded"
            >
              ➡ IGNORE
            </button>
          )}
        </div>
      )}

      {/* End states */}
      {(phase === 'victory' || phase === 'fled' || phase === 'defeated') && (
        <div className="space-y-3">
          {phase === 'victory' && (
            <div className="bg-green-900/30 border border-green-700 rounded p-3 text-center">
              <p className="text-green-400 font-mono font-bold">VICTORY!</p>
              <p className="text-gray-400 text-sm font-mono mt-1">
                The {encounterLabel} has been defeated.
              </p>
            </div>
          )}
          {phase === 'defeated' && (
            <div className="bg-red-900/30 border border-red-700 rounded p-3 text-center">
              <p className="text-red-400 font-mono font-bold">DEFEATED</p>
              <p className="text-gray-400 text-sm font-mono mt-1">
                {s.ship.hull <= 0 ? 'Your ship was destroyed...' : 'You surrendered your cargo.'}
              </p>
            </div>
          )}
          <button
            onClick={onEncounterEnd}
            className="w-full py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-mono font-bold rounded"
          >
            CONTINUE ▶
          </button>
        </div>
      )}
    </div>
  );
}
