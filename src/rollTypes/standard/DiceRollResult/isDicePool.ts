import type { RollResults } from "#/validators/rpgDieRollerResulsTypes";

export function isDicePool(group: RollResults): boolean {
  return group.rolls.some(
    (r) =>
      r.modifiers.includes("target-success") ||
      r.modifiers.includes("target-failure"),
  );
}
