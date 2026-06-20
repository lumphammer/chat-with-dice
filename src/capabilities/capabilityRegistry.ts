import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import { adversariesCapability } from "./adversariesCapability";
import { counterCapability } from "./counterCapability";
import { feedbackTestCapability } from "./feedbackTestCapability";
import { filesCapability } from "./filesCapability";
import { laserFeelingsCapability } from "./laserFeelingsCapability";
import { objectivesCapability } from "./objectivesCapability";
import { rollCapability } from "./rollCapability";
import type { AnyCapability } from "./types";
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
    visibility: counterCapability.visibility,
    capability: counterCapability,
    sidebarInfos: counterCapability.sidebarInfos,
    ChatDisplayComponent: counterCapability.ChatDisplayComponent,
  },
  objectives: {
    visibility: objectivesCapability.visibility,
    capability: objectivesCapability,
    sidebarInfos: objectivesCapability.sidebarInfos,
    ChatDisplayComponent: objectivesCapability.ChatDisplayComponent,
  },
  adversaries: {
    visibility: adversariesCapability.visibility,
    capability: adversariesCapability,
    sidebarInfos: adversariesCapability.sidebarInfos,
    ChatDisplayComponent: adversariesCapability.ChatDisplayComponent,
  },
  roll: {
    visibility: rollCapability.visibility,
    capability: rollCapability,
    sidebarInfos: rollCapability.sidebarInfos,
    ChatDisplayComponent: rollCapability.ChatDisplayComponent,
  },
  laserfeelings: {
    visibility: laserFeelingsCapability.visibility,
    capability: laserFeelingsCapability,
    sidebarInfos: laserFeelingsCapability.sidebarInfos,
    ChatDisplayComponent: laserFeelingsCapability.ChatDisplayComponent,
  },
  files: {
    visibility: filesCapability.visibility,
    capability: filesCapability,
    sidebarInfos: filesCapability.sidebarInfos,
    ChatDisplayComponent: filesCapability.ChatDisplayComponent,
  },
  feedback: {
    visibility: feedbackTestCapability.visibility,
    capability: feedbackTestCapability,
    sidebarInfos: feedbackTestCapability.sidebarInfos,
    ChatDisplayComponent: feedbackTestCapability.ChatDisplayComponent,
  },
};

export function isCapabilityName(
  name: string | undefined | null,
): name is CapabilityName {
  return !!name && name in capabilityRegistry;
}
