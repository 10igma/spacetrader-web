import { useState, memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { DifficultyNames } from '../data/constants';

export default memo(function NewGameScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const [name, setName] = useState('Shelby');
  const [difficulty, setDifficulty] = useState(2);
  const [pilot, setPilot] = useState(4);
  const [fighter, setFighter] = useState(4);
  const [trader, setTrader] = useState(4);
  const [engineer, setEngineer] = useState(4);

  const total = pilot + fighter + trader + engineer;
  const maxPoints = 16;
  const remaining = maxPoints - total;

  const inc = (current: number, setter: (v: number) => void) => {
    if (remaining > 0 && current < 10) setter(current + 1);
  };
  const dec = (current: number, setter: (v: number) => void) => {
    if (current > 1) setter(current - 1);
  };

  const handleStart = () => {
    if (remaining !== 0) return;
    if (!name.trim()) return;
    newGame({
      commanderName: name.trim(),
      difficulty,
      pilotSkill: pilot,
      fighterSkill: fighter,
      traderSkill: trader,
      engineerSkill: engineer,
    });
  };

  const SkillRow = ({
    label,
    value,
    setter,
  }: {
    label: string;
    value: number;
    setter: (v: number) => void;
  }) => (
    <div className="flex items-center justify-between gap-4">
      <span className="w-24 text-cyan-300 font-mono text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => dec(value, setter)}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-amber-400 font-bold rounded border border-gray-600"
        >
          -
        </button>
        <span className="w-8 text-center font-mono text-lg text-green-400">{value}</span>
        <button
          onClick={() => inc(value, setter)}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-amber-400 font-bold rounded border border-gray-600"
        >
          +
        </button>
        <div className="w-24 bg-gray-800 rounded-full h-2 ml-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(value / 10) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-cyan-800 rounded-lg p-8 max-w-md w-full shadow-lg shadow-cyan-900/20">
        <h1 className="text-3xl font-bold text-cyan-400 text-center mb-2 font-mono tracking-wider">
          SPACE TRADER
        </h1>
        <p className="text-gray-500 text-center text-sm mb-6">New Commander Registration</p>

        <div className="space-y-5">
          <div>
            <label className="block text-cyan-300 text-sm font-mono mb-1">Commander Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-green-400 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-cyan-300 text-sm font-mono mb-1">Difficulty</label>
            <div className="flex gap-1">
              {DifficultyNames.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDifficulty(i)}
                  className={`flex-1 py-1.5 text-xs font-mono rounded border transition-colors ${
                    difficulty === i
                      ? 'bg-cyan-700 border-cyan-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-cyan-300 text-sm font-mono">Skill Points</label>
              <span
                className={`text-sm font-mono ${remaining === 0 ? 'text-green-400' : 'text-amber-400'}`}
              >
                {remaining} remaining
              </span>
            </div>
            <div className="space-y-2">
              <SkillRow label="Pilot" value={pilot} setter={setPilot} />
              <SkillRow label="Fighter" value={fighter} setter={setFighter} />
              <SkillRow label="Trader" value={trader} setter={setTrader} />
              <SkillRow label="Engineer" value={engineer} setter={setEngineer} />
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={remaining !== 0 || !name.trim()}
            className={`w-full py-3 rounded font-mono font-bold text-lg tracking-wider transition-all ${
              remaining === 0 && name.trim()
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-700/30 cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            ▶ START GAME
          </button>
        </div>
      </div>
    </div>
  );
});
