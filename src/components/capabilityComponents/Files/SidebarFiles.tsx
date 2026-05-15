import { filesCapability } from "#/capabilities/filesCapability";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { memo } from "react";

export const SidebarFiles = memo(() => {
  const capInfo = filesCapability.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Files" isSaving={capInfo.patches.length > 0}>
      Files
    </SidebarPanel>
  );
});
