import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { authClient } from "#/utils/auth-client";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import { Config } from "../config/Config";
import { Help } from "../help/Help";
import styles from "./sidebar.module.css";
import { Tabs } from "@ark-ui/react/tabs";
import { CircleHelp, Cog } from "lucide-react";
import { memo, useMemo, useRef } from "react";

export const Sidebar = memo(
  ({ config, roomOwnerId }: { config: RoomConfig; roomOwnerId: string }) => {
    const ref = useRef<HTMLElement>(null);

    const { data: sessionData } = authClient.useSession();

    const isOwner = sessionData && sessionData.user.id === roomOwnerId;

    const capabilities = useMemo(
      () =>
        config.capabilities.flatMap(({ name }) =>
          isCapabilityName(name)
            ? [[name, capabilityRegistry[name]] as const]
            : [],
        ),
      [config.capabilities],
    );

    const defaultValue = useMemo(() => {
      const firstCapWithSidebars = capabilities.find(
        ([, capInfo]) => (capInfo.sidebarInfos?.length ?? 0) > 0,
      );
      const defaultKey =
        firstCapWithSidebars && firstCapWithSidebars[1].sidebarInfos?.[0]?.key;
      return defaultKey && `${firstCapWithSidebars?.[0]}.${defaultKey}`;
    }, [capabilities]);

    return (
      <>
        <div className={styles.spaceHolder} />

        <Tabs.Root
          className={`${styles.root} sidebar`}
          defaultValue={defaultValue}
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
                  const sidebarInfos = capabilityRegistry[name].sidebarInfos;
                  if (!sidebarInfos) {
                    return [];
                  }
                  return sidebarInfos.map(({ IconComponent, key }) => {
                    return (
                      <Tabs.Trigger
                        key={`${name}.${key}`}
                        className={styles.tabButton}
                        value={`${name}.${key}`}
                        onClick={(e) => {
                          if (!ref.current) {
                            return;
                          }
                          const isSelected =
                            e.currentTarget.ariaSelected === "true";
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
                        <IconComponent />
                      </Tabs.Trigger>
                    );
                  });
                })}
                {isOwner && (
                  <Tabs.Trigger
                    // key="config"
                    className={styles.tabButton}
                    value="config"
                    onClick={(e) => {
                      if (!ref.current) {
                        return;
                      }
                      const isSelected =
                        e.currentTarget.ariaSelected === "true";
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
                    <Cog />
                  </Tabs.Trigger>
                )}
                <Tabs.Trigger
                  className={styles.tabButton}
                  value="help"
                  onClick={(e) => {
                    if (!ref.current) {
                      return;
                    }
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
                  <CircleHelp />
                </Tabs.Trigger>
              </nav>
            </Tabs.List>
            <section className={styles.contentArea}>
              {config.capabilities.flatMap(({ name }) => {
                if (!isCapabilityName(name)) {
                  return [];
                }
                const sidebarInfos = capabilityRegistry[name].sidebarInfos;
                if (!sidebarInfos) {
                  return [];
                }

                return sidebarInfos.map(({ SidebarComponent, key }) => {
                  return (
                    SidebarComponent && (
                      <Tabs.Content
                        key={`${name}.${key}`}
                        value={`${name}.${key}`}
                        className={styles.tabContent}
                      >
                        <div className={styles.tabContentInner}>
                          <SidebarComponent />
                        </div>
                      </Tabs.Content>
                    )
                  );
                });
              })}
              {isOwner && (
                <Tabs.Content value="config" className={styles.tabContent}>
                  <div className={styles.tabContentInner}>
                    <Config />
                  </div>
                </Tabs.Content>
              )}
              <Tabs.Content value="help" className={styles.tabContent}>
                <div className={styles.tabContentInner}>
                  <Help />
                </div>
              </Tabs.Content>
            </section>
          </aside>
        </Tabs.Root>
      </>
    );
  },
);
