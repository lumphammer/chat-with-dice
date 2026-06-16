import type { RoomConfig } from "#/validators/roomConfigValidator";
import { DicesIcon, FlameIcon } from "lucide-react";
import type { ComponentType } from "react";

export const GENERIC_ROOM_PRESET_NAME = "generic";
export const HAVOC_ROOM_PRESET_NAME = "havoc";

export const ROOM_PRESET_NAMES = [
  GENERIC_ROOM_PRESET_NAME,
  HAVOC_ROOM_PRESET_NAME,
] as const;

export type RoomPresetName = (typeof ROOM_PRESET_NAMES)[number];

export interface RoomPresetInfo {
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  config: RoomConfig;
}

export const roomPresets = {
  [GENERIC_ROOM_PRESET_NAME]: {
    label: "Generic",
    description: "Chat and roll dice",
    Icon: DicesIcon,
    config: {
      capabilities: [{ name: "roll", config: {} }],
      version: 1,
    },
  },
  [HAVOC_ROOM_PRESET_NAME]: {
    label: "Havoc Engine",
    description:
      "Streamlined for Havoc Engine games, with threat and objective tracking",
    Icon: FlameIcon,
    config: {
      version: 1,
      capabilities: [
        { name: "objectives", config: {} },
        { name: "adversaries", config: {} },
      ],
    },
  },
} satisfies Record<RoomPresetName, RoomPresetInfo>;
