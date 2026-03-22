import type { RollResults } from "#/validators/rpgDieRollerResulsTypes";
import { DieChip } from "./DieChip";
import { isDicePool } from "./isDicePool";

type RollGroupProps = {
  group: RollResults;
};

export function RollGroup({ group }: RollGroupProps) {
  const pool = isDicePool(group);

  return (
    <div className="flex flex-wrap gap-1">
      {group.rolls.map((die, i) => (
        <DieChip key={i} die={die} dicePool={pool} />
      ))}
    </div>
  );
}
