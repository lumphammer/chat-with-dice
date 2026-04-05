import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import { Tabs } from "@ark-ui/react/tabs";
import { memo } from "react";

export const Sidebar = memo(({ config }: { config: RoomConfig }) => {
  return (
    <Tabs.Root
      className="bg-base-100 w-sm overflow-hidden"
      defaultValue={config.capabilities[0]?.name}
    >
      <Tabs.List>
        {config.capabilities.map(({ name }) => {
          if (!isCapabilityName(name)) {
            return null;
          }
          const Component = capabilityRegistry[name].iconComponent;
          return (
            <Tabs.Trigger key={name} className="" value={name}>
              <Component />
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
      {config.capabilities.map(({ name }) => {
        if (!isCapabilityName(name)) {
          return null;
        }
        const Component = capabilityRegistry[name].sidebarComponent;

        return (
          Component && (
            <Tabs.Content key={name} value={name}>
              <Component />
            </Tabs.Content>
          )
        );
      })}
    </Tabs.Root>
  );
});
