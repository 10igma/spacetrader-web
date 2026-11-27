import { featuresAt, SHIP_BY_ID, SHIPS, type ShipId } from '@nova/core';
import { useEffect, useState } from 'react';
import { audio } from '../audio/engine.ts';
import { stage } from '../stage/index.ts';
import { useApp, type MilestoneMoment } from '../store.ts';
import { art } from './art.ts';
import { leagueBadge } from './Emblem.tsx';
import { rewardText } from './format.ts';
import { ShipArt } from './Shipyard.tsx';
import { FEATURE_TEXT } from './unlocks.ts';
import { vfx } from './VfxCanvas.tsx';

/** What the big moments say. Everything here is a fact about the game as it stands. */
function content(m: MilestoneMoment, level: number): { eyebrow: string; title: string; hero: React.ReactNode; lines: string[]; rank: 3 | 4 } {
  switch (m.kind) {
    case 'level': {
      const next = SHIPS.find((s) => s.level > m.level);
      return {
        eyebrow: 'Aufstieg', title: `Stufe ${m.level}`, rank: 3,
        hero: <b className="moment__number">{m.level}</b>,
        // What opens at this level comes first: it is the news of this moment.
        lines: [
          ...featuresAt(m.level).map((f) => `Neu: ${FEATURE_TEXT[f].name} · ${FEATURE_TEXT[f].where}`),
          'Tank aufgefüllt · +5 Quanten',
          ...SHIPS.filter((s) => s.level === m.level).map((s) => `Neu in der Werft: ${s.name}`),
          ...(next && m.level >= 4 ? [`Nächstes Schiff: ${next.name} ab Stufe ${next.level}`] : []),
        ],
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
    case 'convoy':
      // Shown by ConvoyMoment below: it has a beat before the result.
      return { eyebrow: '', title: '', hero: null, lines: [], rank: 3 };
    case 'prestige':
      return { eyebrow: 'Prestige', title: `Rang ${m.rank}`, rank: 4, hero: art('emblems', 'prestige') ? <div className="moment__prestige"><img className="moment__badge" src={art('emblems', 'prestige')} alt="" draggable={false} /><b>{'★'.repeat(m.rank)}</b></div> : <b className="moment__number">{'★'.repeat(m.rank)}</b>, lines: [`+${m.rank * 3} % Verkaufspreis auf Dauer`, 'Crew, Titel und Liga bleiben', `Du startest neu auf Stufe ${level}`] };
  }
}

/** How long the convoy's roll hangs in the air. The same for every convoy, whatever the outcome. */
const CONVOY_BEAT_MS = 1300;

/**
 * A convoy comes back: first the chance it was sent with, then, after a beat that is the same
 * every time, how it went. The result was decided by the rules before this is shown.
 */
function ConvoyMoment({ moment }: { moment: Extract<MilestoneMoment, { kind: 'convoy' }> }) {
  const next = useApp((s) => s.nextMilestone);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    audio.riser(CONVOY_BEAT_MS / 1000);
    const timer = window.setTimeout(() => setSettled(true), CONVOY_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [moment.id]);
  useEffect(() => {
    if (!settled) return;
    stage.pulse(moment.success ? 0.35 : 0.25);
    vfx.burst(window.innerWidth / 2, window.innerHeight * 0.38, moment.success ? '#ffc24a' : '#ff4d6d', moment.success ? 34 : 20, { speed: 250 });
    if (moment.success) {
      vfx.ring(window.innerWidth / 2, window.innerHeight * 0.38, '#ffc24a', 190);
      audio.reveal(2);
      audio.coins(moment.reward.credits ?? 500);
    } else audio.deny();
  }, [settled]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = Math.round(moment.chance * 100);
  // Purely cosmetic needle landing well inside the decided sector (no near-miss manipulation).
  const winArc = moment.chance * 360;
  const targetDeg = moment.success ? 720 + winArc * 0.5 : 720 + winArc + (360 - winArc) * 0.5;

  return (
    <div className={`overlay overlay--dim moment moment--convoy${settled ? (moment.success ? ' is-won' : ' is-lost') : ' is-pending'}`} onClick={() => { audio.tap(); if (settled) next(); else setSettled(true); }}>
      {settled && moment.success && <div className="reveal__rays" />}
      <span className="eyebrow moment__eyebrow">Konvoi kehrt zurück</span>
      <div className="moment__hero">
        <div className="dial" style={{ ['--p' as string]: moment.chance, ['--needle' as string]: `${targetDeg}deg` }}>
          <span className="dial__needle" aria-hidden="true" />
          <b>{pct} %</b>
          <small>Chance</small>
        </div>
      </div>
      <h2 className="moment__title" key={String(settled)}>{settled ? (moment.success ? 'Erfolg' : 'Gescheitert') : '...'}</h2>
      <ul className="moment__lines">
        {settled && <li>{moment.success ? rewardText(moment.reward) : `Nur ${rewardText(moment.reward)}`}</li>}
        {settled && moment.xp > 0 && <li style={{ animationDelay: '0.1s' }}>+{moment.xp} Erfahrung</li>}
        {settled && <li style={{ animationDelay: '0.2s' }}>Die Crew ist wieder frei</li>}
      </ul>
      <button className="cta moment__cta" style={{ visibility: settled ? 'visible' : 'hidden' }}><span>Weiter</span></button>
    </div>
  );
}

/** The full-screen beat for the few moments that deserve one. */
export function Milestone() {
  const moment = useApp((s) => s.milestone)!;
  if (moment.kind === 'convoy') return <ConvoyMoment moment={moment} />;
  return <BigMoment moment={moment} />;
}

function BigMoment({ moment }: { moment: MilestoneMoment }) {
  const next = useApp((s) => s.nextMilestone);
  const level = useApp((s) => s.view!.profile.level);
  const c = content(moment, level);
  useEffect(() => {
    audio.reveal(c.rank);
    stage.pulse(0.45);
    vfx.burst(window.innerWidth / 2, window.innerHeight * 0.4, '#ffc24a', 38, { speed: 290 });
    vfx.embers('#ffc24a', 26);
  }, [moment.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`overlay overlay--dim moment moment--${moment.kind}`} onClick={() => { audio.tap(); next(); }}>
      <div className="reveal__rays" />
      <span className="eyebrow moment__eyebrow">{c.eyebrow}</span>
      <div className="moment__hero">{c.hero}</div>
      <h2 className="moment__title">{c.title}</h2>
      <ul className="moment__lines">
        {c.lines.map((line, i) => <li key={line} className={line.startsWith('Neu: ') ? 'is-new' : ''} style={{ animationDelay: `${0.55 + i * 0.09}s` }}>{line}</li>)}
      </ul>
      <button className="cta moment__cta"><span>Weiter</span></button>
    </div>
  );
}
