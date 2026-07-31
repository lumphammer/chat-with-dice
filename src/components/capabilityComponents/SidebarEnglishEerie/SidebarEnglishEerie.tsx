import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { PlayView } from "./PlayView";
import { SetupView } from "./SetupView";
import { memo } from "react";

/**
 * Two modes, one panel. Setup is for writing the sheet; play is for telling the
 * story with it. The room is in one or the other for everybody at once — the
 * mode is shared state, not a local toggle.
 */
export const SidebarEnglishEerie = memo(() => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="English Eerie" isSaving={capInfo.patches.length > 0}>
      {capInfo.state.mode === "setup" ? <SetupView /> : <PlayView />}
    </SidebarPanel>
  );
});

SidebarEnglishEerie.displayName = "SidebarEnglishEerie";
