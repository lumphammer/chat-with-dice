import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import styles from "./sidebar.module.css";
import { Tabs } from "@ark-ui/react/tabs";
import { memo } from "react";

export const Sidebar = memo(({ config }: { config: RoomConfig }) => {
  return (
    <Tabs.Root
      className={styles.root}
      defaultValue={config.capabilities[0]?.name}
      orientation="vertical"
      asChild
    >
      <aside>
        <Tabs.List className={styles.tabList} asChild>
          <nav>
            {config.capabilities.map(({ name }) => {
              if (!isCapabilityName(name)) {
                return null;
              }
              const Component = capabilityRegistry[name].iconComponent;
              return (
                <Tabs.Trigger
                  key={name}
                  className={styles.tabButton}
                  value={name}
                >
                  <Component />
                </Tabs.Trigger>
              );
            })}
          </nav>
        </Tabs.List>
        <section className={styles.contentArea}>
          {config.capabilities.map(({ name }) => {
            if (!isCapabilityName(name)) {
              return null;
            }
            const Component = capabilityRegistry[name].sidebarComponent;

            return (
              Component && (
                <Tabs.Content
                  key={name}
                  value={name}
                  className={styles.tabContent}
                >
                  <Component />
                </Tabs.Content>
              )
            );
          })}
        </section>
      </aside>
    </Tabs.Root>
  );
});
