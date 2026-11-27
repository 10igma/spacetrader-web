import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx?: number;
  ty?: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  drag: number;
  gravity: number;
  kind: 'spark' | 'ember' | 'implode';
}

interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}

const particles: Particle[] = [];
const rings: Ring[] = [];
let wake: (() => void) | null = null;

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

/**
 * Lightweight additive 2D-Canvas VFX layer for crate knocks, card upgrades,
 * encounter impacts, milestones, and wallet arrivals. Sleeps at 0% CPU when idle.
 */
export const vfx = {
  burst(x: number, y: number, color: string, count = 24, opts?: { speed?: number; size?: number; gravity?: number }): void {
    if (reducedMotion()) return;
    const speed = opts?.speed ?? 260;
    const baseSize = opts?.size ?? 3.2;
    const gravity = opts?.gravity ?? 90;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.28 + Math.random() * 0.85);
      const maxLife = 0.42 + Math.random() * 0.48;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: baseSize * (0.55 + Math.random() * 1.15),
        life: maxLife,
        maxLife,
        color,
        drag: 0.93,
        gravity,
        kind: 'spark',
      });
    }
    wake?.();
  },

  implode(x: number, y: number, color: string, count = 28): void {
    if (reducedMotion()) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 130;
      const maxLife = 0.28 + Math.random() * 0.14;
      particles.push({
        x: x + Math.cos(a) * dist,
        y: y + Math.sin(a) * dist,
        vx: 0,
        vy: 0,
        tx: x,
        ty: y,
        size: 2.2 + Math.random() * 2.8,
        life: maxLife,
        maxLife,
        color,
        drag: 1,
        gravity: 0,
        kind: 'implode',
      });
    }
    wake?.();
  },

  embers(color: string, count = 34): void {
    if (reducedMotion() || typeof window === 'undefined') return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const depth = Math.random(); // 0 = far small sharp, 1 = near large soft
      const maxLife = 1.4 + Math.random() * 1.4;
      particles.push({
        x: Math.random() * w,
        y: h + Math.random() * 80,
        vx: (Math.random() - 0.5) * 32,
        vy: -(55 + depth * 125),
        size: 1.8 + depth * 4.5,
        life: maxLife,
        maxLife,
        color,
        drag: 0.995,
        gravity: -10,
        kind: 'ember',
      });
    }
    wake?.();
  },

  ring(x: number, y: number, color: string, maxR = 220): void {
    if (reducedMotion()) return;
    rings.push({ x, y, r: 14, maxR, life: 0.48, maxLife: 0.48, color });
    wake?.();
  },
};

export function VfxCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = (): void => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();

    const loop = (now: number): void => {
      raf = 0;
      // The frame's own timestamp can lie a little before the moment the loop was woken: never step backwards.
      const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
      last = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = rings.length - 1; i >= 0; i--) {
        const rg = rings[i]!;
        rg.life -= dt;
        if (rg.life <= 0) { rings.splice(i, 1); continue; }
        const p = 1 - rg.life / rg.maxLife;
        const ease = 1 - Math.pow(1 - p, 3);
        rg.r = 14 + (rg.maxR - 14) * ease;
        ctx.save();
        ctx.globalAlpha = (1 - p) * 0.72;
        ctx.strokeStyle = rg.color;
        ctx.lineWidth = Math.max(1, (1 - p) * 4.5);
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, Math.max(0, rg.r), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i]!;
        pt.life -= dt;
        if (pt.life <= 0) { particles.splice(i, 1); continue; }
        const ratio = pt.life / pt.maxLife;

        if (pt.kind === 'implode' && pt.tx != null && pt.ty != null) {
          const pull = 1 - Math.exp(-dt * 12);
          pt.x += (pt.tx - pt.x) * pull;
          pt.y += (pt.ty - pt.y) * pull;
        } else {
          pt.vx *= Math.pow(pt.drag, dt * 60);
          pt.vy = pt.vy * Math.pow(pt.drag, dt * 60) + pt.gravity * dt;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
        }

        const alpha = pt.kind === 'ember' ? Math.sin(ratio * Math.PI) * 0.8 : Math.min(1, ratio * 1.4);
        const r = pt.size * (pt.kind === 'spark' ? 0.4 + ratio * 0.8 : 1);

        if (r <= 0) continue;
        ctx.save();
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 2.4);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, pt.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 0 || rings.length > 0) {
        raf = requestAnimationFrame(loop);
      }
    };

    wake = () => {
      if (raf === 0) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    return () => {
      wake = null;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="vfx-layer" aria-hidden="true" />;
}
