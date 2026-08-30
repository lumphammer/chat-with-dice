import { microscopeClient } from "#/capabilities/microscope/client";
import { SidebarPanel } from "../shared/SidebarPanel";
import { PaletteList } from "./PaletteList";
import { memo } from "react";

export const SidebarMicroscopePalette = memo(() => {
  const capInfo = microscopeClient.useMount();

  return (
    <SidebarPanel
      title="Palette"
      isSaving={capInfo.initialised && capInfo.patches.length > 0}
    >
      <PaletteList
        list="yes"
        heading="Yes"
        placeholder="e.g. faster-than-light travel"
      />

      <PaletteList list="no" heading="No" placeholder="e.g. aliens" />
    </SidebarPanel>
  );
});

SidebarMicroscopePalette.displayName = "SidebarMicroscopePalette";
