import type { RoomConfig } from "#/validators/roomConfigValidator";
import { DicesIcon, FlameIcon, GhostIcon, LayersIcon } from "lucide-react";
import type { ComponentType } from "react";

export const GENERIC_ROOM_PRESET_NAME = "generic";
const HAVOC_ROOM_PRESET_NAME = "havoc";
const CARDS_ROOM_PRESET_NAME = "cards";
const ENGLISH_EERIE_ROOM_PRESET_NAME = "englisheerie";

export const ROOM_PRESET_NAMES = [
  GENERIC_ROOM_PRESET_NAME,
  HAVOC_ROOM_PRESET_NAME,
  CARDS_ROOM_PRESET_NAME,
  ENGLISH_EERIE_ROOM_PRESET_NAME,
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
      capabilities: [{ name: "havoc", config: {} }],
    },
  },
  [CARDS_ROOM_PRESET_NAME]: {
    label: "Cards",
    description:
      "Roll dice and draw from shared decks of cards. Includes Files for sharing decks",
    Icon: LayersIcon,
    config: {
      version: 1,
      // Cards reads its deck list from the Files capability's shares, so Files
      // rides along. Roll is here because a table that draws cards usually rolls
      // dice too.
      capabilities: [
        { name: "roll", config: {} },
        { name: "files", config: {} },
        { name: "cards", config: {} },
      ],
    },
  },
  [ENGLISH_EERIE_ROOM_PRESET_NAME]: {
    label: "English Eerie",
    description:
      "Rural horror storytelling: a protagonist sheet, Spirit and Resolve, and the story deck",
    Icon: GhostIcon,
    config: {
      version: 1,
      // Everything the game needs is built in — no dice roller, because the only
      // roll it makes is the obstruction d10 in its own sidebar.
      capabilities: [{ name: "englisheerie", config: {} }],
    },
  },
} satisfies Record<RoomPresetName, RoomPresetInfo>;
