import { filesClient } from "#/capabilities/files/client";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { SharedStuff } from "./SharedStuff";
import { memo } from "react";

export const SidebarSharedFiles = memo(() => {
  const capInfo = filesClient.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel
      title="Shared with room"
      isSaving={capInfo.patches.length > 0}
    >
      <SharedStuff />
    </SidebarPanel>
  );
});

SidebarSharedFiles.displayName = "SidebarSharedFiles";
