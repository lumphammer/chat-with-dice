import { counterCapability } from "#/capabilities/counterCapability";
import { memo } from "react";

export const SidebarCounter = memo(() => {
  const capInfo = counterCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <div>
      <h2>Sidebar Counter</h2>
      <p className="text-5xl">{capInfo.state?.count ?? "loading?"}</p>
      <button
        className="btn btn-primary"
        onClick={() => capInfo.actions.increment({ by: 1 })}
      >
        Increment
      </button>
      <h3 className="mt-4 text-xl">Patches</h3>
      <pre className="text-sm">{JSON.stringify(capInfo.patches, null, 2)}</pre>
    </div>
  );
});
