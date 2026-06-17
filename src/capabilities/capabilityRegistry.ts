import { SharedItemMessageDisplay } from "#/components/capabilityComponents/Files/SharedItemMessageDisplay";
import { SidebarFiles } from "#/components/capabilityComponents/Files/SidebarFiles";
import { SidebarAdversaries } from "#/components/capabilityComponents/SidebarAdversaries/SidebarAdversaries";
import { SidebarCounter } from "#/components/capabilityComponents/SidebarCounter";
import { SidebarFeedback } from "#/components/capabilityComponents/SidebarFeedback";
import { LaserFeelingsResultDisplay } from "#/components/capabilityComponents/SidebarLaserFeelings/LaserFeelingsResultDisplay";
import { SidebarLaserFeelings } from "#/components/capabilityComponents/SidebarLaserFeelings/SidebarLaserFeelings";
import { SidebarObjectives } from "#/components/capabilityComponents/SidebarObjectives/SidebarObjectives";
import { RollResultDisplay } from "#/components/capabilityComponents/SidebarRoll/RollResultDisplay";
import { SidebarRoll } from "#/components/capabilityComponents/SidebarRoll/SidebarRoll";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import { adversariesCapability } from "./adversariesCapability";
import { counterCapability } from "./counterCapability";
import { feedbackTestCapability } from "./feedbackTestCapability";
import { filesCapability } from "./filesCapability";
import { laserFeelingsCapability } from "./laserFeelingsCapability";
import { objectivesCapability } from "./objectivesCapability";
import { rollCapability } from "./rollCapability";
import type { AnyCapability } from "./types";
import {
  Check,
  Dices,
  SquarePlus,
  Swords,
  Zap,
  Folder,
  Speech,
} from "lucide-react";
import type { ComponentType } from "react";

type CapabilityInfo = {
  capability: AnyCapability;
  sidebarInfos?: SidebarInfo[];
  /** Optional component to render this capability's roll messages in the chat log */
  ChatDisplayComponent?: ComponentType<{
    results?: JsonData;
    messageId: string;
  }>;
  visibility?: "public" | "dev";
};

type SidebarInfo = {
  key: string;
  SidebarComponent: ComponentType;
  IconComponent: ComponentType;
};

export const capabilityNames = [
  "counter",
  "objectives",
  "adversaries",
  "roll",
  "laserfeelings",
  "files",
  "feedback",
] as const;

export type CapabilityName = (typeof capabilityNames)[number];

export const capabilityRegistry: Record<CapabilityName, CapabilityInfo> = {
  counter: {
    visibility: "public",
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
    visibility: "public",
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
    visibility: "public",
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
    visibility: "public",
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
    visibility: "public",
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
  files: {
    visibility: "public",
    capability: filesCapability,
    sidebarInfos: [
      {
        key: "files",
        SidebarComponent: SidebarFiles,
        IconComponent: Folder,
      },
    ],
    ChatDisplayComponent: SharedItemMessageDisplay,
  },
  feedback: {
    visibility: "dev",
    capability: feedbackTestCapability,
    sidebarInfos: [
      {
        key: "feedback",
        SidebarComponent: SidebarFeedback,
        IconComponent: Speech,
      },
    ],
  },
};

export function isCapabilityName(
  name: string | undefined | null,
): name is CapabilityName {
  return !!name && name in capabilityRegistry;
}
