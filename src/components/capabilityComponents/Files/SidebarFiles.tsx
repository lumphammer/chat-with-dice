import { filesCapability } from "#/capabilities/filesCapability";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { FileManager } from "#/pages/files/_components/FileManager";
import type { FileManagerLocation } from "#/pages/files/_components/types";
import { Tabs } from "@ark-ui/react/tabs";
import { memo, useState } from "react";

const createRootLocation = (): FileManagerLocation => ({
  folderId: null,
  breadcrumbs: [],
  previewFileId: null,
  previewFileName: null,
});

export const SidebarFiles = memo(() => {
  const capInfo = filesCapability.useMount();
  const [fileLocation, setFileLocation] =
    useState<FileManagerLocation>(createRootLocation);

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="Files" isSaving={capInfo.patches.length > 0}>
      <Tabs.Root
        className="tabs tabs-border"
        defaultValue={"shared"}
        orientation="horizontal"
        // asChild
      >
        <Tabs.List className="tabs tabs-lift w-full">
          <Tabs.Trigger className="tab aria-selected:tab-active" value="shared">
            Shared
          </Tabs.Trigger>
          <Tabs.Trigger className="tab aria-selected:tab-active" value="mine">
            Mine
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content className="" value="shared">
          Shared files
        </Tabs.Content>
        <Tabs.Content className="" value="mine">
          <FileManager
            location={fileLocation}
            onLocationChange={setFileLocation}
          />
        </Tabs.Content>
      </Tabs.Root>
    </SidebarPanel>
  );
});
