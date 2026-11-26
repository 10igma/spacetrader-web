import { CARD_BY_ID, FACTIONS, RARITIES, ROLES, type CrateTier, type SlotView } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { Shipyard } from './Shipyard.tsx';
import { countdown, duration, num, RARITY_LABEL } from './format.ts';
import { useServerNow } from './hooks.ts';
import { Credits, Quanta } from './icons.tsx';
import { CloseX, SpendButton } from './Spend.tsx';

const TIER_NAME: Record<CrateTier, string> = { standard: 'Standard', premium: 'Premium' };

function Crate({ tier = 'standard', small = false }: { tier?: CrateTier; small?: boolean }) {
  const render = art('crates', tier);
  if (render) {
    return (
      <div className={`crate crate--${tier}${small ? ' crate--small' : ''}`} aria-hidden="true">
        {!small && <div className="crate__glow" />}
        <img className="crate__img" src={render} alt="" draggable={false} />
      </div>
    );
  }
  return (
    <div className={`crate crate--${tier}${small ? ' crate--small' : ''}`} aria-hidden="true">
      {!small && <div className="crate__glow" />}
      <svg viewBox="0 0 240 240">
        <path d="M120 22l88 46-88 46-88-46z" className="crate__top" />
        <path d="M32 68l88 46v104l-88-46z" className="crate__left" />
        <path d="M208 68l-88 46v104l88-46z" className="crate__right" />
        <g className="crate__seams" fill="none" strokeWidth={small ? 5 : 2.5} strokeLinecap="round">
          <path d="M120 114v104" />
          <path d="M32 120l88 46 88-46" />
          <path d="M76 45l88 46M164 45l-88 46" />
        </g>
        <circle className="crate__core" cx="120" cy="166" r={small ? 14 : 9} />
      </svg>
    </div>
  );
}

function SlotCell({ slot, index, busy: anyUnlocking }: { slot: SlotView | undefined; index: number; busy: boolean }) {
  const send = useApp((s) => s.send);
  const pending = useApp((s) => s.busy);
  const quanta = useApp((s) => s.view!.wallet.quanta);
  const now = useServerNow();
  if (!slot) return <div className="slot slot--empty"><span>Frei</span></div>;
  const left = slot.readyAt !== null ? slot.readyAt - now : 0;
  const ready = slot.state === 'ready' || (slot.state === 'unlocking' && left <= 0);
  const tap = (type: 'StartUnlock' | 'OpenSlot' | 'SpeedUp') => (): void => { audio.tap(); void send({ type, slot: index }); };

  return (
    <div className={`slot slot--${ready ? 'ready' : slot.state} slot--${slot.tier}`}>
      <Crate tier={slot.tier} small />
      {ready && <button className="slot__btn slot__btn--open" disabled={pending} onClick={tap('OpenSlot')}>Öffnen</button>}
      {!ready && slot.state === 'sealed' && (
        <button className="slot__btn" disabled={pending || anyUnlocking} onClick={tap('StartUnlock')}>
          {anyUnlocking ? 'Wartet' : 'Entsiegeln'}<small>{duration(slot.unlockMs)}</small>
        </button>
      )}
      {!ready && slot.state === 'unlocking' && (
        <>
          <span className="slot__timer">{countdown(left)}</span>
          {slot.speedUpCost > 0 ? (
            <SpendButton className="slot__btn slot__btn--speed" disabled={pending || quanta < slot.speedUpCost} onSpend={() => void send({ type: 'SpeedUp', slot: index })} confirm={<><Quanta />{slot.speedUpCost} ausgeben?</>}>
              Sofort <Quanta />{slot.speedUpCost}
            </SpendButton>
          ) : <button className="slot__btn slot__btn--speed" disabled={pending} onClick={tap('SpeedUp')}>Gratis sofort</button>}
        </>
      )}
    </div>
  );
}

export function Hangar() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const [odds, setOdds] = useState(false);
  const { free, tiers, pityElite, pityLegend } = view.crates;
  const anyUnlocking = view.slots.some((s) => s.state === 'unlocking' && (s.readyAt ?? 0) > now);
  const full = view.slots.length >= view.slotCap;
  const mode = useApp((s) => s.hangarMode);
  const setMode = useApp((s) => s.setHangarMode);
  const segment = (
    <div className="segment" role="tablist">
      {([['crates', 'Container'], ['yard', 'Werft']] as const).map(([id, label]) => (
        <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => { audio.tap(); setMode(id); }}>
          {label}{id === 'crates' && mode !== 'crates' && view.badges.hangar > 0 && <i className="dot" />}
        </button>
      ))}
    </div>
  );

  if (mode === 'yard') {
    return (
      <section className="hangar">
        <header className="screenhead">
          <span className="eyebrow">Hangar</span>
          <h2>Werft</h2>
        </header>
        {segment}
        <Shipyard />
      </section>
    );
  }

  return (
    <section className="hangar">
      <header className="screenhead">
        <span className="eyebrow">Hangar</span>
        <h2>Container</h2>
        <button className="link" onClick={() => { audio.tap(); setOdds(true); }}>Quoten</button>
      </header>
      {segment}

      <div className="free">
        <Crate />
        <div className="free__info">
          <span className="eyebrow">Gratis-Lieferung</span>
          <b>{free.stock} <small>von {free.max} bereit</small></b>
          <span className="free__timer">
            {free.nextAt ? `Nächste in ${countdown(free.nextAt - now)}` : 'Lager voll: Es kommt nichts nach, bis du öffnest'}
          </span>
          <button className="cta cta--gold" disabled={busy || free.stock < 1} onClick={() => { audio.tap(); void send({ type: 'ClaimFreeCrate' }); }}>
            <span>{free.stock > 0 ? 'Gratis öffnen' : 'Unterwegs'}</span>
          </button>
        </div>
      </div>

      <div className="pity">
        <div className="meter meter--elite">
          <div className="meter__row"><span>Elite garantiert in</span><b>{pityElite.max - pityElite.current}</b></div>
          <div className="meter__bar"><i style={{ width: `${(pityElite.current / pityElite.max) * 100}%` }} /></div>
        </div>
        <div className="meter meter--legend">
          <div className="meter__row"><span>Legende garantiert in</span><b>{pityLegend.max - pityLegend.current}</b></div>
          <div className="meter__bar"><i style={{ width: `${(pityLegend.current / pityLegend.max) * 100}%` }} /></div>
        </div>
      </div>

      <h4 className="market__section">
        Verdiente Container
        <span className={full ? 'is-down' : ''}>{view.slots.length} von {view.slotCap} Plätzen{full ? ' · voll: neue Beute verfällt' : ''}</span>
      </h4>
      <div className="slots">
        {Array.from({ length: view.slotCap }, (_, i) => <SlotCell key={i} index={i} slot={view.slots[i]} busy={anyUnlocking} />)}
      </div>

      <h4 className="market__section">Kaufen</h4>
      <div className="shop">
        {(Object.keys(tiers) as CrateTier[]).map((tier) => (
          <SpendButton key={tier} className={`shop__item shop__item--${tier}`} disabled={busy || view.wallet[tiers[tier].currency] < tiers[tier].price || tiers[tier].leftToday < 1} onSpend={() => void send({ type: 'BuyCrate', tier })} confirm={<span className="shop__confirm">{TIER_NAME[tier]} für {num(tiers[tier].price)} {tiers[tier].currency === 'credits' ? 'Credits' : 'Quanten'} kaufen? Tippe noch einmal</span>}>
            <Crate tier={tier} small />
            <span className="shop__main">
              <b>{TIER_NAME[tier]}</b>
              <small>{tiers[tier].cards} Karten · mindestens 1 {RARITY_LABEL[tiers[tier].floor]}</small>
              <small className={tiers[tier].leftToday < 1 ? 'is-down' : ''}>
                {tiers[tier].leftToday < 1 ? 'Heute ausverkauft'
                  : tiers[tier].nextPrice > tiers[tier].price && tiers[tier].leftToday > 1 ? `Heute noch ${tiers[tier].leftToday} · der nächste kostet ${num(tiers[tier].nextPrice)}`
                    : `Heute noch ${tiers[tier].leftToday}`}
              </small>
            </span>
            <span className={`price price--${tiers[tier].currency}`}>{tiers[tier].currency === 'credits' ? <Credits /> : <Quanta />}{num(tiers[tier].price)}</span>
          </SpendButton>
        ))}
      </div>

      <h4 className="market__section">Tagesangebote<span>Wechseln um Mitternacht</span></h4>
      <div className="shop">
        {view.daily.offers.map((o, i) => {
          const card = o.cardId ? CARD_BY_ID.get(o.cardId) : undefined;
          const owned = card ? !!view.collection[card.id] : false;
          return (
            <button key={i} className={`shop__item offer${o.listPrice ? ' offer--deal' : ''}${card ? ` offer--${card.rarity}` : ''}${o.bought ? ' is-bought' : ''}`} disabled={busy || o.bought || view.wallet.credits < o.price} onClick={() => { audio.tap(); void send({ type: 'BuyOffer', index: i }); }}>
              <span className="shop__main">
                <b>{card ? card.name : o.kind === 'shards' ? `${num(o.amount ?? 0)} Splitter` : `${num(o.amount ?? 0)} Quanten`}</b>
                <small>
                  {card ? `${RARITY_LABEL[card.rarity]} · ${ROLES[card.role].name} · ${FACTIONS[card.faction].short} · ${owned ? 'hast du schon' : 'fehlt dir'}` : o.kind === 'shards' ? 'Zum Aufwerten und Schmieden' : 'Für Premium-Container und Beschleunigen'}
                </small>
              </span>
              <span className="offer__price">
                {o.listPrice && <s>{num(o.listPrice)}</s>}
                <span className="price"><Credits />{o.bought ? 'Gekauft' : num(o.price)}</span>
              </span>
            </button>
          );
        })}
      </div>


      {odds && (
        <div className="overlay overlay--dim" onClick={() => setOdds(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => setOdds(false)} />
            <h3>Quoten pro Karte</h3>
            <table>
              <thead><tr><th /><th>Standard</th><th>Premium</th></tr></thead>
              <tbody>
                {RARITIES.map((r) => (
                  <tr key={r} className={`odds odds--${r}`}>
                    <td><i />{RARITY_LABEL[r]}</td>
                    {(['standard', 'premium'] as const).map((tier) => (
                      <td key={tier}>{(tiers[tier].odds[r] * 100).toLocaleString('de-CH', { maximumFractionDigits: 2 })} %</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Die Quoten enthalten den Aufwertungs-Moment, bei dem eine Karte eine Stufe steigt. Jeder Container enthält die
              angegebene Mindest-Seltenheit. Spätestens jeder {pityElite.max}. Container enthält eine Elite oder besser,
              spätestens jeder {pityLegend.max}. eine Legende oder besser. Doppelte Karten werden zu Splittern.
              Rund {Math.round(view.seasonAlbum.cardShare * 100)} % der seltenen, Elite- und Legenden-Karten stammen aus der
              Edition der laufenden Saison. Diese Karten gibt es nur, solange die Saison läuft.
            </p>
            <button className="cta cta--ghost" onClick={() => setOdds(false)}><span>Schliessen</span></button>
          </div>
        </div>
      )}
    </section>
  );
}
