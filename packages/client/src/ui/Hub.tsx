import { CARD_BY_ID, CATEGORY_NAME, FACTIONS, GOOD_BY_ID, rarityRank, SHIP_BY_ID, STATION_BY_ID } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR, longCountdown, num } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconFuel, IconHangar, IconMarket } from './icons.tsx';

const CUSTOMS = ['Kein Zoll', 'Zoll lax', 'Zoll wachsam', 'Zoll streng'];

export function Hub() {
  const view = useApp((s) => s.view)!;
  const setTab = useApp((s) => s.setTab);
  const setHangarMode = useApp((s) => s.setHangarMode);
  const openRoutes = useApp((s) => s.setRoutesOpen);
  const send = useApp((s) => s.send);
  const setSheet = useApp((s) => s.setSheet);
  const stars = view.wanted[STATION_BY_ID.get(view.location)!.faction];
  const news = view.event && view.event.stationId !== view.location ? view.event : null;
  const now = useServerNow();
  const station = STATION_BY_ID.get(view.location)!;
  const go = (tab: 'hangar') => (): void => { audio.tap(); setTab(tab); };

  // The ticker is the live local market, strongest deviations first.
  const movers = [...view.market].sort((a, b) => Math.abs(b.level - 1) - Math.abs(a.level - 1));
  const wanted = [...view.market].sort((a, b) => b.level - a.level)[0]!;

  // News first: everything here is read from the game as it stands, nothing is made up.
  const headlines: { label: string; text: string; tone: 'up' | 'down' | 'warn' }[] = [];
  const { league, season, seasonAlbum, weekend } = view;
  const ahead = league.rank > 1 ? league.standings[league.rank - 2] : undefined;
  headlines.push({
    label: `${league.tierName}-Liga`,
    text: ahead ? `Platz ${league.rank} · ${num(Math.max(0, ahead.score - league.score))} hinter ${ahead.name}` : 'Platz 1 · du führst',
    tone: league.rank <= league.promote ? 'up' : league.rank >= league.relegate ? 'down' : 'warn',
  });
  headlines.push({
    label: 'Saison',
    text: `${season.name} endet in ${longCountdown(season.endsAt - now)}${seasonAlbum.complete ? '' : ` · ${seasonAlbum.total - seasonAlbum.owned} Edition-Karten fehlen`}`,
    tone: 'warn',
  });
  if (weekend.active) headlines.push({ label: 'Blockade-Lauf', text: `läuft noch ${longCountdown(weekend.endsAt - now)} · ${weekend.points} Punkte`, tone: 'down' });
  else if (weekend.startsAt - now < 2 * 86_400_000) headlines.push({ label: 'Blockade-Lauf', text: `startet in ${longCountdown(weekend.startsAt - now)}`, tone: 'warn' });
  for (const lot of view.auction.lots) {
    const card = CARD_BY_ID.get(lot.cardId);
    if (card && !lot.gone && lot.endsAt > now && rarityRank(card.rarity) >= rarityRank('legend')) headlines.push({ label: 'Auktion', text: `${card.name} · endet in ${longCountdown(lot.endsAt - now)}`, tone: 'up' });
  }
  const back = view.convoys.running.filter((c) => c.done).length;
  if (back > 0) headlines.push({ label: 'Konvoi', text: back === 1 ? 'ist zurück' : `${back} sind zurück`, tone: 'up' });

  return (
    <section className="hub" style={{ ['--faction' as string]: FACTION_COLOR[station.faction] }}>
      <header className="hub__loc">
        <span className="eyebrow">{FACTIONS[station.faction].name} · {station.tagline}</span>
        <h1>{station.name}</h1>
        <div className="chips">
          <span className={`chip ${station.customs >= 2 ? 'chip--hot' : 'chip--ok'}`}>{CUSTOMS[station.customs]}</span>
          <span className="chip chip--hot">{GOOD_BY_ID.get(wanted.goodId)!.name} gefragt</span>
          <button className="chip chip--ship" onClick={() => { audio.tap(); setHangarMode('yard'); setTab('hangar'); }}>
            {SHIP_BY_ID.get(view.fleet.active)!.name} · Werft
          </button>
          {view.weekend.active && (
            <button className="chip chip--event" onClick={() => { audio.tap(); setTab('daily'); }}>
              Blockade-Lauf · {view.weekend.points} Punkte
            </button>
          )}
          {view.streak.count > 0 && (
            <button className={`chip chip--streak chip--${view.streak.status}`} onClick={() => { audio.tap(); setTab('daily'); }}>
              Serie {view.streak.count} · +{Math.round(view.streak.bonus * 100)} %{view.streak.status === 'atRisk' ? ` · endet in ${countdown(view.streak.endsAt - now)}` : ''}
            </button>
          )}
          {stars > 0 && view.payOff !== null && (
            <button className="chip chip--wanted" onClick={() => { audio.tap(); void send({ type: 'PayOff' }); }}>
              Fahndung {'★'.repeat(stars)} · Freikaufen {num(view.payOff)}
            </button>
          )}
        </div>
        {view.salvage && (
          <button className="news news--salvage" onClick={() => { audio.tap(); setSheet('salvage'); }}>
            <b>Bergungs-Auktion am Dock</b>
            Versiegelter Wrack-Container für {num(view.salvage.price)} Credits. Tippen für Details.
          </button>
        )}
        {news && (
          <p className="news">
            <b>Eilmeldung</b>
            Knappheit an {CATEGORY_NAME[news.category]} auf {STATION_BY_ID.get(news.stationId)!.name}: Preise +{Math.round((news.mult - 1) * 100)} %, noch {news.jumpsLeft} {news.jumpsLeft === 1 ? 'Sprung' : 'Sprünge'}.
          </p>
        )}
      </header>

      <div className="ticker" aria-hidden="true">
        <div className="ticker__track">
          {[0, 1].flatMap((half) => [
            ...headlines.map((n, i) => (
              <span key={`n${half}-${i}`} className={`ticker__item ticker__item--news ticker__item--${n.tone}`}><b>{n.label}</b>{n.text}</span>
            )),
            ...movers.slice(0, 8).map((m, i) => (
              <span key={`m${half}-${i}`} className={`ticker__item ticker__item--${m.level >= 1 ? 'up' : 'down'}`}>
                <b>{GOOD_BY_ID.get(m.goodId)!.name}</b>{m.level >= 1 ? '+' : '−'}{Math.abs(Math.round((m.level - 1) * 100))} %
              </span>
            )),
          ])}
        </div>
      </div>

      <div className="hub__grow" />

      <div className="tiles">
        <button className={`tile${view.badges.station > 0 ? ' tile--ready' : ''}`} onClick={() => { audio.tap(); setSheet('posts'); }}>
          <span className="tile__icon"><IconMarket /></span>
          <span className="tile__label">{view.posts.list.length > 0 ? (view.badges.station > 0 ? 'Posten voll' : 'Handelsposten') : 'Posten bauen'}</span>
          <span className="tile__value">{view.posts.list.length > 0 ? num(view.posts.stored) : '+'}</span>
        </button>
        <div className="tile">
          <span className="tile__icon"><IconFuel /></span>
          <span className="tile__label">{view.fuel.nextAt ? `+1 in ${countdown(view.fuel.nextAt - now)}` : 'Treibstoff'}</span>
          <span className="pips">
            {Array.from({ length: view.fuel.max }, (_, i) => <i key={i} className={i < view.fuel.amount ? 'on' : ''} />)}
          </span>
        </div>
        <button className={`tile${view.badges.hangar > 0 ? ' tile--ready' : ''}`} onClick={go('hangar')}>
          <span className="tile__icon"><IconHangar /></span>
          <span className="tile__label">{view.badges.hangar > 0 ? 'Container bereit' : 'Gratis-Container'}</span>
          <span className="tile__value">{view.badges.hangar > 0 ? view.badges.hangar : view.crates.free.nextAt ? countdown(view.crates.free.nextAt - now) : '0'}</span>
        </button>
      </div>

      <button className="cta" onClick={() => { audio.tap(); openRoutes(true); }}>
        <span>Route wählen</span>
        <small>{view.routes.length} Ziele in Reichweite</small>
      </button>
    </section>
  );
}
