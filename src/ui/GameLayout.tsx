import { type ReactNode, memo, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import { systemName, formatCredits } from './helpers';
import { useShallow } from 'zustand/shallow';

export type Screen =
  | 'commander'
  | 'galactic'
  | 'shortrange'
  | 'system'
  | 'trading'
  | 'shipyard'
  | 'equipment'
  | 'personnel'
  | 'bank'
  | 'warp'
  | 'manual';

interface GameLayoutProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onRestart: () => void;
  children: ReactNode;
}

export default memo(function GameLayout({ currentScreen, onNavigate, onRestart, children }: GameLayoutProps) {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const {
    days, credits, debt, ship, mercenary, solarSystem, warpSystem,
    getFuelAmount, getFuelTanksSize, getFilledCargoBays, getTotalCargoBays,
  } = useGameStore(useShallow((s) => ({
    days: s.days,
    credits: s.credits,
    debt: s.debt,
    ship: s.ship,
    mercenary: s.mercenary,
    solarSystem: s.solarSystem,
    warpSystem: s.warpSystem,
    getFuelAmount: s.getFuelAmount,
    getFuelTanksSize: s.getFuelTanksSize,
    getFilledCargoBays: s.getFilledCargoBays,
    getTotalCargoBays: s.getTotalCargoBays,
  })));

  const curSystemId = mercenary[0].curSystem;
  const curSys = solarSystem[curSystemId];
  const shipType = SHIP_TYPES[ship.type];

  const canWarp = warpSystem !== curSystemId;

  const navItems: { id: Screen; label: string; short: string }[] = [
    { id: 'commander', label: 'Commander', short: 'CMDR' },
    { id: 'galactic', label: 'Galaxy Map', short: 'GAL' },
    { id: 'shortrange', label: 'Short Range', short: 'SRC' },
    { id: 'system', label: 'System Info', short: 'SYS' },
    { id: 'trading', label: 'Trading', short: 'TRADE' },
    { id: 'shipyard', label: 'Shipyard', short: 'SHIP' },
    { id: 'equipment', label: 'Equipment', short: 'EQUIP' },
    { id: 'personnel', label: 'Personnel', short: 'CREW' },
    { id: 'bank', label: 'Bank', short: 'BANK' },
    { id: 'manual', label: 'Manual', short: '📖' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 font-mono font-bold text-sm tracking-wider">SPACE TRADER</span>
          <span className="text-gray-500 font-mono text-xs">Day {days}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
          <span className="text-amber-400">💰 {formatCredits(credits)}</span>
          <span className={ship.hull < shipType.hullStrength / 3 ? 'text-red-400' : 'text-green-400'}>
            🛡 {ship.hull}/{shipType.hullStrength}
          </span>
          <span className="text-cyan-400">⛽ {getFuelAmount()}/{getFuelTanksSize()}</span>
          <span className="text-gray-400">📦 {getFilledCargoBays()}/{getTotalCargoBays()}</span>
          <span className="text-gray-400">📍 {systemName(curSys.nameIndex)}</span>
        </div>
      </header>

      <nav className="bg-gray-900 border-b border-gray-700 px-2 py-1 flex flex-wrap gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`px-3 py-1.5 font-mono text-xs rounded-t transition-colors ${
              currentScreen === item.id
                ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            {item.short}
          </button>
        ))}
        <div className="flex items-center gap-0.5 ml-auto">
          {canWarp && (
            <button
              onClick={() => onNavigate('warp')}
              className={`px-3 py-1.5 font-mono text-xs rounded-t transition-colors ${
                currentScreen === 'warp'
                  ? 'bg-amber-900 text-amber-300 border-b-2 border-amber-500'
                  : 'bg-amber-900/50 text-amber-400 hover:bg-amber-800'
              }`}
            >
              ▶ WARP
            </button>
          )}
          <button
            onClick={() => setShowRestartConfirm(true)}
            className="px-3 py-1.5 font-mono text-xs rounded-t transition-colors text-red-500 hover:text-red-300 hover:bg-red-900/50"
            title="Start a new game"
          >
            🔄 NEW
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full overflow-y-auto">
        {children}
      </main>

      {debt > 0 && (
        <footer className="bg-red-900/30 border-t border-red-800 px-4 py-1.5 text-center">
          <span className="text-red-400 text-xs font-mono">
            ⚠ Outstanding debt: {formatCredits(debt)}
          </span>
        </footer>
      )}

      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm mx-4 text-center">
            <h3 className="text-red-400 font-mono font-bold text-lg mb-3">⚠️ Start New Game?</h3>
            <p className="text-gray-300 text-sm mb-5">
              All current progress will be lost. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="px-4 py-2 font-mono text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => { setShowRestartConfirm(false); onRestart(); }}
                className="px-4 py-2 font-mono text-xs bg-red-800 text-red-200 rounded hover:bg-red-700 transition-colors"
              >
                🔄 NEW GAME
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
