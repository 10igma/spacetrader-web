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

/** True for a moment after a number went up: the cue for a small celebration where the number lives. */
export function useGain(value: number, ms = 600): boolean {
  const [on, setOn] = useState(false);
  const last = useRef(value);
  useEffect(() => {
    const grew = value > last.current;
    last.current = value;
    if (!grew) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return on;
}
