import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  type DieType,
  type Face,
  type FavouredHandfuls,
  type Handful,
  type Keep,
  type Favour,
  type Operator,
  rollCommon,
} from "./common";

// Composite dice read two smaller dice as tens + units digits.
const D66_COMPONENT_SIDES = 6;
const D100_COMPONENT_SIDES = 10;
const TENS_MULTIPLIER = 10;

// The primitive random draw: a single die showing 1..cardinality.
function rollRaw(cardinality: number): number {
  return Math.floor(Math.random() * cardinality) + 1;
}

// Rolls one die of the given type. Standard dice are a plain 1..cardinality
// draw. Composite dice (d66, d100) roll two smaller dice read as tens + units
// digits; `components` surfaces those individual rolls for display, while
// `result` is the combined value and `cardinality` stays the die's max value
// (66, 100) so `result === cardinality` still detects the max roll.
export function rollOneDie(dieType: DieType, cardinality: number): Face {
  if (dieType === "d66") {
    const tens = rollRaw(D66_COMPONENT_SIDES);
    const units = rollRaw(D66_COMPONENT_SIDES);
    return {
      cardinality,
      components: [tens, units],
      exploded: false,
      kept: true,
      result: tens * TENS_MULTIPLIER + units,
    };
  }
  if (dieType === "d100") {
    // Two d10s reading 0..9 (10 → 0). "00" + "0" is the max, read as the die's
    // cardinality (100), which keeps a uniform 1..100 distribution.
    const tens = rollRaw(D100_COMPONENT_SIDES) % D100_COMPONENT_SIDES;
    const units = rollRaw(D100_COMPONENT_SIDES) % D100_COMPONENT_SIDES;
    const raw = tens * TENS_MULTIPLIER + units;
    return {
      cardinality,
      components: [tens, units],
      exploded: false,
      kept: true,
      result: raw === 0 ? cardinality : raw,
    };
  }
  return {
    cardinality,
    exploded: false,
    kept: true,
    result: rollRaw(cardinality),
  };
}

function rollMaybeExplodingDice(
  dieType: DieType,
  cardinality: number,
  exploding: boolean,
): Face[] {
  const faces: Face[] = [rollOneDie(dieType, cardinality)];
  if (exploding) {
    while (faces[faces.length - 1].result === cardinality) {
      faces[faces.length - 1].exploded = true;
      faces.push(rollOneDie(dieType, cardinality));
    }
  }
  return faces;
}

function rollHandfulOfDice(
  dieType: DieType,
  arity: number,
  cardinality: number,
  keep: Keep,
  exploding: boolean,
): Handful {
  const sorted = Array.from({ length: arity }, () => {
    return rollMaybeExplodingDice(dieType, cardinality, exploding);
  })
    .flat()
    .map((face, originalIndex) => [originalIndex, face] as const)
    .toSorted((a, b) => a[1].result - b[1].result);

  if (keep === "dropHighest") {
    sorted[sorted.length - 1][1].kept = false;
  } else if (keep === "dropLowest") {
    sorted[0][1].kept = false;
  } else if (keep === "highest") {
    for (let i = 0; i < sorted.length - 1; i++) {
      sorted[i][1].kept = false;
    }
  } else if (keep === "lowest") {
    for (let i = 1; i < sorted.length; i++) {
      sorted[i][1].kept = false;
    }
  }

  const restored = sorted
    .toSorted((a, b) => a[0] - b[0])
    .map(([_, face]) => face);

  return {
    faces: restored,
    kept: true,
    total: restored.reduce(
      (acc, face) => acc + (face.kept ? face.result : 0),
      0,
    ),
  };
}

function rollHandfulsWithMaybeFavour(
  dieType: DieType,
  arity: number,
  cardinality: number,
  keep: Keep,
  exploding: boolean,
  favour: Favour,
): Handful | FavouredHandfuls {
  if (favour === "advantage") {
    let total = 0;
    const series1 = rollHandfulOfDice(
      dieType,
      arity,
      cardinality,
      keep,
      exploding,
    );
    const series2 = rollHandfulOfDice(
      dieType,
      arity,
      cardinality,
      keep,
      exploding,
    );
    if (series1.total > series2.total) {
      series2.kept = false;
      total = series1.total;
    } else {
      series1.kept = false;
      total = series2.total;
    }
    return {
      series1,
      series2,
      total,
    };
  } else if (favour === "disadvantage") {
    let total = 0;
    const series1 = rollHandfulOfDice(
      dieType,
      arity,
      cardinality,
      keep,
      exploding,
    );
    const series2 = rollHandfulOfDice(
      dieType,
      arity,
      cardinality,
      keep,
      exploding,
    );
    if (series1.total < series2.total) {
      series2.kept = false;
      total = series1.total;
    } else {
      series1.kept = false;
      total = series2.total;
    }
    return {
      series1,
      series2,
      total,
    };
  }
  return rollHandfulOfDice(dieType, arity, cardinality, keep, exploding);
}

function modify(operand1: number, operator: Operator, operand2: number) {
  if (operator === "+") return operand1 + operand2;
  if (operator === "-") return operand1 - operand2;
  if (operator === "*") return operand1 * operand2;
  if (operator === "/") return operand1 / operand2;
  throw new Error(`Unknown operator: ${operator as any}`);
}

export const rollServer = createServerCapability(rollCommon, {
  actionEffects: {
    doRoll: async ({ payload, sendChatMessage }) => {
      const { arity, cardinality, dieType, exploding, favour, keep, modifier } =
        payload;
      const faceGroup = rollHandfulsWithMaybeFavour(
        dieType,
        arity,
        cardinality,
        keep,
        exploding,
        favour,
      );
      sendChatMessage({
        formula: payload,
        result: {
          faces: faceGroup,
          total: modifier
            ? modify(faceGroup.total, modifier.operator, modifier.operand)
            : faceGroup.total,
        },
      });
    },
  },
});
