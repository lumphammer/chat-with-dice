import { counterCapability } from "#/capabilities/counterCapability";
import { memo } from "react";

export const SidebarCounter = memo(() => {
  const capInfo = counterCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <div>
      Sidebar Counter: {capInfo.state?.count ?? "loading?"}
      <button onClick={() => capInfo.actions.increment({ by: 1 })}>
        Increment
      </button>
    </div>
  );
});
