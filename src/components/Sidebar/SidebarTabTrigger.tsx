import { Tabs } from "@ark-ui/react/tabs";
import { memo, type ReactNode } from "react";

export const SidebarTabTrigger = memo(
  ({
    children,
    label,
    onTriggerClick,
    value,
  }: {
    children: ReactNode;
    label: string;
    onTriggerClick: (trigger: HTMLButtonElement, isSelected: boolean) => void;
    value: string;
  }) => (
    <Tabs.Trigger
      aria-label={label}
      className="sidebar-tab-button"
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
