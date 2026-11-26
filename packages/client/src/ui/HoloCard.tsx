import { FACTIONS, ROLES, type CardDef } from '@nova/core';
import { useEffect, useRef } from 'react';
import { Avatar } from './Avatar.tsx';
import { cardArt } from './art.ts';
import { FACTION_COLOR, RARITY_LABEL } from './format.ts';

interface Props {
  card: CardDef;
  size?: 'lg' | 'sm';
  /** Tilt and foil follow pointer or device orientation. */
  interactive?: boolean;
  locked?: boolean;
  count?: number;
  /** Upgrade level, shown as pips from level 2. */
  level?: number;
  onClick?: () => void;
}

const gyro = { x: 0, y: 0, active: false };
if (typeof window !== 'undefined') {
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    gyro.active = true;
    gyro.x = Math.max(-1, Math.min(1, e.gamma / 25));
    gyro.y = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
  });
}

export function HoloCard({ card, size = 'lg', interactive = false, locked = false, count, level = 1, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const painted = cardArt(card);

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    let raf = 0;
    let x = 0, y = 0, tx = 0, ty = 0, touching = false;
    const t0 = performance.now();

    const onMove = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      touching = true;
    };
    const onLeave = (): void => { touching = false; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onLeave);

    const loop = (now: number): void => {
      const t = (now - t0) / 1000;
      if (!touching) {
        // Idle: device tilt if available, otherwise a slow sway so the foil stays alive.
        tx = gyro.active ? gyro.x : Math.sin(t * 0.9) * 0.55;
        ty = gyro.active ? gyro.y : Math.cos(t * 0.7) * 0.4;
      }
      x += (tx - x) * 0.12;
      y += (ty - y) * 0.12;
      el.style.setProperty('--mx', String((x + 1) / 2));
      el.style.setProperty('--my', String((y + 1) / 2));
      el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onLeave);
    };
  }, [interactive]);

  return (
    <div
      ref={ref}
      className={`holo holo--${size} holo--${card.rarity}${locked ? ' is-locked' : ''}${painted ? ' holo--painted' : ''}${card.season !== undefined ? ' holo--edition' : ''}`}
      style={{ ['--faction' as string]: FACTION_COLOR[card.faction] }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="holo__body">
        <div className={`holo__art${painted ? ' holo__art--painted' : ''}`}>
          {painted ? <img className="holo__img" src={painted} alt="" draggable={false} /> : <Avatar card={card} />}
        </div>
        <div className="holo__head">
          <span className="holo__rating">{locked ? '??' : card.rating}</span>
          <span className="holo__role">{ROLES[card.role].short}</span>
          <span className="holo__faction">{FACTIONS[card.faction].short}</span>
        </div>
        <div className="holo__plate">
          <div className="holo__name">{locked ? 'Unbekannt' : card.name}</div>
          {size === 'lg' && <div className="holo__epithet">{card.epithet}</div>}
          {size === 'lg' && (
            <div className="holo__stats">
              {(['nav', 'hdl', 'tec', 'kmp'] as const).map((k) => (
                <div key={k}><b>{card.stats[k]}</b><span>{k.toUpperCase()}</span></div>
              ))}
            </div>
          )}
          <div className="holo__rarity">{RARITY_LABEL[card.rarity]}</div>
        </div>
        <div className="holo__foil" />
        <div className="holo__glare" />
      </div>
      {card.season !== undefined && <span className="holo__edition" title="Saison-Edition">S</span>}
      {count !== undefined && count > 1 && <span className="holo__count">×{count}</span>}
      {level > 1 && !locked && <span className="holo__level">{Array.from({ length: level - 1 }, (_, i) => <i key={i} />)}</span>}
    </div>
  );
}
