import { useGameStore } from '../state/gameStore';
import { systemName, techName, govName, formatCredits } from './helpers';
import { realDistance } from '../utils/math';
import { wormholeExists } from '../engine/galaxy';

interface WarpScreenProps {
  onWarp: () => void;
  onCancel: () => void;
}

export default function WarpScreen({ onWarp, onCancel }: WarpScreenProps) {
  const s = useGameStore();
  const curSystem = s.mercenary[0].curSystem;
  const curSys = s.solarSystem[curSystem];
  const destSys = s.solarSystem[s.warpSystem];
  const dist = realDistance(curSys, destSys);
  const fuel = s.getFuelAmount();
  const isWormhole = wormholeExists(s.wormhole, curSystem, s.warpSystem);
  const fuelCost = isWormhole ? 0 : Math.min(dist, fuel);
  const canWarp = isWormhole || dist <= fuel;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Warp Confirmation</h2>

      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* From */}
          <div>
            <span className="text-gray-500 text-xs font-mono block mb-1">FROM</span>
            <span className="text-cyan-400 font-mono font-bold">
              {systemName(curSys.nameIndex)}
            </span>
          </div>
          {/* To */}
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
          <span className="text-green-400">{fuel - fuelCost}/{s.getFuelTanksSize()}</span>
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
          <span className="text-amber-400">{formatCredits(s.getMercenaryMoney())}/day</span>
        </div>
        <div className="flex justify-between text-sm font-mono">
          <span className="text-gray-400">Insurance Cost</span>
          <span className="text-amber-400">{formatCredits(s.getInsuranceMoney())}/day</span>
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
}
