import { useEffect, useRef, useState } from 'react';
import { serverNow } from '../store.ts';

/** Re-render on an interval with the authoritative clock. */
export function useServerNow(intervalMs = 1000): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Numbers never jump: they roll to their new value. */
export function useCountUp(value: number, durationMs = 700): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    if (origin === value) return;
    let raf = 0;
    const step = (t: number): void => {
      const k = Math.min(1, (t - start) / durationMs);
      const eased = 1 - (1 - k) ** 3;
      const next = Math.round(origin + (value - origin) * eased);
      from.current = next;
      setShown(next);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return shown;
}
