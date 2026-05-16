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
        className="absolute inset-0 flex flex-col overflow-hidden"
        defaultValue={"mine"}
        orientation="horizontal"
        // asChild
      >
        <Tabs.List className="tabs tabs-lift w-full">
          <Tabs.Trigger
            className="tab aria-selected:tab-active flex-1 basis-0"
            value="shared"
          >
            Shared with Room
          </Tabs.Trigger>
          <Tabs.Trigger
            className="tab aria-selected:tab-active flex-1 basis-0"
            value="mine"
          >
            My Files
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content
          className="relative flex-1 overflow-y-auto"
          value="shared"
        >
          Shared files
        </Tabs.Content>
        <Tabs.Content className="relative flex-1 overflow-y-auto" value="mine">
          <FileManager
            location={fileLocation}
            onLocationChange={setFileLocation}
          />
        </Tabs.Content>
      </Tabs.Root>
    </SidebarPanel>
  );
});
