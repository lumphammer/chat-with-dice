import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { DeleteButton } from "./DeleteButton";
import { ObjectiveEditForm } from "./ObjectiveEditForm";
import { ResilienceTracker } from "./ResilienceTracker";
import { PencilIcon, Check } from "lucide-react";
import { useState } from "react";

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
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="border-base-content/60 data-editing:border-primary rounded-box
        my-4 border p-3 data-completed:opacity-50"
      data-editing={isEditing ? "" : undefined}
      data-completed={!isEditing && objective.resilience <= 0 ? "" : undefined}
    >
      {isEditing ? (
        <ObjectiveEditForm
          objective={objective}
          onSave={(update) => {
            onUpdateObjective(update);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <>
          <div className="mb-1 flex items-start gap-2">
            <h3 className="min-w-0 grow font-semibold">
              {objective.name}
              {objective.resilience <= 0 ? <Check className="inline" /> : null}
            </h3>
            <DeleteButton onDelete={onDelete} />
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-base-content/50 hover:text-base-content -mr-1
                shrink-0 rounded p-1 transition-colors"
              aria-label="Edit objective"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-2 flex gap-1">
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
            {/*{objective.resilience <= 0 && (
              <span className="badge badge-accent badge-sm align-middle">
                Completed
              </span>
            )}*/}
          </div>
          <ResilienceTracker
            startingResilience={objective.startingResilience}
            resilience={objective.resilience}
            onSetResilience={onSetResilience}
          />
        </>
      )}
    </div>
  );
};
