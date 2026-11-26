import { CONFIG, FACTIONS, STATION_BY_ID, type Reward, type SalvageKind } from '@nova/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { countdown, duration, FACTION_COLOR, num, rewardText } from './format.ts';
import { useServerNow } from './hooks.ts';
import { Credits, Quanta } from './icons.tsx';
import { CloseX, SpendButton } from './Spend.tsx';

// ---------------------------------------------------------------------------
// Trading posts
// ---------------------------------------------------------------------------

export function PostSheet() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const close = useApp((s) => s.setSheet);
  const now = useServerNow();
  const here = STATION_BY_ID.get(view.location)!;
  const { list, next, stored } = view.posts;
  const hereBuilding = list.some((p) => p.stationId === view.location && p.readyAt !== null);

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(null)}>
      <div className="sheet sheet--trade posts" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => close(null)} />
        <span className="eyebrow">Passives Einkommen</span>
        <h3>Handelsposten</h3>
        <p className="trade__note">Posten verdienen, während du weg bist. Nach {CONFIG.posts.storageHours} Stunden ist ihr Lager voll, dann verdienen sie nichts mehr.</p>
        <div className="picker__list">
          {list.length === 0 && <p className="trade__note">Noch kein Posten. Baue den ersten hier auf {here.name}.</p>}
          {list.map((p) => {
            const st = STATION_BY_ID.get(p.stationId)!;
            const full = p.readyAt === null && p.stored >= p.cap;
            return (
              <div key={p.stationId} className={`post${full ? ' is-full' : ''}`} style={{ ['--faction' as string]: FACTION_COLOR[st.faction] }}>
                <div className="post__main">
                  <b>{st.name} <small>Stufe {p.level}</small></b>
                  <div className="mission__bar"><i style={{ width: `${(p.stored / p.cap) * 100}%` }} /></div>
                  <small>
                    {p.readyAt !== null ? `Im Bau: noch ${countdown(p.readyAt - now)}`
                      : full ? `Lager voll: ${num(p.stored)} · verdient nichts mehr`
                        : `${num(p.stored)} / ${num(p.cap)} · +${num(p.perHour)} pro Stunde${p.fullAt ? ` · voll in ${countdown(p.fullAt - now)}` : ''}`}
                  </small>
                </div>
                {p.readyAt !== null && (
                  <SpendButton className="mission__btn mission__btn--plain post__rush" disabled={busy || view.wallet.quanta < p.speedUpCost} onSpend={() => void send({ type: 'SpeedUpPost', stationId: p.stationId })} confirm={<><Quanta />{p.speedUpCost}<small>ausgeben?</small></>}>
                    {p.speedUpCost > 0 ? <><Quanta />{p.speedUpCost}</> : 'Gratis'}<small>sofort</small>
                  </SpendButton>
                )}
              </div>
            );
          })}
        </div>
        <div className="trade__actions">
          <button className="cta cta--gold" disabled={busy || stored < 1} onClick={() => { audio.tap(); void send({ type: 'CollectPosts' }); }}>
            <span>Abholen</span>
            <small>{num(stored)} Credits</small>
          </button>
          <button className="cta" disabled={busy || !next || hereBuilding || view.wallet.credits < (next?.cost ?? 0)} onClick={() => { audio.tap(); void send({ type: 'BuildPost' }); }}>
            <span>{next ? (next.level === 1 ? 'Bauen' : 'Ausbauen') : 'Maximal'}</span>
            <small>{next ? `${here.name} · ${num(next.cost)} · +${num(next.perHour)}/Std. · ${duration(next.buildMs)}` : here.name}</small>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wheel
// ---------------------------------------------------------------------------

/** One colour per kind of prize. Credit prizes go from dim to bright with their size. */
/** Colour is saved for the prizes worth looking at. Everything else is one of two quiet blues. */
function segmentColor(r: Reward, all: readonly Reward[], index = 0): string {
  if (r.crate === 'premium') return '#ffc24a';
  if (r.crate) return '#3be3ff';
  const credits = all.map((x) => x.credits ?? 0).filter((c) => c > 0).sort((x, y) => x - y);
  if (r.credits && r.credits === credits[credits.length - 1] && credits.length > 1) return '#ff4fa3';
  if (r.quanta && r.quanta >= 20) return '#7fb6ff';
  return index % 2 ? '#1a2a4a' : '#101c36';
}

const shortReward = (r: Reward): string =>
  r.crate === 'premium' ? 'Premium' : r.crate ? 'Container' : r.quanta ? `${r.quanta} Q` : r.shards ? `${r.shards} Spl.` : num(r.credits ?? 0);

/**
 * The wheel is a playback device. The prize is drawn by the game service when
 * the spin is requested. Segment sizes are proportional to the real odds, so
 * what you see is what you get.
 */
export function WheelSheet() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const result = useApp((s) => s.wheel);
  const close = useApp((s) => s.setSheet);
  const { segments, available } = view.daily.wheel;
  const total = segments.reduce((a, s) => a + s.weight, 0);
  const rewards = segments.map((s) => s.reward);
  const [angle, setAngle] = useState(0);
  const [landed, setLanded] = useState(false);

  const arcs = useMemo(() => {
    let at = 0;
    return segments.map((s) => {
      const from = at;
      at += (s.weight / total) * 360;
      return { ...s, from, to: at, mid: (from + at) / 2 };
    });
  }, [segments, total]);

  const disc = useRef<SVGSVGElement>(null);
  // While it turns, every field that passes the pointer ticks, slower and slower.
  useEffect(() => {
    if (!result || landed) return;
    let raf = 0;
    let last = -1;
    const bounds = arcs.map((a) => a.from);
    const step = (): void => {
      const m = disc.current ? new DOMMatrixReadOnly(getComputedStyle(disc.current).transform) : null;
      if (m) {
        // The angle under the pointer at the top is the negative of the disc's own rotation.
        const under = ((-Math.atan2(m.b, m.a) * 180) / Math.PI + 360) % 360;
        const field = bounds.filter((b) => b <= under).length;
        if (last !== -1 && field !== last) audio.tick();
        last = field;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [result, landed, arcs]);

  useEffect(() => {
    if (!result) return;
    // Five full turns, then stop with the winning segment under the pointer at the top.
    setAngle(360 * 5 + (360 - arcs[result.index]!.mid));
    audio.riser(3.6);
    const t = window.setTimeout(() => { setLanded(true); audio.reveal(result.reward.crate === 'premium' ? 4 : result.reward.crate ? 3 : 1); }, 3900);
    return () => window.clearTimeout(t);
  }, [result, arcs]);

  const point = (deg: number, r: number): string => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(100 + r * Math.cos(rad)).toFixed(2)} ${(100 + r * Math.sin(rad)).toFixed(2)}`;
  };

  return (
    <div className="overlay overlay--dim" onClick={() => { if (!result || landed) close(null); }}>
      <div className="wheel" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => { if (!result || landed) close(null); }} />
        <span className="eyebrow">Einmal pro Tag</span>
        <h3>Glücksrad</h3>
        <div className="wheel__stage">
          <div className="wheel__pointer" />
          <svg ref={disc} viewBox="0 0 200 200" className="wheel__disc" style={{ transform: `rotate(${angle}deg)` }}>
            {arcs.map((a, i) => (
              <g key={i}>
                <path className={landed && result ? (i === result.index ? 'is-won' : 'is-lost') : ''} d={`M100 100 L${point(a.from, 90)} A90 90 0 ${a.to - a.from > 180 ? 1 : 0} 1 ${point(a.to, 90)} Z`} fill={segmentColor(a.reward, rewards, i)} stroke="#050912" strokeWidth="1" />
                {/* Labels run from hub to rim and are turned so that none stands on its head. */}
                {a.to - a.from >= 14 && (a.mid <= 180
                  ? <text x="128" y="103" transform={`rotate(${a.mid - 90} 100 100)`} textAnchor="start" className="wheel__label">{shortReward(a.reward)}</text>
                  : <text x="72" y="103" transform={`rotate(${a.mid + 90} 100 100)`} textAnchor="end" className="wheel__label">{shortReward(a.reward)}</text>)}
              </g>
            ))}
            <circle cx="100" cy="100" r="16" fill="#050912" stroke="#ffc24a" strokeWidth="2" />
          </svg>
          <div className={`wheel__rim${result && !landed ? ' is-spinning' : ''}`} />
        </div>
        {landed && result ? (
          <div className="wheel__result">
            <small>Gewonnen</small>
            <b>{rewardText(result.reward)}</b>
            <button className="cta cta--ghost" onClick={() => close(null)}><span>Weiter</span></button>
          </div>
        ) : (
          <button className="cta cta--gold" disabled={busy || !available || !!result} onClick={() => { audio.tap(); void send({ type: 'SpinWheel' }); }}>
            <span>{result ? 'Dreht …' : available ? 'Drehen' : 'Morgen wieder'}</span>
          </button>
        )}
        <ul className="wheel__odds">
          {arcs.map((a, i) => (
            <li key={i}><i style={{ background: segmentColor(a.reward, rewards, i) }} />{rewardText(a.reward)}<b>{((a.weight / total) * 100).toFixed(0)} %</b></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salvage
// ---------------------------------------------------------------------------

const SALVAGE_NAME: Record<SalvageKind, string> = {
  scrap: 'Schrott',
  credits: 'Verwertbare Fracht',
  jackpot: 'Volltreffer',
  shards: 'Splitter',
  crate: 'Container',
  premium: 'Premium-Container',
};
const WEIGHT = ['Leicht', 'Mittel', 'Schwer'];

export function SalvageSheet() {
  const view = useApp((s) => s.view)!;
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  const result = useApp((s) => s.salvageResult);
  const close = useApp((s) => s.setSheet);
  // Keep showing the lot after it is gone from the view, so the result has context.
  const [lot] = useState(view.salvage);
  if (!lot) return null;
  const total = lot.outcomes.reduce((a, o) => a + o.weight, 0);
  const payout = (o: { kind: SalvageKind; credits: number; shards: number }): string =>
    o.kind === 'crate' ? '1 Container' : o.kind === 'premium' ? '1 Premium-Container' : o.shards ? `${num(o.shards)} Splitter` : `${num(o.credits)} Credits`;
  const good = result && result.kind !== 'scrap';

  return (
    <div className="overlay overlay--dim overlay--bottom" onClick={() => close(null)}>
      <div className="sheet sheet--trade salvage" onClick={(e) => e.stopPropagation()}>
        <CloseX onClick={() => close(null)} />
        <span className="eyebrow">Bergungs-Auktion</span>
        <h3>Versiegelter Wrack-Container</h3>
        <p className="trade__note">Gewicht: {WEIGHT[lot.weight]} · Herkunft: {FACTIONS[lot.origin].name}. Was drin ist, weiss niemand. Die Quoten stehen unten.</p>
        {result ? (
          <div className={`salvage__result ${good ? 'is-win' : 'is-loss'}`}>
            <small>{good ? 'Im Container' : 'Leider nur'}</small>
            <b>{SALVAGE_NAME[result.kind]}</b>
            <span>{payout(result)}</span>
          </div>
        ) : null}
        <table>
          <tbody>
            {lot.outcomes.map((o) => (
              <tr key={o.kind} className={result?.kind === o.kind ? 'is-hit' : ''}>
                <td>{SALVAGE_NAME[o.kind]}</td>
                <td>{payout(o)}</td>
                <td>{((o.weight / total) * 100).toFixed(0)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result ? (
          <button className="cta cta--ghost" onClick={() => close(null)}><span>Schliessen</span></button>
        ) : (
          <button className="cta cta--gold" disabled={busy || view.wallet.credits < lot.price} onClick={() => { audio.tap(); void send({ type: 'BuySalvage' }); }}>
            <span>Ersteigern <i className="price"><Credits />{num(lot.price)}</i></span>
            <small>{view.wallet.credits < lot.price ? 'Zu wenig Credits' : 'Im Schnitt kommen weniger Credits zurück, als du zahlst'}</small>
          </button>
        )}
      </div>
    </div>
  );
}
