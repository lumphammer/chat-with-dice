import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import { memo } from "react";

export const Sidebar = memo(({ config }: { config: RoomConfig }) => {
  return (
    <div className="bg-base-100 w-sm">
      {config.capabilities.map(({ name }) => {
        if (!isCapabilityName(name)) {
          return null;
        }
        const Component = capabilityRegistry[name].sidebarComponent;
        return <Component key={name} />;
      })}
    </div>
  );
});
