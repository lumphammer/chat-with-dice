import { rollClient } from "#/capabilities/roll/client";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { RollForm } from "./RollForm";
import { memo } from "react";

export const SidebarRoll = memo(() => {
  const capInfo = rollClient.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Roll Dice" isSaving={capInfo.patches.length > 0}>
      <RollForm onRoll={(formula) => capInfo.actions.doRoll(formula)} />
    </SidebarPanel>
  );
});

SidebarRoll.displayName = "SidebarRoll";
