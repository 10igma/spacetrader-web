import { CARD_BY_ID, CONFIG, convoyChance, convoyStrength, FACTIONS, ROLES, type ConvoyOffer } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { FACTION_COLOR, longCountdown, ownedCards, RARITY_LABEL, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import { Quanta } from './icons.tsx';
import { CloseX, SpendButton } from './Spend.tsx';

const offerTitle = (o: ConvoyOffer): string => `${o.hours} Std. · ${FACTIONS[o.faction].name}`;

function ConvoySheet({ offer, onClose }: { offer: ConvoyOffer; onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const [team, setTeam] = useState<string[]>([]);
  const seated = new Set(Object.values(view.deck.seats).map((s) => s?.cardId));
  const levels = view.cardLevels;
  const free = ownedCards(view).filter((c) => !seated.has(c.id) && !view.convoys.busy.includes(c.id))
    .map((c) => ({ card: c, strength: convoyStrength(offer, c.id, levels[c.id] ?? 1) }))
    .sort((a, b) => b.strength - a.strength);
  const strength = team.reduce((sum, id) => sum + convoyStrength(offer, id, levels[id] ?? 1), 0);
  const chance = team.length > 0 ? convoyChance(offer, team, levels) : 0;
  const toggle = (id: string) => (): void => {
    audio.tap();
    setTeam((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length < view.convoys.crew ? [...t, id] : t));
  };
  const go = (): void => { audio.tap(); void send({ type: 'SendConvoy', offer: offer.id, cards: team }).then(onClose); };

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade picker" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={onClose} />
        <span className="eyebrow">Konvoi · {offerTitle(offer)}</span>
        <h3>{rewardText(offer.reward)}</h3>
        <p className="trade__note">
          Gesucht: {FACTIONS[offer.faction].name} (zählt 25 % mehr) und {ROLES[offer.role].name} (15 % mehr). Scheitert der Konvoi, kommen {Math.round(CONFIG.convoy.failShare * 100)} % der Credits zurück. Crew geht nie verloren.
        </p>
        <div className={`chance${chance >= 0.9 ? ' is-good' : chance >= 0.6 ? '' : ' is-risky'}`}>
          <b>{Math.round(chance * 100)} %</b>
          <span>
            <div className="mission__bar"><i style={{ width: `${Math.min(1, strength / offer.need) * 100}%` }} /></div>
            <small>Erfolgschance · Stärke {strength} von {offer.need}</small>
          </span>
          <button className="link" onClick={() => { audio.tap(); setTeam(free.slice(0, view.convoys.crew).map((f) => f.card.id)); }}>Beste Crew</button>
        </div>
        <div className="picker__list">
          {free.length === 0 && <p className="trade__note">Keine freie Reserve. Wer auf der Brücke sitzt oder schon unterwegs ist, kann nicht mit.</p>}
          {free.map(({ card, strength: value }) => {
            const picked = team.includes(card.id);
            return (
              <button key={card.id} className={`pick pick--${card.rarity}${picked ? ' is-current' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[card.faction] }} onClick={toggle(card.id)}>
                <span className="pick__value">{value}</span>
                <span className="pick__main">
                  <b>{card.name}</b>
                  <small>
                    {ROLES[card.role].name} · {FACTIONS[card.faction].short} · {RARITY_LABEL[card.rarity]}
                    {card.faction === offer.faction ? ' · Fraktion passt' : ''}{card.role === offer.role ? ' · Rolle passt' : ''}
                  </small>
                </span>
                <span className="pick__state">{picked ? 'Dabei' : ''}</span>
              </button>
            );
          })}
        </div>
        <button className="cta" disabled={busy || team.length === 0} onClick={go}>
          <span>{team.length === 0 ? `Bis zu ${view.convoys.crew} Karten wählen` : `Losschicken · ${offer.hours} Std.`}</span>
        </button>
      </div>
    </div>
  );
}

export function Convoys() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const [open, setOpen] = useState<number | null>(null);
  const { running, offers, slots } = view.convoys;
  const full = running.length >= slots;
  const offer = open === null ? undefined : offers[open];

  return (
    <div className="convoys">
      <p className="convoys__intro">Deine Reserve fliegt Aufträge, während du handelst. Wer unterwegs ist, kann nicht auf die Brücke.</p>
      <h4 className="market__section">Unterwegs<span>{running.length} von {slots}</span></h4>
      {Array.from({ length: slots }, (_, i) => running[i]).map((c, i) => c ? (
        <div key={i} className={`convoy${c.done ? ' is-done' : ''}`}>
          <span className="convoy__main">
            <b>{offerTitle(c.offer)}</b>
            <small>{c.cards.map((id) => CARD_BY_ID.get(id)!.name.split(' ').slice(-1)[0]).join(', ')} · Chance {Math.round(c.chance * 100)} %</small>
            <small>{rewardText(c.offer.reward)}</small>
            {!c.done && <div className="mission__bar"><i style={{ width: `${Math.min(1, 1 - (c.endsAt - now) / (c.offer.hours * 3_600_000)) * 100}%` }} /></div>}
          </span>
          <span className="gear__actions">
            {c.done ? (
              <button className="mission__btn" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'ClaimConvoy', slot: i }); }}>Abholen</button>
            ) : (
              <>
                <span className="gear__state">{longCountdown(c.endsAt - now)}</span>
                <SpendButton className="price price--btn price--quanta" disabled={busy || view.wallet.quanta < c.rushCost} onSpend={() => void send({ type: 'RushConvoy', slot: i })} confirm={<><Quanta />{c.rushCost} ausgeben?</>}>
                  Sofort <Quanta />{c.rushCost}
                </SpendButton>
              </>
            )}
          </span>
        </div>
      ) : <div key={i} className="convoy convoy--empty"><small>Freier Konvoi-Platz</small></div>)}

      <h4 className="market__section">Aufträge heute<span>{offers.filter((o) => !o.taken).length} offen</span></h4>
      {offers.map((o) => (
        <button key={o.id} className={`convoy convoy--offer${o.taken ? ' is-taken' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[o.faction] }} disabled={o.taken || full} onClick={() => { audio.tap(); setOpen(o.id); }}>
          <span className="convoy__hours"><b>{o.hours}</b>Std.</span>
          <span className="convoy__main">
            <b>{FACTIONS[o.faction].name}</b>
            <small>{ROLES[o.role].name} gesucht · Stärke {o.need}</small>
            <small>{rewardText(o.reward)} · {o.xp} XP</small>
          </span>
          <span className="gear__state">{o.taken ? 'Vergeben' : full ? 'Kein Platz' : 'Crew wählen'}</span>
        </button>
      ))}
      {offer && !offer.taken && <ConvoySheet offer={offer} onClose={() => setOpen(null)} />}
    </div>
  );
}
