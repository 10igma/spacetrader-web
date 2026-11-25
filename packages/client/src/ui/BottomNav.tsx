import type { ReactNode } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp, type Tab } from '../store.ts';
import { useServerNow } from './hooks.ts';
import { IconDeck, IconHangar, IconLeague, IconMarket, IconStation } from './icons.tsx';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'station', label: 'Station', icon: <IconStation /> },
  { id: 'market', label: 'Markt', icon: <IconMarket /> },
  { id: 'hangar', label: 'Hangar', icon: <IconHangar /> },
  { id: 'deck', label: 'Deck', icon: <IconDeck /> },
  { id: 'league', label: 'Liga', icon: <IconLeague /> },
];

export function BottomNav() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const nextFreeAt = useApp((s) => s.view!.crates.nextFreeAt);
  const now = useServerNow();
  const freeReady = now >= nextFreeAt;

  return (
    <nav className="nav" aria-label="Hauptnavigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`nav__item${tab === t.id ? ' is-active' : ''}${t.id === 'hangar' ? ' nav__item--hero' : ''}`}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => { audio.tap(); setTab(t.id); }}
        >
          <span className="nav__icon">{t.icon}{t.id === 'hangar' && freeReady && <i className="dot" />}</span>
          <span className="nav__label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
