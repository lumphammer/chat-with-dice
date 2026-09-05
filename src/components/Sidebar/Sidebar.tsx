import { authClient } from "#/auth/authClient.ts";
import type { SidebarVisibilityContext } from "#/capabilities/createClientCapability";
import { useMountedCapabilities } from "#/capabilities/useMountedCapabilities";
import { useRoomInfoContext } from "../DiceRoller/contexts/roomInfoContext";
import { useRoomUiNavigationContext } from "../DiceRoller/contexts/roomUiNavigationContext";
import { useRefStash } from "../useRefStash";
import { useStateWithRef } from "../useStateWithRef";
import { Config } from "./Config";
import { Help } from "./Help";
import { SidebarTabTrigger } from "./SidebarTabTrigger";
import { MobileSidebarControlsProvider } from "./mobileSidebarContext";
import { SidebarSideContext } from "./sidebarSideContext";
import { useContainerMinWidth } from "./useContainerMinWidth";
import { useModalRegion } from "./useModalRegion";
import { useSwipeToDismiss } from "./useSwipeToDismiss";
import { Tabs } from "@ark-ui/react/tabs";
import { CircleHelp, Cog, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

// Keep aligned with the sidebar container queries in global.css.
const DESKTOP_CONTAINER_WIDTH_REM = 53;
const SWIPE_HANDLE_SELECTOR = "[data-sidebar-swipe-handle]";
const BACKDROP_DRAG_FADE_AMOUNT = 0.75;

type SidebarStyle = CSSProperties & {
  "--sidebar-drag-distance": string;
};

export const Sidebar = memo(
  ({
    backgroundElementRefs,
    side = "right",
  }: {
    side?: "left" | "right";
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
    const { roomOwnerId } = useRoomInfoContext();
    const { sharedFolderOpenRequest } = useRoomUiNavigationContext();
    const isOwner = sessionData && sessionData.user.id === roomOwnerId;
    const isDesktop = useContainerMinWidth(ref, DESKTOP_CONTAINER_WIDTH_REM);
    const isDesktopRef = useRefStash(isDesktop);

    const capabilities = useMountedCapabilities();

    const sidebarVisibilityContext = useMemo<SidebarVisibilityContext>(
      () => ({
        viewer: sessionData
          ? {
              id: sessionData.user.id,
              isAnonymous: sessionData.user.isAnonymous ?? true,
            }
          : null,
        roomOwnerId,
      }),
      [roomOwnerId, sessionData],
    );

    const capabilitySidebars = useMemo(
      () =>
        capabilities.flatMap(([capabilityName, capability]) =>
          (capability.sidebarInfos ?? [])
            .filter(
              ({ isVisible }) => isVisible?.(sidebarVisibilityContext) ?? true,
            )
            .map((sidebarInfo) => ({
              ...sidebarInfo,
              value: `${capabilityName}.${sidebarInfo.key}`,
            })),
        ),
      [capabilities, sidebarVisibilityContext],
    );

    const defaultValue = useMemo(() => {
      return capabilitySidebars[0]?.value;
    }, [capabilitySidebars]);

    const availableTabValues = useMemo(() => {
      const capabilityTabs = capabilitySidebars.map(({ value }) => value);
      return [...capabilityTabs, ...(isOwner ? ["config"] : []), "help"];
    }, [capabilitySidebars, isOwner]);

    const [chosenTab, setChosenTab] = useState<string | null>(
      defaultValue ?? null,
    );
    // Capabilities mount and unmount as the room is configured, so the chosen
    // tab can stop existing. Falling back during render rather than correcting
    // it in an effect means there's never a frame pointing at a tab that isn't
    // there.
    const selectedTab =
      chosenTab && availableTabValues.includes(chosenTab)
        ? chosenTab
        : (defaultValue ?? availableTabValues[0] ?? null);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDesktopClosed, setIsDesktopClosed, isDesktopClosedRef] =
      useStateWithRef(side === "left");
    const isModalOpen = side === "right" && isMobileOpen && !isDesktop;

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
      enabled: side === "right" && !isDesktop,
      handleSelector: SWIPE_HANDLE_SELECTOR,
      onDismiss: isModalOpen ? closeMobileSidebar : undefined,
      onReveal: !isModalOpen ? openMobileSidebar : undefined,
    });

    const sidebarStyle: SidebarStyle = {
      "--sidebar-drag-distance": `${dragDistance}px`,
    };

    useModalRegion({
      backgroundElementRefs,
      enabled: isModalOpen,
      initialFocusRef: closeButtonRef,
      onDismiss: closeMobileSidebar,
      regionRef: dialogRef,
      returnFocusRef,
    });

    // The shared-folder request is an event from elsewhere in the room UI (a
    // click on a shared file) that arrives as changed context rather than as a
    // callback, so the state changes it drives can only happen in an effect.
    useEffect(() => {
      if (side !== "right" || !sharedFolderOpenRequest) return;
      if (!availableTabValues.includes("files.shared")) return;

      // oxlint-disable-next-line react/set-state-in-effect
      setChosenTab("files.shared");
      setIsDesktopClosed(false);
      if (!isDesktop) {
        setIsMobileOpen(true);
      }
    }, [
      availableTabValues,
      side,
      isDesktop,
      sharedFolderOpenRequest,
      setIsDesktopClosed,
    ]);

    // Crossing to the desktop layout drops the mobile drawer, so coming back to
    // a narrow container doesn't find it still open. `isDesktop` is measured
    // from the container by a ResizeObserver, so an effect is the only place
    // this can happen — there's no event to hang it off.
    useEffect(() => {
      if (isDesktop) {
        // oxlint-disable-next-line react/set-state-in-effect
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
        <div className="sidebar-space-holder" />
        {isModalOpen && (
          <div
            className="sidebar-backdrop"
            aria-hidden="true"
            onClick={closeMobileSidebar}
            style={{ opacity: 1 - dragProgress * BACKDROP_DRAG_FADE_AMOUNT }}
          />
        )}

        <Tabs.Root
          className="sidebar"
          value={selectedTab}
          onValueChange={(details) => setChosenTab(details.value)}
          orientation="vertical"
          asChild
        >
          <aside
            ref={ref}
            aria-label={`${side === "left" ? "Left" : "Right"} sidebar`}
            data-side={side}
            data-desktop-closed={isDesktopClosed || undefined}
            data-mobile-open={isMobileOpen || undefined}
            data-swipe-dragging={isSwipeDragging || undefined}
            style={sidebarStyle}
            {...swipeHandlers}
          >
            <div
              ref={dialogRef}
              className="sidebar-dialog-wrapper"
              role={isModalOpen ? "dialog" : undefined}
              aria-modal={isModalOpen || undefined}
              aria-label={isModalOpen ? "Sidebar" : undefined}
            >
              {isModalOpen && (
                <button
                  ref={closeButtonRef}
                  className="sidebar-close-button"
                  type="button"
                  aria-label="Close sidebar"
                  onClick={closeMobileSidebar}
                >
                  <X />
                </button>
              )}
              <Tabs.List className="sidebar-tab-rail" asChild>
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
                  {capabilitySidebars.map(({ IconComponent, label, value }) => (
                    <SidebarTabTrigger
                      key={value}
                      label={label}
                      value={value}
                      onTriggerClick={handleTriggerClick}
                    >
                      <IconComponent />
                    </SidebarTabTrigger>
                  ))}
                  {isOwner && (
                    <SidebarTabTrigger
                      label="Configure room"
                      value="config"
                      onTriggerClick={handleTriggerClick}
                    >
                      <Cog />
                    </SidebarTabTrigger>
                  )}
                  <SidebarTabTrigger
                    label="Help"
                    value="help"
                    onTriggerClick={handleTriggerClick}
                  >
                    <CircleHelp />
                  </SidebarTabTrigger>
                </nav>
              </Tabs.List>
              <SidebarSideContext value={side}>
                <MobileSidebarControlsProvider
                  closeMobileSidebar={closeMobileSidebar}
                >
                  <section
                    className="sidebar-content-area"
                    inert={isDesktop ? isDesktopClosed : !isModalOpen}
                  >
                    {capabilitySidebars.map(({ SidebarComponent, value }) => (
                      <Tabs.Content
                        key={value}
                        value={value}
                        className="sidebar-content-drawer"
                      >
                        <SidebarComponent />
                      </Tabs.Content>
                    ))}
                    {isOwner && (
                      <Tabs.Content
                        value="config"
                        className="sidebar-content-drawer"
                      >
                        <Config />
                      </Tabs.Content>
                    )}
                    <Tabs.Content
                      value="help"
                      className="sidebar-content-drawer"
                    >
                      <Help />
                    </Tabs.Content>
                  </section>
                </MobileSidebarControlsProvider>
              </SidebarSideContext>
            </div>
          </aside>
        </Tabs.Root>
      </>
    );
  },
);

Sidebar.displayName = "Sidebar";
