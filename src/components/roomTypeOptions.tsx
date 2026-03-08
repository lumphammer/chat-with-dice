import { GENERIC_ROOM_TYPE, HAVOC_ROOM_TYPE } from "#/constants";
import { typeSafeObjectFromEntries } from "#/lib/typeSafeObjectFromEntries";
import type { RoomType } from "#/types";
import { DicesIcon, FlameIcon } from "lucide-react";
import type { ComponentType } from "react";

export interface RoomTypeOption {
  type: RoomType;
  label: string;
  description: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
}

export const roomTypeOptions: RoomTypeOption[] = [
  {
    type: GENERIC_ROOM_TYPE,
    label: "Generic",
    description: "Chat and roll dice",
    Icon: DicesIcon,
  },
  {
    type: HAVOC_ROOM_TYPE,
    label: "Havoc Engine",
    description:
      "Streamlined for Havoc Engine games, with threat and objective tracking",
    Icon: FlameIcon,
  },
];

export const roomTypeOptionsByType = typeSafeObjectFromEntries(
  roomTypeOptions.map((option) => [option.type, option]),
);
