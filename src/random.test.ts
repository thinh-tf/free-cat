import assert from "node:assert/strict";
import { test } from "node:test";
import { pick, randomInt, shuffle } from "./random.js";

// Randomised code needs many samples to catch an off-by-one at a boundary.
const SAMPLES = 2000;

test("randomInt stays within the half-open range", () => {
  const seen = new Set<number>();
  for (let i = 0; i < SAMPLES; i++) {
    const value = randomInt(3, 7);
    assert.ok(value >= 3 && value < 7, `${value} outside [3, 7)`);
    seen.add(value);
  }
  // Every value in range should turn up; 7 must not.
  assert.deepEqual([...seen].sort(), [3, 4, 5, 6]);
});

test("randomInt rejects an empty range", () => {
  assert.throws(() => randomInt(5, 5), RangeError);
  assert.throws(() => randomInt(5, 4), RangeError);
});

test("randomInt rejects non-integer bounds", () => {
  assert.throws(() => randomInt(0, 2.5), RangeError);
});

test("pick returns an element of the input", () => {
  const items = ["a", "b", "c"] as const;
  const seen = new Set<string>();
  for (let i = 0; i < SAMPLES; i++) {
    const value = pick(items);
    assert.ok(items.includes(value));
    seen.add(value);
  }
  assert.equal(seen.size, 3, "every element should eventually be picked");
});

test("pick rejects an empty array", () => {
  assert.throws(() => pick([]), RangeError);
});

test("shuffle returns a permutation without mutating the input", () => {
  const input = [1, 2, 3, 4, 5];
  const copy = [...input];
  const result = shuffle(input);

  assert.deepEqual(input, copy, "input must not be mutated");
  assert.deepEqual([...result].sort((a, b) => a - b), copy);
});

test("shuffle handles empty and single-element arrays", () => {
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle([42]), [42]);
});

test("shuffle actually reorders", () => {
  // A 20-element array stays identical with probability 1/20!, so a single
  // differing result across many attempts is a safe assertion.
  const input = Array.from({ length: 20 }, (_, i) => i);
  const reordered = Array.from({ length: 10 }, () => shuffle(input)).some(
    (result) => !result.every((value, index) => value === input[index]),
  );
  assert.ok(reordered, "shuffle never changed the order");
});
