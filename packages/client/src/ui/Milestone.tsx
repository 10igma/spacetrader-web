import { SHIP_BY_ID, SHIPS, type ShipId } from '@nova/core';
import { useEffect } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp, type MilestoneMoment } from '../store.ts';
import { art } from './art.ts';
import { leagueBadge } from './Emblem.tsx';
import { ShipArt } from './Shipyard.tsx';

/** What the big moments say. Everything here is a fact about the game as it stands. */
function content(m: MilestoneMoment, level: number): { eyebrow: string; title: string; hero: React.ReactNode; lines: string[]; rank: 3 | 4 } {
  switch (m.kind) {
    case 'level': {
      const next = SHIPS.find((s) => s.level > m.level);
      return {
        eyebrow: 'Aufstieg', title: `Stufe ${m.level}`, rank: 3,
        hero: <b className="moment__number">{m.level}</b>,
        lines: ['Tank aufgefüllt', '+5 Quanten', ...SHIPS.filter((s) => s.level === m.level).map((s) => `Neu in der Werft: ${s.name}`), ...(next ? [`Nächstes Schiff: ${next.name} ab Stufe ${next.level}`] : [])],
      };
    }
    case 'ship': {
      const ship = SHIP_BY_ID.get(m.ship as ShipId)!;
      return {
        eyebrow: 'Neues Schiff', title: ship.name, rank: 3,
        hero: <div className="moment__ship"><ShipArt id={ship.id} /></div>,
        lines: [ship.cls, ...(ship.hold ? [`Laderaum +${ship.hold}`] : []), ...(ship.fuel ? [`Tank +${ship.fuel}`] : []), `${ship.slots} Modulplätze`],
      };
    }
    case 'league':
      return { eyebrow: 'Aufstieg', title: `${m.tierName}-Liga`, rank: 3, hero: leagueBadge(m.tier) ? <img className="moment__badge" src={leagueBadge(m.tier)} alt="" draggable={false} /> : <b className="moment__number">▲</b>, lines: [`Platz ${m.rank} in der letzten Woche`, 'Stärkere Rivalen, bessere Belohnungen'] };
    case 'album':
      return { eyebrow: 'Saison-Edition', title: 'Komplett', rank: 4, hero: <b className="moment__number">12</b>, lines: ['Neuer Titel freigeschaltet', 'Lackierung Prisma freigeschaltet', 'Beides bleibt dir für immer'] };
    case 'charter':
      return { eyebrow: 'Saison', title: 'Premium-Charter', rank: 3, hero: <b className="moment__number">★</b>, lines: ['Zweite Belohnung auf jeder Stufe', 'Schon Erspieltes kannst du jetzt abholen'] };
    case 'prestige':
      return { eyebrow: 'Prestige', title: `Rang ${m.rank}`, rank: 4, hero: art('emblems', 'prestige') ? <div className="moment__prestige"><img className="moment__badge" src={art('emblems', 'prestige')} alt="" draggable={false} /><b>{'★'.repeat(m.rank)}</b></div> : <b className="moment__number">{'★'.repeat(m.rank)}</b>, lines: [`+${m.rank * 3} % Verkaufspreis auf Dauer`, 'Crew, Titel und Liga bleiben', `Du startest neu auf Stufe ${level}`] };
  }
}

/** The full-screen beat for the few moments that deserve one. */
export function Milestone() {
  const moment = useApp((s) => s.milestone)!;
  const next = useApp((s) => s.nextMilestone);
  const level = useApp((s) => s.view!.profile.level);
  const c = content(moment, level);
  useEffect(() => { audio.reveal(c.rank); }, [moment.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`overlay overlay--dim moment moment--${moment.kind}`} onClick={() => { audio.tap(); next(); }}>
      <div className="reveal__rays" />
      <span className="eyebrow moment__eyebrow">{c.eyebrow}</span>
      <div className="moment__hero">{c.hero}</div>
      <h2 className="moment__title">{c.title}</h2>
      <ul className="moment__lines">
        {c.lines.map((line, i) => <li key={line} style={{ animationDelay: `${0.55 + i * 0.09}s` }}>{line}</li>)}
      </ul>
      <button className="cta moment__cta"><span>Weiter</span></button>
    </div>
  );
}
