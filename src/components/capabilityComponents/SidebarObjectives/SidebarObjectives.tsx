import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { CreateObjectiveForm } from "./CreateObjectiveForm";
import { ObjectiveDisplay } from "./ObjectiveDisplay";
import { LoaderCircleIcon } from "lucide-react";
import { memo } from "react";

export const SidebarObjectives = memo(() => {
  const capInfo = objectivesCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <div className="relative h-full overflow-scroll p-4">
      {capInfo.patches.length > 0 && (
        <LoaderCircleIcon
          className="text-base-content/40 absolute top-4 right-4 h-5 w-5
            animate-spin"
          aria-label="Saving…"
        />
      )}
      <h2 className="text-3xl">Objectives</h2>
      <CreateObjectiveForm />
      {capInfo.state.objectives.map((objective) => (
        <ObjectiveDisplay
          key={objective.id}
          objective={objective}
          onDelete={() => capInfo.actions.deleteObjective({ id: objective.id })}
          onSetResilience={(resilience) =>
            capInfo.actions.setResilience({ id: objective.id, resilience })
          }
          onUpdateObjective={(update) =>
            capInfo.actions.updateObjective({ id: objective.id, ...update })
          }
        />
      ))}
    </div>
  );
});
