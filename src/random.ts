import { randomInt as cryptoRandomInt } from "node:crypto";

/**
 * A random integer in the half-open range [min, max).
 *
 * Backed by node:crypto, which uses rejection sampling internally and so is
 * free of the modulo bias you get from `Math.floor(Math.random() * n)`.
 *
 * @throws RangeError if the range is empty or the bounds are not integers.
 */
export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`randomInt: bounds must be integers, got [${min}, ${max})`);
  }
  if (max <= min) {
    throw new RangeError(`randomInt: range must be non-empty, got [${min}, ${max})`);
  }
  return cryptoRandomInt(min, max);
}

/**
 * A uniformly chosen element of `items`.
 *
 * @throws RangeError if `items` is empty.
 */
export function pick<T>(items: readonly T[]): T {
  if (items.length === 0) {
    throw new RangeError("pick: cannot pick from an empty array");
  }
  // The index is strictly less than the length, so the lookup always hits.
  return items[randomInt(0, items.length)] as T;
}

/**
 * A shuffled copy of `items`, leaving the input untouched.
 *
 * Uses Fisher-Yates, so every permutation is equally likely.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    // Both indices are within bounds by construction.
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
