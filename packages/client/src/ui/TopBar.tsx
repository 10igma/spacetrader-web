import { xpForLevel } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { num } from './format.ts';
import { useEffect, useRef } from 'react';
import { flyToWallet } from './fly.ts';
import { useCountUp, useGain } from './hooks.ts';
import { Credits, IconGear, Quanta } from './icons.tsx';

export function TopBar() {
  const view = useApp((s) => s.view)!;
  const setSheet = useApp((s) => s.setSheet);
  const setTab = useApp((s) => s.setTab);
  const setHangarMode = useApp((s) => s.setHangarMode);
  const credits = useCountUp(view.wallet.credits);
  const quanta = useCountUp(view.wallet.quanta, 500);
  const creditsUp = useGain(view.wallet.credits);
  const quantaUp = useGain(view.wallet.quanta);
  const creditsPill = useRef<HTMLSpanElement>(null);
  const quantaPill = useRef<HTMLSpanElement>(null);
  const before = useRef(view.wallet);
  const quiet = useApp((s) => !!s.travel || !!s.reveal);
  // Whenever a balance goes up, the gain flies in from where the player just tapped.
  useEffect(() => {
    const was = before.current;
    before.current = view.wallet;
    if (quiet) return;
    if (view.wallet.credits > was.credits) flyToWallet('credits', creditsPill.current, view.wallet.credits - was.credits);
    if (view.wallet.quanta > was.quanta) flyToWallet('quanta', quantaPill.current, (view.wallet.quanta - was.quanta) * 100);
  }, [view.wallet, quiet]);
  const xp = view.profile.xp / xpForLevel(view.profile.level);

  return (
    <header className="topbar">
      <button className="topbar__me" aria-label="Profil" onClick={() => { audio.tap(); setSheet('profile'); }}>
        <div className="level" style={{ ['--p' as string]: xp }}>
          <span>{view.profile.level}</span>
        </div>
        <div className="topbar__who">
          <b>{view.captain.title}</b>
          <span>Stufe {view.profile.level}{view.captain.prestige > 0 && <em> {'★'.repeat(view.captain.prestige)}</em>}</span>
        </div>
      </button>
      <div className="topbar__wallet">
        <button type="button" className="pillwrap" aria-label="Zum Markt" onClick={() => { audio.tap(); setTab('market'); }}>
          <span ref={creditsPill} className={`pill pill--credits${creditsUp ? ' is-gain' : ''}`}><Credits />{num(credits)}</span>
        </button>
        <button type="button" className="pillwrap" aria-label="Zum Shop" onClick={() => { audio.tap(); setHangarMode('shop'); setTab('hangar'); }}>
          <span ref={quantaPill} className={`pill pill--quanta${quantaUp ? ' is-gain' : ''}`}><Quanta />{num(quanta)}</span>
        </button>
        <button className="iconbtn" aria-label="Einstellungen" onClick={() => { audio.tap(); setSheet('settings'); }}>
          <IconGear />
        </button>
      </div>
    </header>
  );
}
