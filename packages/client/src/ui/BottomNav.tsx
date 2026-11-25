import type { ReactNode } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp, type Tab } from '../store.ts';
import { IconDaily, IconDeck, IconHangar, IconMarket, IconStation } from './icons.tsx';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'station', label: 'Station', icon: <IconStation /> },
  { id: 'market', label: 'Markt', icon: <IconMarket /> },
  { id: 'hangar', label: 'Hangar', icon: <IconHangar /> },
  { id: 'deck', label: 'Deck', icon: <IconDeck /> },
  { id: 'daily', label: 'Aufträge', icon: <IconDaily /> },
];

export function BottomNav() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const badges = useApp((s) => s.view!.badges);
  const count: Partial<Record<Tab, number>> = { station: badges.station, hangar: badges.hangar, daily: badges.daily, deck: badges.deck };

  return (
    <nav className="nav" aria-label="Hauptnavigation">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`nav__item${tab === t.id ? ' is-active' : ''}${t.id === 'hangar' ? ' nav__item--hero' : ''}`}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => { audio.tap(); setTab(t.id); }}
        >
          <span className="nav__icon">{t.icon}{(count[t.id] ?? 0) > 0 && <i className="dot" />}</span>
          <span className="nav__label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
