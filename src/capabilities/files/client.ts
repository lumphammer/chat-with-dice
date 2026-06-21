import { createClientCapability } from "#/capabilities/createClientCapability";
import { SharedItemMessageDisplay } from "#/components/capabilityComponents/Files/SharedItemMessageDisplay";
import { SidebarFiles } from "#/components/capabilityComponents/Files/SidebarFiles";
import { filesCommon } from "./common";
import { Folder } from "lucide-react";

export const filesClient = createClientCapability(filesCommon, {
  visibility: "public",
  sidebarInfos: [
    {
      key: "files",
      SidebarComponent: SidebarFiles,
      IconComponent: Folder,
    },
  ],
  ChatDisplayComponent: SharedItemMessageDisplay,
});
