import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import styles from "./sidebar.module.css";
import { Tabs } from "@ark-ui/react/tabs";
import { memo, useRef } from "react";

export const Sidebar = memo(({ config }: { config: RoomConfig }) => {
  const ref = useRef<HTMLElement>(null);

  return (
    <Tabs.Root
      className={styles.root}
      defaultValue={config.capabilities[0]?.name}
      orientation="vertical"
      asChild
    >
      <aside ref={ref}>
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
                  onClick={(e) => {
                    if (!ref.current) {
                      return;
                    }
                    console.log(e.currentTarget, ref.current);
                    const isSelected = e.currentTarget.ariaSelected === "true";
                    if ("desktopClosed" in ref.current.dataset) {
                      delete ref.current.dataset.desktopClosed;
                    } else if (isSelected) {
                      ref.current.dataset.desktopClosed = "true";
                    }
                    if (!("mobileOpen" in ref.current.dataset)) {
                      ref.current.dataset.mobileOpen = "true";
                    } else if (isSelected) {
                      delete ref.current.dataset.mobileOpen;
                    }
                  }}
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
