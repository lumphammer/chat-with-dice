import { createClientCapability } from "#/capabilities/createClientCapability";
import { MicroscopeMessageDisplay } from "#/components/capabilityComponents/SidebarMicroscope/MicroscopeMessageDisplay";
import { SidebarMicroscopeLegacies } from "#/components/capabilityComponents/SidebarMicroscope/SidebarMicroscopeLegacies";
import { SidebarMicroscopePalette } from "#/components/capabilityComponents/SidebarMicroscope/SidebarMicroscopePalette";
import { SidebarMicroscopeTimeline } from "#/components/capabilityComponents/SidebarMicroscope/SidebarMicroscopeTimeline";
import { microscopeCommon } from "./common";
import { Microscope, Palette, Trophy } from "lucide-react";

/**
 * Three tabs from one capability, where every other capability here has one.
 * They are three genuinely separate views of the same game — a fractal
 * timeline, a flat list, and two short lists of words — and putting them behind
 * a second tab strip inside one panel would only be the sidebar's tab strip
 * again, one level down and harder to reach.
 */
export const microscopeClient = createClientCapability(microscopeCommon, {
  sidebarInfos: [
    {
      key: "timeline",
      label: "Microscope timeline",
      SidebarComponent: SidebarMicroscopeTimeline,
      IconComponent: Microscope,
    },
    {
      key: "legacies",
      label: "Microscope legacies",
      SidebarComponent: SidebarMicroscopeLegacies,
      IconComponent: Trophy,
    },
    {
      key: "palette",
      label: "Microscope palette",
      SidebarComponent: SidebarMicroscopePalette,
      IconComponent: Palette,
    },
  ],
  ChatDisplayComponent: MicroscopeMessageDisplay,
});
