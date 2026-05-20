import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { authClient } from "#/utils/auth-client";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "../DiceRoller/contexts/roomUiNavigationContext";
import { Config } from "./Config";
import { Help } from "./Help";
import { UsersOnline } from "./UsersOnline";
import styles from "./sidebar.module.css";
import { Tabs } from "@ark-ui/react/tabs";
import { CircleHelp, Cog, UsersRound } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

export const Sidebar = memo(() => {
  const ref = useRef<HTMLElement>(null);

  const { data: sessionData } = authClient.useSession();
  const { roomConfig, roomOwnerId } = useRoomInfoContext();
  const { sharedFolderOpenRequest } = useRoomUiNavigationContext();
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

  const availableTabValues = useMemo(() => {
    const capabilityTabs = capabilities.flatMap(
      ([name, capInfo]) =>
        capInfo.sidebarInfos?.map(({ key }) => `${name}.${key}`) ?? [],
    );
    return [
      ...capabilityTabs,
      ...(isOwner ? ["config"] : []),
      "usersOnline",
      "help",
    ];
  }, [capabilities, isOwner]);

  const [selectedTab, setSelectedTab] = useState<string | null>(
    defaultValue ?? null,
  );

  useEffect(() => {
    setSelectedTab((current) => {
      if (current && availableTabValues.includes(current)) return current;
      return defaultValue ?? availableTabValues[0] ?? null;
    });
  }, [availableTabValues, defaultValue]);

  useEffect(() => {
    if (!sharedFolderOpenRequest) return;
    if (!availableTabValues.includes("files.files")) return;

    setSelectedTab("files.files");
    if (!ref.current) return;

    delete ref.current.dataset.desktopClosed;
    ref.current.dataset.mobileOpen = "true";
  }, [availableTabValues, sharedFolderOpenRequest]);

  const handleTriggerClick = (isSelected: boolean) => {
    if (!ref.current) {
      return;
    }
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
  };

  return (
    <>
      <div className={styles.spaceHolder} />

      <Tabs.Root
        className={`${styles.root} sidebar`}
        value={selectedTab}
        onValueChange={(details) => setSelectedTab(details.value)}
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
                        const isSelected =
                          e.currentTarget.ariaSelected === "true";
                        handleTriggerClick(isSelected);
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
                    const isSelected = e.currentTarget.ariaSelected === "true";
                    handleTriggerClick(isSelected);
                  }}
                >
                  <Cog />
                </Tabs.Trigger>
              )}
              <Tabs.Trigger
                className={styles.tabButton}
                value="usersOnline"
                onClick={(e) => {
                  const isSelected = e.currentTarget.ariaSelected === "true";
                  handleTriggerClick(isSelected);
                }}
              >
                <UsersRound />
              </Tabs.Trigger>{" "}
              <Tabs.Trigger
                className={styles.tabButton}
                value="help"
                onClick={(e) => {
                  const isSelected = e.currentTarget.ariaSelected === "true";
                  handleTriggerClick(isSelected);
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
