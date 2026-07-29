import { createClientCapability } from "#/capabilities/createClientCapability";
import { SafetySignalMessageDisplay } from "#/components/capabilityComponents/Safety/SafetySignalMessageDisplay";
import { SafetySignalOverlay } from "#/components/capabilityComponents/Safety/SafetySignalOverlay";
import { SidebarSafety } from "#/components/capabilityComponents/Safety/SidebarSafety";
import { safetyCommon } from "./common";
import { ShieldAlert } from "lucide-react";

export const safetyClient = createClientCapability(safetyCommon, {
  sidebarInfos: [
    {
      key: "safety",
      label: "Safety tools",
      SidebarComponent: SidebarSafety,
      IconComponent: ShieldAlert,
    },
  ],
  ChatDisplayComponent: SafetySignalMessageDisplay,
  RoomOverlayComponent: SafetySignalOverlay,
});
