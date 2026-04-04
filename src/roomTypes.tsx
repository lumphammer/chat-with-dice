import type { RoomConfig } from "#/validators/roomConfigValidator";
import { DicesIcon, FlameIcon, CirclePlus } from "lucide-react";
import type { ComponentType } from "react";

export const GENERIC_ROOM_TYPE_NAME = "generic";
export const HAVOC_ROOM_TYPE_NAME = "havoc";
export const COUNTER_ROOM_TYPE_NAME = "counter";

export const ROOM_TYPE_NAMES = [
  GENERIC_ROOM_TYPE_NAME,
  COUNTER_ROOM_TYPE_NAME,
  HAVOC_ROOM_TYPE_NAME,
] as const;

export type RoomTypeName = (typeof ROOM_TYPE_NAMES)[number];

export interface RoomTypeInfo {
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  config: RoomConfig;
}

export const roomTypes = {
  [GENERIC_ROOM_TYPE_NAME]: {
    label: "Generic",
    description: "Chat and roll dice",
    Icon: DicesIcon,
    config: {
      capabilities: [],
      version: 1,
    },
  },
  [COUNTER_ROOM_TYPE_NAME]: {
    label: "Room with a Counter",
    description: "Like generic, but it has a counter",
    Icon: CirclePlus,
    config: {
      capabilities: [
        {
          name: "counter",
          config: { startAt: 0 },
        },
      ],
      version: 1,
    },
  },
  [HAVOC_ROOM_TYPE_NAME]: {
    label: "Havoc Engine",
    description:
      "Streamlined for Havoc Engine games, with threat and objective tracking",
    Icon: FlameIcon,
    config: {
      version: 1,
      capabilities: [
        {
          name: "objectives",
          config: {},
        },
      ],
    },
  },
} satisfies Record<RoomTypeName, RoomTypeInfo>;
