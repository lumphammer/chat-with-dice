import { filesClient } from "#/capabilities/files/client";
import { FileManager } from "#/components/FileManager/FileManager";
import type { FileManagerLocation } from "#/components/FileManager/types";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { memo, useState } from "react";

const createRootLocation = (): FileManagerLocation => ({
  folderId: null,
  breadcrumbs: [],
  previewFileId: null,
  previewFileName: null,
});

export const SidebarMyFiles = memo(() => {
  const capInfo = filesClient.useMount();
  const [location, setLocation] =
    useState<FileManagerLocation>(createRootLocation);

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="My files" isSaving={capInfo.patches.length > 0}>
      <div className="pt-4">
        <FileManager location={location} onLocationChange={setLocation} />
      </div>
    </SidebarPanel>
  );
});

SidebarMyFiles.displayName = "SidebarMyFiles";
