import { memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import {
  systemName, policeRecordName, reputationName, formatCredits,
} from './helpers';
import { useShallow } from 'zustand/shallow';

export default memo(function CommanderStatus() {
  const {
    nameCommander, difficulty, days, credits, debt, ship, mercenary,
    policeRecordScore, reputationScore, policeKills, traderKills, pirateKills,
    escapePod, insurance,
    getCurrentWorth, getPilotSkill, getFighterSkill, getTraderSkill, getEngineerSkill,
    getFuelAmount, getFuelTanksSize, getFilledCargoBays, getTotalCargoBays,
  } = useGameStore(useShallow((s) => ({
    nameCommander: s.nameCommander,
    difficulty: s.difficulty,
    days: s.days,
    credits: s.credits,
    debt: s.debt,
    ship: s.ship,
    mercenary: s.mercenary,
    policeRecordScore: s.policeRecordScore,
    reputationScore: s.reputationScore,
    policeKills: s.policeKills,
    traderKills: s.traderKills,
    pirateKills: s.pirateKills,
    escapePod: s.escapePod,
    insurance: s.insurance,
    getCurrentWorth: s.getCurrentWorth,
    getPilotSkill: s.getPilotSkill,
    getFighterSkill: s.getFighterSkill,
    getTraderSkill: s.getTraderSkill,
    getEngineerSkill: s.getEngineerSkill,
    getFuelAmount: s.getFuelAmount,
    getFuelTanksSize: s.getFuelTanksSize,
    getFilledCargoBays: s.getFilledCargoBays,
    getTotalCargoBays: s.getTotalCargoBays,
  })));

  const cmdr = mercenary[0];
  const shipType = SHIP_TYPES[ship.type];

  const Row = ({ label, value, color = 'text-green-400' }: { label: string; value: string | number; color?: string }) => (
    <div className="flex justify-between py-1 border-b border-gray-800">
      <span className="text-gray-400 font-mono text-sm">{label}</span>
      <span className={`font-mono text-sm ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Commander Status</h2>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <Row label="Name" value={nameCommander} color="text-amber-400" />
        <Row label="Difficulty" value={['Beginner', 'Easy', 'Normal', 'Hard', 'Impossible'][difficulty]} />
        <Row label="Days" value={days} />
        <Row label="Credits" value={formatCredits(credits)} color="text-amber-400" />
        <Row label="Debt" value={debt > 0 ? formatCredits(debt) : 'None'} color={debt > 0 ? 'text-red-400' : 'text-green-400'} />
        <Row label="Net Worth" value={formatCredits(getCurrentWorth())} color="text-amber-400" />
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Skills</h3>
        <Row label="Pilot" value={`${cmdr.pilot} (eff: ${getPilotSkill()})`} />
        <Row label="Fighter" value={`${cmdr.fighter} (eff: ${getFighterSkill()})`} />
        <Row label="Trader" value={`${cmdr.trader} (eff: ${getTraderSkill()})`} />
        <Row label="Engineer" value={`${cmdr.engineer} (eff: ${getEngineerSkill()})`} />
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Ship: {shipType.name}</h3>
        <Row label="Hull" value={`${ship.hull}/${shipType.hullStrength}`} color={ship.hull < shipType.hullStrength / 3 ? 'text-red-400' : 'text-green-400'} />
        <Row label="Fuel" value={`${getFuelAmount()} / ${getFuelTanksSize()} parsecs`} />
        <Row label="Cargo" value={`${getFilledCargoBays()} / ${getTotalCargoBays()} bays`} />
        <Row label="Current System" value={systemName(cmdr.curSystem)} color="text-cyan-400" />
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Record</h3>
        <Row label="Police Record" value={policeRecordName(policeRecordScore)} color={policeRecordScore < 0 ? 'text-red-400' : 'text-green-400'} />
        <Row label="Reputation" value={reputationName(reputationScore)} />
        <Row label="Kills" value={`Police: ${policeKills}  Traders: ${traderKills}  Pirates: ${pirateKills}`} />
      </div>

      {escapePod && (
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <Row label="Escape Pod" value="Installed" color="text-cyan-400" />
          <Row label="Insurance" value={insurance ? 'Active' : 'None'} color={insurance ? 'text-cyan-400' : 'text-gray-500'} />
        </div>
      )}
    </div>
  );
});
