import { CARD_BY_ID, rarityRank, type Pull } from '@nova/core';
import { useEffect, useMemo, useState } from 'react';
import { audio, type Rank } from '../audio/engine.ts';
import { stage } from '../stage/index.ts';
import { useApp } from '../store.ts';
import { art } from './art.ts';
import { HoloCard } from './HoloCard.tsx';
import { num, RARITY_LABEL, RARITY_RGB } from './format.ts';
import { Shard } from './icons.tsx';

type Phase = 'crate' | 'crack' | 'charge' | 'tell' | 'bump' | 'show' | 'summary';

/** The crate shakes harder and harder, then breaks open. */
const CRATE_MS = 1150;
const CRACK_MS = 520;

const CHARGE_MS = 900;
/** Higher rarities hold the tension longer before the card lands. */
const TELL_MS = [450, 650, 950, 1400, 2000];


/**
 * Presentation only. The pulls were decided by the game service before this
 * component mounted. Nothing here can change or hint at a different outcome:
 * the rift shows the real rarity, then the real card.
 */
export function Reveal({ pulls }: { pulls: Pull[] }) {
  const close = useApp((s) => s.closeReveal);
  const tier = useApp((s) => s.revealCrate);
  const closed = tier ? art('crates', tier) : undefined;
  const opened = tier ? art('crates', `${tier}-open`) ?? closed : undefined;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(closed ? 'crate' : 'charge');
  const pull = pulls[index]!;
  const card = CARD_BY_ID.get(pull.cardId)!;
  const rank = rarityRank(pull.rarity) as Rank;

  const sparks = useMemo(
    () => Array.from({ length: 10 + rank * 6 }, (_, i) => ({
      angle: (i / (10 + rank * 6)) * 360 + Math.random() * 20,
      dist: 90 + Math.random() * 150,
      delay: Math.random() * 120,
    })),
    [index, rank],
  );

  useEffect(() => {
    audio.duck(true);
    return () => { audio.duck(false); stage.setRift(null, 0); };
  }, []);

  useEffect(() => {
    let timer = 0;
    if (phase === 'crate') {
      // Nothing about the contents shows yet: same light, same sound for every crate.
      stage.setRift(null, 0);
      audio.riser(CRATE_MS / 1000);
      timer = window.setTimeout(() => setPhase('crack'), CRATE_MS);
    } else if (phase === 'crack') {
      stage.pulse(0.3);
      audio.warp(0.5);
      timer = window.setTimeout(() => setPhase('charge'), CRACK_MS);
    } else if (phase === 'charge') {
      stage.setRift([0.75, 0.85, 1], 0.4);
      audio.riser(CHARGE_MS / 1000);
      timer = window.setTimeout(() => setPhase('tell'), CHARGE_MS);
    } else if (phase === 'tell') {
      // With an upgrade moment the rift first shows the rarity that was rolled, then rises.
      const shown = pull.upgradedFrom ?? pull.rarity;
      const shownRank = rarityRank(shown) as Rank;
      stage.setRift(RARITY_RGB[shown], pull.upgradedFrom ? 0.8 : 1);
      audio.tell(shownRank);
      timer = window.setTimeout(() => setPhase(pull.upgradedFrom ? 'bump' : 'show'), pull.upgradedFrom ? 700 : TELL_MS[rank]);
    } else if (phase === 'bump') {
      stage.setRift(RARITY_RGB[pull.rarity], 1);
      stage.pulse(0.3);
      audio.tell(rank);
      timer = window.setTimeout(() => setPhase('show'), TELL_MS[rank]);
    } else if (phase === 'show') {
      stage.setRift(RARITY_RGB[pull.rarity], 0.62);
      stage.pulse(0.35 + rank * 0.14);
      audio.reveal(rank);
    } else {
      stage.setRift(null, 0);
    }
    return () => window.clearTimeout(timer);
  }, [phase, index, pull.rarity, rank]);

  const advance = (): void => {
    if (phase === 'crate') { setPhase('crack'); return; }
    if (phase === 'crack') { setPhase('charge'); return; }
    if (phase === 'charge' || phase === 'tell' || phase === 'bump') { setPhase('show'); return; }
    if (phase === 'show') {
      audio.tap();
      if (index + 1 < pulls.length) { setIndex(index + 1); setPhase('charge'); }
      else setPhase('summary');
    }
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
        <button className="cta" onClick={() => { audio.tap(); close(); }}><span>Weiter</span></button>
      </div>
    );
  }

  if (phase === 'crate' || phase === 'crack') {
    return (
      <div className={`overlay reveal reveal--${phase} reveal--${tier}`} onClick={advance}>
        <img className="reveal__crate" src={phase === 'crate' ? closed : opened} alt="" draggable={false} />
        {phase === 'crack' && <div className="reveal__flash" />}
        <p className="overlay__hint">Tippen zum Öffnen</p>
      </div>
    );
  }

  return (
    <div className={`overlay reveal reveal--${phase} reveal--${phase === 'tell' && pull.upgradedFrom ? pull.upgradedFrom : pull.rarity}`} onClick={advance}>
      <div className="reveal__count">{index + 1} / {pulls.length}</div>
      {phase === 'tell' && <div className="reveal__tell">{RARITY_LABEL[pull.upgradedFrom ?? pull.rarity]}</div>}
      {phase === 'bump' && <div className="reveal__tell reveal__tell--bump" key="bump"><small>Aufgewertet</small>{RARITY_LABEL[pull.rarity]}</div>}
      {phase === 'show' && (
        <>
          <div className="reveal__rays" />
          <div className="sparks">
            {sparks.map((s, i) => (
              <i key={i} style={{ ['--a' as string]: `${s.angle}deg`, ['--d' as string]: `${s.dist}px`, animationDelay: `${s.delay}ms` }} />
            ))}
          </div>
          <div className="reveal__card" key={index}>
            <HoloCard card={card} interactive />
          </div>
          <div className="reveal__tag">
            {pull.isNew ? <span className="badge badge--new">Neu in der Sammlung</span> : <span className="badge"><Shard />Duplikat · +{num(pull.shards)} Splitter</span>}
          </div>
        </>
      )}
      <p className="overlay__hint">{phase === 'show' ? 'Tippen für weiter' : 'Tippen zum Überspringen'}</p>
    </div>
  );
}
