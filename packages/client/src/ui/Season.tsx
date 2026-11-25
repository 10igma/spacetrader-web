import { charterReward, CONFIG } from '@nova/core';
import { useEffect, useRef } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { longCountdown, num, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconLock, Quanta } from './icons.tsx';

function WeekendCard() {
  const weekend = useApp((s) => s.view!.weekend);
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const top = weekend.milestones[weekend.milestones.length - 1]!.at;

  if (!weekend.active) {
    return (
      <div className="event event--idle">
        <span className="eyebrow">Wochenend-Event</span>
        <b>Blockade-Lauf</b>
        <small>Noch {longCountdown(weekend.startsAt - now)} bis zum Start: mehr Zoll, bessere Schwarzmarkt-Preise, Belohnungen für Sprünge.</small>
      </div>
    );
  }
  return (
    <div className="event">
      <span className="eyebrow">Wochenend-Event · endet in {longCountdown(weekend.endsAt - now)}</span>
      <b>Blockade-Lauf</b>
      <small>Zoll kontrolliert öfter, Hehler zahlen {Math.round(CONFIG.weekend.fenceBonus * 100)} % mehr. Sprung 1 Punkt, Sieg 2, durchgeschmuggelt 3.</small>
      <div className="event__bar">
        <i style={{ width: `${Math.min(1, weekend.points / top) * 100}%` }} />
        {weekend.milestones.map((m) => <em key={m.at} className={weekend.points >= m.at ? 'on' : ''} style={{ left: `${(m.at / top) * 100}%` }} />)}
      </div>
      <div className="event__row">
        <span>{weekend.points} Punkte · nächste Belohnung: {(() => {
          const next = weekend.milestones.find((m) => !m.claimed);
          return next ? `${rewardText(next.reward)} bei ${next.at}` : 'alle abgeholt';
        })()}</span>
        <button className="mission__btn" disabled={busy || weekend.claimable < 1} onClick={() => { audio.tap(); void send({ type: 'ClaimWeekend' }); }}>
          {weekend.claimable > 0 ? 'Abholen' : 'Offen'}
        </button>
      </div>
    </div>
  );
}

export function Season() {
  const season = useApp((s) => s.view!.season);
  const quanta = useApp((s) => s.view!.wallet.quanta);
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow(60_000);
  const current = useRef<HTMLDivElement>(null);
  const into = season.xp % season.xpPerTier;
  const maxed = season.tier >= season.tiers;

  useEffect(() => { current.current?.scrollIntoView({ block: 'center' }); }, []);

  return (
    <div className="season">
      <div className="season__head">
        <span className="eyebrow">Saison endet in {longCountdown(season.endsAt - now)}</span>
        <h3>{season.name}</h3>
        <div className="season__tier">
          <b>{season.tier}</b><span>/ {season.tiers}</span>
          <div className="season__xp">
            <div className="mission__bar"><i style={{ width: `${maxed ? 100 : (into / season.xpPerTier) * 100}%` }} /></div>
            <small>{maxed ? 'Charter abgeschlossen' : `${num(into)} / ${num(season.xpPerTier)} bis Stufe ${season.tier + 1}`}</small>
          </div>
          <button className="mission__btn" disabled={busy || season.claimable < 1} onClick={() => { audio.tap(); void send({ type: 'ClaimCharter' }); }}>
            {season.claimable > 0 ? `${season.claimable} abholen` : 'Abgeholt'}
          </button>
        </div>
      </div>

      {!season.premium && (
        <button className="premium" disabled={busy || quanta < season.premiumPrice} onClick={() => { audio.tap(); void send({ type: 'BuyCharter' }); }}>
          <span>
            <b>Premium-Charter</b>
            <small>{season.waitingPremium > 0 ? `${season.waitingPremium} Belohnungen hast du schon erspielt. Sie warten auf dich` : 'Zweite Belohnung auf jeder Stufe'}</small>
          </span>
          <span className="price price--quanta"><Quanta />{season.premiumPrice}</span>
        </button>
      )}

      <WeekendCard />

      <div className="track">
        <div className="track__row track__row--head"><span /><span>Gratis</span><span>Premium</span></div>
        {Array.from({ length: season.tiers }, (_, i) => i + 1).map((t) => {
          const reached = t <= season.tier;
          return (
            <div key={t} ref={t === Math.min(season.tiers, season.tier + 1) ? current : undefined} className={`track__row${reached ? ' is-reached' : ''}${t === season.tier + 1 ? ' is-next' : ''}`}>
              <span className="track__n">{t}</span>
              <span className={`track__cell${t <= season.claimedFree ? ' is-claimed' : reached ? ' is-ready' : ''}`}>{rewardText(charterReward(t, 'free'))}</span>
              <span className={`track__cell track__cell--premium${!season.premium ? ' is-locked' : t <= season.claimedPremium ? ' is-claimed' : reached ? ' is-ready' : ''}`}>
                {!season.premium && <IconLock />}{rewardText(charterReward(t, 'premium'))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
