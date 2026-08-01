import { createClientCapability } from "#/capabilities/createClientCapability";
import { EnglishEerieMessageDisplay } from "#/components/capabilityComponents/SidebarEnglishEerie/EnglishEerieMessageDisplay";
import { SidebarEnglishEerie } from "#/components/capabilityComponents/SidebarEnglishEerie/SidebarEnglishEerie";
import { englishEerieCommon } from "./common";
import { Ghost } from "lucide-react";

export const englisheerieClient = createClientCapability(englishEerieCommon, {
  sidebarInfos: [
    {
      key: "englisheerie",
      label: "English Eerie",
      SidebarComponent: SidebarEnglishEerie,
      IconComponent: Ghost,
    },
  ],
  ChatDisplayComponent: EnglishEerieMessageDisplay,
});
