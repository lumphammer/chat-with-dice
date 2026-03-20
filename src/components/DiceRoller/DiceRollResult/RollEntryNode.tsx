import type { RollEntry } from "#/validators/rpgDieRollerResulsTypes";
import { RollGroup } from "./RollGroup";
import { RollGroupContainer } from "./RollGroupContainer";

type RollEntryNodeProps = {
  entry: RollEntry;
};

export function RollEntryNode({ entry }: RollEntryNodeProps) {
  if (typeof entry === "string") {
    // operator: +, -, *, /
    return <span className="self-center opacity-40">{entry}</span>;
  }

  if (typeof entry === "number") {
    // literal modifier, e.g. the +3 in "2d6+3"
    return (
      <span className="self-center font-mono text-sm opacity-60">{entry}</span>
    );
  }

  if (entry.type === "roll-results") {
    return <RollGroup group={entry} />;
  }

  if (entry.type === "result-group" && entry.isRollGroup) {
    return <RollGroupContainer group={entry} />;
  }

  return null;
}
