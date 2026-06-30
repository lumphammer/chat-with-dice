import { authClient } from "#/auth/authClient.ts";
import {
  type CapabilityName,
  isCapabilityName,
} from "#/capabilities/capabilityNames";
import { clientCapabilityRegistry } from "#/capabilities/clientCapabilityRegistry";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "../DiceRoller/contexts/roomUiNavigationContext";
import { useRefStash } from "../useRefStash";
import { useStateWithRef } from "../useStateWithRef";
import { Config } from "./Config";
import { Help } from "./Help";
import styles from "./sidebar.module.css";
import { useContainerMinWidth } from "./useContainerMinWidth";
import { useModalRegion } from "./useModalRegion";
import { useSwipeToDismiss } from "./useSwipeToDismiss";
import { Tabs } from "@ark-ui/react/tabs";
import { CircleHelp, Cog, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

const DESKTOP_CONTAINER_WIDTH_REM = 80;
const SWIPE_HANDLE_SELECTOR = "[data-sidebar-swipe-handle]";
const BACKDROP_DRAG_FADE_AMOUNT = 0.75;

type SidebarStyle = CSSProperties & {
  "--sidebarDragDistance": string;
};

const SidebarTabTrigger = memo(
  ({
    children,
    onTriggerClick,
    value,
  }: {
    children: ReactNode;
    onTriggerClick: (trigger: HTMLButtonElement, isSelected: boolean) => void;
    value: string;
  }) => (
    <Tabs.Trigger
      className={styles.tabButton}
      value={value}
      onClick={(event) => {
        const isSelected = event.currentTarget.ariaSelected === "true";
        onTriggerClick(event.currentTarget, isSelected);
      }}
    >
      {children}
    </Tabs.Trigger>
  ),
);

SidebarTabTrigger.displayName = "SidebarTabTrigger";

export const Sidebar = memo(
  ({
    backgroundElementRefs,
  }: {
    /**
     * Refs to elements that should be inerted while the sidebar is in its
     * modal (mobile-open) state. The Sidebar can't know its own siblings, so
     * the parent names them.
     */
    backgroundElementRefs: RefObject<HTMLElement | null>[];
  }) => {
    const ref = useRef<HTMLElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);

    const { data: sessionData } = authClient.useSession();
    const { roomConfig, roomOwnerId } = useRoomInfoContext();
    const { sharedFolderOpenRequest } = useRoomUiNavigationContext();
    const isOwner = sessionData && sessionData.user.id === roomOwnerId;
    const isDesktop = useContainerMinWidth(ref, DESKTOP_CONTAINER_WIDTH_REM);
    const isDesktopRef = useRefStash(isDesktop);

    const capabilities = useMemo(() => {
      const configCapabilityNames = roomConfig.capabilities.flatMap(
        ({ name }) => (isCapabilityName(name) ? [name] : []),
      );
      // "always" capabilities aren't listed in the room config (no opt-in/out),
      // but their sidebar panels must always be present.
      const alwaysCapabilityNames = (
        Object.keys(clientCapabilityRegistry) as CapabilityName[]
      ).filter(
        (name) =>
          clientCapabilityRegistry[name].visibility === "always" &&
          !configCapabilityNames.includes(name),
      );
      return [...configCapabilityNames, ...alwaysCapabilityNames].map(
        (name) => [name, clientCapabilityRegistry[name]] as const,
      );
    }, [roomConfig.capabilities]);

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
      return [...capabilityTabs, ...(isOwner ? ["config"] : []), "help"];
    }, [capabilities, isOwner]);

    const [selectedTab, setSelectedTab] = useState<string | null>(
      defaultValue ?? null,
    );
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDesktopClosed, setIsDesktopClosed, isDesktopClosedRef] =
      useStateWithRef(false);
    const isModalOpen = isMobileOpen && !isDesktop;

    const closeMobileSidebar = useCallback(() => {
      setIsMobileOpen(false);
    }, []);
    const openMobileSidebar = useCallback(() => {
      setIsMobileOpen(true);
    }, []);

    const {
      dragDistance,
      dragProgress,
      isDragging: isSwipeDragging,
      swipeHandlers,
    } = useSwipeToDismiss({
      enabled: !isDesktop,
      handleSelector: SWIPE_HANDLE_SELECTOR,
      onDismiss: isModalOpen ? closeMobileSidebar : undefined,
      onReveal: !isModalOpen ? openMobileSidebar : undefined,
    });

    const sidebarStyle: SidebarStyle = {
      "--sidebarDragDistance": `${dragDistance}px`,
    };

    useModalRegion({
      backgroundElementRefs,
      enabled: isModalOpen,
      initialFocusRef: closeButtonRef,
      onDismiss: closeMobileSidebar,
      regionRef: dialogRef,
      returnFocusRef,
    });

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
      setIsDesktopClosed(false);
      if (!isDesktop) {
        setIsMobileOpen(true);
      }
    }, [
      availableTabValues,
      isDesktop,
      sharedFolderOpenRequest,
      setIsDesktopClosed,
    ]);

    useEffect(() => {
      if (isDesktop) {
        setIsMobileOpen(false);
      }
    }, [isDesktop]);

    const handleTriggerClick = useCallback(
      (trigger: HTMLButtonElement, isSelected: boolean) => {
        if (isDesktopRef.current) {
          if (isDesktopClosedRef.current) {
            setIsDesktopClosed(false);
          } else if (isSelected) {
            setIsDesktopClosed(true);
          }
          return;
        }

        returnFocusRef.current = trigger;
        setIsMobileOpen(true);
      },
      [isDesktopClosedRef, setIsDesktopClosed, isDesktopRef],
    );

    return (
      <>
        <div className={styles.spaceHolder} />
        {isModalOpen && (
          <div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={closeMobileSidebar}
            style={{ opacity: 1 - dragProgress * BACKDROP_DRAG_FADE_AMOUNT }}
          />
        )}

        <Tabs.Root
          className={`${styles.root} sidebar`}
          value={selectedTab}
          onValueChange={(details) => setSelectedTab(details.value)}
          orientation="vertical"
          asChild
        >
          <aside
            ref={ref}
            aria-label="Sidebar"
            data-desktop-closed={isDesktopClosed || undefined}
            data-mobile-open={isMobileOpen || undefined}
            data-swipe-dragging={isSwipeDragging || undefined}
            style={sidebarStyle}
            {...swipeHandlers}
          >
            <div
              ref={dialogRef}
              className={styles.dialogWrapper}
              role={isModalOpen ? "dialog" : undefined}
              aria-modal={isModalOpen || undefined}
              aria-label={isModalOpen ? "Sidebar" : undefined}
            >
              {isModalOpen && (
                <button
                  ref={closeButtonRef}
                  className={styles.mobileCloseButton}
                  type="button"
                  aria-label="Close sidebar"
                  onClick={closeMobileSidebar}
                >
                  <X />
                </button>
              )}
              <Tabs.List className={styles.tabList} asChild>
                {/* Tap on the nav's empty area (not a tab button) opens the
                    sidebar on mobile. Keyboard users have full access via the
                    focusable tab buttons inside, so the click handler is a
                    mouse/touch convenience and does not need a keyboard
                    equivalent. */}
                {/* oxlint-disable-next-line jsx_a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <nav
                  data-sidebar-swipe-handle
                  onClick={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (isDesktop) return;
                    setIsMobileOpen(true);
                  }}
                >
                  {capabilities.flatMap(([name, capInfo]) => {
                    const sidebarInfos = capInfo.sidebarInfos;
                    if (!sidebarInfos) {
                      return [];
                    }
                    return sidebarInfos.map(({ IconComponent, key }) => {
                      const value = `${name}.${key}`;
                      return (
                        <SidebarTabTrigger
                          key={value}
                          value={value}
                          onTriggerClick={handleTriggerClick}
                        >
                          <IconComponent />
                        </SidebarTabTrigger>
                      );
                    });
                  })}
                  {isOwner && (
                    <SidebarTabTrigger
                      value="config"
                      onTriggerClick={handleTriggerClick}
                    >
                      <Cog />
                    </SidebarTabTrigger>
                  )}
                  <SidebarTabTrigger
                    value="help"
                    onTriggerClick={handleTriggerClick}
                  >
                    <CircleHelp />
                  </SidebarTabTrigger>
                </nav>
              </Tabs.List>
              <section className={styles.contentArea}>
                {capabilities.flatMap(([name, capInfo]) => {
                  const sidebarInfos = capInfo.sidebarInfos;
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
              </section>
            </div>
          </aside>
        </Tabs.Root>
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";
