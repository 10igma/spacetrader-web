import { xpForLevel } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { num } from './format.ts';
import { useCountUp } from './hooks.ts';
import { Credits, IconSound, Quanta } from './icons.tsx';

export function TopBar() {
  const view = useApp((s) => s.view)!;
  const muted = useApp((s) => s.muted);
  const toggleMute = useApp((s) => s.toggleMute);
  const setSheet = useApp((s) => s.setSheet);
  const credits = useCountUp(view.wallet.credits);
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
        <span className="pill pill--credits"><Credits />{num(credits)}</span>
        <span className="pill pill--quanta"><Quanta />{num(view.wallet.quanta)}</span>
        <button className="iconbtn" aria-label={muted ? 'Ton an' : 'Ton aus'} onClick={() => { toggleMute(); audio.tap(); }}>
          <IconSound off={muted} />
        </button>
      </div>
    </header>
  );
}
