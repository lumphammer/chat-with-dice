import type { RollResult } from "#/validators/rpgDieRollerResulsTypes";

type DieChipProps = {
  die: RollResult;
  dicePool?: boolean;
};

export function DieChip({ die, dicePool = false }: DieChipProps) {
  const isDropped = !die.useInTotal;
  const isExploded = die.modifiers.includes("explode");
  const isCritSuccess = die.modifiers.includes("critical-success");
  const isCritFail = die.modifiers.includes("critical-failure");
  const isRerolled = die.modifiers.includes("re-roll");
  const isSuccess = die.modifiers.includes("target-success");
  const isFailure = die.modifiers.includes("target-failure");
  const isPoolCrit = isSuccess && isCritSuccess;
  const isMiss =
    dicePool && !isSuccess && !isFailure && !isDropped && !isCritFail;

  let extraClasses = "";
  if (isDropped) {
    extraClasses = "opacity-50 line-through decoration-2";
  } else if (isPoolCrit) {
    // success AND crit — stands out from plain success
    extraClasses = "text-success font-bold ring-2 ring-success";
  } else if (isSuccess) {
    extraClasses = "text-success ring-2 ring-success/50";
  } else if (isFailure) {
    extraClasses = "text-error ring-2 ring-error/50";
  } else if (isCritSuccess) {
    extraClasses = "text-success ring-2 ring-success/50";
  } else if (isCritFail) {
    extraClasses = "text-error ring-2 ring-error/50";
  } else if (isExploded) {
    extraClasses = "text-warning ring-2 ring-warning/50";
  } else if (isRerolled) {
    extraClasses = "opacity-50 line-through";
  } else if (isMiss) {
    extraClasses = "opacity-50";
  }

  return (
    <kbd className={`kbd kbd-sm tabular-nums ${extraClasses}`}>
      {die.value}
      {isExploded && <span className="text-warning ml-px">!</span>}
      {isPoolCrit && <span className="text-success ml-px">**</span>}
      {!isPoolCrit && isSuccess && (
        <span className="text-success ml-px">*</span>
      )}
      {isFailure && <span className="text-error ml-px">_</span>}
      {isCritFail && !isFailure && <span className="text-error ml-px">__</span>}
    </kbd>
  );
}
