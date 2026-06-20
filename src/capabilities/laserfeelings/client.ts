import { createClientCapability } from "#/capabilities/createClientCapability";
import { LaserFeelingsResultDisplay } from "#/components/capabilityComponents/SidebarLaserFeelings/LaserFeelingsResultDisplay";
import { SidebarLaserFeelings } from "#/components/capabilityComponents/SidebarLaserFeelings/SidebarLaserFeelings";
import { laserfeelingsCommon } from "./common";
import { Zap } from "lucide-react";

export const laserfeelingsClient = createClientCapability(laserfeelingsCommon, {
  visibility: "public",
  sidebarInfos: [
    {
      key: "laserfeelings",
      SidebarComponent: SidebarLaserFeelings,
      IconComponent: Zap,
    },
  ],
  ChatDisplayComponent: LaserFeelingsResultDisplay,
});
