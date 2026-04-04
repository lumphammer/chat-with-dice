import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { CreateObjectiveForm } from "./CreateObjectiveForm";
import { memo, useState } from "react";

export const SidebarObjectives = memo(() => {
  const capInfo = objectivesCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <div className="p-4">
      <h2 className="text-3xl">Objectives</h2>
      <CreateObjectiveForm />
      {capInfo.state.objectives.map((objective) => {
        return (
          <div key={objective.id}>
            <h3>{objective.name}</h3>
            <p>Difficulty: {objective.difficulty}</p>
            <p>
              Resilience: {objective.resilience} /{" "}
              {objective.startingResilience}
            </p>
          </div>
        );
      })}
    </div>
  );
});
