import { useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { formatCredits } from './helpers';
import { maxLoan } from '../engine/bank';

export default function BankScreen() {
  const s = useGameStore();
  const [loanAmount, setLoanAmount] = useState(1000);
  const [payAmount, setPayAmount] = useState(1000);
  const worth = s.getCurrentWorth();
  const maxLoanVal = maxLoan(s.policeRecordScore, worth);
  const canBorrow = Math.max(0, maxLoanVal - s.debt);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Bank</h2>

      {/* Overview */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <div className="flex justify-between py-1 border-b border-gray-800">
          <span className="text-gray-400 font-mono text-sm">Credits</span>
          <span className="text-amber-400 font-mono text-sm">{formatCredits(s.credits)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-800">
          <span className="text-gray-400 font-mono text-sm">Current Debt</span>
          <span className={`font-mono text-sm ${s.debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {s.debt > 0 ? formatCredits(s.debt) : 'None'}
          </span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-800">
          <span className="text-gray-400 font-mono text-sm">Net Worth</span>
          <span className="text-amber-400 font-mono text-sm">{formatCredits(worth)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-800">
          <span className="text-gray-400 font-mono text-sm">Max Loan</span>
          <span className="text-gray-300 font-mono text-sm">{formatCredits(maxLoanVal)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-400 font-mono text-sm">Available to Borrow</span>
          <span className="text-cyan-400 font-mono text-sm">{formatCredits(canBorrow)}</span>
        </div>
      </div>

      {/* Get Loan */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-3">Get Loan</h3>
        <p className="text-gray-500 text-xs font-mono mb-2">
          Interest: 10% per day on outstanding debt
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={canBorrow}
            value={loanAmount}
            onChange={(e) => setLoanAmount(Math.max(0, parseInt(e.target.value) || 0))}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-green-400 font-mono text-sm"
          />
          <button
            onClick={() => s.doGetLoan(loanAmount)}
            disabled={canBorrow <= 0}
            className={`px-4 py-2 font-mono text-sm rounded ${
              canBorrow > 0
                ? 'bg-cyan-800 hover:bg-cyan-700 text-cyan-200'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            BORROW
          </button>
          {canBorrow > 0 && (
            <button
              onClick={() => s.doGetLoan(canBorrow)}
              className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-cyan-300 font-mono text-sm rounded"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {/* Pay Back */}
      {s.debt > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <h3 className="text-cyan-300 font-mono text-sm mb-3">Pay Back Debt</h3>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={Math.min(s.credits, s.debt)}
              value={payAmount}
              onChange={(e) => setPayAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-green-400 font-mono text-sm"
            />
            <button
              onClick={() => s.doPayBack(payAmount)}
              disabled={s.credits <= 0}
              className={`px-4 py-2 font-mono text-sm rounded ${
                s.credits > 0
                  ? 'bg-green-800 hover:bg-green-700 text-green-200'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              PAY
            </button>
            <button
              onClick={() => s.doPayBack(Math.min(s.credits, s.debt))}
              className="px-4 py-2 bg-green-900 hover:bg-green-800 text-green-300 font-mono text-sm rounded"
            >
              PAY ALL
            </button>
          </div>
        </div>
      )}

      {/* Insurance */}
      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-3">Insurance</h3>
        {!s.escapePod ? (
          <p className="text-gray-500 text-sm font-mono">
            You need an escape pod before you can buy insurance.
          </p>
        ) : s.insurance ? (
          <div>
            <p className="text-green-400 text-sm font-mono mb-2">
              Insurance active — Daily cost: {formatCredits(s.getInsuranceMoney())}
            </p>
            <p className="text-gray-500 text-xs font-mono mb-2">
              No-claim: {s.noClaim} days (discount up to 90%)
            </p>
            <button
              onClick={() => s.doStopInsurance()}
              className="w-full py-2 bg-red-900 hover:bg-red-800 text-red-300 font-mono text-sm rounded"
            >
              CANCEL INSURANCE
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 text-sm font-mono mb-2">
              Protects your ship value if destroyed. Requires escape pod.
            </p>
            <button
              onClick={() => s.doBuyInsurance()}
              className="w-full py-2 bg-cyan-800 hover:bg-cyan-700 text-cyan-200 font-mono text-sm rounded"
            >
              BUY INSURANCE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
