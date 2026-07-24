import { havocClient } from "#/capabilities/havoc/client";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { CreateObjectiveForm } from "./CreateObjectiveForm";
import { ObjectiveDisplay } from "./ObjectiveDisplay";
import { memo } from "react";

export const SidebarObjectives = memo(() => {
  const capInfo = havocClient.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Objectives" isSaving={capInfo.patches.length > 0}>
      <CreateObjectiveForm />
      {capInfo.state.objectives.map((objective) => (
        <ObjectiveDisplay
          key={objective.id}
          objective={objective}
          onDelete={() => capInfo.actions.deleteObjective({ id: objective.id })}
          onSetResilience={(resilience) =>
            capInfo.actions.setObjectiveResilience({
              id: objective.id,
              resilience,
            })
          }
          onUpdateObjective={(update) =>
            capInfo.actions.updateObjective({ id: objective.id, ...update })
          }
        />
      ))}
    </SidebarPanel>
  );
});
