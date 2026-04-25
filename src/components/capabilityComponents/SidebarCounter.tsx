import { counterCapability } from "#/capabilities/counterCapability";
import { SidebarPanel } from "./shared/SidebarPanel";
import { memo } from "react";

export const SidebarCounter = memo(() => {
  const capInfo = counterCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Counter" isSaving={capInfo.patches.length > 0}>
      <p className="sm text-base-content/70">
        A minimal room capability. Click the button to increment the number.
      </p>
      <p className="text-base-content/70 my-4 text-5xl">
        {capInfo.state?.count ?? "loading?"}
      </p>
      <button
        className="btn btn-primary"
        onClick={() => capInfo.actions.increment({ by: 1 })}
      >
        Increment
      </button>
      <h3 className="mt-4 text-xl">Patches</h3>
      <p className="sm text-base-content/70">
        This shows pending optimistic state patches. Every time you click
        "increment" a patch is added to the list; when the corresponding state
        update comes back from the server, the patch is removed.
      </p>
      <pre className="text-sm">{JSON.stringify(capInfo.patches, null, 2)}</pre>
    </SidebarPanel>
  );
});
