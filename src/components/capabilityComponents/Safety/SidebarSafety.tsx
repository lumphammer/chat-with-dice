import { safetyClient } from "#/capabilities/safety/client";
import { SidebarPanel } from "../shared/SidebarPanel";
import { AvoidList } from "./AvoidList";
import { Credits } from "./Credits";
import { Intro } from "./Intro";
import { SafetySignalButtons } from "./SafetySignalButtons";
import { memo } from "react";

export const SidebarSafety = memo(() => {
  const capInfo = safetyClient.useMount();

  return (
    <SidebarPanel
      title="Safety tools"
      isSaving={capInfo.initialised && capInfo.patches.length > 0}
    >
      <Intro />
      <SafetySignalButtons />
      <AvoidList />
      <Credits />
    </SidebarPanel>
  );
});

SidebarSafety.displayName = "SidebarSafety";
