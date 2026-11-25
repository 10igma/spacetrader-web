import { GOOD_BY_ID, GOODS, STATION_BY_ID, type GoodId } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { num } from './format.ts';
import { Credits } from './icons.tsx';

const pct = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))} %`;

function TradeSheet({ goodId, onClose }: { goodId: GoodId; onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const good = GOOD_BY_ID.get(goodId)!;
  const row = view.market.find((m) => m.goodId === goodId)!;
  const lot = view.cargo.items[goodId];
  const owned = lot?.qty ?? 0;
  const free = view.cargo.cap - view.cargo.used;
  const maxBuy = Math.max(0, Math.min(free, Math.floor(view.wallet.credits / row.buy)));
  const [qty, setQty] = useState(() => Math.max(1, owned > 0 ? owned : Math.min(5, maxBuy)));
  const step = (d: number) => (): void => { audio.tap(); setQty((q) => Math.max(1, Math.min(99, q + d))); };
  const gain = lot ? Math.round((row.sell - lot.avgCost) * Math.min(qty, owned)) : 0;

  const trade = (type: 'Buy' | 'Sell') => async (): Promise<void> => {
    audio.tap();
    const events = await send({ type, goodId, qty });
    if (events.some((e) => e.type === 'Sold' || e.type === 'Bought')) onClose();
  };

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade" onClick={(e) => e.stopPropagation()}>
        <div className="trade__head">
          <div>
            <span className="eyebrow">{good.category}{good.contraband ? ' · Schmuggelware' : ''}</span>
            <h3>{good.name}</h3>
          </div>
          <span className={`trade__level ${row.level < 1 ? 'is-cheap' : 'is-dear'}`}>{pct(row.level - 1)}<small>zum Mittel</small></span>
        </div>
        <div className="trade__prices">
          <div><span>Kaufpreis</span><b><Credits />{num(row.buy)}</b></div>
          <div><span>Verkaufspreis</span><b><Credits />{num(row.sell)}</b></div>
          <div><span>An Bord</span><b>{owned}{lot ? <small> zu {num(Math.round(lot.avgCost))}</small> : null}</b></div>
        </div>
        <div className="stepper">
          <button onClick={step(-5)} aria-label="5 weniger">−5</button>
          <button onClick={step(-1)} aria-label="1 weniger">−</button>
          <output>{qty}</output>
          <button onClick={step(1)} aria-label="1 mehr">+</button>
          <button onClick={step(5)} aria-label="5 mehr">+5</button>
        </div>
        <div className="stepper__quick">
          <button className="link" disabled={maxBuy < 1} onClick={() => { audio.tap(); setQty(Math.max(1, maxBuy)); }}>Maximum kaufbar: {maxBuy}</button>
          <button className="link" disabled={owned < 1} onClick={() => { audio.tap(); setQty(Math.max(1, owned)); }}>Alles an Bord: {owned}</button>
        </div>
        <div className="trade__actions">
          <button className="cta" disabled={busy || qty > maxBuy} onClick={trade('Buy')}>
            <span>Kaufen</span>
            <small>{num(row.buy * qty)} Credits</small>
          </button>
          <button className="cta cta--gold" disabled={busy || qty > owned} onClick={trade('Sell')}>
            <span>Verkaufen</span>
            <small>{qty > owned ? 'Nicht an Bord' : `${num(row.sell * qty)} · ${gain >= 0 ? 'Gewinn' : 'Verlust'} ${num(Math.abs(gain))}`}</small>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Market() {
  const view = useApp((s) => s.view)!;
  const [open, setOpen] = useState<GoodId | null>(null);
  const station = STATION_BY_ID.get(view.location)!;
  const byId = new Map(view.market.map((m) => [m.goodId, m]));

  return (
    <section className="market">
      <header className="screenhead">
        <span className="eyebrow">Markt · {station.name}</span>
        <h2>Handel</h2>
        <span className="pill">Laderaum {view.cargo.used} / {view.cargo.cap}</span>
      </header>
      <div className="deck__bar"><i style={{ width: `${(view.cargo.used / view.cargo.cap) * 100}%` }} /></div>
      <div className="market__list">
        {GOODS.map((g) => {
          const row = byId.get(g.id)!;
          const lot = view.cargo.items[g.id];
          const gain = lot ? row.sell - lot.avgCost : 0;
          return (
            <button key={g.id} className={`good${g.contraband ? ' good--hot' : ''}${lot ? ' good--owned' : ''}`} onClick={() => { audio.tap(); setOpen(g.id); }}>
              <span className="good__name">
                <b>{g.name}</b>
                <small>{g.category}{g.contraband ? ' · illegal' : ''}</small>
              </span>
              <span className={`good__level ${row.level < 0.95 ? 'is-cheap' : row.level > 1.05 ? 'is-dear' : ''}`}>{pct(row.level - 1)}</span>
              <span className="good__price">
                <b>{num(row.buy)}</b>
                {lot
                  ? <small className={gain >= 0 ? 'is-up' : 'is-down'}>{lot.qty} an Bord · {gain >= 0 ? '+' : '−'}{num(Math.abs(Math.round(gain)))}</small>
                  : <small>Verkauf {num(row.sell)}</small>}
              </span>
            </button>
          );
        })}
      </div>
      {open && <TradeSheet goodId={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
