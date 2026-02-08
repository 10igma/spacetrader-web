import { useState, memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { formatCredits } from './helpers';
import { maxLoan } from '../engine/bank';
import { useShallow } from 'zustand/shallow';

export default memo(function BankScreen() {
  const {
    credits, debt, policeRecordScore, escapePod, insurance, noClaim,
    doGetLoan, doPayBack, doBuyInsurance, doStopInsurance,
    getCurrentWorth, getInsuranceMoney,
  } = useGameStore(useShallow((s) => ({
    credits: s.credits,
    debt: s.debt,
    policeRecordScore: s.policeRecordScore,
    escapePod: s.escapePod,
    insurance: s.insurance,
    noClaim: s.noClaim,
    doGetLoan: s.doGetLoan,
    doPayBack: s.doPayBack,
    doBuyInsurance: s.doBuyInsurance,
    doStopInsurance: s.doStopInsurance,
    getCurrentWorth: s.getCurrentWorth,
    getInsuranceMoney: s.getInsuranceMoney,
  })));

  const [loanAmount, setLoanAmount] = useState(1000);
  const [payAmount, setPayAmount] = useState(1000);
  const worth = getCurrentWorth();
  const maxLoanVal = maxLoan(policeRecordScore, worth);
  const canBorrow = Math.max(0, maxLoanVal - debt);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">Bank</h2>

      <div className="bg-gray-900 border border-gray-700 rounded p-4 space-y-0.5">
        <div className="flex justify-between py-1 border-b border-gray-800">
          <span className="text-gray-400 font-mono text-sm">Credits</span>
          <span className="text-amber-400 font-mono text-sm">{formatCredits(credits)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-800">
          <span className="text-gray-400 font-mono text-sm">Current Debt</span>
          <span className={`font-mono text-sm ${debt > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {debt > 0 ? formatCredits(debt) : 'None'}
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
            onClick={() => doGetLoan(loanAmount)}
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
              onClick={() => doGetLoan(canBorrow)}
              className="px-4 py-2 bg-cyan-900 hover:bg-cyan-800 text-cyan-300 font-mono text-sm rounded"
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {debt > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded p-4">
          <h3 className="text-cyan-300 font-mono text-sm mb-3">Pay Back Debt</h3>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={Math.min(credits, debt)}
              value={payAmount}
              onChange={(e) => setPayAmount(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-green-400 font-mono text-sm"
            />
            <button
              onClick={() => doPayBack(payAmount)}
              disabled={credits <= 0}
              className={`px-4 py-2 font-mono text-sm rounded ${
                credits > 0
                  ? 'bg-green-800 hover:bg-green-700 text-green-200'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              PAY
            </button>
            <button
              onClick={() => doPayBack(Math.min(credits, debt))}
              className="px-4 py-2 bg-green-900 hover:bg-green-800 text-green-300 font-mono text-sm rounded"
            >
              PAY ALL
            </button>
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-700 rounded p-4">
        <h3 className="text-cyan-300 font-mono text-sm mb-3">Insurance</h3>
        {!escapePod ? (
          <p className="text-gray-500 text-sm font-mono">
            You need an escape pod before you can buy insurance.
          </p>
        ) : insurance ? (
          <div>
            <p className="text-green-400 text-sm font-mono mb-2">
              Insurance active — Daily cost: {formatCredits(getInsuranceMoney())}
            </p>
            <p className="text-gray-500 text-xs font-mono mb-2">
              No-claim: {noClaim} days (discount up to 90%)
            </p>
            <button
              onClick={() => doStopInsurance()}
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
              onClick={() => doBuyInsurance()}
              className="w-full py-2 bg-cyan-800 hover:bg-cyan-700 text-cyan-200 font-mono text-sm rounded"
            >
              BUY INSURANCE
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
