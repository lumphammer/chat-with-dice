import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { ResilienceTracker } from "./ResilienceTracker";

type MountedCapInfo = Extract<
  ReturnType<typeof objectivesCapability.useMount>,
  { initialised: true }
>;
type Objective = MountedCapInfo["state"]["objectives"][number];

interface Props {
  objective: Objective;
  onSetResilience: (resilience: number) => void;
}

export const ObjectiveDisplay = ({ objective, onSetResilience }: Props) => {
  return (
    <div className="border-base-content/20 rounded-box my-2 border p-3">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="grow font-semibold">{objective.name}</h3>
        {objective.isPrimary && (
          <span className="badge badge-primary badge-sm">Primary</span>
        )}
      </div>
      <ResilienceTracker
        startingResilience={objective.startingResilience}
        resilience={objective.resilience}
        onSetResilience={onSetResilience}
      />
    </div>
  );
};
