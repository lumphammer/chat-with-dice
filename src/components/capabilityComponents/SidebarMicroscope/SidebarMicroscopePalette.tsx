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
      <p className="muted text-sm">
        What this history may and may not contain. Add freely; nothing here is
        anybody's to take back off the list.
      </p>

      <PaletteList
        list="yes"
        heading="Yes"
        description="Things this history definitely has room for."
        placeholder="e.g. faster-than-light travel"
      />

      <PaletteList
        list="no"
        heading="No"
        description="Things this history will not contain, whoever wants them."
        placeholder="e.g. aliens"
      />
    </SidebarPanel>
  );
});

SidebarMicroscopePalette.displayName = "SidebarMicroscopePalette";
