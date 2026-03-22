import type { ResultGroup } from "#/validators/rpgDieRollerResulsTypes";
import { SubExpression } from "./SubExpression";

type RollGroupContainerProps = {
  group: ResultGroup;
};

export function RollGroupContainer({ group }: RollGroupContainerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {group.results.map((entry, i) => {
        if (typeof entry === "object" && entry.type === "result-group") {
          return <SubExpression key={i} group={entry} />;
        }
        return null;
      })}
    </div>
  );
}
