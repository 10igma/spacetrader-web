import { CONFIG } from '@nova/core';
import { useEffect, useRef } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { longCountdown, num, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import { leagueBadge } from './Emblem.tsx';

export function League() {
  const league = useApp((s) => s.view!.league);
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow(60_000);
  const you = useRef<HTMLDivElement>(null);
  useEffect(() => { you.current?.scrollIntoView({ block: 'center' }); }, []);
  const zone = league.rank <= league.promote ? 'up' : league.rank >= league.relegate ? 'down' : 'hold';
  const top = league.tier >= CONFIG.league.tiers.length - 1;

  return (
    <div className="league">
      <div className={`league__head league__head--${league.tier}`}>
        {leagueBadge(league.tier)
          ? <img className="league__art" src={leagueBadge(league.tier)} alt={`${league.tierName}-Liga`} draggable={false} />
          : <div className="league__badge"><b>{league.tierName}</b><small>Liga</small></div>}
        <div className="league__info">
          <span className="eyebrow">{league.tierName}-Liga · endet in {longCountdown(league.endsAt - now)}</span>
          <b>Platz {league.rank} <small>von {league.standings.length}</small></b>
          <small className={zone === 'up' ? 'is-up' : zone === 'down' ? 'is-down' : ''}>
            {zone === 'up' ? (top ? 'Spitzengruppe: höchste Liga' : 'Aufstiegsplatz') : zone === 'down' ? (league.tier === 0 ? 'Schlussgruppe: tiefer geht es nicht' : 'Abstiegsplatz') : `Platz ${league.promote} steigt auf`}
          </small>
        </div>
      </div>

      {league.last && (
        <div className="results">
          <p className={league.last.moved > 0 ? 'is-up' : league.last.moved < 0 ? 'is-down' : ''}>
            Letzte Woche: Platz {league.last.rank} in {CONFIG.league.tiers[league.last.tier]}.{' '}
            {league.last.moved > 0 ? `Aufstieg in ${CONFIG.league.tiers[league.last.tier + 1]}.` : league.last.moved < 0 ? `Abstieg in ${CONFIG.league.tiers[league.last.tier - 1]}.` : 'Liga gehalten.'}
          </p>
          <p>{Object.keys(league.last.reward).length > 0 ? `Belohnung: ${rewardText(league.last.reward)}` : 'Keine Belohnung für die Schlussgruppe.'}</p>
          <button className="mission__btn" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'ClaimLeague' }); }}>Abholen</button>
        </div>
      )}

      <h4 className="market__section">Wochengewinn<span>Rivalen sind simuliert</span></h4>
      <div className="table">
        {league.standings.map((row, i) => {
          const rank = i + 1;
          return (
            <div key={`${row.name}-${i}`} ref={row.you ? you : undefined} className={`table__row${row.you ? ' is-you' : ''}${rank <= league.promote ? ' is-up' : rank >= league.relegate ? ' is-down' : ''}`}>
              <span className="table__rank">{rank}</span>
              <span className="table__name">{row.you ? 'Du' : row.name}</span>
              <span className="table__score">{num(row.score)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
