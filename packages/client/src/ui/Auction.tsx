import { CARD_BY_ID, cardValue, FACTIONS, ROLES, rarityRank, type AuctionResult, type LotView } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { HoloCard } from './HoloCard.tsx';
import { countdown, duration, num, RARITY_LABEL } from './format.ts';
import { useServerNow } from './hooks.ts';
import { Credits } from './icons.tsx';
import { CloseX } from './Spend.tsx';

const RESULT_TEXT: Record<AuctionResult['kind'], (name: string, price: string) => string> = {
  won: (n, p) => `Ersteigert: ${n} für ${p}`,
  lost: (n, p) => `Überboten: ${n} ging für ${p} weg. Dein Gebot ist zurück`,
  bought: (n, p) => `Gekauft: ${n} für ${p}`,
  sold: (n, p) => `Verkauft: ${n} bringt dir ${p}`,
  unsold: (n) => `Kein Käufer: ${n} ist zurück in der Sammlung`,
};

const round50 = (n: number): number => Math.max(50, Math.round(n / 50) * 50);

function BidSheet({ lotKey, onClose }: { lotKey: string; onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const lot = view.auction.lots.find((l) => l.key === lotKey);
  const [bid, setBid] = useState(() => lot?.minBid ?? 0);
  // The lot ran out while the sheet was open: nothing left to do here.
  if (!lot || lot.gone) return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade"><h3>Auktion beendet</h3><p className="trade__note">Das Ergebnis steht oben in der Liste.</p></div>
    </div>
  );
  const card = CARD_BY_ID.get(lot.cardId)!;
  const amount = Math.max(bid, lot.minBid);
  const extra = amount - (lot.yourMax ?? 0);
  const step = Math.max(50, round50(lot.price * 0.05));
  const full = lot.yourMax === null && view.auction.openBids >= view.auction.maxBids;
  const set = (n: number) => (): void => { audio.tap(); setBid(Math.max(lot.minBid, round50(n))); };

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade bid" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={onClose} />
        <div className="bid__head">
          <div className="bid__card"><HoloCard card={card} size="sm" /></div>
          <div className="bid__info">
            <span className="eyebrow">{RARITY_LABEL[card.rarity]} · {ROLES[card.role].name} · {FACTIONS[card.faction].short}</span>
            <h3>{card.name}</h3>
            <dl>
              <div><dt>Schätzwert</dt><dd>{num(lot.estimate)}</dd></div>
              <div><dt>Höchstgebot</dt><dd>{num(lot.price)}</dd></div>
              <div><dt>Endet in</dt><dd className={lot.endsAt - now < 120_000 ? 'is-down' : ''}>{countdown(lot.endsAt - now)}</dd></div>
            </dl>
          </div>
        </div>
        {lot.yourMax !== null && (
          <p className={`bid__status ${lot.leading ? 'is-up' : 'is-down'}`}>
            {lot.leading ? `Du führst. Dein Limit: ${num(lot.yourMax)}` : `Überboten. Dein Limit war ${num(lot.yourMax)}`}
          </p>
        )}
        <div className="bid__amount">
          <button onClick={set(amount - step)} aria-label="Weniger">−</button>
          <output>{num(amount)}</output>
          <button onClick={set(amount + step)} aria-label="Mehr">+</button>
        </div>
        <div className="stepper__quick">
          <button className="link" onClick={set(lot.minBid)}>Mindestgebot {num(lot.minBid)}</button>
          <button className="link" onClick={set(lot.estimate)}>Schätzwert {num(lot.estimate)}</button>
        </div>
        <div className="trade__actions">
          <button className="cta" disabled={busy || full || view.wallet.credits < extra} onClick={() => { audio.tap(); void send({ type: 'PlaceBid', lot: lot.key, max: amount }).then(onClose); }}>
            <span>{lot.yourMax === null ? 'Bieten' : 'Erhöhen'}</span>
            <small>{full ? `Höchstens ${view.auction.maxBids} Gebote gleichzeitig` : view.wallet.credits < extra ? 'Zu wenig Credits' : `Limit ${num(amount)} · ${num(extra)} wird hinterlegt`}</small>
          </button>
          <button className="cta cta--ghost" disabled={busy || view.wallet.credits + (lot.yourMax ?? 0) < lot.buyNow} onClick={() => { audio.tap(); void send({ type: 'BuyNow', lot: lot.key }).then(onClose); }}>
            <span>Sofort kaufen</span>
            <small>{num(lot.buyNow)} · {Math.round((lot.buyNow / lot.estimate - 1) * 100)} % über Schätzwert</small>
          </button>
        </div>
        <p className="trade__note">
          Du zahlst nie mehr als dein Limit. Gewinnst du, zahlst du einen Schritt über dem besten Gegengebot, der Rest kommt zurück.
          Verlierst du, kommt alles zurück.
        </p>
      </div>
    </div>
  );
}

function SellSheet({ onClose }: { onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const spares = Object.entries(view.collection)
    .filter(([, copies]) => copies >= 2)
    .map(([id, copies]) => ({ card: CARD_BY_ID.get(id)!, copies }))
    .sort((a, b) => rarityRank(b.card.rarity) - rarityRank(a.card.rarity) || b.card.rating - a.card.rating);
  const [picked, setPicked] = useState<string | null>(null);
  const [min, setMin] = useState(0);
  const [dur, setDur] = useState(1);
  const card = picked ? CARD_BY_ID.get(picked)! : null;
  const value = card ? cardValue(card) : 0;
  const step = Math.max(50, round50(value * 0.05));

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade picker" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={onClose} />
        <span className="eyebrow">Auktionshaus</span>
        <h3>{card ? card.name : 'Duplikat anbieten'}</h3>
        {!card ? (
          <>
            <p className="trade__note">Nur doppelte Karten. Deine letzte Kopie bleibt immer bei dir.</p>
            <div className="picker__list">
              {spares.length === 0 && <p className="trade__note">Du hast noch keine doppelten Karten.</p>}
              {spares.map(({ card: c, copies }) => (
                <button key={c.id} className={`pick pick--${c.rarity}`} onClick={() => { audio.tap(); setPicked(c.id); setMin(round50(cardValue(c) * 0.6)); }}>
                  <span className="pick__value">{c.rating}</span>
                  <span className="pick__main"><b>{c.name}</b><small>{RARITY_LABEL[c.rarity]} · {copies - 1} übrig · Schätzwert {num(cardValue(c))}</small></span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="trade__note">Schätzwert {num(value)}. Bleibt das beste Gebot unter deinem Mindestpreis, kommt die Karte zurück.</p>
            <div className="bid__amount">
              <button onClick={() => { audio.tap(); setMin((m) => Math.max(50, m - step)); }} aria-label="Weniger">−</button>
              <output>{num(min)}</output>
              <button onClick={() => { audio.tap(); setMin((m) => m + step); }} aria-label="Mehr">+</button>
            </div>
            <div className="chips chips--pick">
              {view.auction.listMinutes.map((m, i) => (
                <button key={m} className={`chip${dur === i ? ' is-active' : ''}`} onClick={() => { audio.tap(); setDur(i); }}>{duration(m * 60_000)}</button>
              ))}
            </div>
            <button className="cta" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'ListCard', cardId: card.id, min, duration: dur }).then(onClose); }}>
              <span>Anbieten</span>
              <small>Mindestpreis {num(min)} · {Math.round(view.auction.fee * 100)} % Gebühr bei Verkauf</small>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function LotRow({ lot, onOpen }: { lot: LotView; onOpen: () => void }) {
  const owned = useApp((s) => s.view!.collection[lot.cardId] ?? 0);
  const now = useServerNow();
  const card = CARD_BY_ID.get(lot.cardId)!;
  const left = lot.endsAt - now;
  const state = lot.gone ? 'gone' : lot.yourMax === null ? 'open' : lot.leading ? 'lead' : 'outbid';
  return (
    <button className={`lot lot--${state} lot--${card.rarity}`} disabled={lot.gone} onClick={onOpen}>
      <span className="lot__thumb"><HoloCard card={card} size="sm" /></span>
      <span className="lot__main">
        <b>{card.name}</b>
        <small>{RARITY_LABEL[card.rarity]} · {ROLES[card.role].short} · {FACTIONS[card.faction].short} · {owned > 0 ? `hast du ${owned}×` : 'fehlt dir'}</small>
        <small className={`lot__state${state === 'outbid' ? ' is-down' : state === 'lead' ? ' is-up' : ''}`}>
          {state === 'gone' ? 'Gekauft' : state === 'lead' ? `Du führst · Limit ${num(lot.yourMax!)}` : state === 'outbid' ? 'Überboten · dein Gebot ist zurück' : `Schätzwert ${num(lot.estimate)}`}
        </small>
      </span>
      <span className="lot__price">
        <b><Credits />{num(lot.price)}</b>
        <small className={left < 120_000 ? 'is-down' : ''}>{countdown(left)}</small>
      </span>
    </button>
  );
}

export function Auction() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const [open, setOpen] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const { lots, listings, results, openBids, maxBids, maxListings } = view.auction;
  // Soonest to end first: that is where a decision is due.
  const sorted = [...lots].sort((a, b) => a.endsAt - b.endsAt);

  return (
    <>
      <div className="market__list">
        {results.length > 0 && (
          <div className="results">
            {results.map((r, i) => (
              <p key={i} className={r.kind === 'won' || r.kind === 'sold' || r.kind === 'bought' ? 'is-up' : ''}>
                {RESULT_TEXT[r.kind](CARD_BY_ID.get(r.cardId)!.name, num(r.price))}
              </p>
            ))}
            <button className="mission__btn mission__btn--plain" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'AckAuctions' }); }}>Verstanden</button>
          </div>
        )}
        <h4 className="market__section">Laufende Auktionen<span>Gebote {openBids} von {maxBids}</span></h4>
        {sorted.map((lot) => <LotRow key={lot.key} lot={lot} onOpen={() => { audio.tap(); setOpen(lot.key); }} />)}

        <h4 className="market__section">Deine Angebote<span>{listings.length} von {maxListings}</span></h4>
        {listings.map((l, i) => {
          const card = CARD_BY_ID.get(l.cardId)!;
          return (
            <div key={i} className={`lot lot--own lot--${card.rarity}`}>
              <span className="lot__main">
                <b>{card.name}</b>
                <small>{RARITY_LABEL[card.rarity]} · Mindestpreis {num(l.min)}</small>
                <small className={l.offer ? 'is-up' : ''}>{l.offer ? `Bestes Gebot ${num(l.offer)}` : 'Noch kein Gebot'}</small>
              </span>
              <span className="lot__price"><small>{countdown(l.endsAt - now)}</small></span>
            </div>
          );
        })}
        <button className="cta cta--ghost" disabled={listings.length >= maxListings} onClick={() => { audio.tap(); setSelling(true); }}>
          <span>{listings.length >= maxListings ? 'Alle Plätze belegt' : 'Duplikat anbieten'}</span>
        </button>
      </div>
      {open && <BidSheet lotKey={open} onClose={() => setOpen(null)} />}
      {selling && <SellSheet onClose={() => setSelling(false)} />}
    </>
  );
}
