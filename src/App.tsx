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
import EncounterScreen from './ui/EncounterScreen';
import { generateOpponent } from './engine/encounters';
import { POLICE, PIRATE, TRADER, PIRATEATTACK, POLICEATTACK, POLICEINSPECTION, TRADERIGNORE } from './data/constants';
import { POLITICS_DATA } from './data/politics';
import { getRandom } from './utils/math';
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

    // Check for encounter before warping
    const destSys = s.solarSystem[destSystem];
    const pol = POLITICS_DATA[destSys.politics];

    // Random encounter chance
    const encounterRoll = getRandom(44 - 2 * s.difficulty);

    if (encounterRoll < pol.strengthPirates + pol.strengthPolice + pol.strengthTraders) {
      // Generate an encounter
      let encounterType: number;
      const roll = getRandom(pol.strengthPirates + pol.strengthPolice + pol.strengthTraders);

      if (roll < pol.strengthPolice) {
        encounterType = POLICEINSPECTION;
        if (s.policeRecordScore < -5) encounterType = POLICEATTACK;
      } else if (roll < pol.strengthPolice + pol.strengthPirates) {
        encounterType = PIRATEATTACK;
      } else {
        encounterType = TRADERIGNORE;
      }

      // Generate opponent
      let oppType = POLICE;
      if (encounterType >= PIRATE && encounterType < 20) oppType = PIRATE;
      else if (encounterType >= TRADER && encounterType < 30) oppType = TRADER;

      const opponent = generateOpponent(
        oppType, destSystem, s.solarSystem, [...s.mercenary],
        s.difficulty, s.policeRecordScore, s.reputationScore,
        s.ship, s.credits, s.debt, s.moonBought, s.scarabStatus,
        s.wildStatus, s.buyingPrice,
      );

      useGameStore.setState({
        opponent,
        encounterType,
      });

      setInEncounter(true);
      return;
    }

    // No encounter — warp directly
    s.doWarp();
    s.solarSystem[destSystem].visited = true;
    setScreen('commander');
  }, []);

  const handleEncounterEnd = useCallback(() => {
    const s = useGameStore.getState();
    setInEncounter(false);

    // If ship destroyed, game over (simple handling)
    if (s.ship.hull <= 0) {
      if (s.escapePod) {
        // Escape pod saves you but loses everything
        alert('Your escape pod saves your life! You arrive at a nearby system with a Flea ship.');
      } else {
        alert(`Game Over! Commander ${s.nameCommander} was killed. Score: ${s.getScore(0)}`);
        useGameStore.setState({ initialized: false } as Partial<ReturnType<typeof useGameStore.getState>>);
        return;
      }
    }

    // Complete the warp
    s.doWarp();
    const destSystem = s.warpSystem;
    s.solarSystem[destSystem].visited = true;
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
