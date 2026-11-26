import { art } from './art.ts';

/**
 * Rewards visibly travel to the wallet: a handful of glyphs fly from where the player last
 * touched the screen to the counter that just went up. Pure decoration, driven by the
 * number that changed, never the other way round.
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
  // Nothing to fly if the touch was on the wallet itself or right next to it.
  if (Math.hypot(end.x - start.x, end.y - start.y) < 90) return;
  const picture = art('currency', kind);
  const count = Math.max(4, Math.min(10, Math.round(Math.log10(Math.max(10, amount)) * 2)));
  for (let i = 0; i < count; i++) {
    const el = document.createElement(picture ? 'img' : 'i');
    if (picture) (el as HTMLImageElement).src = picture;
    el.className = 'flyglyph';
    el.style.setProperty('--tone', TONE[kind]);
    document.body.appendChild(el);
    // Each glyph leaves in its own direction first, then all converge on the counter.
    const spread = { x: (Math.random() - 0.5) * 90, y: (Math.random() - 0.5) * 70 - 20 };
    const anim = el.animate([
      { transform: `translate(${start.x}px, ${start.y}px) scale(0.4)`, opacity: 0 },
      { transform: `translate(${start.x + spread.x}px, ${start.y + spread.y}px) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${end.x}px, ${end.y}px) scale(0.55)`, opacity: 1, offset: 0.92 },
      { transform: `translate(${end.x}px, ${end.y}px) scale(0.2)`, opacity: 0 },
    ], { duration: 620 + Math.random() * 160, delay: i * 28, easing: 'cubic-bezier(0.3, 0, 0.2, 1)', fill: 'both' });
    anim.onfinish = () => el.remove();
    anim.oncancel = () => el.remove();
  }
}
