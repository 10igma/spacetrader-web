import { type ReactNode } from 'react';
import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import { systemName, formatCredits } from './helpers';

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
  | 'warp';

interface GameLayoutProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  children: ReactNode;
}

export default function GameLayout({ currentScreen, onNavigate, children }: GameLayoutProps) {
  const s = useGameStore();
  const curSystemId = s.mercenary[0].curSystem;
  const curSys = s.solarSystem[curSystemId];
  const shipType = SHIP_TYPES[s.ship.type];

  const canWarp = s.warpSystem !== curSystemId;

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
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header bar */}
      <header className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="text-cyan-400 font-mono font-bold text-sm tracking-wider">SPACE TRADER</span>
          <span className="text-gray-500 font-mono text-xs">Day {s.days}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
          <span className="text-amber-400">💰 {formatCredits(s.credits)}</span>
          <span className={s.ship.hull < shipType.hullStrength / 3 ? 'text-red-400' : 'text-green-400'}>
            🛡 {s.ship.hull}/{shipType.hullStrength}
          </span>
          <span className="text-cyan-400">⛽ {s.getFuelAmount()}/{s.getFuelTanksSize()}</span>
          <span className="text-gray-400">📦 {s.getFilledCargoBays()}/{s.getTotalCargoBays()}</span>
          <span className="text-gray-400">📍 {systemName(curSys.nameIndex)}</span>
        </div>
      </header>

      {/* Navigation tabs */}
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
        {canWarp && (
          <button
            onClick={() => onNavigate('warp')}
            className={`px-3 py-1.5 font-mono text-xs rounded-t ml-auto transition-colors ${
              currentScreen === 'warp'
                ? 'bg-amber-900 text-amber-300 border-b-2 border-amber-500'
                : 'bg-amber-900/50 text-amber-400 hover:bg-amber-800'
            }`}
          >
            ▶ WARP
          </button>
        )}
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full overflow-y-auto">
        {children}
      </main>

      {/* Debt warning */}
      {s.debt > 0 && (
        <footer className="bg-red-900/30 border-t border-red-800 px-4 py-1.5 text-center">
          <span className="text-red-400 text-xs font-mono">
            ⚠ Outstanding debt: {formatCredits(s.debt)}
          </span>
        </footer>
      )}
    </div>
  );
}
