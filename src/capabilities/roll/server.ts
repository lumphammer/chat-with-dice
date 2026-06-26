import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  type Face,
  type FavouredHandfuls,
  type Handful,
  type Keep,
  type Favour,
  type Operator,
  rollCommon,
} from "./common";

function rollOneDie(cardinality: number): Face {
  return {
    cardinality,
    exploded: false,
    kept: true,
    result: Math.floor(Math.random() * cardinality) + 1,
  };
}

function rollMaybeExplodingDice(
  cardinality: number,
  exploding: boolean,
): Face[] {
  const faces: Face[] = [rollOneDie(cardinality)];
  if (exploding) {
    while (faces[faces.length - 1].result === cardinality) {
      faces[faces.length - 1].exploded = true;
      faces.push(rollOneDie(cardinality));
    }
  }
  return faces;
}

function rollHandfulOfDice(
  arity: number,
  cardinality: number,
  keep: Keep,
  exploding: boolean,
): Handful {
  const sorted = Array.from({ length: arity }, () => {
    return rollMaybeExplodingDice(cardinality, exploding);
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
  arity: number,
  cardinality: number,
  keep: Keep,
  exploding: boolean,
  favour: Favour,
): Handful | FavouredHandfuls {
  if (favour === "advantage") {
    let total = 0;
    const series1 = rollHandfulOfDice(arity, cardinality, keep, exploding);
    const series2 = rollHandfulOfDice(arity, cardinality, keep, exploding);
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
    const series1 = rollHandfulOfDice(arity, cardinality, keep, exploding);
    const series2 = rollHandfulOfDice(arity, cardinality, keep, exploding);
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
  return rollHandfulOfDice(arity, cardinality, keep, exploding);
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
      const { arity, cardinality, exploding, favour, keep, modifier } = payload;
      const faceGroup = rollHandfulsWithMaybeFavour(
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
