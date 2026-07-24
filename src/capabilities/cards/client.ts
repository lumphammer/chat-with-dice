import { createClientCapability } from "#/capabilities/createClientCapability";
import { CardDrawMessageDisplay } from "#/components/capabilityComponents/Cards/CardDrawMessageDisplay";
import { SidebarCards } from "#/components/capabilityComponents/Cards/SidebarCards";
import { cardsCommon } from "./common";
import { Layers } from "lucide-react";

export const cardsClient = createClientCapability(cardsCommon, {
  sidebarInfos: [
    {
      key: "cards",
      label: "Cards",
      SidebarComponent: SidebarCards,
      // Layers is the Deck glyph used for deck folders in the Files tree, so the
      // Cards sidebar reads as the same thing.
      IconComponent: Layers,
    },
  ],
  ChatDisplayComponent: CardDrawMessageDisplay,
});
