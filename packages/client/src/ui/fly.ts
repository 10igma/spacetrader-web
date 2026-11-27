import { art } from './art.ts';
import { vfx } from './VfxCanvas.tsx';

/**
 * Rewards visibly travel to the wallet along a curved quadratic Bezier arc
 * and trigger an additive spark burst when they land on the counter.
 */
let lastTouch = { x: window.innerWidth / 2, y: window.innerHeight * 0.6 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => { lastTouch = { x: e.clientX, y: e.clientY }; }, { capture: true, passive: true });
}

const TONE = { credits: '#ffc24a', quanta: '#3be3ff' } as const;

export function flyToWallet(kind: 'credits' | 'quanta', target: HTMLElement | null, amount: number): void {
  if (!target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = target.getBoundingClientRect();
  const end = { x: to.left + 14, y: to.top + to.height / 2 };
  const start = lastTouch;
  if (Math.hypot(end.x - start.x, end.y - start.y) < 90) return;
  const picture = art('currency', kind);
  const count = Math.max(4, Math.min(10, Math.round(Math.log10(Math.max(10, amount)) * 2)));
  let landed = false;

  for (let i = 0; i < count; i++) {
    const el = document.createElement(picture ? 'img' : 'i');
    if (picture) (el as HTMLImageElement).src = picture;
    el.className = 'flyglyph';
    el.style.setProperty('--tone', TONE[kind]);
    document.body.appendChild(el);

    const spread = { x: (Math.random() - 0.5) * 95, y: (Math.random() - 0.5) * 65 - 24 };
    const mid = {
      x: (start.x + end.x) * 0.5 + spread.x * 0.9,
      y: Math.min(start.y, end.y) - 40 + spread.y * 0.6,
    };
    const duration = 580 + Math.random() * 150;
    const delay = i * 26;
    const anim = el.animate([
      { transform: `translate(${start.x}px, ${start.y}px) scale(0.45)`, opacity: 0 },
      { transform: `translate(${start.x + spread.x * 0.55}px, ${start.y + spread.y * 0.55}px) scale(1.05)`, opacity: 1, offset: 0.24 },
      { transform: `translate(${mid.x}px, ${mid.y}px) scale(0.9)`, opacity: 1, offset: 0.58 },
      { transform: `translate(${end.x}px, ${end.y}px) scale(0.55)`, opacity: 1, offset: 0.93 },
      { transform: `translate(${end.x}px, ${end.y}px) scale(0.2)`, opacity: 0 },
    ], { duration, delay, easing: 'cubic-bezier(0.25, 0.1, 0.2, 1)', fill: 'both' });

    anim.onfinish = () => {
      el.remove();
      if (!landed) {
        landed = true;
        vfx.burst(end.x, end.y, TONE[kind], 10, { speed: 120, size: 2.4, gravity: 20 });
      }
    };
    anim.oncancel = () => el.remove();
  }
}
