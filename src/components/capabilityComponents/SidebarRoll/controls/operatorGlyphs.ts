import type { Operator } from "#/capabilities/roll/common";

// × and ÷ read better than the raw * and / operators.
export const OPERATOR_GLYPHS: Record<Operator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};
