import { SidebarAdversaries } from "#/components/capabilityComponents/SidebarAdversaries/SidebarAdversaries";
import { SidebarCounter } from "#/components/capabilityComponents/SidebarCounter";
import { LaserFeelingsResultDisplay } from "#/components/capabilityComponents/SidebarLaserFeelings/LaserFeelingsResultDisplay";
import { SidebarLaserFeelings } from "#/components/capabilityComponents/SidebarLaserFeelings/SidebarLaserFeelings";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives/SidebarObjectives";
import { RollResultDisplay } from "#/components/capabilityComponents/SidebarRoll/RollResultDisplay";
import { SidebarRoll } from "#/components/capabilityComponents/SidebarRoll/SidebarRoll";
import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { adversariesCapability } from "./adversariesCapability";
import { counterCapability } from "./counterCapability";
import { laserFeelingsCapability } from "./laserFeelingsCapability";
import { objectivesCapability } from "./objectivesCapability";
import { rollCapability } from "./rollCapability";
import type { AnyCapability } from "./types";
import { Check, Dices, SquarePlus, Swords, Zap } from "lucide-react";
import type { ComponentType } from "react";

type CapabilityInfo = {
  capability: AnyCapability;
  sidebarInfos?: SidebarInfo[];
  /** Optional component to render this capability's roll messages in the chat log */
  ChatDisplayComponent?: ComponentType<{
    results?: JsonData;
    messageId: string;
  }>;
};

type SidebarInfo = {
  key: string;
  SidebarComponent: ComponentType;
  IconComponent: ComponentType;
};

const capabilityNames = [
  "counter",
  "objectives",
  "adversaries",
  "roll",
  "laserfeelings",
] as const;
export type CapabilityName = (typeof capabilityNames)[number];

export const capabilityRegistry: Record<CapabilityName, CapabilityInfo> = {
  counter: {
    capability: counterCapability,
    sidebarInfos: [
      {
        key: "counter",
        SidebarComponent: SidebarCounter,
        IconComponent: SquarePlus,
      },
    ],
  },
  objectives: {
    capability: objectivesCapability,
    sidebarInfos: [
      {
        key: "objectives",
        SidebarComponent: SidebarObjectives,
        IconComponent: Check,
      },
    ],
  },
  adversaries: {
    capability: adversariesCapability,
    sidebarInfos: [
      {
        key: "adversaries",
        SidebarComponent: SidebarAdversaries,
        IconComponent: Swords,
      },
    ],
  },
  roll: {
    capability: rollCapability,
    sidebarInfos: [
      {
        key: "roll",
        SidebarComponent: SidebarRoll,
        IconComponent: Dices,
      },
    ],
    ChatDisplayComponent: RollResultDisplay,
  },
  laserfeelings: {
    capability: laserFeelingsCapability,
    sidebarInfos: [
      {
        key: "laserfeelings",
        SidebarComponent: SidebarLaserFeelings,
        IconComponent: Zap,
      },
    ],
    ChatDisplayComponent: LaserFeelingsResultDisplay,
  },
};

export function isCapabilityName(
  name: string | undefined | null,
): name is CapabilityName {
  return !!name && name in capabilityRegistry;
}
