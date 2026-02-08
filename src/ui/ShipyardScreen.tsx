import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import { MAXSHIPTYPE } from '../data/constants';
import { formatCredits, systemName } from './helpers';

export default function ShipyardScreen() {
  const s = useGameStore();
  const curSystemId = s.mercenary[0].curSystem;
  const curSystem = s.solarSystem[curSystemId];
  const shipType = SHIP_TYPES[s.ship.type];
  const maxFuel = s.getFuelTanksSize() - s.getFuelAmount();
  const maxRepair = shipType.hullStrength - s.ship.hull;

  const handleFillTank = () => {
    s.doBuyFuel(maxFuel * shipType.costOfFuel);
  };

  const handleFullRepair = () => {
    s.doBuyRepairs(maxRepair * shipType.repairCosts);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">
        Shipyard — {systemName(curSystem.nameIndex)}
      </h2>

      <div className="text-sm font-mono bg-gray-900 border border-gray-700 rounded p-3">
        <span className="text-amber-400">Credits: {formatCredits(s.credits)}</span>
      </div>

      {/* Current ship */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Current Ship: {shipType.name}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm font-mono">
          <div className="text-gray-400">Hull: <span className="text-green-400">{s.ship.hull}/{shipType.hullStrength}</span></div>
          <div className="text-gray-400">Fuel: <span className="text-green-400">{s.getFuelAmount()}/{s.getFuelTanksSize()}</span></div>
          <div className="text-gray-400">Cargo: <span className="text-green-400">{shipType.cargoBays} bays</span></div>
          <div className="text-gray-400">Weapons: <span className="text-green-400">{shipType.weaponSlots} slots</span></div>
          <div className="text-gray-400">Shields: <span className="text-green-400">{shipType.shieldSlots} slots</span></div>
          <div className="text-gray-400">Gadgets: <span className="text-green-400">{shipType.gadgetSlots} slots</span></div>
          <div className="text-gray-400">Crew: <span className="text-green-400">{shipType.crewQuarters} quarters</span></div>
        </div>
      </div>

      {/* Buy fuel */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Buy Fuel</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400 text-sm font-mono">
            {s.getFuelAmount()}/{s.getFuelTanksSize()} parsecs
            ({shipType.costOfFuel} cr/parsec)
          </span>
        </div>
        {maxFuel > 0 ? (
          <div className="flex gap-2">
            <button
              onClick={handleFillTank}
              className="flex-1 py-2 bg-cyan-800 hover:bg-cyan-700 text-cyan-200 font-mono text-sm rounded"
            >
              FILL TANK ({formatCredits(maxFuel * shipType.costOfFuel)})
            </button>
          </div>
        ) : (
          <p className="text-green-400 text-sm font-mono">Tank is full!</p>
        )}
      </div>

      {/* Repair hull */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Repair Hull</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-400 text-sm font-mono">
            {s.ship.hull}/{shipType.hullStrength} HP
            ({shipType.repairCosts} cr/point)
          </span>
          <div className="flex-1 bg-gray-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${s.ship.hull / shipType.hullStrength > 0.5 ? 'bg-green-500' : s.ship.hull / shipType.hullStrength > 0.25 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${(s.ship.hull / shipType.hullStrength) * 100}%` }}
            />
          </div>
        </div>
        {maxRepair > 0 ? (
          <div className="flex gap-2">
            <button
              onClick={handleFullRepair}
              className="flex-1 py-2 bg-green-800 hover:bg-green-700 text-green-200 font-mono text-sm rounded"
            >
              FULL REPAIR ({formatCredits(maxRepair * shipType.repairCosts)})
            </button>
          </div>
        ) : (
          <p className="text-green-400 text-sm font-mono">Hull is pristine!</p>
        )}
      </div>

      {/* Buy escape pod */}
      {!s.escapePod && (
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <h3 className="text-cyan-300 font-mono text-sm mb-2">Escape Pod</h3>
          <p className="text-gray-400 text-sm mb-2">An escape pod will save your life if your ship is destroyed.</p>
          <button
            onClick={() => s.doBuyEscapePod()}
            disabled={s.credits < 2000}
            className={`w-full py-2 font-mono text-sm rounded ${
              s.credits >= 2000
                ? 'bg-purple-800 hover:bg-purple-700 text-purple-200'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            BUY ESCAPE POD (2,000 cr.)
          </button>
        </div>
      )}

      {/* Available ships for purchase */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-3">Ships For Sale</h3>
        <div className="space-y-2">
          {Array.from({ length: MAXSHIPTYPE }).map((_, i) => {
            const st = SHIP_TYPES[i];
            if (st.minTechLevel > curSystem.techLevel) return null;
            if (st.occurrence <= 0) return null;
            const isCurrent = i === s.ship.type;

            return (
              <div
                key={i}
                className={`border rounded p-3 ${isCurrent ? 'border-cyan-600 bg-gray-800' : 'border-gray-700 bg-gray-850'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-mono font-bold ${isCurrent ? 'text-cyan-400' : 'text-green-400'}`}>
                    {st.name}
                    {isCurrent && <span className="text-cyan-600 text-xs ml-2">(current)</span>}
                  </span>
                  <span className="text-amber-400 font-mono text-sm">{formatCredits(st.price)}</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-xs font-mono text-gray-400">
                  <span>Cargo: {st.cargoBays}</span>
                  <span>Wpn: {st.weaponSlots}</span>
                  <span>Shd: {st.shieldSlots}</span>
                  <span>Gdg: {st.gadgetSlots}</span>
                  <span>Crew: {st.crewQuarters}</span>
                  <span>Fuel: {st.fuelTanks}</span>
                  <span>Hull: {st.hullStrength}</span>
                  <span>Size: {['Tiny','Small','Med','Lrg','Huge'][st.size]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
