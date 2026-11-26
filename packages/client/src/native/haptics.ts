import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { loadSettings } from './settings.ts';

/**
 * The game's haptic vocabulary. Few words, used consistently:
 * a tap is light, money is a double tick, danger is a warning, a loss is an
 * error, and a card reveal grows with its rarity.
 */
export type Haptic = 'tap' | 'coins' | 'warn' | 'loss' | 'warp' | 'reveal0' | 'reveal1' | 'reveal2' | 'reveal3' | 'reveal4';

/** Fallback for browsers with the Vibration API (Android Chrome). Milliseconds on, off, on. */
const PATTERN: Record<Haptic, number | number[]> = {
  tap: 8,
  coins: [10, 40, 14],
  warn: [20, 60, 20],
  loss: [40, 50, 60],
  warp: 60,
  reveal0: 14,
  reveal1: [14, 50, 18],
  reveal2: [18, 50, 24, 50, 30],
  reveal3: [24, 40, 30, 40, 40, 40, 70],
  reveal4: [30, 40, 40, 40, 50, 40, 60, 40, 120],
};

let enabled = loadSettings().haptics;
export const setHaptics = (on: boolean): void => { enabled = on; };

const native = Capacitor.isNativePlatform();
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function play(kind: Haptic): Promise<void> {
  switch (kind) {
    case 'tap': return Haptics.impact({ style: ImpactStyle.Light });
    case 'coins': await Haptics.impact({ style: ImpactStyle.Light }); await wait(60); return Haptics.impact({ style: ImpactStyle.Light });
    case 'warn': return Haptics.notification({ type: NotificationType.Warning });
    case 'loss': return Haptics.notification({ type: NotificationType.Error });
    case 'warp': return Haptics.impact({ style: ImpactStyle.Heavy });
    case 'reveal0': return Haptics.impact({ style: ImpactStyle.Light });
    case 'reveal1': return Haptics.impact({ style: ImpactStyle.Medium });
    case 'reveal2': await Haptics.impact({ style: ImpactStyle.Medium }); await wait(90); return Haptics.impact({ style: ImpactStyle.Heavy });
    case 'reveal3':
    case 'reveal4': {
      // A drum roll into the success tick: three for a legend, five for a singularity.
      for (let i = 0; i < (kind === 'reveal3' ? 3 : 5); i++) { await Haptics.impact({ style: ImpactStyle.Heavy }); await wait(80); }
      return Haptics.notification({ type: NotificationType.Success });
    }
  }
}

export function haptic(kind: Haptic): void {
  if (!enabled) return;
  if (native) { void play(kind).catch(() => { /* no motor, no feedback */ }); return; }
  try { navigator.vibrate?.(PATTERN[kind]); } catch { /* not allowed before the first touch */ }
}
