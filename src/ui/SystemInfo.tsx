import { useGameStore } from '../state/gameStore';
import {
  systemName, govName, techName, sizeName, statusName, resourceName,
} from './helpers';
import { realDistance } from '../utils/math';

export default function SystemInfo() {
  const s = useGameStore();
  const curSystem = s.mercenary[0].curSystem;
  const curSys = s.solarSystem[curSystem];
  const selectedId = s.warpSystem;
  const selectedSys = s.solarSystem[selectedId];
  const isCurrent = selectedId === curSystem;
  const dist = realDistance(curSys, selectedSys);

  const Row = ({ label, value, color = 'text-green-400' }: { label: string; value: string | number; color?: string }) => (
    <div className="flex justify-between py-1 border-b border-gray-800">
      <span className="text-gray-400 font-mono text-sm">{label}</span>
      <span className={`font-mono text-sm ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">System Information</h2>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <Row label="Name" value={systemName(selectedSys.nameIndex)} color="text-amber-400" />
        <Row label="Tech Level" value={techName(selectedSys.techLevel)} />
        <Row label="Government" value={govName(selectedSys.politics)} />
        <Row label="Size" value={sizeName(selectedSys.size)} />
        <Row label="Resources" value={resourceName(selectedSys.specialResources)} />
        <Row label="Status" value={statusName(selectedSys.status)} color={selectedSys.status > 0 ? 'text-amber-400' : 'text-green-400'} />
        {!isCurrent && (
          <Row label="Distance" value={`${dist} parsecs`} color={dist <= s.getFuelAmount() ? 'text-green-400' : 'text-red-400'} />
        )}
        {isCurrent && (
          <Row label="Location" value="Current system" color="text-cyan-400" />
        )}
        <Row label="Visited" value={selectedSys.visited ? 'Yes' : 'No'} color={selectedSys.visited ? 'text-green-400' : 'text-gray-500'} />
      </div>

      {isCurrent && (
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <h3 className="text-cyan-300 font-mono text-sm mb-2">Available Goods</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {selectedSys.qty.map((qty, i) => {
              const names = ['Water', 'Furs', 'Food', 'Ore', 'Games', 'Firearms', 'Medicine', 'Machines', 'Narcotics', 'Robots'];
              return (
                <div key={i} className="flex justify-between text-sm font-mono">
                  <span className="text-gray-400">{names[i]}</span>
                  <span className={qty > 0 ? 'text-green-400' : 'text-gray-600'}>{qty}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
