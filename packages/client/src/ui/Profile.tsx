import { CARD_BY_ID, CONFIG, rarityRank, type CardDef } from '@nova/core';
import { useState, type ReactNode } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { HoloCard } from './HoloCard.tsx';
import { FACTION_COLOR, num, ownedCards, RARITY_LABEL } from './format.ts';
import { IconLock, Quanta } from './icons.tsx';
import { ShipArt } from './Shipyard.tsx';
import { CloseX, SpendButton } from './Spend.tsx';

const LEAGUES = CONFIG.league.tiers;

/** A paint you own switches on one tap. A paint you buy takes two. */
function PaintButton({ buy, className, tone, disabled, onAct, confirm, children }: { buy: boolean; className: string; tone: string; disabled: boolean; onAct: () => void; confirm: ReactNode; children: ReactNode }) {
  const style = { ['--tone' as string]: tone };
  return buy
    ? <span style={style} className="paint__wrap"><SpendButton className={className} disabled={disabled} onSpend={onAct} confirm={confirm}>{children}</SpendButton></span>
    : <button style={style} className={className} disabled={disabled} onClick={() => { audio.tap(); onAct(); }}>{children}</button>;
}

function ShowcasePicker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const current = view.captain.showcase;
  const cards = ownedCards(view).sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.rating - a.rating);
  const set = (card: CardDef | null) => (): void => {
    audio.tap();
    const next = [...current];
    if (card) next[Math.min(slot, next.length)] = card.id; else next.splice(slot, 1);
    // A card is shown once: picking it again moves it.
    const unique = next.filter((id, i) => id && (id !== card?.id || i === Math.min(slot, current.length)));
    void send({ type: 'SetShowcase', cards: unique.slice(0, 3) }).then(onClose);
  };
  return (
    <div className="overlay overlay--dim overlay--bottom overlay--top" onClick={onClose}>
      <div className="sheet sheet--trade picker" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={onClose} />
        <span className="eyebrow">Schaukasten · Platz {slot + 1}</span>
        <h3>Karte zeigen</h3>
        <div className="picker__list">
          {cards.map((card) => (
            <button key={card.id} className={`pick pick--${card.rarity}${current.includes(card.id) ? ' is-current' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[card.faction] }} onClick={set(card)}>
              <span className="pick__value">{card.rating}</span>
              <span className="pick__main"><b>{card.name}</b><small>{card.epithet} · {RARITY_LABEL[card.rarity]}</small></span>
              <span className="pick__state">{current.includes(card.id) ? 'Gezeigt' : ''}</span>
            </button>
          ))}
        </div>
        {current[slot] && <button className="cta cta--ghost" onClick={set(null)}><span>Platz leeren</span></button>}
      </div>
    </div>
  );
}

export function ProfileSheet() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const close = useApp((s) => s.setSheet);
  const [picking, setPicking] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const c = view.captain;
  const f = c.facts;
  const tap = (fn: () => void) => (): void => { audio.tap(); fn(); };
  const stats: [string, string][] = [
    ['Sprünge', num(f.jumps)],
    ['Handelsgewinn', num(f.profit)],
    ['Karten', `${f.cards} / 130`],
    ['Konvois', num(f.convoys)],
    ['Geschmuggelt', num(f.smuggled)],
    ['Beste Liga', LEAGUES[f.bestLeague] ?? LEAGUES[0]!],
  ];

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(null)}>
      <div className="sheet sheet--trade profile" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => close(null)} />
        <span className="eyebrow">Profil · Stufe {view.profile.level}</span>
        <h3>{c.title}</h3>
        <div className="profile__scroll">
          <div className="profile__hero">
            <ShipArt id={view.fleet.active} paint={view.captain.paints.find((p) => p.id === c.paint)?.tone ?? null} />
            <div className="profile__case">
              {[0, 1, 2].map((i) => {
                const card = c.showcase[i] ? CARD_BY_ID.get(c.showcase[i]!) : undefined;
                return card
                  ? <HoloCard key={i} card={card} size="sm" level={view.cardLevels[card.id] ?? 1} onClick={tap(() => setPicking(i))} />
                  : <button key={i} className="profile__empty" onClick={tap(() => setPicking(i))}>+</button>;
              })}
            </div>
          </div>
          <div className="profile__stats">
            {stats.map(([label, value]) => <span key={label}><b>{value}</b>{label}</span>)}
          </div>

          <h4 className="market__section">Titel<span>{c.titles.filter((t) => t.unlocked).length} von {c.titles.length}</span></h4>
          <div className="profile__titles">
            {c.titles.map((t) => (
              <button key={t.id} className={`title${t.id === c.titleId ? ' is-active' : ''}${t.unlocked ? '' : ' is-locked'}`} disabled={busy || !t.unlocked || t.id === c.titleId} onClick={tap(() => void send({ type: 'SetTitle', title: t.id }))}>
                <b>{!t.unlocked && <IconLock />}{t.name}</b>
                <small>{t.hint}</small>
              </button>
            ))}
          </div>

          <h4 className="market__section">Lackierung<span>Nur Optik</span></h4>
          <div className="profile__paints">
            {c.paints.map((p) => (
              <PaintButton
                key={p.id}
                buy={!p.unlocked && p.price !== null}
                className={`paint${p.id === c.paint ? ' is-active' : ''}${p.unlocked ? '' : ' is-locked'}${p.tone === 'prisma' ? ' paint--prisma' : ''}`}
                tone={p.tone && p.tone !== 'prisma' ? p.tone : '#7fe3ff'}
                disabled={busy || p.id === c.paint || (!p.unlocked && (p.price === null || view.wallet.quanta < p.price))}
                onAct={() => void send(p.unlocked ? { type: 'SetPaint', paint: p.id } : { type: 'BuyPaint', paint: p.id })}
                confirm={<><i /><b>Kaufen?</b><small><Quanta />{p.price}</small></>}
              >
                <i />
                <b>{p.name}</b>
                <small>{p.unlocked ? (p.id === c.paint ? 'Aktiv' : 'Wählen') : p.price !== null ? <><Quanta />{p.price}</> : p.hint}</small>
              </PaintButton>
            ))}
          </div>

          <h4 className="market__section">Prestige<span>{'★'.repeat(c.prestige)}{'☆'.repeat(c.prestigeMax - c.prestige)}</span></h4>
          <div className="prestige">
            {art('emblems', 'prestige') && <img className="prestige__badge" src={art('emblems', 'prestige')} alt="" draggable={false} />}
            <p>
              Fang als Kapitän neu an und verkaufe dafür <b>auf Dauer {Math.round(c.prestigeBonus * 100)} % besser</b> pro Rang.
              {c.prestige > 0 && ` Dein Bonus jetzt: ${Math.round(view.saleBonus.prestige * 100)} %.`}
            </p>
            {c.prestige >= c.prestigeMax ? <p className="is-up">Höchster Rang erreicht.</p>
              : !c.canPrestige ? <p>Möglich ab Stufe {c.prestigeLevel}. Du bist auf Stufe {view.profile.level}.</p>
                : !confirm ? <button className="cta cta--gold" disabled={busy} onClick={tap(() => setConfirm(true))}><span>Prestige {c.prestige + 1} ansehen</span></button>
                  : (
                    <>
                      <ul className="prestige__list">
                        <li className="is-down">Du verlierst: Stufe, Credits, Fracht, Laderaum-Ausbau, alle Schiffe und Module, Handelsposten.</li>
                        <li className="is-up">Du behältst: Crew und Kartenstufen, Quanten, Splitter, Alben, Saison, Liga, Serie, Titel und Lackierungen.</li>
                        <li className="is-up">Du bekommst: +{Math.round(c.prestigeBonus * 100)} % Verkaufspreis auf Dauer, {CONFIG.prestige.quanta} Quanten, {CONFIG.prestige.shards} Splitter.</li>
                      </ul>
                      <div className="prestige__actions">
                        <button className="cta cta--ghost" onClick={tap(() => setConfirm(false))}><span>Abbrechen</span></button>
                        <button className="cta cta--danger" disabled={busy} onClick={tap(() => { void send({ type: 'Prestige' }).then(() => setConfirm(false)); })}><span>Neu anfangen</span></button>
                      </div>
                    </>
                  )}
          </div>
        </div>
      </div>
      {picking !== null && <ShowcasePicker slot={picking} onClose={() => setPicking(null)} />}
    </div>
  );
}
