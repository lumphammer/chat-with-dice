import { createClientCapability } from "#/capabilities/createClientCapability";
import { SidebarFeedback } from "#/components/capabilityComponents/SidebarFeedback";
import { feedbackCommon } from "./common";
import { Speech } from "lucide-react";

export const feedbackClient = createClientCapability(feedbackCommon, {
  sidebarInfos: [
    {
      key: "feedback",
      label: "Feedback",
      SidebarComponent: SidebarFeedback,
      IconComponent: Speech,
    },
  ],
});
