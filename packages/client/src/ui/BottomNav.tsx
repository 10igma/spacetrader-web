import type { ReactNode } from 'react';
import { audio } from '../audio/engine.ts';
import { useApp, type Tab } from '../store.ts';
import type { Feature } from '@nova/core';
import { IconDaily, IconDeck, IconHangar, IconMarket, IconStation } from './icons.tsx';
import { useFresh, useUnlocks } from './unlocks.ts';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'station', label: 'Station', icon: <IconStation /> },
  { id: 'market', label: 'Markt', icon: <IconMarket /> },
  { id: 'hangar', label: 'Hangar', icon: <IconHangar /> },
  { id: 'deck', label: 'Deck', icon: <IconDeck /> },
  { id: 'daily', label: 'Aufträge', icon: <IconDaily /> },
];
/** Parts that mark their tab as new until they have been looked at. */
const NEWS: Record<Tab, Feature[]> = { station: ['posts'], market: ['auction'], hangar: ['shop', 'yard'], deck: ['deck', 'convoys'], daily: ['daily', 'season', 'league'] };

export function BottomNav() {
  const unlocks = useUnlocks();
  const fresh = useFresh();
  // A new captain has three tabs. Deck and daily goals come with the first crew and the second level.
  const tabs = TABS.filter((t) => (t.id === 'deck' ? unlocks.deck : t.id === 'daily' ? unlocks.daily : true));
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const badges = useApp((s) => s.view!.badges);
  const count: Partial<Record<Tab, number>> = { station: badges.station, market: badges.market, hangar: badges.hangar, daily: badges.daily, deck: badges.deck };

  return (
    <nav className="nav" aria-label="Hauptnavigation" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`nav__item${tab === t.id ? ' is-active' : ''}${t.id === 'hangar' ? ' nav__item--hero' : ''}`}
          aria-current={tab === t.id ? 'page' : undefined}
          onClick={() => { audio.tap(); setTab(t.id); }}
        >
          <span className="nav__icon">{t.icon}{(count[t.id] ?? 0) > 0 ? <i className="dot" /> : fresh(...NEWS[t.id]) ? <i className="dot dot--new" /> : null}</span>
          <span className="nav__label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
