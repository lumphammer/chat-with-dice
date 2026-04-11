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
      className="bg-base-100 relative w-sm"
      defaultValue={config.capabilities[0]?.name}
      orientation="vertical"
    >
      <Tabs.List className="absolute right-full flex flex-col gap-4">
        {config.capabilities.map(({ name }) => {
          if (!isCapabilityName(name)) {
            return null;
          }
          const Component = capabilityRegistry[name].iconComponent;
          return (
            <Tabs.Trigger
              key={name}
              className="border-base-content/30 hover:border-accent
                hover:bg-accent/30 aria-selected:bg-accent text-base-content
                aria-selected:text-accent-content block rounded border p-1
                shadow-2xl transition-transform not-aria-selected:cursor-pointer
                hover:not-aria-selected:scale-120"
              value={name}
            >
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
