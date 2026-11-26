import { charterReward, CONFIG } from '@nova/core';
import { useEffect, useRef } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { longCountdown, num, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import type { Reward } from '@nova/core';
import { Credits, IconDeck, IconHangar, IconLock, Quanta, Shard } from './icons.tsx';
import { SpendButton } from './Spend.tsx';

/** One reward as a tile: what it is at a glance, how much in big digits. */
function RewardTile({ reward, state, premium = false }: { reward: Reward; state: 'locked' | 'open' | 'ready' | 'claimed'; premium?: boolean }) {
  const main = reward.seasonCard ? { icon: <IconDeck />, amount: reward.seasonCard === 'legend' ? 'Legende' : 'Elite', label: 'Saison-Karte', big: true }
    : reward.crate ? { icon: <IconHangar />, amount: reward.crate === 'premium' ? 'Premium' : 'Container', label: reward.crate === 'premium' ? 'Container' : 'Standard', big: reward.crate === 'premium' }
      : reward.credits ? { icon: <Credits />, amount: num(reward.credits), label: 'Credits', big: false }
        : reward.quanta ? { icon: <Quanta />, amount: num(reward.quanta), label: 'Quanten', big: false }
          : { icon: <Shard />, amount: num(reward.shards ?? 0), label: 'Splitter', big: false };
  const extra = (reward.seasonCard || reward.crate) && reward.quanta ? `+ ${reward.quanta} Quanten` : '';
  // Rendered art where it has been made: crates and currencies.
  const picture = reward.seasonCard ? undefined
    : reward.crate ? art('crates', reward.crate)
      : art('currency', reward.credits ? 'credits' : reward.quanta ? 'quanta' : 'shards');
  return (
    <span className={`rtile rtile--${state}${premium ? ' rtile--premium' : ''}${main.big ? ' rtile--big' : ''}`}>
      <span className={`rtile__icon${picture && state !== 'locked' ? ' rtile__icon--art' : ''}`}>{state === 'locked' ? <IconLock /> : picture ? <img src={picture} alt="" draggable={false} /> : main.icon}</span>
      <span className="rtile__main"><b>{main.amount}</b><small>{main.label}{extra ? ` ${extra}` : ''}</small></span>
      {state === 'claimed' && <span className="rtile__check">✓</span>}
    </span>
  );
}

export function WeekendCard() {
  const weekend = useApp((s) => s.view!.weekend);
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const top = weekend.milestones[weekend.milestones.length - 1]!.at;
  const banner = art('banners', 'event-blockade');

  if (!weekend.active) {
    return (
      <div className={`event event--idle${banner ? ' event--art' : ''}`} style={banner ? { ['--img' as string]: `url("${banner}")` } : undefined}>
        <span className="eyebrow">Wochenend-Event</span>
        <b>Blockade-Lauf</b>
        <small>Noch {longCountdown(weekend.startsAt - now)} bis zum Start: mehr Zoll, bessere Schwarzmarkt-Preise, Belohnungen für Sprünge.</small>
      </div>
    );
  }
  return (
    <div className={`event${banner ? ' event--art' : ''}`} style={banner ? { ['--img' as string]: `url("${banner}")` } : undefined}>
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
  // One banner per season theme, in the order of the season names.
  const banner = art('banners', `season-${((season.index % CONFIG.season.names.length) + CONFIG.season.names.length) % CONFIG.season.names.length}`);

  useEffect(() => { current.current?.scrollIntoView({ block: 'center' }); }, []);

  return (
    <div className="season">
      <div className={`season__head${banner ? ' season__head--art' : ''}`} style={banner ? { ['--img' as string]: `url("${banner}")` } : undefined}>
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
        <SpendButton
          className="premium" disabled={busy || quanta < season.premiumPrice} onSpend={() => void send({ type: 'BuyCharter' })}
          confirm={<><span><b>{season.premiumPrice} Quanten ausgeben?</b><small>Danach hast du {quanta - season.premiumPrice} Quanten. Tippe noch einmal zum Kaufen</small></span><span className="price price--quanta"><Quanta />{season.premiumPrice}</span></>}
        >
          <span>
            <b>Premium-Charter</b>
            <small>{season.waitingPremium > 0 ? `Zweite Belohnung auf jeder Stufe. ${season.waitingPremium} davon sofort abholbar` : 'Zweite Belohnung auf jeder Stufe'}</small>
          </span>
          <span className="price price--quanta"><Quanta />{season.premiumPrice}</span>
        </SpendButton>
      )}

      <WeekendCard />

      <div className="track">
        <div className="track__row track__row--head"><span /><span>Gratis</span><span className="track__gold">Premium</span></div>
        {Array.from({ length: season.tiers }, (_, i) => i + 1).map((t) => {
          const reached = t <= season.tier;
          return (
            <div key={t} ref={t === Math.min(season.tiers, season.tier + 1) ? current : undefined} className={`track__row${reached ? ' is-reached' : ''}${t === season.tier + 1 ? ' is-next' : ''}`}>
              <span className="track__n">{t}</span>
              <RewardTile reward={charterReward(t, 'free')} state={t <= season.claimedFree ? 'claimed' : reached ? 'ready' : 'open'} />
              <RewardTile premium reward={charterReward(t, 'premium')} state={!season.premium ? 'locked' : t <= season.claimedPremium ? 'claimed' : reached ? 'ready' : 'open'} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
