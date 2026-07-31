import { englisheerieClient } from "#/capabilities/englisheerie/client";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import { ObstructionSection } from "./ObstructionSection";
import { ProtagonistSection } from "./ProtagonistSection";
import { StoryDeckSection } from "./StoryDeckSection";
import { TrackersSection } from "./TrackersSection";
import { memo } from "react";

export const SidebarEnglishEerie = memo(() => {
  const capInfo = englisheerieClient.useMount();

  if (!capInfo.initialised) {
    return "Loading...";
  }

  return (
    <SidebarPanel title="English Eerie" isSaving={capInfo.patches.length > 0}>
      <ProtagonistSection />
      <TrackersSection />
      <StoryDeckSection />
      <ObstructionSection />
    </SidebarPanel>
  );
});

SidebarEnglishEerie.displayName = "SidebarEnglishEerie";
