/**
 * Derives a perceptually-distributed hue (0–360) from an arbitrary string.
 * Intended for use with OKLCH so that every hue appears equally bright/dark
 * at the same lightness and chroma values.
 *
 * Uses a djb2-style hash: fast, branchless, and distributes UUIDs well across
 * the full hue wheel without clustering.
 */

const INITIAL_HASH = 5381;
const HASH_MULTIPLIER = 33;
const HUE_DEGREES = 360;

export function deriveHueFromUserId(userId: string): number {
  let hash = INITIAL_HASH;
  for (let i = 0; i < userId.length; i++) {
    // hash * 33 XOR charCode, kept as a 32-bit integer
    hash = (Math.imul(hash, HASH_MULTIPLIER) ^ userId.charCodeAt(i)) | 0;
  }
  // Map the signed 32-bit result onto [0, 360)
  return ((hash % HUE_DEGREES) + HUE_DEGREES) % HUE_DEGREES;
}
