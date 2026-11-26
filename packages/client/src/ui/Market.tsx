import { CATEGORY_NAME, CONFIG, GOOD_BY_ID, GOODS, quote, STATION_BY_ID, type GoodDef, type GoodId, type MarketRow } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { Auction } from './Auction.tsx';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { num, pct } from './format.ts';
import { Credits } from './icons.tsx';
import { CloseX } from './Spend.tsx';

const Heat = ({ heat }: { heat: number }) => (heat > 0 ? <i className="heat" title="Heisse Fracht">{'▲'.repeat(Math.min(heat, 5))}</i> : null);

function legalNote(good: GoodDef, row: MarketRow): string {
  if (row.channel === 'fence') return 'hier verboten';
  if (good.tier === 'outlawed') return 'fast überall verboten';
  if (good.tier === 'sanctioned') return 'anderswo verboten';
  return '';
}

function TradeSheet({ goodId, onClose }: { goodId: GoodId; onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const good = GOOD_BY_ID.get(goodId)!;
  const row = view.market.find((m) => m.goodId === goodId)!;
  const lot = view.cargo.items[goodId];
  const owned = lot?.qty ?? 0;
  const fence = row.channel === 'fence';
  const fenceLeft = fence ? (view.fence.closed ? 0 : view.fence.left) : Infinity;
  const free = view.cargo.cap - view.cargo.used;

  let maxBuy = Math.min(free, fenceLeft, 99);
  while (maxBuy > 0 && quote(row, 'buy', maxBuy) > view.wallet.credits) maxBuy--;
  const maxSell = Math.min(owned, fenceLeft);

  // A first-time buyer gets a full hold suggested: five units out of twenty make a first sale feel like nothing.
  const [qty, setQty] = useState(() => Math.max(1, owned > 0 ? maxSell : view.stats.jumps === 0 ? maxBuy : Math.min(5, maxBuy)));
  const step = (d: number) => (): void => { audio.tap(); setQty((q) => Math.max(1, Math.min(99, q + d))); };
  const cost = quote(row, 'buy', qty);
  const revenue = quote(row, 'sell', Math.min(qty, owned));
  const gain = lot ? Math.round(revenue - lot.avgCost * Math.min(qty, owned)) : 0;
  const note = legalNote(good, row);

  const trade = (type: 'Buy' | 'Sell') => async (): Promise<void> => {
    audio.tap();
    const events = await send({ type, goodId, qty });
    if (events.some((e) => e.type === 'Sold' || e.type === 'Bought')) onClose();
  };

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className={`sheet sheet--trade${fence ? ' sheet--fence' : ''}`} onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={onClose} />
        <div className="trade__head">
          {art('goods', good.id) && <img className="trade__icon" src={art('goods', good.id)} alt="" draggable={false} />}
          <div className="trade__title">
            <span className="eyebrow">{CATEGORY_NAME[good.category]}{note ? ` · ${note}` : ''}</span>
            <h3>{good.name}</h3>
          </div>
          <span className={`trade__level ${row.level < 1 ? 'is-cheap' : 'is-dear'}`}>{pct(row.level - 1)}<small>zum Mittel</small></span>
        </div>
        {fence && (
          <p className="trade__fence">
            {view.fence.closed
              ? 'Der Hehler hat dichtgemacht: Die Fahndung nach dir ist zu hoch.'
              : `Nur über den Hehler: schlechtere Preise, nimmt heute noch ${view.fence.left} Einheiten.`}
          </p>
        )}
        <div className="trade__prices">
          <div><span>Kaufpreis</span><b><Credits />{num(row.buy)}</b></div>
          <div><span>Verkaufspreis</span><b><Credits />{num(row.sell)}</b></div>
          <div>
            <span>An Bord <Heat heat={lot?.heat ?? 0} /></span>
            <b>{owned}{lot ? <small> zu {num(Math.round(lot.avgCost))}</small> : null}</b>
          </div>
        </div>
        {lot && lot.heat > 0 && good.tier !== 'free' && (
          <p className="trade__hot">Heisse Fracht: {lot.heat} {lot.heat === 1 ? 'Sprung' : 'Sprünge'} unterwegs. Der Verkaufspreis steigt, die Aufmerksamkeit des Zolls auch.</p>
        )}
        <div className="stepper">
          <button onClick={step(-5)} aria-label="5 weniger">−5</button>
          <button onClick={step(-1)} aria-label="1 weniger">−</button>
          <output>{qty}</output>
          <button onClick={step(1)} aria-label="1 mehr">+</button>
          <button onClick={step(5)} aria-label="5 mehr">+5</button>
        </div>
        <div className="stepper__quick">
          <button className="link" disabled={maxBuy < 1} onClick={() => { audio.tap(); setQty(Math.max(1, maxBuy)); }}>Maximum kaufbar: {maxBuy}</button>
          <button className="link" disabled={maxSell < 1} onClick={() => { audio.tap(); setQty(Math.max(1, maxSell)); }}>Verkaufbar: {maxSell}</button>
        </div>
        <div className="trade__actions">
          <button className="cta" disabled={busy || qty > maxBuy} onClick={trade('Buy')}>
            <span>Kaufen</span>
            <small>{qty > maxBuy ? 'Nicht möglich' : `${num(cost)} · je ${num(Math.round(cost / qty))}`}</small>
          </button>
          <button className="cta cta--gold" disabled={busy || qty > maxSell} onClick={trade('Sell')}>
            <span>Verkaufen</span>
            <small>{qty > owned ? 'Nicht an Bord' : qty > maxSell ? 'Hehler-Limit' : `${num(revenue)} · ${gain >= 0 ? 'Gewinn' : 'Verlust'} ${num(Math.abs(gain))}`}</small>
          </button>
        </div>
        <p className="trade__note">Grosse Mengen bewegen den Preis. Der Betrag oben gilt für die gewählte Menge.</p>
      </div>
    </div>
  );
}

function HoldSheet({ onClose }: { onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const up = view.holdUpgrade;
  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={onClose} />
        <span className="eyebrow">Werft</span>
        <h3>Laderaum</h3>
        {up ? (
          <>
            <div className="upgrade">
              <b>{view.cargo.cap}</b><i>→</i><b className="is-up">{up.cap}</b><span>Einheiten</span>
            </div>
            <button className="cta" disabled={busy || view.wallet.credits < up.cost} onClick={() => { audio.tap(); void send({ type: 'UpgradeHold' }).then(onClose); }}>
              <span>Ausbauen <i className="price"><Credits />{num(up.cost)}</i></span>
              <small>{view.wallet.credits < up.cost ? `Es fehlen ${num(up.cost - view.wallet.credits)} Credits` : `Ausbaustufe ${up.level}`}</small>
            </button>
          </>
        ) : <p className="trade__note">Der Laderaum ist voll ausgebaut: {view.cargo.cap} Einheiten.</p>}
      </div>
    </div>
  );
}

function GoodRow({ good, row, onOpen }: { good: GoodDef; row: MarketRow; onOpen: () => void }) {
  const lot = useApp((s) => s.view!.cargo.items[good.id]);
  const gain = lot ? row.sell - lot.avgCost : 0;
  const note = legalNote(good, row);
  const picture = art('goods', good.id);
  return (
    <button className={`good${good.tier !== 'free' ? ' good--hot' : ''}${lot ? ' good--owned' : ''}${picture ? ' good--art' : ''}`} onClick={onOpen}>
      {picture && <img className="good__icon" src={picture} alt="" draggable={false} loading="lazy" />}
      <span className="good__name">
        <b>{good.name}</b>
        <small>{CATEGORY_NAME[good.category]}{note ? ` · ${note}` : ''}</small>
      </span>
      <span className={`good__level ${row.level < 0.95 ? 'is-cheap' : row.level > 1.05 ? 'is-dear' : ''}`}>{pct(row.level - 1)}</span>
      <span className="good__price">
        <b>{num(row.buy)}</b>
        {lot
          ? <small className={gain >= 0 ? 'is-up' : 'is-down'}><Heat heat={lot.heat} /> {lot.qty} an Bord · {gain >= 0 ? '+' : '−'}{num(Math.abs(Math.round(gain)))}</small>
          : <small>Verkauf {num(row.sell)}</small>}
      </span>
    </button>
  );
}

export function Market() {
  const view = useApp((s) => s.view)!;
  const [open, setOpen] = useState<GoodId | null>(null);
  const [hold, setHold] = useState(false);
  const [mode, setMode] = useState<'goods' | 'auction'>('goods');
  const station = STATION_BY_ID.get(view.location)!;
  const byId = new Map(view.market.map((m) => [m.goodId, m]));
  const aboard = GOODS.filter((g) => view.cargo.items[g.id]);
  const open_ = GOODS.filter((g) => !view.cargo.items[g.id] && byId.get(g.id)!.channel === 'open');
  const fence = GOODS.filter((g) => !view.cargo.items[g.id] && byId.get(g.id)!.channel === 'fence');
  const list = (goods: GoodDef[]) => goods.map((g) => (
    <GoodRow key={g.id} good={g} row={byId.get(g.id)!} onOpen={() => { audio.tap(); setOpen(g.id); }} />
  ));

  return (
    <section className="market">
      <header className="screenhead">
        <span className="eyebrow">{mode === 'goods' ? `Markt · ${station.name}` : 'Auktionshaus · überall erreichbar'}</span>
        <h2>{mode === 'goods' ? 'Handel' : 'Auktionen'}</h2>
        {mode === 'goods' && (
          <button className="pill pill--btn" onClick={() => { audio.tap(); setHold(true); }}>
            Laderaum {view.cargo.used} / {view.cargo.cap}{view.holdUpgrade ? <i className="plus">+</i> : null}
          </button>
        )}
      </header>
      <div className="segment" role="tablist">
        <button role="tab" aria-selected={mode === 'goods'} className={mode === 'goods' ? 'is-active' : ''} onClick={() => { audio.tap(); setMode('goods'); }}>Waren</button>
        <button role="tab" aria-selected={mode === 'auction'} className={mode === 'auction' ? 'is-active' : ''} onClick={() => { audio.tap(); setMode('auction'); }}>
          Auktionen{view.badges.market > 0 && <i className="dot" />}
        </button>
      </div>
      {mode === 'auction' ? <Auction /> : (
        <div className="market__list">
          {view.events.filter((e) => e.stationId === view.location).map((e) => (
            <p key={e.category} className="market__event market__event--crisis"><b>{e.name}:</b> {CATEGORY_NAME[e.category]} +{Math.round((e.mult - 1) * 100)} %. Bedarf noch {e.demand} Einheiten, jede verkaufte zählt.</p>
          ))}
          {view.weekend.active && <p className="market__event">Blockade-Lauf: Hehler zahlen {Math.round(CONFIG.weekend.fenceBonus * 100)} % mehr, der Zoll kontrolliert öfter.</p>}
          {aboard.length > 0 && <h4 className="market__section">An Bord</h4>}
          {list(aboard)}
          <h4 className="market__section">Offener Markt</h4>
          {list(open_)}
          {fence.length > 0 && (
            <h4 className="market__section market__section--fence">
              Schwarzmarkt
              <span>{view.fence.closed ? 'Hehler hat dichtgemacht' : `Hehler nimmt noch ${view.fence.left} von ${view.fence.cap}`}</span>
            </h4>
          )}
          {list(fence)}
        </div>
      )}
      {open && <TradeSheet goodId={open} onClose={() => setOpen(null)} />}
      {hold && <HoldSheet onClose={() => setHold(false)} />}
    </section>
  );
}
