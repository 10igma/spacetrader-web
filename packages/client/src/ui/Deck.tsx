import { CARDS, rarityRank } from '@nova/core';
import { audio } from '../audio/engine.ts';
import { useApp } from '../store.ts';
import { HoloCard } from './HoloCard.tsx';
import { num } from './format.ts';
import { Shard } from './icons.tsx';

const SORTED = [...CARDS].sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.rating - a.rating);

export function Deck() {
  const view = useApp((s) => s.view)!;
  const setInspect = useApp((s) => s.setInspect);
  const owned = SORTED.filter((c) => view.collection[c.id]);
  const missing = SORTED.filter((c) => !view.collection[c.id]);

  return (
    <section className="deck">
      <header className="screenhead">
        <span className="eyebrow">Sammlung · Set 1</span>
        <h2>{owned.length}<small> / {CARDS.length} Crew</small></h2>
        <span className="pill pill--shards"><Shard />{num(view.wallet.shards)}</span>
      </header>
      <div className="deck__bar"><i style={{ width: `${(owned.length / CARDS.length) * 100}%` }} /></div>
      <div className="deck__grid">
        {owned.map((c) => (
          <HoloCard key={c.id} card={c} size="sm" count={view.collection[c.id]} onClick={() => { audio.tap(); setInspect(c.id); }} />
        ))}
        {missing.map((c) => <HoloCard key={c.id} card={c} size="sm" locked />)}
      </div>
    </section>
  );
}
