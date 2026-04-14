import { createCapability } from "./createCapability";
import { z } from "zod/v4";

// TERMINOLOGY
// FACE: a die that has landed on the table and is showing a number
// HANDFUL: a group of dice thrown together
// FAVOUR: Advantage or disadvantage

const keepValidator = z
  .enum(["all", "highest", "lowest", "dropHighest", "dropLowest"])
  .default("all");

type Keep = z.infer<typeof keepValidator>;

const favourValidator = z.enum(["normal", "advantage", "disadvantage"]);

const operatorValidator = z.enum(["+", "-", "*", "/"]);

type Operator = z.infer<typeof operatorValidator>;

type Favour = z.infer<typeof favourValidator>;

const rollFormulaValidator = z.object({
  arity: z.int().min(1),
  cardinality: z.int().min(1),
  modifier: z
    .object({
      operator: operatorValidator,
      operand: z.number(),
    })
    .optional(),
  favour: favourValidator,
  keep: keepValidator,
  exploding: z.boolean(),
});

const faceValidator = z.object({
  cardinality: z.int().min(1),
  result: z.int().min(1),
  exploded: z.boolean(),
  kept: z.boolean(),
});

type Face = z.infer<typeof faceValidator>;

const handfulValidator = z.object({
  faces: z.array(faceValidator),
  total: z.int(),
  kept: z.boolean(),
});

type Handful = z.infer<typeof handfulValidator>;

const favouredHandfulsValidator = z.object({
  series1: handfulValidator,
  series2: handfulValidator,
  total: z.int(),
});

type FavouredHandfuls = z.infer<typeof favouredHandfulsValidator>;

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
  // finally
  return rollHandfulOfDice(arity, cardinality, keep, exploding);
}

const messageDataValidator = z.object({
  formula: rollFormulaValidator,
  result: z.object({
    faces: z.union([handfulValidator, favouredHandfulsValidator]),
    total: z.int(),
  }),
});

type MessageData = z.infer<typeof messageDataValidator>;

function modify(operand1: number, operator: Operator, operand2: number) {
  if (operator === "+") return operand1 + operand2;
  if (operator === "-") return operand1 - operand2;
  if (operator === "*") return operand1 * operand2;
  if (operator === "/") return operand1 / operand2;
  throw new Error(`Unknown operator: ${operator as any}`);
}

export const rollCapability = createCapability({
  name: "roll",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: z.object({}),
  getInitialState: () => ({}),
  initialise: () => {},
  messageDataValidator,
  buildActions: ({ createAction }) => {
    return {
      doRoll: createAction({
        payloadValidator: rollFormulaValidator,
        effectfulFn: async ({ payload, sendChatMessage, chatId }) => {
          const { arity, cardinality, exploding, favour, keep, modifier } =
            payload;
          const faceGroup = rollHandfulsWithMaybeFavour(
            arity,
            cardinality,
            keep,
            exploding,
            favour,
          );
          const messageData: MessageData = {
            formula: payload,
            result: {
              faces: faceGroup,
              total: modifier
                ? modify(faceGroup.total, modifier.operator, modifier.operand)
                : faceGroup.total,
            },
          };
          sendChatMessage({
            chat: "",
            chatId,
            created_time: Date.now(),
            displayName: "",
            id: "",
            rollType: "",
            formula: {},
            results: messageData,
          });
        },
      }),
    };
  },
});
