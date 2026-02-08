import { useState, useCallback } from 'react';
import { useGameStore } from './state/gameStore';
import NewGameScreen from './ui/NewGameScreen';
import GameLayout, { type Screen } from './ui/GameLayout';
import CommanderStatus from './ui/CommanderStatus';
import GalacticChart from './ui/GalacticChart';
import ShortRangeChart from './ui/ShortRangeChart';
import SystemInfo from './ui/SystemInfo';
import TradingScreen from './ui/TradingScreen';
import ShipyardScreen from './ui/ShipyardScreen';
import EquipmentScreen from './ui/EquipmentScreen';
import PersonnelScreen from './ui/PersonnelScreen';
import BankScreen from './ui/BankScreen';
import WarpScreen from './ui/WarpScreen';
import ManualScreen from './ui/ManualScreen';
import EncounterScreen from './ui/EncounterScreen';
import { realDistance } from './utils/math';
import { wormholeExists } from './engine/galaxy';

function App() {
  const initialized = useGameStore((s) => s.initialized);
  const [screen, setScreen] = useState<Screen>('commander');
  const [inEncounter, setInEncounter] = useState(false);

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s);
  }, []);

  const handleWarp = useCallback(() => {
    const s = useGameStore.getState();
    const curSystem = s.mercenary[0].curSystem;
    const destSystem = s.warpSystem;

    if (destSystem === curSystem) return;

    const dist = realDistance(s.solarSystem[curSystem], s.solarSystem[destSystem]);
    const fuel = s.getFuelAmount();
    const isWormhole = wormholeExists(s.wormhole, curSystem, destSystem);

    if (!isWormhole && dist > fuel) return;

    // Try encounter via store action (encounter logic moved to engine/store)
    const hasEncounter = s.tryEncounter();
    if (hasEncounter) {
      setInEncounter(true);
      return;
    }

    // No encounter — warp directly
    s.doWarp();
    s.markDestVisited();
    setScreen('commander');
  }, []);

  const handleEncounterEnd = useCallback(() => {
    const s = useGameStore.getState();
    setInEncounter(false);

    if (s.ship.hull <= 0) {
      if (s.escapePod) {
        alert('Your escape pod saves your life! You arrive at a nearby system with a Flea ship.');
      } else {
        alert(`Game Over! Commander ${s.nameCommander} was killed. Score: ${s.getScore(0)}`);
        useGameStore.setState({ initialized: false } as Partial<ReturnType<typeof useGameStore.getState>>);
        return;
      }
    }

    // Complete the warp
    s.doWarp();
    s.markDestVisited();
    setScreen('commander');
  }, []);

  const handleWarpCancel = useCallback(() => {
    setScreen('shortrange');
  }, []);

  if (!initialized) {
    return <NewGameScreen />;
  }

  if (inEncounter) {
    return (
      <div className="min-h-screen bg-gray-950 p-4">
        <div className="max-w-4xl mx-auto">
          <EncounterScreen onEncounterEnd={handleEncounterEnd} />
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'commander': return <CommanderStatus />;
      case 'galactic': return <GalacticChart />;
      case 'shortrange': return <ShortRangeChart />;
      case 'system': return <SystemInfo />;
      case 'trading': return <TradingScreen />;
      case 'shipyard': return <ShipyardScreen />;
      case 'equipment': return <EquipmentScreen />;
      case 'personnel': return <PersonnelScreen />;
      case 'bank': return <BankScreen />;
      case 'warp': return <WarpScreen onWarp={handleWarp} onCancel={handleWarpCancel} />;
      case 'manual': return <ManualScreen />;
      default: return <CommanderStatus />;
    }
  };

  return (
    <GameLayout currentScreen={screen} onNavigate={handleNavigate}>
      {renderScreen()}
    </GameLayout>
  );
}

export default App;
