import { rollClient } from "#/capabilities/roll/client";
import { useCloseMobileSidebar } from "#/components/Sidebar/mobileSidebarContext";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { RollForm } from "./RollForm";
import { memo, useCallback, type ComponentProps } from "react";

export const SidebarRoll = memo(() => {
  const capInfo = rollClient.useMount();
  const closeMobileSidebar = useCloseMobileSidebar();

  const handleRoll = useCallback(
    (formula: Parameters<ComponentProps<typeof RollForm>["onRoll"]>[0]) => {
      if (capInfo.initialised) {
        capInfo.actions.doRoll(formula);
        closeMobileSidebar();
      }
    },
    [capInfo, closeMobileSidebar],
  );

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Roll Dice" isSaving={capInfo.patches.length > 0}>
      <RollForm onRoll={handleRoll} />
    </SidebarPanel>
  );
});

SidebarRoll.displayName = "SidebarRoll";
