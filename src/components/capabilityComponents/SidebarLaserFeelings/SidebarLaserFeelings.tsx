import { laserfeelingsClient } from "#/capabilities/laserfeelings/client";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { LaserFeelingsForm } from "./LaserFeelingsForm";
import { memo } from "react";

export const SidebarLaserFeelings = memo(() => {
  const capInfo = laserfeelingsClient.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel
      title="Lasers & Feelings"
      isSaving={capInfo.patches.length > 0}
    >
      <LaserFeelingsForm
        onRoll={(formula) => capInfo.actions.doRoll(formula)}
      />
    </SidebarPanel>
  );
});

SidebarLaserFeelings.displayName = "SidebarLaserFeelings";
