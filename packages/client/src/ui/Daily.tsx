import { useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useFresh, useSeenNow, useUnlocks } from './unlocks.ts';
import { useApp } from '../store.ts';
import { countdown, missionText, num, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconDaily, IconFlame, Quanta } from './icons.tsx';
import { League } from './League.tsx';
import { Season, WeekendCard } from './Season.tsx';
import { SpendButton } from './Spend.tsx';

/** A calendar reward in two words, for the symbol. */
const rewardShort = (r: { credits?: number; shards?: number; quanta?: number; freeze?: number; crate?: unknown }): string =>
  r.credits ? `${num(r.credits)} Credits` : r.shards ? `${r.shards} Splitter` : r.quanta ? `${r.quanta} Quanten` : r.freeze ? 'Urlaubsschein' : 'Container';

const STREAK_TEXT = {
  none: 'Spring heute einmal, um eine Serie zu starten.',
  safe: 'Für heute gesichert. Morgen geht es weiter.',
  atRisk: 'Ein Sprung heute hält die Serie.',
  frozen: 'Tag verpasst. Dein Urlaubsschein rettet die Serie beim nächsten Sprung.',
  broken: 'Serie gerissen. Der nächste Sprung startet eine neue.',
} as const;

function Today() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const setSheet = useApp((s) => s.setSheet);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const { streak, calendar, daily } = view;
  // Missions that are done and not collected yet, highest index first so indexes stay valid while claiming.
  const claimable = daily.missions.map((m, i) => (!m.claimed && m.progress >= m.target ? i : -1)).filter((i) => i >= 0);
  // Steps already collected in the current seven-day round.
  const doneCount = calendar.claimable ? calendar.step % calendar.rewards.length : ((calendar.step - 1) % calendar.rewards.length) + 1;
  const tap = (fn: () => void) => (): void => { audio.tap(); fn(); };
  const [detail, setDetail] = useState<'streak' | 'calendar' | null>(null);
  const today = calendar.rewards[doneCount % calendar.rewards.length];
  const urgent = streak.status === 'atRisk' && streak.endsAt - now < 3 * 3_600_000;
  const streakTone = urgent ? 'urgent' : streak.status;

  return (
    <>
      {view.weekend.active && <WeekendCard />}
      {view.comeback && (
        <button className="comeback" disabled={busy} onClick={tap(() => void send({ type: 'ClaimComeback' }))}>
          <b>Willkommen zurück, Kapitän</b>
          <small>Dein Geschenk: {rewardText(view.comeback)} und ein voller Tank</small>
          <span className="mission__btn" aria-hidden="true">Abholen</span>
        </button>
      )}

      {/* Three things that come back every day, as symbols. Details open on a tap. */}
      <div className="trio">
        <button className={`trio__btn trio__btn--streak trio__btn--${streakTone}${detail === 'streak' ? ' is-open' : ''}`} onClick={tap(() => setDetail(detail === 'streak' ? null : 'streak'))}>
          <span className="trio__icon"><IconFlame /><b>{streak.count}</b></span>
          <b>Serie</b>
          <small>{streak.status === 'atRisk' ? countdown(streak.endsAt - now) : streak.status === 'safe' ? `+${Math.round(streak.bonus * 100)} %` : streak.status === 'frozen' ? 'Schein hält' : streak.status === 'broken' ? 'gerissen' : 'starten'}</small>
        </button>
        <button className={`trio__btn trio__btn--wheel${daily.wheel.available ? ' trio__btn--ready' : ''}`} onClick={tap(() => setSheet('wheel'))}>
          <span className="trio__icon"><i className="wheelcard__icon" /></span>
          <b>Glücksrad</b>
          <small>{daily.wheel.available ? 'Gratis-Dreh' : 'morgen'}</small>
        </button>
        <button
          className={`trio__btn trio__btn--calendar${calendar.claimable ? ' trio__btn--ready' : ''}${detail === 'calendar' ? ' is-open' : ''}`}
          disabled={busy}
          onClick={tap(() => { if (calendar.claimable) void send({ type: 'ClaimCalendar' }); else setDetail(detail === 'calendar' ? null : 'calendar'); })}
        >
          <span className="trio__icon"><IconDaily /></span>
          <b>Tag {(doneCount % calendar.rewards.length) + 1}</b>
          <small>{calendar.claimable && today ? rewardShort(today) : 'morgen'}</small>
        </button>
      </div>

      {detail === 'streak' && (
        <div className={`streak streak--${streak.status}${streak.status === 'atRisk' && streak.endsAt - now < 3 * 3_600_000 ? ' is-urgent' : ''}`}>
          <div className="streak__flame"><IconFlame /><b>{streak.count}</b></div>
          <div className="streak__main">
            <b>Handelsserie{streak.count > 0 ? ` · +${Math.round(streak.bonus * 100)} % Verkaufspreis` : ''}</b>
            <span>{STREAK_TEXT[streak.status]}</span>
            {streak.status === 'atRisk' && <span className="streak__clock">Noch {countdown(streak.endsAt - now)}</span>}
          </div>
          <SpendButton className="streak__freeze" disabled={busy || streak.freezes >= streak.maxFreezes || view.wallet.quanta < streak.freezePrice} onSpend={() => void send({ type: 'BuyFreeze' })} confirm={<><span>Kaufen?</span><small><Quanta />{streak.freezePrice}</small></>}>
            <b>{streak.freezes}<small> / {streak.maxFreezes}</small></b>
            <span>Urlaubsschein</span>
            <small><Quanta />{streak.freezePrice}</small>
          </SpendButton>
        </div>
      )}
      {detail === 'calendar' && (
        <div className="calendar" ref={(el) => { el?.querySelector('.cal--today, .cal--next')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }}>
          {calendar.rewards.map((r, i) => {
            const state = i < doneCount ? 'done' : i === doneCount ? (calendar.claimable ? 'today' : 'next') : 'future';
            return (
              <button key={i} className={`cal cal--${state}${r.crate ? ' cal--big' : ''}`} disabled={busy || state !== 'today'} onClick={tap(() => void send({ type: 'ClaimCalendar' }))}>
                <small>Tag {i + 1}</small>
                <b>{r.credits ? num(r.credits) : r.shards ?? r.quanta ?? (r.freeze ? '1' : '★')}</b>
                <span>{r.credits ? 'Credits' : r.shards ? 'Splitter' : r.quanta ? 'Quanten' : r.freeze ? 'Schein' : 'Premium'}</span>
              </button>
            );
          })}
        </div>
      )}

      <h4 className="market__section">
        Tagesaufträge
        {claimable.length >= 2
          ? <button className="link link--gold" disabled={busy} onClick={tap(() => { void (async () => { for (const index of claimable) await send({ type: 'ClaimMission', index }); })(); })}>Alle {claimable.length} abholen</button>
          : <span>{daily.chest.done} von {daily.chest.total} erledigt</span>}
      </h4>
      <button
        className={`chest${daily.chest.done === daily.chest.total && !daily.chest.claimed ? ' chest--ready' : ''}${daily.chest.claimed ? ' is-claimed' : ''}`}
        disabled={busy || daily.chest.claimed || daily.chest.done < daily.chest.total}
        onClick={tap(() => void send({ type: 'ClaimChest' }))}
      >
        <span className="chest__pips">{Array.from({ length: daily.chest.total }, (_, i) => <i key={i} className={i < daily.chest.done ? 'on' : ''} />)}</span>
        <span className="chest__text">
          <b>{daily.chest.claimed ? 'Tagesbonus erhalten' : daily.chest.done === daily.chest.total ? 'Tagesbonus abholen' : 'Tagesbonus für alle drei'}</b>
          <small>{rewardText(daily.chest.reward)}</small>
        </span>
      </button>
      <div className="missions">
        {daily.missions.map((m, i) => {
          const done = m.progress >= m.target;
          return (
            <div key={i} className={`mission${done ? ' is-done' : ''}${m.claimed ? ' is-claimed' : ''}`}>
              <div className="mission__main">
                <b>{missionText(m)}</b>
                <div className="mission__bar"><i style={{ width: `${(m.progress / m.target) * 100}%` }} /></div>
                <small>{num(m.progress)} / {num(m.target)} · {rewardText(m.reward)}</small>
              </div>
              <button className="mission__btn" disabled={busy || !done || m.claimed} onClick={tap(() => void send({ type: 'ClaimMission', index: i }))}>
                {m.claimed ? 'Erhalten' : done ? 'Abholen' : 'Offen'}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

type Mode = 'today' | 'season' | 'league';

export function Daily() {
  const view = useApp((s) => s.view)!;
  const now = useServerNow();
  const seasonBadge = view.season.claimable > 0 || view.weekend.claimable > 0;
  const unlocks = useUnlocks();
  const fresh = useFresh();
  const [wanted, setMode] = useState<Mode>(() => (view.league.last && unlocks.league ? 'league' : 'today'));
  const mode = (wanted === 'season' && !unlocks.season) || (wanted === 'league' && !unlocks.league) ? 'today' : wanted;
  useSeenNow('daily');
  useSeenNow(mode === 'season' ? 'season' : mode === 'league' ? 'league' : null);
  const tabs = ([
    { id: 'today', label: 'Heute', dot: false, open: true, isNew: false },
    { id: 'season', label: 'Saison', dot: seasonBadge, open: unlocks.season, isNew: fresh('season') },
    { id: 'league', label: 'Liga', dot: view.league.last !== null, open: unlocks.league, isNew: fresh('league') },
  ] as { id: Mode; label: string; dot: boolean; open: boolean; isNew: boolean }[]).filter((t) => t.open);
  return (
    <section className="daily">
      <header className="screenhead">
        <span className="eyebrow">
          {mode === 'today' ? `Heute · endet in ${countdown(view.daily.endsAt - now)}` : mode === 'season' ? `Saison · ${view.season.name}` : `${view.league.tierName}-Liga`}
        </span>
        <h2>{mode === 'today' ? 'Aufträge' : mode === 'season' ? 'Charter' : 'Liga'}</h2>
      </header>
      {tabs.length > 1 && (
        <div className={`segment segment--${tabs.length}`} role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={mode === t.id} className={mode === t.id ? 'is-active' : ''} onClick={() => { audio.tap(); setMode(t.id); }}>
              {t.label}{t.dot ? <i className="dot" /> : t.isNew ? <i className="dot dot--new" /> : null}
            </button>
          ))}
        </div>
      )}
      {mode === 'today' && <Today />}
      {mode === 'season' && <Season />}
      {mode === 'league' && <League />}
    </section>
  );
}
