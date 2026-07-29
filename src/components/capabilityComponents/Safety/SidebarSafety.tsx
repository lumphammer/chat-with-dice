import { safetyClient } from "#/capabilities/safety/client";
import { SidebarPanel } from "../shared/SidebarPanel";
import { AvoidList } from "./AvoidList";
import { SafetySignalButtons } from "./SafetySignalButtons";
import { memo } from "react";

export const SidebarSafety = memo(() => {
  const capInfo = safetyClient.useMount();

  return (
    <SidebarPanel
      title="Safety tools"
      isSaving={capInfo.initialised && capInfo.patches.length > 0}
    >
      <section className="mt-4">
        <h3 className="heading">Open Door Policy</h3>
        <p className="text-sm">
          Anyone may step away at any time, for any reason, without explanation.
        </p>
      </section>
      <SafetySignalButtons />
      <AvoidList />
    </SidebarPanel>
  );
});

SidebarSafety.displayName = "SidebarSafety";
