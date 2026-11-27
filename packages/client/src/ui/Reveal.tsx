import { CARD_BY_ID, rarityRank, type Pull } from '@nova/core';
import { useEffect, useMemo, useState } from 'react';
import { audio, type Rank } from '../audio/engine.ts';
import { haptic } from '../native/haptics.ts';
import { stage } from '../stage/index.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { seatUpgrades } from './crew.ts';
import { HoloCard } from './HoloCard.tsx';
import { num, RARITY_LABEL, RARITY_RGB } from './format.ts';
import { Shard } from './icons.tsx';
import { vfx } from './VfxCanvas.tsx';

const rgbHex = (rgb: readonly [number, number, number]): string =>
  `rgb(${rgb.map((c) => Math.round(c * 255)).join(', ')})`;

type Phase = 'crate' | 'crack' | 'charge' | 'tell' | 'bump' | 'flip' | 'show' | 'leave' | 'summary';

/** The crate takes three knocks. Left alone it knocks itself, so nobody is stuck in front of it. */
const KNOCKS = 3;
const KNOCK_MS = 1000;
/** The lid blows off: flash, shock ring, light column. */
const BURST_MS = 850;
/** A card rises face down out of the crate. */
const RISE_MS = 560;
/** Higher rarities hold the tension longer before the card turns. */
const TELL_MS = [420, 700, 1100, 1900, 2600];
const FLIP_MS = 230;
const LEAVE_MS = 240;

const spray = (n: number, near: number, far: number): { angle: number; dist: number; delay: number }[] =>
  Array.from({ length: n }, (_, i) => ({ angle: (i / n) * 360 + Math.random() * 20, dist: near + Math.random() * far, delay: Math.random() * 120 }));

/**
 * Presentation only. The pulls were decided by the game service before this
 * component mounted. Nothing here can change or hint at a different outcome:
 * every crate takes the same knocks and bursts the same way, the light on a
 * card's back is its real rarity, and then the real card turns over.
 */
export function Reveal({ pulls }: { pulls: Pull[] }) {
  const close = useApp((s) => s.closeReveal);
  const send = useApp((s) => s.send);
  const busy = useApp((s) => s.busy);
  // After a crate the reserve may hold someone better than who sits on the bridge.
  const gain = Object.values(seatUpgrades(useApp((s) => s.view)!)).reduce((a, b) => a + (b ?? 0), 0);
  const tier = useApp((s) => s.revealCrate);
  const closed = tier ? art('crates', tier) : undefined;
  const opened = tier ? art('crates', `${tier}-open`) ?? closed : undefined;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(closed ? 'crate' : 'charge');
  const [knocks, setKnocks] = useState(0);
  const pull = pulls[index]!;
  const card = CARD_BY_ID.get(pull.cardId)!;
  const rank = rarityRank(pull.rarity) as Rank;
  // What the light shows right now: with an upgrade moment first the rarity that was rolled, then the real one.
  const hidden = phase === 'crate' || phase === 'crack' || phase === 'charge';
  const shown = hidden ? null : phase === 'tell' && pull.upgradedFrom ? pull.upgradedFrom : pull.rarity;
  const epic = rank >= 3;

  const sparks = useMemo(() => spray(12 + rank * 8, 90, 150 + rank * 30), [index, rank]);
  const debris = useMemo(() => spray(22, 60, 240), []);
  const rain = useMemo(() => Array.from({ length: epic ? 28 : 0 }, () => ({ left: Math.random() * 100, delay: Math.random() * 1.6, dur: 1.4 + Math.random() * 1.4, size: 2 + Math.random() * 3 })), [index, epic]);

  useEffect(() => {
    audio.duck(true);
    return () => { audio.duck(false); stage.setRift(null, 0); };
  }, []);

  const knock = (): void => {
    if (knocks + 1 >= KNOCKS) { setPhase('crack'); return; }
    // Same sound, same light for every crate: the knocks say nothing about what is inside.
    audio.tell(knocks as Rank);
    haptic(knocks === 0 ? 'reveal0' : 'reveal1');
    stage.pulse(0.12 + knocks * 0.08);
    vfx.burst(window.innerWidth / 2, window.innerHeight * 0.52, '#7ce8ff', 14 + knocks * 10, { speed: 180 + knocks * 70, size: 2.6 });
    setKnocks(knocks + 1);
  };

  useEffect(() => {
    let timer = 0;
    const after = (ms: number, next: Phase): void => { timer = window.setTimeout(() => setPhase(next), ms); };
    if (phase === 'crate') {
      stage.setRift(null, 0);
      if (knocks === 0) { audio.riser(0.35); window.setTimeout(() => { stage.pulse(0.22); haptic('coins'); }, 330); }
      timer = window.setTimeout(knock, knocks === 0 ? KNOCK_MS + 350 : KNOCK_MS);
    } else if (phase === 'crack') {
      stage.pulse(0.75);
      stage.setRift([0.75, 0.85, 1], 0.5);
      vfx.ring(window.innerWidth / 2, window.innerHeight * 0.52, '#a8e8ff', 260);
      vfx.burst(window.innerWidth / 2, window.innerHeight * 0.52, '#ffd27a', 46, { speed: 340, size: 3.6 });
      audio.warp(0.55);
      audio.reveal(1);
      after(BURST_MS, 'charge');
    } else if (phase === 'charge') {
      stage.setRift([0.75, 0.85, 1], 0.4);
      audio.riser((RISE_MS + TELL_MS[rank]!) / 1000);
      after(RISE_MS, 'tell');
    } else if (phase === 'tell') {
      const first = pull.upgradedFrom ?? pull.rarity;
      stage.setRift(RARITY_RGB[first], pull.upgradedFrom ? 0.8 : 1);
      audio.tell(rarityRank(first) as Rank);
      if (epic && !pull.upgradedFrom) haptic('warn');
      after(pull.upgradedFrom ? 750 : TELL_MS[rank]!, pull.upgradedFrom ? 'bump' : 'flip');
    } else if (phase === 'bump') {
      const color = rgbHex(RARITY_RGB[pull.rarity]);
      stage.setRift(RARITY_RGB[pull.rarity], 1);
      stage.pulse(0.35);
      vfx.implode(window.innerWidth / 2, window.innerHeight * 0.46, color, 32);
      window.setTimeout(() => {
        vfx.ring(window.innerWidth / 2, window.innerHeight * 0.46, color, 240);
        vfx.burst(window.innerWidth / 2, window.innerHeight * 0.46, color, 42, { speed: 310, size: 3.5 });
      }, 240);
      audio.tell(rank);
      haptic('reveal1');
      after(TELL_MS[rank]!, 'flip');
    } else if (phase === 'flip') {
      after(FLIP_MS, 'show');
    } else if (phase === 'show') {
      const color = rgbHex(RARITY_RGB[pull.rarity]);
      stage.setRift(RARITY_RGB[pull.rarity], 0.62);
      stage.pulse(0.35 + rank * 0.16);
      vfx.burst(window.innerWidth / 2, window.innerHeight * 0.46, color, 18 + rank * 12, { speed: 240 + rank * 40, size: 3.0 + rank * 0.4 });
      if (epic) vfx.embers(color, 36);
      audio.reveal(rank);
    } else if (phase === 'leave') {
      timer = window.setTimeout(() => {
        if (index + 1 < pulls.length) { setIndex(index + 1); setPhase('charge'); } else setPhase('summary');
      }, LEAVE_MS);
    } else {
      stage.setRift(null, 0);
    }
    return () => window.clearTimeout(timer);
  }, [phase, index, knocks, pull.rarity, rank]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = (): void => {
    if (phase === 'crate') { knock(); return; }
    // The burst is short and the same for everyone: it plays out.
    if (phase === 'crack' || phase === 'leave') return;
    if (phase === 'charge' || phase === 'tell' || phase === 'bump' || phase === 'flip') { setPhase('show'); return; }
    if (phase === 'show') { audio.tap(); setPhase('leave'); }
  };

  if (phase === 'summary') {
    const shards = pulls.reduce((s, p) => s + p.shards, 0);
    // The best card of the crate stands out. Ties go to the first.
    const best = pulls.reduce((b, p, i) => (rarityRank(p.rarity) > rarityRank(pulls[b]!.rarity) ? i : b), 0);
    return (
      <div className="overlay overlay--dim reveal reveal--summary">
        <h3 className="reveal__title">Inhalt</h3>
        <div className="reveal__row">
          {pulls.map((p, i) => (
            <div key={i} className={`reveal__slot${i === best ? ' is-best' : ''}`} style={{ animationDelay: `${i * 90}ms`, ['--rar' as string]: `rgb(${RARITY_RGB[p.rarity].map((c) => Math.round(c * 255)).join(' ')})` }}>
              <HoloCard card={CARD_BY_ID.get(p.cardId)!} size="sm" />
              {p.isNew ? <span className="badge badge--new">Neu</span> : <span className="badge"><Shard />+{num(p.shards)}</span>}
            </div>
          ))}
        </div>
        {shards > 0 && <p className="reveal__shards">Doppelte Karten: +{num(shards)} Splitter</p>}
        {gain > 0 && (
          <button className="cta cta--gold" disabled={busy} onClick={() => { audio.tap(); void send({ type: 'AutoDeck' }).then(close); }}>
            <span>Crew neu aufstellen</span>
            <small>Deine Brücke wird stärker: +{gain}</small>
          </button>
        )}
        <button className={`cta${gain > 0 ? ' cta--ghost' : ''}`} onClick={() => { audio.tap(); close(); }}><span>Weiter</span></button>
      </div>
    );
  }

  const waiting = phase === 'charge' || phase === 'tell' || phase === 'bump' || phase === 'flip';
  const faceUp = phase === 'show' || phase === 'leave';
  const left = pulls.length - index - (faceUp ? 1 : 0);

  return (
    <div
      className={`overlay reveal reveal--${phase} reveal--${tier ?? 'none'}${shown ? ` reveal--${shown}` : ''}${epic && !hidden && !(phase === 'tell' && pull.upgradedFrom) ? ' is-epic' : ''}`}
      style={{ ['--heat' as string]: knocks / (KNOCKS - 1) }}
      onClick={advance}
    >
      {phase !== 'crate' && phase !== 'crack' && (
        <div className="reveal__count" aria-label={`Karte ${index + 1} von ${pulls.length}`}>
          <span className="reveal__left">{Array.from({ length: pulls.length }, (_, i) => <i key={i} className={i < pulls.length - left ? 'is-out' : ''} />)}</span>
          {index + 1} / {pulls.length}
        </div>
      )}

      {/* The crate: drops in, takes its knocks, bursts, then stays below as the source of the cards. */}
      {closed && (
        <div className="reveal__box">
          <div className="reveal__leak" />
          {phase !== 'crate' && <div className="reveal__beam" />}
          <img key={phase === 'crate' ? `k${knocks}` : 'open'} className="reveal__crate" src={phase === 'crate' ? closed : opened} alt="" draggable={false} />
          {phase === 'crate' && knocks === 0 && <div className="reveal__impact" />}
        </div>
      )}
      {phase === 'crack' && (
        <>
          <div className="reveal__flash" />
          <div className="reveal__ring" />
          <div className="sparks sparks--debris">
            {debris.map((s, i) => <i key={i} style={{ ['--a' as string]: `${s.angle}deg`, ['--d' as string]: `${s.dist}px`, animationDelay: `${s.delay}ms` }} />)}
          </div>
        </>
      )}

      {waiting && (
        <div className={`cardback${phase === 'flip' ? ' is-turning' : ''}`} key={`back${index}`}>
          <div className="cardback__face"><span className="cardback__mark" /></div>
        </div>
      )}
      {phase === 'bump' && <div className="reveal__tell reveal__tell--bump" key="bump"><small>Aufgewertet</small>{RARITY_LABEL[pull.rarity]}</div>}

      {faceUp && (
        <>
          <div className="reveal__rays" />
          {rank >= 1 && <div className="reveal__banner" key={`banner${index}`}>{RARITY_LABEL[pull.rarity]}</div>}
          {phase === 'show' && (
            <div className="sparks">
              {sparks.map((s, i) => (
                <i key={i} style={{ ['--a' as string]: `${s.angle}deg`, ['--d' as string]: `${s.dist}px`, animationDelay: `${s.delay}ms` }} />
              ))}
            </div>
          )}
          {epic && <div className="rain">{rain.map((r, i) => <i key={i} style={{ left: `${r.left}%`, width: r.size, height: r.size * 3, animationDelay: `${r.delay}s`, animationDuration: `${r.dur}s` }} />)}</div>}
          <div className={`reveal__card${phase === 'leave' ? ' is-leaving' : ''}`} key={index}>
            <HoloCard card={card} interactive />
          </div>
          <div className="reveal__tag">
            {pull.isNew ? <span className="badge badge--new">Neu in der Sammlung</span> : <span className="badge"><Shard />Duplikat · +{num(pull.shards)} Splitter</span>}
          </div>
        </>
      )}
      <p className="overlay__hint">{phase === 'crate' ? 'Tippen zum Aufbrechen' : phase === 'show' ? 'Tippen für weiter' : phase === 'crack' || phase === 'leave' ? '' : 'Tippen zum Überspringen'}</p>
    </div>
  );
}
