import { rollOneDie } from "./server";
import { afterEach, describe, expect, test, vi } from "vitest";

const SAMPLES = 2000;

// Die geometry under test.
const D6_SIDES = 6;
const D10_SIDES = 10;
const D20_CARDINALITY = 20;
const D66_CARDINALITY = 66;
const D100_CARDINALITY = 100;

// Composite-die bounds.
const TENS_MULTIPLIER = 10;
const MIN_DIGIT = 0;
const MAX_DIGIT = 9;
const MIN_D6_DIGIT = 1;
const MAX_D6_DIGIT = 6;
const MIN_D66_RESULT = 11;

afterEach(() => {
  vi.restoreAllMocks();
});

// Forces Math.random() to return each value in `sequence` in turn, so we can
// drive rollOneDie to specific die faces. rollRaw does
// `Math.floor(random * cardinality) + 1`, so `(n - 1) / cardinality` yields n.
function mockRandomFaces(cardinality: number, sequence: number[]) {
  let i = 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    const face = sequence[i % sequence.length];
    i += 1;
    return (face - 1) / cardinality;
  });
}

describe("rollOneDie standard", () => {
  test("produces 1..cardinality with no components", () => {
    for (let i = 0; i < SAMPLES; i++) {
      const face = rollOneDie("standard", D20_CARDINALITY);
      expect(face.cardinality).toBe(D20_CARDINALITY);
      expect(face.result).toBeGreaterThanOrEqual(1);
      expect(face.result).toBeLessThanOrEqual(D20_CARDINALITY);
      expect(face.components).toBeUndefined();
    }
  });
});

describe("rollOneDie d66", () => {
  test("digits are 1..6 and combine as tens*10 + units", () => {
    for (let i = 0; i < SAMPLES; i++) {
      const face = rollOneDie("d66", D66_CARDINALITY);
      expect(face.cardinality).toBe(D66_CARDINALITY);
      const [tens, units] = face.components ?? [];
      expect(tens).toBeGreaterThanOrEqual(MIN_D6_DIGIT);
      expect(tens).toBeLessThanOrEqual(MAX_D6_DIGIT);
      expect(units).toBeGreaterThanOrEqual(MIN_D6_DIGIT);
      expect(units).toBeLessThanOrEqual(MAX_D6_DIGIT);
      expect(face.result).toBe(tens * TENS_MULTIPLIER + units);
      expect(face.result).toBeGreaterThanOrEqual(MIN_D66_RESULT);
      expect(face.result).toBeLessThanOrEqual(D66_CARDINALITY);
    }
  });

  test("double sixes give the max value 66", () => {
    mockRandomFaces(D6_SIDES, [MAX_D6_DIGIT, MAX_D6_DIGIT]);
    const face = rollOneDie("d66", D66_CARDINALITY);
    expect(face.result).toBe(D66_CARDINALITY);
    expect(face.components).toEqual([MAX_D6_DIGIT, MAX_D6_DIGIT]);
  });
});

describe("rollOneDie d100", () => {
  test("digits are 0..9 and combine as a percentile 1..100", () => {
    for (let i = 0; i < SAMPLES; i++) {
      const face = rollOneDie("d100", D100_CARDINALITY);
      expect(face.cardinality).toBe(D100_CARDINALITY);
      const [tens, units] = face.components ?? [];
      expect(tens).toBeGreaterThanOrEqual(MIN_DIGIT);
      expect(tens).toBeLessThanOrEqual(MAX_DIGIT);
      expect(units).toBeGreaterThanOrEqual(MIN_DIGIT);
      expect(units).toBeLessThanOrEqual(MAX_DIGIT);
      const raw = tens * TENS_MULTIPLIER + units;
      expect(face.result).toBe(raw === 0 ? D100_CARDINALITY : raw);
      expect(face.result).toBeGreaterThanOrEqual(1);
      expect(face.result).toBeLessThanOrEqual(D100_CARDINALITY);
    }
  });

  test("00 + 0 reads as the max value 100", () => {
    // rollRaw(10) returns 10 for both draws; 10 % 10 === 0 → digits [0, 0].
    mockRandomFaces(D10_SIDES, [D10_SIDES, D10_SIDES]);
    const face = rollOneDie("d100", D100_CARDINALITY);
    expect(face.result).toBe(D100_CARDINALITY);
    expect(face.components).toEqual([MIN_DIGIT, MIN_DIGIT]);
  });

  test("a non-zero percentile reads its digits directly", () => {
    const tensPick = 4;
    const unitsPick = 7;
    mockRandomFaces(D10_SIDES, [tensPick, unitsPick]);
    const face = rollOneDie("d100", D100_CARDINALITY);
    expect(face.components).toEqual([tensPick, unitsPick]);
    expect(face.result).toBe(tensPick * TENS_MULTIPLIER + unitsPick);
  });
});
