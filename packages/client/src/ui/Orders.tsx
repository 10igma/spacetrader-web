import { GOOD_BY_ID, STATION_BY_ID, type OrderView } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { num } from './format.ts';
import { Credits } from './icons.tsx';
import { CloseX, SpendButton } from './Spend.tsx';

export const jumps = (n: number): string => (n === 1 ? '1 Sprung' : `${n} Sprünge`);

/** Where an order you took stands: deliverable here, out of reach, no detour left, or fine. */
export type OrderState = 'here' | 'lost' | 'tight' | 'ok';
export const orderState = (o: OrderView): OrderState => (o.here ? 'here' : o.left < o.hops ? 'lost' : o.left === o.hops ? 'tight' : 'ok');

/** One line for an order you took: what is left to do and how long you have. */
export function orderStatus(o: OrderView): string {
  const missing = Math.max(0, o.qty - o.have);
  const state = orderState(o);
  if (state === 'here') {
    if (missing === 0) return 'Ware an Bord: hier abliefern';
    return o.left > 0
      ? `Es fehlen ${missing}. Diese Station hat selbst keine. Du hast noch ${jumps(o.left)}, um sie zu holen`
      : `Es fehlen ${missing}. Wenn du ablegst, verfällt der Auftrag`;
  }
  if (state === 'lost') return `Nicht mehr zu schaffen: noch ${jumps(o.left)}, der Weg braucht ${o.hops}. Das Pfand verfällt`;
  const cargo = missing === 0 ? 'Ware an Bord' : `an Bord ${o.have} von ${o.qty}`;
  return state === 'tight' ? `Noch ${jumps(o.left)}: kein Umweg mehr · ${cargo}` : `Noch ${jumps(o.left)}, direkt ${o.hops} · ${cargo}`;
}

export function OrderCard({ order: o, active }: { order: OrderView; active: boolean }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const setCourse = useApp((s) => s.setCourse);
  const setSheet = useApp((s) => s.setSheet);
  const openRoutes = useApp((s) => s.setRoutesOpen);
  const good = GOOD_BY_ID.get(o.goodId)!;
  const station = STATION_BY_ID.get(o.to)!;
  const picture = art('goods', good.id);
  const state = active ? orderState(o) : 'ok';
  const ready = active && o.here && o.have >= o.qty;
  const full = view.orders.active.length >= view.orders.max;
  const short = view.wallet.credits < o.deposit;
  // Deposit plus the lot bought right here: can this captain actually pay for the run?
  const stake = o.deposit + (o.buyHere ?? 0);

  return (
    <div className={`order order--${state}${ready ? ' order--ready' : ''}`}>
      <div className="order__top">
        {picture && <img className="order__icon" src={picture} alt="" draggable={false} />}
        <span className="order__main">
          <b>{o.qty} × {good.name}</b>
          <small>nach {station.name}{o.here ? '' : ` · ${jumps(o.hops)} direkt`}</small>
        </span>
        <span className="order__pay">
          <b><Credits />{num(o.total)}</b>
          <small>je {num(o.pay)}</small>
        </span>
      </div>
      <div className="order__foot">
        {active
          ? <small className="order__status">{orderStatus(o)}</small>
          : (
            <small className={`order__status${view.wallet.credits < stake ? ' is-warn' : ''}`}>
              Frist {jumps(o.left)} · Pfand {num(o.deposit)}
              {o.buyHere !== null ? ` · hier laden ${num(o.buyHere)}` : ' · Ware schon an Bord'}
              {view.wallet.credits < stake ? ' · dein Geld reicht nicht für beides' : ''}
              <i>Auf dem Markt dort brächte die Menge {num(o.market)}</i>
            </small>
          )}
        {active ? (
          ready ? (
            <button className="mission__btn" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'DeliverOrder', id: o.id }); }}>Abliefern</button>
          ) : !o.here ? (
            <button className="mission__btn mission__btn--plain" onClick={() => { audio.tap(); setCourse(o.to); setSheet(null); openRoutes(true); }}>Kurs</button>
          ) : null
        ) : (
          <SpendButton
            className="mission__btn mission__btn--plain"
            disabled={busy || full || short}
            onSpend={() => void send({ type: 'AcceptOrder', id: o.id })}
            confirm={<>Pfand {num(o.deposit)}?</>}
          >
            {full ? 'Voll' : 'Annehmen'}
          </SpendButton>
        )}
      </div>
    </div>
  );
}

/** The freight board of the station: orders on offer here, and the ones you carry. */
export function OrderSheet() {
  const view = useApp((s) => s.view)!;
  const close = useApp((s) => s.setSheet);
  const { offers, active, max, level } = view.orders;
  const here = STATION_BY_ID.get(view.location)!;
  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(null)}>
      <div className="sheet sheet--trade orders" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => close(null)} />
        <span className="eyebrow">Frachtbörse · {here.name}</span>
        <h3>Lieferaufträge</h3>
        <p className="trade__note">
          Feste Menge, fester Preis, feste Frist in Sprüngen. Das Pfand bekommst du bei der Lieferung zurück.
          Läuft die Frist ab, ist es weg. Wer bestellt, verkauft die Ware selbst nicht: Du musst sie mitbringen.
        </p>
        <div className="picker__list">
          {active.length > 0 && <h4 className="market__section">Angenommen <span>{active.length} von {max}</span></h4>}
          {active.map((o) => <OrderCard key={o.id} order={o} active />)}
          <h4 className="market__section">Aushang hier <span>gilt, solange du angedockt bist</span></h4>
          {offers.map((o) => <OrderCard key={o.id} order={o} active={false} />)}
          {offers.length === 0 && (
            <p className="trade__note">
              {view.profile.level < level ? `Die Frachtbörse öffnet ab Stufe ${level}.` : 'Hier hängt gerade nichts aus. An der nächsten Station gibt es neue Aufträge.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
