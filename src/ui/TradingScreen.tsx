import { useState, memo } from 'react';
import { useGameStore } from '../state/gameStore';
import { TRADE_ITEMS } from '../data/tradeItems';
import { MAXTRADEITEM } from '../data/constants';
import { formatCredits, systemName } from './helpers';
import { useShallow } from 'zustand/shallow';

export default memo(function TradingScreen() {
  const {
    ship, mercenary, solarSystem, credits, buyPrice, sellPrice,
    doBuyCargo, doSellCargo, getTotalCargoBays, getFilledCargoBays,
  } = useGameStore(useShallow((s) => ({
    ship: s.ship,
    mercenary: s.mercenary,
    solarSystem: s.solarSystem,
    credits: s.credits,
    buyPrice: s.buyPrice,
    sellPrice: s.sellPrice,
    doBuyCargo: s.doBuyCargo,
    doSellCargo: s.doSellCargo,
    getTotalCargoBays: s.getTotalCargoBays,
    getFilledCargoBays: s.getFilledCargoBays,
  })));

  const curSystemId = mercenary[0].curSystem;
  const curSystem = solarSystem[curSystemId];
  const [quantities, setQuantities] = useState<number[]>(new Array(MAXTRADEITEM).fill(1));
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');

  const setQty = (index: number, val: number) => {
    const q = [...quantities];
    q[index] = Math.max(1, val);
    setQuantities(q);
  };

  const handleBuy = (index: number) => {
    doBuyCargo(index, quantities[index]);
  };

  const handleSell = (index: number) => {
    doSellCargo(index, quantities[index]);
  };

  const freeBays = getTotalCargoBays() - getFilledCargoBays();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-cyan-400 font-mono">
        Trading — {systemName(curSystem.nameIndex)}
      </h2>

      <div className="flex flex-wrap gap-4 text-sm font-mono bg-gray-900 border border-gray-700 rounded p-3">
        <span className="text-amber-400">Credits: {formatCredits(credits)}</span>
        <span className="text-gray-400">Cargo: {getFilledCargoBays()}/{getTotalCargoBays()}</span>
        <span className="text-gray-400">Free: {freeBays} bays</span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 py-2 font-mono text-sm rounded-t border-b-2 transition-colors ${
            tab === 'buy' ? 'bg-gray-800 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500'
          }`}
        >
          BUY CARGO
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 py-2 font-mono text-sm rounded-t border-b-2 transition-colors ${
            tab === 'sell' ? 'bg-gray-800 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500'
          }`}
        >
          SELL CARGO
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded overflow-hidden">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left p-2">Item</th>
              {tab === 'buy' && <th className="text-right p-2">Avail</th>}
              <th className="text-right p-2">{tab === 'buy' ? 'Buy $' : 'Sell $'}</th>
              <th className="text-right p-2">On Ship</th>
              <th className="text-center p-2">Qty</th>
              <th className="text-center p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MAXTRADEITEM }).map((_, i) => {
              const buyP = buyPrice[i];
              const sellP = sellPrice[i];
              const onShip = ship.cargo[i];
              const avail = curSystem.qty[i];
              const price = tab === 'buy' ? buyP : sellP;

              if (tab === 'buy' && (buyP <= 0 || avail <= 0)) {
                return (
                  <tr key={i} className="border-b border-gray-800 text-gray-600">
                    <td className="p-2">{TRADE_ITEMS[i].name}</td>
                    <td className="text-right p-2">0</td>
                    <td className="text-right p-2">—</td>
                    <td className="text-right p-2">{onShip}</td>
                    <td className="text-center p-2">—</td>
                    <td className="text-center p-2">—</td>
                  </tr>
                );
              }

              if (tab === 'sell' && (onShip <= 0 || sellP <= 0)) {
                return (
                  <tr key={i} className="border-b border-gray-800 text-gray-600">
                    <td className="p-2">{TRADE_ITEMS[i].name}</td>
                    <td className="text-right p-2">{price > 0 ? price : '—'}</td>
                    <td className="text-right p-2">{onShip}</td>
                    <td className="text-center p-2">—</td>
                    <td className="text-center p-2">—</td>
                  </tr>
                );
              }

              return (
                <tr key={i} className="border-b border-gray-800">
                  <td className="p-2 text-green-400">{TRADE_ITEMS[i].name}</td>
                  {tab === 'buy' && <td className="text-right p-2 text-gray-300">{avail}</td>}
                  <td className="text-right p-2 text-amber-400">{price}</td>
                  <td className="text-right p-2 text-cyan-400">{onShip}</td>
                  <td className="text-center p-2">
                    <input
                      type="number"
                      min={1}
                      max={tab === 'buy' ? Math.min(avail, freeBays) : onShip}
                      value={quantities[i]}
                      onChange={(e) => setQty(i, parseInt(e.target.value) || 1)}
                      className="w-14 bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-center text-green-400 text-xs"
                    />
                  </td>
                  <td className="text-center p-2">
                    {tab === 'buy' ? (
                      <button
                        onClick={() => handleBuy(i)}
                        className="px-3 py-1 bg-green-800 hover:bg-green-700 text-green-300 rounded text-xs font-bold"
                      >
                        BUY
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSell(i)}
                        className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-amber-300 rounded text-xs font-bold"
                      >
                        SELL
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tab === 'sell' && getFilledCargoBays() > 0 && (
        <button
          onClick={() => {
            for (let i = 0; i < MAXTRADEITEM; i++) {
              if (ship.cargo[i] > 0 && sellPrice[i] > 0) {
                doSellCargo(i, ship.cargo[i]);
              }
            }
          }}
          className="w-full py-2 bg-amber-900 hover:bg-amber-800 text-amber-300 font-mono text-sm rounded border border-amber-700"
        >
          SELL ALL CARGO
        </button>
      )}
    </div>
  );
});
