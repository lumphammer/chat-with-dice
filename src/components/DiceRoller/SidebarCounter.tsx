import { counterCapability } from "#/capabilities/counterCapability";
import { memo } from "react";

export const SidebarCounter = memo(() => {
  const { state } = counterCapability.useMount();
  return <div>Sidebar Counter: {state?.count ?? "loading?"}</div>;
});
