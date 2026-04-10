import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { ItemCard } from "#/components/capabilityComponents/shared/ItemCard";
import { ResilienceTracker } from "#/components/capabilityComponents/shared/ResilienceTracker";
import { ObjectiveEditForm } from "./ObjectiveEditForm";

type MountedCapInfo = Extract<
  ReturnType<typeof objectivesCapability.useMount>,
  { initialised: true }
>;
export type Objective = MountedCapInfo["state"]["objectives"][number];

interface Props {
  objective: Objective;
  onDelete: () => void;
  onSetResilience: (resilience: number) => void;
  onUpdateObjective: (update: {
    name: string;
    isPrimary: boolean;
    difficulty: number;
    startingResilience: number;
  }) => void;
}

export const ObjectiveDisplay = ({
  objective,
  onDelete,
  onSetResilience,
  onUpdateObjective,
}: Props) => {
  const hasBadges = objective.isPrimary || objective.difficulty > 0;

  return (
    <ItemCard
      name={objective.name}
      isCompleted={objective.resilience <= 0}
      itemType="objective"
      onDelete={onDelete}
      badges={
        hasBadges ? (
          <>
            {objective.isPrimary && (
              <span className="badge badge-secondary badge-sm align-middle">
                Primary
              </span>
            )}
            {objective.difficulty > 0 && (
              <span className="badge badge-primary badge-sm">
                Difficulty {objective.difficulty}
              </span>
            )}
          </>
        ) : undefined
      }
      renderEditForm={({ onDone }) => (
        <ObjectiveEditForm
          objective={objective}
          onSave={(update) => {
            onUpdateObjective(update);
            onDone();
          }}
          onCancel={onDone}
        />
      )}
    >
      <ResilienceTracker
        startingResilience={objective.startingResilience}
        resilience={objective.resilience}
        onSetResilience={onSetResilience}
      />
    </ItemCard>
  );
};
