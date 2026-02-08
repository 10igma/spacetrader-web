import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import { WEAPONS } from '../data/weapons';
import { SHIELDS } from '../data/shields';
import { GADGETS } from '../data/gadgets';
import { MAXWEAPONTYPE, MAXSHIELDTYPE, MAXGADGETTYPE } from '../data/constants';
import { formatCredits, systemName } from './helpers';
import { basePrice, weaponSellPrice, shieldSellPrice, gadgetSellPrice } from '../engine/ship';

export default function EquipmentScreen() {
  const s = useGameStore();
  const curSystemId = s.mercenary[0].curSystem;
  const curSystem = s.solarSystem[curSystemId];
  const shipType = SHIP_TYPES[s.ship.type];
  const traderSkill = s.getTraderSkill();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">
        Equipment — {systemName(curSystem.nameIndex)}
      </h2>

      <div className="text-sm font-mono bg-gray-900 border border-gray-700 rounded p-3">
        <span className="text-amber-400">Credits: {formatCredits(s.credits)}</span>
      </div>

      {/* Current equipment */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Installed Equipment</h3>

        <div className="mb-3">
          <span className="text-gray-500 text-xs font-mono">WEAPONS ({shipType.weaponSlots} slots)</span>
          {Array.from({ length: shipType.weaponSlots }).map((_, i) => {
            const wpn = s.ship.weapon[i];
            return (
              <div key={`w-${i}`} className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className={`font-mono text-sm ${wpn >= 0 ? 'text-red-400' : 'text-gray-600'}`}>
                  {wpn >= 0 ? WEAPONS[wpn].name : '(empty)'}
                </span>
                {wpn >= 0 && (
                  <span className="text-gray-500 text-xs font-mono">
                    Sell: {formatCredits(weaponSellPrice(s.ship, i))}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mb-3">
          <span className="text-gray-500 text-xs font-mono">SHIELDS ({shipType.shieldSlots} slots)</span>
          {Array.from({ length: shipType.shieldSlots }).map((_, i) => {
            const shd = s.ship.shield[i];
            return (
              <div key={`s-${i}`} className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className={`font-mono text-sm ${shd >= 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                  {shd >= 0 ? `${SHIELDS[shd].name} (${s.ship.shieldStrength[i]}/${SHIELDS[shd].power})` : '(empty)'}
                </span>
                {shd >= 0 && (
                  <span className="text-gray-500 text-xs font-mono">
                    Sell: {formatCredits(shieldSellPrice(s.ship, i))}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div>
          <span className="text-gray-500 text-xs font-mono">GADGETS ({shipType.gadgetSlots} slots)</span>
          {Array.from({ length: shipType.gadgetSlots }).map((_, i) => {
            const gdg = s.ship.gadget[i];
            return (
              <div key={`g-${i}`} className="flex justify-between items-center py-1 border-b border-gray-800">
                <span className={`font-mono text-sm ${gdg >= 0 ? 'text-purple-400' : 'text-gray-600'}`}>
                  {gdg >= 0 ? GADGETS[gdg].name : '(empty)'}
                </span>
                {gdg >= 0 && (
                  <span className="text-gray-500 text-xs font-mono">
                    Sell: {formatCredits(gadgetSellPrice(s.ship, i))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available weapons */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Available Weapons</h3>
        {Array.from({ length: MAXWEAPONTYPE }).map((_, i) => {
          const w = WEAPONS[i];
          const price = basePrice(w.techLevel, w.price, curSystem.techLevel, traderSkill);
          if (price <= 0) return null;
          return (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-800">
              <div>
                <span className="text-red-400 font-mono text-sm">{w.name}</span>
                <span className="text-gray-500 text-xs ml-2">Power: {w.power}</span>
              </div>
              <span className="text-amber-400 font-mono text-sm">{formatCredits(price)}</span>
            </div>
          );
        })}
      </div>

      {/* Available shields */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Available Shields</h3>
        {Array.from({ length: MAXSHIELDTYPE }).map((_, i) => {
          const sh = SHIELDS[i];
          const price = basePrice(sh.techLevel, sh.price, curSystem.techLevel, traderSkill);
          if (price <= 0) return null;
          return (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-800">
              <div>
                <span className="text-blue-400 font-mono text-sm">{sh.name}</span>
                <span className="text-gray-500 text-xs ml-2">Power: {sh.power}</span>
              </div>
              <span className="text-amber-400 font-mono text-sm">{formatCredits(price)}</span>
            </div>
          );
        })}
      </div>

      {/* Available gadgets */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Available Gadgets</h3>
        {Array.from({ length: MAXGADGETTYPE }).map((_, i) => {
          const g = GADGETS[i];
          const price = basePrice(g.techLevel, g.price, curSystem.techLevel, traderSkill);
          if (price <= 0) return null;
          return (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-800">
              <span className="text-purple-400 font-mono text-sm">{g.name}</span>
              <span className="text-amber-400 font-mono text-sm">{formatCredits(price)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
