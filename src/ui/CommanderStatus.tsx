import { useGameStore } from '../state/gameStore';
import { SHIP_TYPES } from '../data/shipTypes';
import {
  systemName, policeRecordName, reputationName, formatCredits,
} from './helpers';

export default function CommanderStatus() {
  const s = useGameStore();
  const cmdr = s.mercenary[0];
  const shipType = SHIP_TYPES[s.ship.type];

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
        <Row label="Name" value={s.nameCommander} color="text-amber-400" />
        <Row label="Difficulty" value={['Beginner', 'Easy', 'Normal', 'Hard', 'Impossible'][s.difficulty]} />
        <Row label="Days" value={s.days} />
        <Row label="Credits" value={formatCredits(s.credits)} color="text-amber-400" />
        <Row label="Debt" value={s.debt > 0 ? formatCredits(s.debt) : 'None'} color={s.debt > 0 ? 'text-red-400' : 'text-green-400'} />
        <Row label="Net Worth" value={formatCredits(s.getCurrentWorth())} color="text-amber-400" />
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Skills</h3>
        <Row label="Pilot" value={`${cmdr.pilot} (eff: ${s.getPilotSkill()})`} />
        <Row label="Fighter" value={`${cmdr.fighter} (eff: ${s.getFighterSkill()})`} />
        <Row label="Trader" value={`${cmdr.trader} (eff: ${s.getTraderSkill()})`} />
        <Row label="Engineer" value={`${cmdr.engineer} (eff: ${s.getEngineerSkill()})`} />
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Ship: {shipType.name}</h3>
        <Row label="Hull" value={`${s.ship.hull}/${shipType.hullStrength}`} color={s.ship.hull < shipType.hullStrength / 3 ? 'text-red-400' : 'text-green-400'} />
        <Row label="Fuel" value={`${s.getFuelAmount()} / ${s.getFuelTanksSize()} parsecs`} />
        <Row label="Cargo" value={`${s.getFilledCargoBays()} / ${s.getTotalCargoBays()} bays`} />
        <Row label="Current System" value={systemName(cmdr.curSystem)} color="text-cyan-400" />
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <h3 className="text-cyan-300 font-mono text-sm mb-2">Record</h3>
        <Row label="Police Record" value={policeRecordName(s.policeRecordScore)} color={s.policeRecordScore < 0 ? 'text-red-400' : 'text-green-400'} />
        <Row label="Reputation" value={reputationName(s.reputationScore)} />
        <Row label="Kills" value={`Police: ${s.policeKills}  Traders: ${s.traderKills}  Pirates: ${s.pirateKills}`} />
      </div>

      {s.escapePod && (
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <Row label="Escape Pod" value="Installed" color="text-cyan-400" />
          <Row label="Insurance" value={s.insurance ? 'Active' : 'None'} color={s.insurance ? 'text-cyan-400' : 'text-gray-500'} />
        </div>
      )}
    </div>
  );
}
