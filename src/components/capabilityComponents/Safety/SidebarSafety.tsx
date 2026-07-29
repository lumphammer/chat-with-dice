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
      <SafetySignalButtons />
      <AvoidList />
    </SidebarPanel>
  );
});

SidebarSafety.displayName = "SidebarSafety";
