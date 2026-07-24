import { rollClient } from "#/capabilities/roll/client";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { RollForm } from "./RollForm";
import { memo } from "react";

export const SidebarRoll = memo(() => {
  const capInfo = rollClient.useMount();
  const closeMobileSidebar = useCloseMobileSidebar();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Roll Dice" isSaving={capInfo.patches.length > 0}>
      <RollForm
        onRoll={(formula) => {
          capInfo.actions.doRoll(formula);
          closeMobileSidebar();
        }}
      />
    </SidebarPanel>
  );
});

SidebarRoll.displayName = "SidebarRoll";
