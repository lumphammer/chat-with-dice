import {
  $6,
  HAVOC_CRITICAL_DEGREE,
  HAVOC_CRITICAL_MIN,
  HAVOC_FAILURE_DEGREE,
  HAVOC_SUCCESS_DEGREE,
  HAVOC_SUCCESS_MIN,
} from "#/constants";
import type { HavocFace, HavocFormula, HavocResult } from "./havocValidators";

function d(size: number): number {
  return Math.floor(Math.random() * size) + 1;
}

export const havocHandler = (formula: HavocFormula): HavocResult => {
  const faces = Array.from({ length: formula.numDice }).map<HavocFace>(() => {
    const faceValue = d($6);
    return faceValue < HAVOC_SUCCESS_MIN
      ? {
          faceValue,
          degree: HAVOC_FAILURE_DEGREE,
        }
      : faceValue < HAVOC_CRITICAL_MIN
        ? {
            faceValue,
            degree: HAVOC_SUCCESS_DEGREE,
          }
        : {
            faceValue,
            degree: HAVOC_CRITICAL_DEGREE,
            usedForSpecial: false,
          };
  });
  return {
    faces,
  };
};
