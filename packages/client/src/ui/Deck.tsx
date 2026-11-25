import { CARD_BY_ID, CARDS, FACTIONS, rarityRank, ROLES, seatStat, SEATS, type BonusKey, type FactionId, type RoleId } from '@nova/core';
import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { Convoys } from './Convoys.tsx';
import { HoloCard } from './HoloCard.tsx';
import { BONUS_LABEL, FACTION_COLOR, num, RARITY_LABEL, rewardText } from './format.ts';
import { Shard } from './icons.tsx';

const SORTED = [...CARDS].sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.rating - a.rating);
const SEAT_BONUS: Record<RoleId, BonusKey> = { pilot: 'nav', trader: 'hdl', tech: 'tec', gunner: 'kmp', smuggler: 'smg' };
const BONUS_USE: Record<BonusKey, string> = {
  nav: 'Flucht und Durchbruch',
  hdl: 'Verkaufspreise und Bestechung',
  tec: 'Scanner täuschen',
  kmp: 'Kampf gegen Piraten',
  smg: 'Zoll meidet dich, Scan findet weniger',
};

function SeatPicker({ seat, onClose }: { seat: RoleId; onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const current = view.deck.seats[seat]?.cardId ?? null;
  const seatOf = (id: string): RoleId | undefined => SEATS.find((s) => view.deck.seats[s]?.cardId === id);
  const owned = CARDS.filter((c) => view.collection[c.id])
    .map((c) => ({ card: c, value: Math.round(seatStat(c, seat, view.cardLevels[c.id] ?? 1) * (c.role === seat ? 1 : 0.75)) }))
    .sort((a, b) => b.value - a.value);
  const set = (cardId: string | null) => (): void => { audio.tap(); void send({ type: 'SetSeat', seat, cardId }).then(onClose); };

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={onClose}>
      <div className="sheet sheet--trade picker" onClick={(e) => e.stopPropagation()}>
        <span className="eyebrow">Platz besetzen</span>
        <h3>{ROLES[seat].name}</h3>
        <p className="trade__note">Zählt für {BONUS_LABEL[SEAT_BONUS[seat]]}: {BONUS_USE[SEAT_BONUS[seat]]}. Fremde Rollen bringen 75 % ihres Werts.</p>
        <div className="picker__list">
          {owned.length === 0 && <p className="trade__note">Noch keine Crew. Öffne einen Container im Hangar.</p>}
          {owned.map(({ card, value }) => {
            const elsewhere = seatOf(card.id);
            const away = view.convoys.busy.includes(card.id);
            return (
              <button key={card.id} disabled={away} className={`pick pick--${card.rarity}${card.id === current ? ' is-current' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[card.faction] }} onClick={set(card.id)}>
                <span className="pick__value">{value}</span>
                <span className="pick__main">
                  <b>{card.name}</b>
                  <small>{ROLES[card.role].name} · {RARITY_LABEL[card.rarity]}{card.role !== seat ? ' · fremde Rolle' : ''}</small>
                </span>
                <span className="pick__state">{away ? 'Im Konvoi' : card.id === current ? 'Sitzt hier' : elsewhere ? `Wechselt von ${ROLES[elsewhere].short}` : ''}</span>
              </button>
            );
          })}
        </div>
        {current && <button className="cta cta--ghost" onClick={set(null)}><span>Platz leeren</span></button>}
      </div>
    </div>
  );
}

const FACTION_ORDER: FactionId[] = ['tessera', 'asche', 'helix', 'zenit'];

export function Deck() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const setInspect = useApp((s) => s.setInspect);
  const [picking, setPicking] = useState<RoleId | null>(null);
  const [page, setPage] = useState<FactionId>(() => FACTION_ORDER.find((f) => view.albums[f].claimable) ?? 'tessera');
  const album = view.albums[page];
  const cards = SORTED.filter((c) => c.faction === page);
  const owned = cards.filter((c) => view.collection[c.id]);
  const missing = cards.filter((c) => !view.collection[c.id]);
  const need = album.next ? Math.ceil(album.total * album.next.pct) : album.total;
  const mode = useApp((s) => s.deckMode);
  const setMode = useApp((s) => s.setDeckMode);
  const back = view.convoys.running.filter((c) => c.done).length;
  const segment = (
    <div className="segment" role="tablist">
      {([['bridge', 'Brücke'], ['convoys', 'Konvois']] as const).map(([id, label]) => (
        <button key={id} role="tab" aria-selected={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => { audio.tap(); setMode(id); }}>
          {label}{id === 'convoys' && back > 0 && <i className="dot" />}
        </button>
      ))}
    </div>
  );

  if (mode === 'convoys') {
    return (
      <section className="deck">
        <header className="screenhead">
          <span className="eyebrow">Reserve</span>
          <h2>Konvois</h2>
        </header>
        {segment}
        <Convoys />
      </section>
    );
  }

  return (
    <section className="deck">
      <header className="screenhead">
        <span className="eyebrow">Brücke</span>
        <h2>Crew</h2>
        <span className="pill pill--chem">Chemie <b>{view.deck.chem}</b></span>
      </header>
      {segment}

      <div className="bridge">
        {SEATS.map((seat) => {
          const s = view.deck.seats[seat];
          const card = s ? CARD_BY_ID.get(s.cardId) : undefined;
          return (
            <button key={seat} className={`seat${card ? ` seat--${card.rarity}` : ' seat--empty'}`} style={card ? { ['--faction' as string]: FACTION_COLOR[card.faction] } : undefined} onClick={() => { audio.tap(); setPicking(seat); }}>
              <span className="seat__role">{ROLES[seat].short}</span>
              {card && s ? (
                <>
                  <span className="seat__value">{s.value}</span>
                  <span className="seat__name">{card.name.split(' ').slice(-1)[0]}</span>
                  <span className="seat__links">{[0, 1, 2, 3].map((i) => <i key={i} className={i < s.links ? 'on' : ''} />)}</span>
                  {!s.onRole && <span className="seat__off">fremd</span>}
                </>
              ) : <span className="seat__plus">+</span>}
            </button>
          );
        })}
      </div>

      <div className="bonuses">
        {(Object.keys(BONUS_LABEL) as BonusKey[]).map((k) => (
          <div key={k} className="bonus" title={BONUS_USE[k]}>
            <span>{BONUS_LABEL[k]}</span>
            <div className="bonus__bar"><i style={{ width: `${view.crew[k] * 100}%` }} /></div>
            <b>{Math.round(view.crew[k] * 100)}</b>
          </div>
        ))}
      </div>
      <div className="deck__actions">
        <button className="link" disabled={busy || Object.keys(view.collection).length === 0} onClick={() => { audio.tap(); void send({ type: 'AutoDeck' }); }}>Automatisch aufstellen</button>
        <span className="pill pill--shards"><Shard />{num(view.wallet.shards)}</span>
      </div>

      <div className="albums" role="tablist">
        {FACTION_ORDER.map((f) => {
          const a = view.albums[f];
          return (
            <button key={f} role="tab" aria-selected={f === page} className={`album${f === page ? ' is-active' : ''}${a.complete ? ' is-complete' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[f] }} onClick={() => { audio.tap(); setPage(f); }}>
              <b>{FACTIONS[f].short}</b>
              <span>{a.owned}/{a.total}</span>
              <i style={{ width: `${(a.owned / a.total) * 100}%` }} />
              {a.claimable && <em className="dot" />}
            </button>
          );
        })}
      </div>
      <div className="album__goal" style={{ ['--faction' as string]: FACTION_COLOR[page] }}>
        {album.next ? (
          <>
            <span><b>{FACTIONS[page].name}</b>{album.claimable ? 'Meilenstein erreicht' : `Noch ${need - album.owned} bis ${Math.round(album.next.pct * 100)} %`} · {rewardText(album.next.reward)}{album.next.pct === 1 ? ' + 2 % Verkaufspreis auf Dauer' : ''}</span>
            <button className="mission__btn" disabled={busy || !album.claimable} onClick={() => { audio.tap(); void send({ type: 'ClaimAlbum', faction: page }); }}>{album.claimable ? 'Abholen' : `${album.owned}/${need}`}</button>
          </>
        ) : <span><b>{FACTIONS[page].name}</b>Album komplett · +2 % Verkaufspreis auf Dauer</span>}
      </div>
      <div className="deck__grid">
        {owned.map((c) => (
          <HoloCard key={c.id} card={c} size="sm" count={view.collection[c.id]} level={view.cardLevels[c.id] ?? 1} onClick={() => { audio.tap(); setInspect(c.id); }} />
        ))}
        {missing.map((c) => <HoloCard key={c.id} card={c} size="sm" locked onClick={() => { audio.tap(); setInspect(c.id); }} />)}
      </div>
      {picking && <SeatPicker seat={picking} onClose={() => setPicking(null)} />}
    </section>
  );
}
