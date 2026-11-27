import { courseFuel, FACTIONS, GOOD_BY_ID, STATION_BY_ID, courseTo } from '@nova/core';
import type { ReactNode } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, FACTION_COLOR, num } from './format.ts';
import { useServerNow } from './hooks.ts';
import { IconAlert, IconFuel, IconHangar, IconMarket, IconOrder } from './icons.tsx';
import { art } from './art.ts';
import { Emblem } from './Emblem.tsx';
import { jumps, orderState, orderStatus } from './Orders.tsx';
import { crisisLine } from './RouteSheet.tsx';
import { ShipArt } from './Shipyard.tsx';
import { SpendButton } from './Spend.tsx';
import { useFresh, useUnlocks } from './unlocks.ts';

const CUSTOMS = ['Kein Zoll', 'Zoll lax', 'Zoll wachsam', 'Zoll streng'];

export function Hub() {
  const view = useApp((s) => s.view)!;
  const unlocks = useUnlocks();
  const fresh = useFresh();
  const setTab = useApp((s) => s.setTab);
  const setHangarMode = useApp((s) => s.setHangarMode);
  const openRoutes = useApp((s) => s.setRoutesOpen);
  const send = useApp((s) => s.send);
  const setSheet = useApp((s) => s.setSheet);
  const stars = view.wanted[STATION_BY_ID.get(view.location)!.faction];
  const course = useApp((s) => s.course);
  const setCourse = useApp((s) => s.setCourse);
  const way = course && course !== view.location ? courseTo(view.location, course) : [];
  const now = useServerNow();
  const station = STATION_BY_ID.get(view.location)!;

  // What needs attention sits at the edge as a symbol with a mark. The details come after a tap.
  const { orders } = view;
  const ready = orders.active.find((o) => o.here && o.have >= o.qty);
  const urgent = ready ?? [...orders.active].sort((a, b) => (a.left - a.hops) - (b.left - b.hops))[0];
  const far = view.events.filter((e) => e.stationId !== view.location);
  const rail: { key: string; tone: string; icon: ReactNode; label: string; mark: string; say: string; go: () => void }[] = [];
  if (urgent || orders.offers.length > 0) {
    rail.push({
      key: 'orders',
      tone: ready ? 'ready' : urgent ? orderState(urgent) : 'ok',
      icon: <IconOrder />,
      label: ready ? 'Liefern' : urgent ? jumps(urgent.left) : 'Fracht',
      mark: ready ? '!' : urgent ? '' : String(orders.offers.length),
      say: ready ? `Lieferung bereit: ${ready.qty} × ${GOOD_BY_ID.get(ready.goodId)!.name}`
        : urgent ? `Lieferauftrag ${STATION_BY_ID.get(urgent.to)!.name}: ${orderStatus(urgent)}`
          : `Frachtbörse: ${orders.offers.length} Lieferaufträge`,
      go: () => setSheet('orders'),
    });
  }
  if (view.events.length > 0) {
    rail.push({
      key: 'crisis',
      tone: 'crisis',
      icon: <IconAlert />,
      label: view.events.length === 1 ? view.events[0]!.name : 'Krisen',
      mark: view.events.length > 1 ? String(view.events.length) : '',
      say: view.events.map((e) => `${e.name} auf ${STATION_BY_ID.get(e.stationId)!.name}: ${crisisLine(e)}`).join('. '),
      go: () => { if (far.length === 1 && !course) setCourse(far[0]!.stationId); openRoutes(true); },
    });
  }
  if (view.salvage && unlocks.salvage) rail.push({ key: 'salvage', tone: 'salvage', icon: <IconHangar />, label: 'Bergung', mark: '', say: `Bergungs-Auktion am Dock für ${num(view.salvage.price)} Credits`, go: () => setSheet('salvage') });
  const own: typeof rail = [{
    key: 'crates',
    tone: view.badges.hangar > 0 ? 'ready' : 'idle',
    icon: <IconHangar />,
    label: view.badges.hangar > 0 ? 'Container' : view.crates.free.nextAt ? countdown(view.crates.free.nextAt - now) : 'Container',
    mark: view.badges.hangar > 0 ? String(view.badges.hangar) : '',
    say: view.badges.hangar > 0 ? `${view.badges.hangar} Container bereit` : 'Zum Hangar',
    go: () => { setHangarMode('crates'); setTab('hangar'); },
  }];
  if (unlocks.posts) {
    const full = view.badges.station > 0;
    own.push({
      key: 'posts',
      tone: full ? 'ready' : fresh('posts') ? 'new' : 'idle',
      icon: <IconMarket />,
      label: view.posts.list.length > 0 ? num(view.posts.stored) : fresh('posts') ? 'Neu' : 'Posten',
      mark: full ? '!' : '',
      say: view.posts.list.length > 0 ? `Handelsposten: ${num(view.posts.stored)} Credits im Lager${full ? ', Lager voll' : ''}` : 'Handelsposten bauen',
      go: () => setSheet('posts'),
    });
  }
  // One status at a time next to the customs level: the most pressing wins.
  const streakAtRisk = view.streak.count > 0 && view.streak.status === 'atRisk';

  const stationArt = art('stations', view.location);
  const paint = view.captain.paints.find((p) => p.id === view.captain.paint)?.tone ?? null;
  const empty = view.cargo.used === 0;
  // The best thing on board and where it sells: the answer to "where should I go".
  const best = view.routes
    .flatMap((r) => r.hints.filter((h) => view.cargo.items[h.goodId]).map((h) => ({ stationId: r.stationId, goodId: h.goodId, pct: Math.round(h.pct * 100) })))
    .sort((a, b) => b.pct - a.pct)[0];
  // A new captain gets four steps, one at a time. Each is read from what they have done so far.
  const made = view.stats.profit > 0;
  const steps = made || view.profile.level > 3 ? null
    : view.crates.opened === 0 ? { done: 0, text: 'Öffne deinen Gratis-Container: Darin ist deine erste Crew', go: () => setTab('hangar') }
      : view.stats.jumps === 0 && empty ? { done: 1, text: 'Kauf günstige Ware auf dem Markt', go: () => setTab('market') }
        : empty ? { done: 3, text: 'Kauf wieder ein und verkauf anderswo teurer', go: () => setTab('market') }
          : view.stats.jumps === 0 ? { done: 2, text: 'Wähle eine Route und spring', go: () => openRoutes(true) }
            : { done: 3, text: 'Verkauf deine Fracht hier oder spring weiter', go: () => setTab('market') };

  return (
    <section className="hub" style={{ ['--faction' as string]: FACTION_COLOR[station.faction] }}>
      <header className="hub__loc">
        <span className="eyebrow"><Emblem faction={station.faction} />{FACTIONS[station.faction].name} · {station.tagline}</span>
        <h1>{station.name}</h1>
        <div className="chips">
          <span className={`chip ${station.customs >= 2 ? 'chip--hot' : 'chip--ok'}`}>{CUSTOMS[station.customs]}</span>
          {stars > 0 && view.payOff !== null ? (
            <SpendButton className="chip chip--wanted" onSpend={() => void send({ type: 'PayOff' })} confirm={<>{num(view.payOff)} Credits zahlen? Tippe noch einmal</>}>
              Fahndung {'★'.repeat(stars)} · Freikaufen {num(view.payOff)}
            </SpendButton>
          ) : streakAtRisk && unlocks.daily ? (
            <button className={`chip chip--streak chip--${view.streak.endsAt - now >= 3 * 3_600_000 ? 'open' : 'atRisk'}`} onClick={() => { audio.tap(); setTab('daily'); }}>
              Serie {view.streak.count} · endet in {countdown(view.streak.endsAt - now)}
            </button>
          ) : view.weekend.active && unlocks.daily ? (
            <button className="chip chip--event" onClick={() => { audio.tap(); setTab('daily'); }}>
              Blockade-Lauf · {view.weekend.points} Punkte
            </button>
          ) : null}
        </div>
      </header>

      <div className={`hub__stage${stationArt ? ' has-station' : ''}`}>
        {/* Atmospheric depth haze + orbital traffic so station and ship sit in one unified space. */}
        {stationArt && <div className="hub__haze" aria-hidden="true" />}
        {stationArt && (
          <div className="hub__traffic" aria-hidden="true">
            <i /><i /><i />
          </div>
        )}
        {/* The place you are at, and your ship docked in front of it. */}
        {stationArt && <img key={view.location} className="hub__station" src={stationArt} alt="" draggable={false} />}
        {stationArt && <span className="hub__tether" aria-hidden="true" />}
        <button className="hub__dock" aria-label={unlocks.yard ? 'Zur Werft' : 'Dein Schiff'} onClick={() => { if (!unlocks.yard) return; audio.tap(); setHangarMode('yard'); setTab('hangar'); }}>
          <ShipArt id={view.fleet.active} paint={paint} view={stationArt ? 'rear' : 'top'} mode="dock" />
        </button>
        {/* Left: what you own and collect. Right: what the sector asks of you. */}
        <div className="rail rail--left">
          {own.map((r) => (
            <button key={r.key} className={`rail__btn rail__btn--${r.key} rail__btn--${r.tone}`} aria-label={r.say} onClick={() => { audio.tap(); r.go(); }}>
              <span className="rail__icon">{r.icon}{r.mark && <i>{r.mark}</i>}</span>
              <small>{r.label}</small>
            </button>
          ))}
        </div>
        {rail.length > 0 && (
          <div className="rail">
            {rail.map((r) => (
              <button key={r.key} className={`rail__btn rail__btn--${r.key} rail__btn--${r.tone}`} aria-label={r.say} onClick={() => { audio.tap(); r.go(); }}>
                <span className="rail__icon">{r.icon}{r.mark && <i>{r.mark}</i>}</span>
                <small>{r.label}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {steps && (
        <button className="coach" onClick={() => { audio.tap(); steps.go(); }}>
          <span className="eyebrow">Erste Schritte · {steps.done} von 4</span>
          <b>{steps.text}</b>
          <span className="coach__pips">{[0, 1, 2, 3].map((i) => <i key={i} className={i < steps.done ? 'on' : i === steps.done ? 'now' : ''} />)}</span>
        </button>
      )}

      {/* The tank in one line: how far you can go, and when the next unit comes. */}
      <div className="fuelline" aria-label={`Tank ${view.fuel.amount} von ${view.fuel.max}`}>
        <IconFuel />
        <span className="pips">{Array.from({ length: view.fuel.max }, (_, i) => <i key={i} className={i < view.fuel.amount ? 'on' : ''} />)}</span>
        <small>{view.fuel.nextAt ? `+1 in ${countdown(view.fuel.nextAt - now)}` : 'Tank voll'}</small>
      </div>

      {ready ? (
        <button className="cta cta--gold" onClick={() => { audio.tap(); void send({ type: 'DeliverOrder', id: ready.id }); }}>
          <span>Abliefern</span>
          <small>{ready.qty} × {GOOD_BY_ID.get(ready.goodId)!.name} · {num(ready.total)} Credits</small>
        </button>
      ) : steps && steps.done === 0 ? (
        <button className="cta cta--gold" onClick={() => { audio.tap(); setHangarMode('crates'); setTab('hangar'); }}>
          <span>Gratis-Container öffnen</span>
          <small>Deine erste Crew wartet</small>
        </button>
      ) : empty ? (
        <>
          <button className="cta" onClick={() => { audio.tap(); setTab('market'); }}>
            <span>Fracht kaufen</span>
            <small>Laderaum leer</small>
          </button>
          <button className="link hub__skip" onClick={() => { audio.tap(); openRoutes(true); }}>Ohne Fracht springen</button>
        </>
      ) : (
        <button className="cta" onClick={() => { audio.tap(); openRoutes(true); }}>
          <span>{way.length > 0 ? `Weiter nach ${STATION_BY_ID.get(way[0]!)!.name}` : 'Sternkarte'}</span>
          <small>
            {way.length > 1 ? `Kurs ${STATION_BY_ID.get(course!)!.name} · ${jumps(way.length)}, ${courseFuel(view.location, way)} Treibstoff`
              : best ? `${GOOD_BY_ID.get(best.goodId)!.name} +${best.pct} % auf ${STATION_BY_ID.get(best.stationId)!.name}` : `${view.routes.length} Ziele in Reichweite`}
          </small>
        </button>
      )}
    </section>
  );
}
