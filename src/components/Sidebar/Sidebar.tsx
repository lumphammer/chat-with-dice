import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { authClient } from "#/utils/auth-client";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { Config } from "./Config";
import { Help } from "./Help";
import { UsersOnline } from "./UsersOnline";
import styles from "./sidebar.module.css";
import { Tabs } from "@ark-ui/react/tabs";
import { CircleHelp, Cog, UsersRound } from "lucide-react";
import { memo, useMemo, useRef } from "react";

export const Sidebar = memo(() => {
  const ref = useRef<HTMLElement>(null);

  const { data: sessionData } = authClient.useSession();
  const { roomConfig, roomOwnerId } = useRoomInfoContext();
  const isOwner = sessionData && sessionData.user.id === roomOwnerId;

  const capabilities = useMemo(
    () =>
      roomConfig.capabilities.flatMap(({ name }) =>
        isCapabilityName(name)
          ? [[name, capabilityRegistry[name]] as const]
          : [],
      ),
    [roomConfig.capabilities],
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
              {roomConfig.capabilities.map(({ name }) => {
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
                  <Cog />
                </Tabs.Trigger>
              )}
              <Tabs.Trigger
                className={styles.tabButton}
                value="usersOnline"
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
                <UsersRound />
              </Tabs.Trigger>{" "}
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
            {roomConfig.capabilities.flatMap(({ name }) => {
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
                      className={styles.contentDrawer}
                    >
                      <SidebarComponent />
                    </Tabs.Content>
                  )
                );
              });
            })}
            {isOwner && (
              <Tabs.Content value="config" className={styles.contentDrawer}>
                <Config />
              </Tabs.Content>
            )}
            <Tabs.Content value="help" className={styles.contentDrawer}>
              <Help />
            </Tabs.Content>
            <Tabs.Content value="usersOnline" className={styles.contentDrawer}>
              <UsersOnline />
            </Tabs.Content>
          </section>
        </aside>
      </Tabs.Root>
    </>
  );
});
