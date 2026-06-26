import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  D6_FACES,
  type Face,
  type Mode,
  type YourNumber,
  laserfeelingsCommon,
} from "./common";

function rollD6(): number {
  return Math.floor(Math.random() * D6_FACES) + 1;
}

function evaluateFace(
  result: number,
  yourNumber: YourNumber,
  mode: Mode,
): Face {
  const laserFeelings = result === yourNumber;
  const beats = mode === "lasers" ? result < yourNumber : result > yourNumber;
  return {
    result,
    laserFeelings,
    success: laserFeelings || beats,
  };
}

export const laserfeelingsServer = createServerCapability(laserfeelingsCommon, {
  actionEffects: {
    doRoll: async ({ payload, sendChatMessage }) => {
      const { yourNumber, numberOfDice, mode } = payload;
      const faces: Face[] = Array.from({ length: numberOfDice }, () =>
        evaluateFace(rollD6(), yourNumber, mode),
      );
      const successCount = faces.filter((f) => f.success).length;
      const laserFeelingsCount = faces.filter((f) => f.laserFeelings).length;
      sendChatMessage({
        formula: payload,
        result: {
          faces,
          successCount,
          laserFeelingsCount,
        },
      });
    },
  },
});
