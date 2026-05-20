import { filesCapability } from "#/capabilities/filesCapability";
import { useRoomUiNavigationContext } from "#/components/DiceRoller/contexts/roomUiNavigationContext";
import { FileManager } from "#/components/FileManager/FileManager";
import type { FileManagerLocation } from "#/components/FileManager/types";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { authClient } from "#/utils/auth-client";
import { SharedStuff } from "./SharedStuff";
import { Tabs } from "@ark-ui/react/tabs";
import { memo, useEffect, useState } from "react";

const createRootLocation = (): FileManagerLocation => ({
  folderId: null,
  breadcrumbs: [],
  previewFileId: null,
  previewFileName: null,
});

type FilesTab = "shared" | "mine";

const isFilesTab = (value: string): value is FilesTab =>
  value === "shared" || value === "mine";

export const SidebarFiles = memo(() => {
  const capInfo = filesCapability.useMount();
  const { data: sessionData } = authClient.useSession();
  const { sharedFolderOpenRequest } = useRoomUiNavigationContext();
  const isAnonymous = sessionData?.user.isAnonymous ?? false;
  const [fileLocation, setFileLocation] =
    useState<FileManagerLocation>(createRootLocation);
  const [selectedTab, setSelectedTab] = useState<FilesTab>("shared");

  useEffect(() => {
    if (isAnonymous && selectedTab === "mine") {
      setSelectedTab("shared");
    }
  }, [isAnonymous, selectedTab]);

  useEffect(() => {
    if (sharedFolderOpenRequest) {
      setSelectedTab("shared");
    }
  }, [sharedFolderOpenRequest]);

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel isSaving={capInfo.patches.length > 0}>
      <Tabs.Root
        className="absolute inset-0 flex flex-col overflow-hidden"
        value={selectedTab}
        onValueChange={(details) => {
          if (isFilesTab(details.value)) {
            setSelectedTab(details.value);
          }
        }}
        orientation="horizontal"
        // asChild
      >
        <Tabs.List className="tabs tabs-border w-full">
          <Tabs.Trigger
            className="tab aria-selected:tab-active flex-1 basis-0"
            value="shared"
          >
            Shared with Room
          </Tabs.Trigger>
          {!isAnonymous && (
            <Tabs.Trigger
              className="tab aria-selected:tab-active flex-1 basis-0"
              value="mine"
            >
              My Files
            </Tabs.Trigger>
          )}
        </Tabs.List>
        <Tabs.Content
          className="relative flex-1 overflow-y-auto"
          value="shared"
        >
          <SharedStuff />
        </Tabs.Content>
        {!isAnonymous && (
          <Tabs.Content
            className="relative flex-1 overflow-y-auto pt-4"
            value="mine"
          >
            <FileManager
              location={fileLocation}
              onLocationChange={setFileLocation}
            />
          </Tabs.Content>
        )}
      </Tabs.Root>
    </SidebarPanel>
  );
});
