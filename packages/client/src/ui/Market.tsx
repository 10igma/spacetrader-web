import { CATEGORY_NAME, CONFIG, GOOD_BY_ID, GOODS, quote, STATION_BY_ID, type GoodDef, type GoodId, type MarketRow } from '@nova/core';
import { useEffect, useState } from 'react';
import { audio } from '../audio/engine.ts';
import { Auction } from './Auction.tsx';
import { useFresh, useSeenNow, useUnlocks } from './unlocks.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { num, pct } from './format.ts';
import { Credits } from './icons.tsx';
import { jumps, orderStatus } from './Orders.tsx';
import { CloseX } from './Spend.tsx';

const Heat = ({ heat }: { heat: number }) => (heat > 0 ? <i className="heat" title="Heisse Fracht">{'▲'.repeat(Math.min(heat, 5))}</i> : null);

function legalNote(good: GoodDef, row: MarketRow): string {
  if (row.channel === 'fence') return 'hier verboten';
  if (good.tier === 'outlawed') return 'fast überall verboten';
  if (good.tier === 'sanctioned') return 'anderswo verboten';
  return '';
}

function TradeSheet({ goodId, initialQty, onClose }: { goodId: GoodId; initialQty?: number; onClose: () => void }) {
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
  const soldOut = view.orders.active.some((o) => o.here && o.goodId === goodId);
  const wantedFor = view.orders.active.find((o) => !o.here && o.goodId === goodId && o.have < o.qty);

  // Best reachable station to sell this good, from route hints.
  const bestSell = view.routes
    .flatMap((r) => r.hints.filter((h) => h.goodId === goodId).map((h) => ({ stationId: r.stationId, pct: Math.round(h.pct * 100) })))
    .sort((a, b) => b.pct - a.pct)[0];

  let maxBuy = soldOut ? 0 : Math.min(free, fenceLeft, 99);
  while (maxBuy > 0 && quote(row, 'buy', maxBuy) > view.wallet.credits) maxBuy--;
  const maxSell = Math.min(owned, fenceLeft);

  const [qty, setQty] = useState(() => {
    if (initialQty && initialQty > 0) return Math.max(1, Math.min(initialQty, Math.max(1, maxBuy)));
    return Math.max(1, wantedFor ? Math.min(wantedFor.qty - wantedFor.have, maxBuy) : owned > 0 ? maxSell : view.stats.jumps === 0 ? maxBuy : Math.min(5, maxBuy));
  });
  const step = (d: number) => (): void => { audio.tap(); setQty((q) => Math.max(1, Math.min(99, q + d))); };
  const cost = quote(row, 'buy', qty);
  const revenue = quote(row, 'sell', Math.min(qty, owned));
  const gain = lot ? Math.round(revenue - lot.avgCost * Math.min(qty, owned)) : 0;
  const note = legalNote(good, row);
  const capRef = owned > 0 ? maxSell : maxBuy;

  const trade = (type: 'Buy' | 'Sell') => async (): Promise<void> => {
    audio.tap();
    const events = await send({ type, goodId, qty });
    if (events.some((e) => e.type === 'Sold' || e.type === 'Bought')) onClose();
  };

  // Swipe-down to close on touch devices.
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent): void => { setStartY(e.touches[0]?.clientY ?? null); };
  const onTouchMove = (e: React.TouchEvent): void => {
    if (startY === null) return;
    const dy = (e.touches[0]?.clientY ?? startY) - startY;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = (): void => {
    if (dragY > 80) onClose();
    setDragY(0);
    setStartY(null);
  };

  const showBuy = !soldOut && (maxBuy > 0 || owned === 0);
  const showSell = owned > 0;

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div
        className={`sheet sheet--trade${fence ? ' sheet--fence' : ''}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="sheet__handle" aria-hidden="true" />
        <CloseX onClick={onClose} />
        <div className="trade__head">
          {art('goods', good.id) && <img className="trade__icon" src={art('goods', good.id)} alt="" draggable={false} />}
          <div className="trade__title">
            <span className="eyebrow">{CATEGORY_NAME[good.category]}{note ? ` · ${note}` : ''}</span>
            <h3>{good.name}</h3>
            <small className={`trade__lvl ${row.level < 1 ? 'is-cheap' : 'is-dear'}`}>
              {pct(row.level - 1)} zum Mittel
              {bestSell && bestSell.pct > 5 && <> · <b>+{bestSell.pct} % auf {STATION_BY_ID.get(bestSell.stationId)!.name}</b></>}
            </small>
          </div>
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
        {soldOut && <p className="trade__fence">Ausverkauft: Diese Station wartet selbst auf deine Lieferung.</p>}
        {wantedFor && <p className="trade__order">Für deinen Lieferauftrag nach {STATION_BY_ID.get(wantedFor.to)!.name} fehlen {wantedFor.qty - wantedFor.have}. Er zahlt je {num(wantedFor.pay)}.</p>}
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
        <div className="stepper__pills">
          {[
            { label: '1', v: 1 },
            { label: '5', v: 5 },
            { label: '50 %', v: Math.max(1, Math.floor(capRef / 2)) },
            { label: `MAX (${capRef})`, v: Math.max(1, capRef) },
          ].map((p) => (
            <button key={p.label} className={`qpill${qty === p.v ? ' is-on' : ''}`} disabled={capRef < 1} onClick={() => { audio.tap(); setQty(p.v); }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className={`trade__actions${showBuy && showSell ? '' : ' trade__actions--single'}`}>
          {showBuy && (
            <button className="cta" disabled={busy || qty > maxBuy} onClick={trade('Buy')}>
              <span>Kaufen</span>
              <small>{soldOut ? 'Ausverkauft' : qty > maxBuy ? 'Nicht möglich' : `${num(cost)} · je ${num(Math.round(cost / qty))}`}</small>
            </button>
          )}
          {showSell && (
            <button className="cta cta--gold" disabled={busy || qty > maxSell} onClick={trade('Sell')}>
              <span>Verkaufen</span>
              <small>{qty > owned ? 'Nicht an Bord' : qty > maxSell ? 'Hehler-Limit' : `${num(revenue)} · ${gain >= 0 ? 'Gewinn' : 'Verlust'} ${num(Math.abs(gain))}`}</small>
            </button>
          )}
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
        <div className="sheet__handle" aria-hidden="true" />
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

function GoodRow({ good, row, bestHint, onOpen, soldOut = false }: { good: GoodDef; row: MarketRow; bestHint?: { station: string; pct: number }; onOpen: () => void; soldOut?: boolean }) {
  const lot = useApp((s) => s.view!.cargo.items[good.id]);
  const gain = lot ? row.sell - lot.avgCost : 0;
  const note = legalNote(good, row);
  const picture = art('goods', good.id);
  return (
    <button className={`good${good.tier !== 'free' ? ' good--hot' : ''}${lot ? ' good--owned' : ''}${picture ? ' good--art' : ''}`} onClick={onOpen}>
      {picture && <img className="good__icon" src={picture} alt="" draggable={false} loading="lazy" />}
      <span className="good__name">
        <b>{good.name}</b>
        {lot ? (
          <small className={`good__aboard ${gain >= 0 ? 'is-up' : 'is-down'}`}>
            <Heat heat={lot.heat} /> {lot.qty} an Bord · {gain >= 0 ? '+' : '−'}{num(Math.abs(Math.round(gain)))}
          </small>
        ) : bestHint && bestHint.pct >= 10 ? (
          <small className="good__hint">→ {bestHint.station} +{bestHint.pct} %</small>
        ) : note ? <small>{note}</small> : null}
      </span>
      <span className={`good__level ${row.level < 0.95 ? 'is-cheap' : row.level > 1.05 ? 'is-dear' : ''}`}>{pct(row.level - 1)}</span>
      <span className="good__price">
        <b>{soldOut ? 'Ausverkauft' : num(lot ? row.sell : row.buy)}</b>
      </span>
    </button>
  );
}

export function Market() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const openRoutes = useApp((s) => s.setRoutesOpen);
  const marketTrade = useApp((s) => s.marketTrade);
  const clearMarketTrade = useApp((s) => s.clearMarketTrade);
  const [open, setOpen] = useState<{ goodId: GoodId; qty?: number } | null>(null);
  const [hold, setHold] = useState(false);
  const unlocks = useUnlocks();
  const fresh = useFresh();
  const [wanted, setMode] = useState<'goods' | 'auction'>('goods');
  const mode = wanted === 'auction' && !unlocks.auction ? 'goods' : wanted;
  useSeenNow(mode === 'auction' ? 'auction' : null);

  useEffect(() => {
    if (marketTrade) {
      setMode('goods');
      setOpen(marketTrade);
      clearMarketTrade();
    }
  }, [marketTrade, clearMarketTrade]);

  const station = STATION_BY_ID.get(view.location)!;
  const byId = new Map(view.market.map((m) => [m.goodId, m]));

  // Best reachable selling hint per good.
  const bestHintByGood = new Map<GoodId, { station: string; pct: number }>();
  for (const r of view.routes) {
    const stName = STATION_BY_ID.get(r.stationId)!.name;
    for (const h of r.hints) {
      const p = Math.round(h.pct * 100);
      const prev = bestHintByGood.get(h.goodId);
      if (!prev || p > prev.pct) bestHintByGood.set(h.goodId, { station: stName, pct: p });
    }
  }

  // Best destination for currently loaded cargo (for the sticky jump bar).
  const bestCargoRoute = view.routes
    .flatMap((r) => r.hints.filter((h) => view.cargo.items[h.goodId]).map((h) => ({ stationId: r.stationId, name: STATION_BY_ID.get(r.stationId)!.name, pct: Math.round(h.pct * 100) })))
    .sort((a, b) => b.pct - a.pct)[0];

  const aboard = GOODS.filter((g) => view.cargo.items[g.id]);
  const open_ = GOODS.filter((g) => !view.cargo.items[g.id] && byId.get(g.id)!.channel === 'open');
  const fence = GOODS.filter((g) => !view.cargo.items[g.id] && byId.get(g.id)!.channel === 'fence');

  // 1-tap "Sell all" total profit preview for open-channel aboard goods (never touches active delivery cargo).
  const sellableAboard = aboard.filter((g) => {
    const row = byId.get(g.id)!;
    const neededByOrder = view.orders.active.some((o) => o.goodId === g.id);
    return row.channel === 'open' && !neededByOrder;
  });
  const sellAllProfit = sellableAboard.reduce((sum, g) => {
    const lot = view.cargo.items[g.id]!;
    const row = byId.get(g.id)!;
    return sum + Math.round(quote(row, 'sell', lot.qty) - lot.avgCost * lot.qty);
  }, 0);

  const sellAll = async (): Promise<void> => {
    audio.tap();
    for (const g of sellableAboard) {
      const qty = useApp.getState().view?.cargo.items[g.id]?.qty ?? 0;
      if (qty > 0) await send({ type: 'Sell', goodId: g.id, qty });
    }
  };

  const list = (goods: GoodDef[]) => goods.map((g) => (
    <GoodRow
      key={g.id}
      good={g}
      row={byId.get(g.id)!}
      bestHint={bestHintByGood.get(g.id)}
      soldOut={view.orders.active.some((o) => o.here && o.goodId === g.id)}
      onOpen={() => { audio.tap(); setOpen({ goodId: g.id }); }}
    />
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
      {unlocks.auction && (
        <div className="segment" role="tablist">
          <button role="tab" aria-selected={mode === 'goods'} className={mode === 'goods' ? 'is-active' : ''} onClick={() => { audio.tap(); setMode('goods'); }}>Waren</button>
          <button role="tab" aria-selected={mode === 'auction'} className={mode === 'auction' ? 'is-active' : ''} onClick={() => { audio.tap(); setMode('auction'); }}>
            Auktionen{mode !== 'auction' && view.badges.market > 0 ? <i className="dot" /> : fresh('auction') ? <i className="dot dot--new" /> : null}
          </button>
        </div>
      )}
      {mode === 'auction' ? <Auction /> : (
        <div className={`market__list${view.cargo.used > 0 ? ' has-jumpbar' : ''}`}>
          {view.events.filter((e) => e.stationId === view.location).map((e) => (
            <p key={e.category} className="market__event market__event--crisis"><b>{e.name}:</b> {CATEGORY_NAME[e.category]} +{Math.round((e.mult - 1) * 100)} % · Bedarf {e.demand}</p>
          ))}
          {view.orders.active.map((o) => {
            const good = GOOD_BY_ID.get(o.goodId)!;
            const missing = Math.max(0, o.qty - o.have);
            if (o.here) {
              return (
                <div key={o.id} className={`market__order${missing === 0 ? ' is-ready' : ''}`}>
                  <span>
                    <b>Auftrag: {o.qty} × {good.name}</b>
                    <small>{missing === 0 ? `${num(o.total)} Credits · ${num(o.deposit)} Pfand zurück` : orderStatus(o)}</small>
                  </span>
                  {missing === 0 && <button className="mission__btn" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'DeliverOrder', id: o.id }); }}>Abliefern</button>}
                </div>
              );
            }
            if (missing === 0 || o.buyHere === null) return null;
            return (
              <button key={o.id} className="market__order market__order--load" onClick={() => { audio.tap(); setOpen({ goodId: o.goodId, qty: missing }); }}>
                <span>
                  <b>Auftrag {STATION_BY_ID.get(o.to)!.name}: {missing} × {good.name} fehlen</b>
                  <small>Hier laden für {num(o.buyHere)} · noch {jumps(o.left)}</small>
                </span>
              </button>
            );
          })}
          {view.weekend.active && <p className="market__event">Blockade-Lauf: Hehler +{Math.round(CONFIG.weekend.fenceBonus * 100)} %, mehr Zoll</p>}
          {aboard.length > 0 && (
            <h4 className="market__section">
              An Bord
              {sellableAboard.length >= 2 && (
                <button className="link link--gold" disabled={busy} onClick={() => void sellAll()}>
                  Alles verkaufen ({sellAllProfit >= 0 ? '+' : '−'}{num(Math.abs(sellAllProfit))})
                </button>
              )}
            </h4>
          )}
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
      {mode === 'goods' && view.cargo.used > 0 && (
        <button className="market__jumpbar" onClick={() => { audio.tap(); openRoutes(true); }}>
          <span>
            <small>Fracht bereit · {view.cargo.used}/{view.cargo.cap}</small>
            <b>{bestCargoRoute ? `Abflug · ${bestCargoRoute.name} (+${bestCargoRoute.pct} %)` : 'Abflug · Sternkarte öffnen'}</b>
          </span>
          <i>→</i>
        </button>
      )}
      {open && <TradeSheet goodId={open.goodId} initialQty={open.qty} onClose={() => setOpen(null)} />}
      {hold && <HoldSheet onClose={() => setHold(false)} />}
    </section>
  );
}
