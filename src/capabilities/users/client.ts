import { createClientCapability } from "#/capabilities/createClientCapability";
import { SidebarUsers } from "#/components/capabilityComponents/SidebarUsers";
import { usersCommon } from "./common";
import { UsersRound } from "lucide-react";

export const usersClient = createClientCapability(usersCommon, {
  sidebarInfos: [
    {
      key: "users",
      SidebarComponent: SidebarUsers,
      IconComponent: UsersRound,
    },
  ],
});
