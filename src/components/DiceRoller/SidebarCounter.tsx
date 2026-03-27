import { counterCapability } from "#/capabilities/counterCapability";
import { memo } from "react";

export const SidebarCounter = memo(() => {
  const { state, actions } = counterCapability.useMount();
  return (
    <div>
      Sidebar Counter: {state?.count ?? "loading?"}
      <button onClick={() => actions.increment({ by: 1 })}>Increment</button>
    </div>
  );
});
