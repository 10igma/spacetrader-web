import { memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { systemName, techName, govName, formatCredits } from './helpers';
import { realDistance } from '../utils/math';
import { wormholeExists } from '../engine/galaxy';
import { useShallow } from 'zustand/shallow';

interface WarpScreenProps {
  onWarp: () => void;
  onCancel: () => void;
}

export default memo(function WarpScreen({ onWarp, onCancel }: WarpScreenProps) {
  const {
    mercenary, solarSystem, warpSystem, wormhole,
    getFuelAmount, getFuelTanksSize, getMercenaryMoney, getInsuranceMoney,
  } = useGameStore(useShallow((s) => ({
    mercenary: s.mercenary,
    solarSystem: s.solarSystem,
    warpSystem: s.warpSystem,
    wormhole: s.wormhole,
    getFuelAmount: s.getFuelAmount,
    getFuelTanksSize: s.getFuelTanksSize,
    getMercenaryMoney: s.getMercenaryMoney,
    getInsuranceMoney: s.getInsuranceMoney,
  })));

  const curSystem = mercenary[0].curSystem;
  const curSys = solarSystem[curSystem];
  const destSys = solarSystem[warpSystem];
  const dist = realDistance(curSys, destSys);
  const fuel = getFuelAmount();
  const isWormhole = wormholeExists(wormhole, curSystem, warpSystem);
  const fuelCost = isWormhole ? 0 : Math.min(dist, fuel);
  const canWarp = isWormhole || dist <= fuel;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Warp Confirmation</h2>

      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-500 text-xs font-mono block mb-1">FROM</span>
            <span className="text-cyan-400 font-mono font-bold">
              {systemName(curSys.nameIndex)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 text-xs font-mono block mb-1">TO</span>
            <span className="text-amber-400 font-mono font-bold">
              {systemName(destSys.nameIndex)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-1">
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Distance</span>
          <span className="text-green-400">{dist} parsecs</span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Fuel Cost</span>
          <span className={isWormhole ? 'text-purple-400' : 'text-green-400'}>
            {isWormhole ? 'Wormhole (free fuel)' : `${fuelCost} parsecs`}
          </span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Fuel After</span>
          <span className="text-green-400">{fuel - fuelCost}/{getFuelTanksSize()}</span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Tech Level</span>
          <span className="text-green-400">{techName(destSys.techLevel)}</span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Government</span>
          <span className="text-green-400">{govName(destSys.politics)}</span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Mercenary Cost</span>
          <span className="text-amber-400">{formatCredits(getMercenaryMoney())}/day</span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Insurance Cost</span>
          <span className="text-amber-400">{formatCredits(getInsuranceMoney())}/day</span>
        </div>
      </div>

      {!canWarp && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-400 text-sm font-mono text-center">
          Not enough fuel to reach this system!
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 font-mono font-bold rounded"
        >
          CANCEL
        </button>
        <button
          onClick={onWarp}
          disabled={!canWarp}
          className={`flex-1 py-3 font-mono font-bold rounded ${
            canWarp
              ? 'bg-cyan-700 hover:bg-cyan-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          ▶ ENGAGE WARP
        </button>
      </div>
    </div>
  );
});
