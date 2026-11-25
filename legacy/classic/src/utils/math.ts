/**
 * Space Trader 1.2.0 — Math utilities
 * Ported from Math.c
 */

// ── Seeded PRNG (Multiply-With-Carry) ────────────────────────────────────

const DEFSEEDX = 521288629;
const DEFSEEDY = 362436069;

let seedX = DEFSEEDX;
let seedY = DEFSEEDY;

/**
 * Raw 32-bit pseudo-random number via MWC generator.
 * Ported from Rand() in Math.c.
 *
 * NOTE: The original C code used 16-bit arithmetic with overflow.
 * In JS we use a simplified PRNG that provides equivalent randomness
 * for game purposes. We use Math.random() for the web port since
 * the original PRNG relied on 16-bit int overflow semantics.
 */
export function rand(): number {
  // Simplified MWC adapted for JS 32-bit integer math
  const a = 18000;
  const b = 30903;
  seedX = (a * (seedX & 0xFFFF) + (seedX >>> 16)) & 0xFFFFFFFF;
  seedY = (b * (seedY & 0xFFFF) + (seedY >>> 16)) & 0xFFFFFFFF;
  return (((seedX << 16) + (seedY & 0xFFFF)) & 0xFFFFFFFF) >>> 0;
}

/**
 * Seed the PRNG. Pass 0 for either to use the default seed.
 * Ported from RandSeed() in Math.c.
 */
export function randSeed(seed1: number, seed2: number): void {
  seedX = seed1 ? (seed1 >>> 0) : DEFSEEDX;
  seedY = seed2 ? (seed2 >>> 0) : DEFSEEDY;
}

/**
 * Get a random integer in [0, maxVal).
 * Equivalent to GetRandom(maxVal) macro: SysRandom(0) % maxVal
 */
export function getRandom(maxVal: number): number {
  if (maxVal <= 0) return 0;
  return rand() % maxVal;
}

// ── Integer square root ──────────────────────────────────────────────────

/**
 * Integer square root, ported from Math.c sqrt().
 * Returns the nearest integer to the true square root.
 */
export function isqrt(a: number): number {
  let i = 0;
  while (i * i < a) {
    ++i;
  }
  if (i > 0) {
    if (i * i - a > a - (i - 1) * (i - 1)) {
      --i;
    }
  }
  return i;
}

// ── Distance helpers ─────────────────────────────────────────────────────

/**
 * Square of the distance between two solar systems.
 * Ported from SqrDistance() in Math.c.
 */
export function sqrDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

/**
 * Distance between two solar systems (integer approximation).
 * Ported from RealDistance() in Math.c.
 */
export function realDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return isqrt(sqrDistance(a, b));
}

// ── Convenience helpers used across the engine ───────────────────────────

export function sqr(a: number): number {
  return a * a;
}

export function abs(a: number): number {
  return a < 0 ? -a : a;
}
