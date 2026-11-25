/**
 * Deterministic PRNG (sfc32). State is plain data so it can live inside the
 * authoritative game state and be persisted. It never leaves the server side:
 * `toClientView` strips it.
 */
export type RngState = [number, number, number, number];

/** xmur3 string hash, used to derive independent streams from one seed. */
export function seedRng(seed: string): RngState {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const next = (): number => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
  const state: RngState = [next(), next(), next(), next()];
  for (let i = 0; i < 12; i++) nextFloat(state);
  return state;
}

/** Returns a float in [0, 1) and advances the state in place. */
export function nextFloat(s: RngState): number {
  let [a, b, c, d] = s;
  a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  s[0] = a; s[1] = b; s[2] = c; s[3] = d;
  return (t >>> 0) / 4294967296;
}

export function nextInt(s: RngState, maxExclusive: number): number {
  return Math.floor(nextFloat(s) * maxExclusive);
}

export function pick<T>(s: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick() from empty list');
  return items[nextInt(s, items.length)] as T;
}
