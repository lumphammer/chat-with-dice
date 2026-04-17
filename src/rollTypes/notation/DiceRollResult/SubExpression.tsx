import type { ResultGroup } from "#/validators/rpgDieRollerResulsTypes";
import { RollEntryNode } from "./RollEntryNode";

type SubExpressionProps = {
  group: ResultGroup;
};

export function SubExpression({ group }: SubExpressionProps) {
  const isDropped = !group.useInTotal;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 rounded-lg border px-2 py-1
        ${isDropped ? "border-base-300 opacity-35" : "border-base-content/20"}`}
    >
      {group.results.map((entry, i) => (
        <RollEntryNode key={i} entry={entry} />
      ))}
      <span
        className={`ml-1 text-sm font-semibold tabular-nums ${
          isDropped ? "line-through" : "opacity-70"
        }`}
      >
        ={group.value}
      </span>
    </div>
  );
}
