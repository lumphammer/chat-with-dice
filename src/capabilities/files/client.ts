import { createClientCapability } from "#/capabilities/createClientCapability";
import { SharedItemMessageDisplay } from "#/components/capabilityComponents/Files/SharedItemMessageDisplay";
import { SidebarMyFiles } from "#/components/capabilityComponents/Files/SidebarMyFiles";
import { SidebarSharedFiles } from "#/components/capabilityComponents/Files/SidebarSharedFiles";
import { filesCommon } from "./common";
import { Folder, Share2 } from "lucide-react";

export const filesClient = createClientCapability(filesCommon, {
  sidebarInfos: [
    {
      key: "shared",
      label: "Shared with room",
      SidebarComponent: SidebarSharedFiles,
      IconComponent: Share2,
    },
    {
      key: "mine",
      label: "My files",
      SidebarComponent: SidebarMyFiles,
      IconComponent: Folder,
      isVisible: ({ viewer }) => viewer?.isAnonymous === false,
    },
  ],
  ChatDisplayComponent: SharedItemMessageDisplay,
});
