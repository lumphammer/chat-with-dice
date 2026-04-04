import { objectivesCapability } from "#/capabilities/objectivesCapability";
import { memo } from "react";

export const SidebarObjectives = memo(() => {
  const capInfo = objectivesCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <div className="p-4">
      <h2 className="text-3xl">Objectives</h2>
    </div>
  );
});
