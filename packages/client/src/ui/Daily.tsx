import { FACTIONS } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, missionText, num, RARITY_LABEL, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFlame, Quanta } from './icons.tsx';

const STREAK_TEXT = {
  none: 'Spring heute einmal, um eine Serie zu starten.',
  safe: 'Für heute gesichert. Morgen geht es weiter.',
  atRisk: 'Noch kein Sprung heute. Ohne Sprung reisst die Serie um Mitternacht.',
  frozen: 'Tag verpasst. Dein Urlaubsschein rettet die Serie beim nächsten Sprung.',
  broken: 'Serie gerissen. Der nächste Sprung startet eine neue.',
} as const;

export function Daily() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const setSheet = useApp((s) => s.setSheet);
  const busy = useApp((s) => s.busy);
  const now = useServerNow();
  const { streak, calendar, daily } = view;
  // Steps already collected in the current seven-day round.
  const doneCount = calendar.claimable ? calendar.step % calendar.rewards.length : ((calendar.step - 1) % calendar.rewards.length) + 1;
  const tap = (fn: () => void) => (): void => { audio.tap(); fn(); };

  return (
    <section className="daily">
      <header className="screenhead">
        <span className="eyebrow">Heute · endet in {countdown(daily.endsAt - now)}</span>
        <h2>Aufträge</h2>
      </header>

      <div className={`streak streak--${streak.status}`}>
        <div className="streak__flame"><IconFlame /><b>{streak.count}</b></div>
        <div className="streak__main">
          <b>Handelsserie{streak.count > 0 ? ` · +${Math.round(streak.bonus * 100)} % Verkaufspreis` : ''}</b>
          <span>{STREAK_TEXT[streak.status]}</span>
          {streak.status === 'atRisk' && <span className="streak__clock">Noch {countdown(streak.endsAt - now)}</span>}
        </div>
        <button className="streak__freeze" disabled={busy || streak.freezes >= streak.maxFreezes || view.wallet.quanta < streak.freezePrice} onClick={tap(() => void send({ type: 'BuyFreeze' }))}>
          <b>{streak.freezes}<small> / {streak.maxFreezes}</small></b>
          <span>Urlaubsschein</span>
          <small><Quanta />{streak.freezePrice}</small>
        </button>
      </div>

      <button className={`wheelcard${daily.wheel.available ? ' wheelcard--ready' : ''}`} onClick={tap(() => setSheet('wheel'))}>
        <span className="wheelcard__icon" />
        <span className="wheelcard__main">
          <b>Glücksrad</b>
          <small>{daily.wheel.available ? 'Dein Gratis-Dreh für heute wartet' : 'Heute gedreht. Morgen gibt es den nächsten'}</small>
        </span>
        <span className="mission__btn" aria-hidden="true">{daily.wheel.available ? 'Drehen' : 'Quoten'}</span>
      </button>

      <h4 className="market__section">Login-Kalender<span>{calendar.claimable ? 'Heute abholbar' : 'Morgen wieder'}</span></h4>
      <div className="calendar">
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

      <h4 className="market__section">Tagesaufträge<span>{daily.chest.done} von {daily.chest.total} erledigt</span></h4>
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
        <button
          className={`chest${daily.chest.done === daily.chest.total && !daily.chest.claimed ? ' chest--ready' : ''}`}
          disabled={busy || daily.chest.claimed || daily.chest.done < daily.chest.total}
          onClick={tap(() => void send({ type: 'ClaimChest' }))}
        >
          <span className="chest__pips">{Array.from({ length: daily.chest.total }, (_, i) => <i key={i} className={i < daily.chest.done ? 'on' : ''} />)}</span>
          <b>{daily.chest.claimed ? 'Tagesbonus erhalten' : 'Tagesbonus für alle drei'}</b>
          <small>{rewardText(daily.chest.reward)}</small>
        </button>
      </div>
      <h4 className="market__section">Manifeste<span>Duplikate abgeben, Belohnung kassieren</span></h4>
      <div className="missions">
        {daily.manifests.map((m, i) => {
          const ready = !m.done && m.have >= m.need;
          const what = `${m.need} ${m.need === 1 ? 'Duplikat' : 'Duplikate'}${m.faction ? ` · ${FACTIONS[m.faction].name}` : ''}${m.minRarity ? ` · ab ${RARITY_LABEL[m.minRarity]}` : ''}`;
          return (
            <div key={i} className={`mission${ready ? ' is-done' : ''}${m.done ? ' is-claimed' : ''}`}>
              <div className="mission__main">
                <b>{what}</b>
                <div className="mission__bar"><i style={{ width: `${Math.min(1, m.have / m.need) * 100}%` }} /></div>
                <small>{m.done ? 'Erfüllt' : `Passende Duplikate: ${m.have}`} · {rewardText(m.reward)}</small>
              </div>
              <button className="mission__btn" disabled={busy || !ready} onClick={tap(() => void send({ type: 'SubmitManifest', index: i }))}>
                {m.done ? 'Erhalten' : ready ? 'Abgeben' : 'Offen'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
