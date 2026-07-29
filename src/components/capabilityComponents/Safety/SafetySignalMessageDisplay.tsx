import { safetySignalMessageValidator } from "#/capabilities/safety/common";
import { logger } from "#/utils/logger.ts";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import { SIGNAL_PRESENTATION } from "./signalPresentation";
import { memo, useMemo } from "react";

/**
 * The chat-log record of a Safety Signal.
 *
 * Unattributed signals need no special casing here: `ChatBubble` shows
 * `message.displayName` (the sentinel's "Anonymous") and derives the bubble hue
 * from the sentinel user id, so every unattributed signal gets the same
 * non-identifying colour and never renders as the reader's own message.
 */
export const SafetySignalMessageDisplay = memo(
  ({ capabilityData }: { capabilityData?: JsonData }) => {
    const parsed = useMemo(
      () => safetySignalMessageValidator.safeParse(capabilityData),
      [capabilityData],
    );

    if (!parsed.success) {
      logger.error(
        "Unable to parse safety signal message data",
        capabilityData,
      );
      return null;
    }

    const { kind } = parsed.data;
    const { Icon, label, colorClass, borderClass } = SIGNAL_PRESENTATION[kind];

    return (
      // Stacked rather than side-by-side, matching the sidebar button: the icon
      // reads as a card being played, not as a glyph decorating a line of text.
      <div
        className={`rounded-box flex flex-col items-center gap-1 border-2 px-6
          py-4 text-center ${borderClass} ${colorClass}`}
      >
        <Icon className="h-12 w-12 shrink-0" />
        <div>
          <div className="text-xl font-bold">{label}</div>
        </div>
      </div>
    );
  },
);

SafetySignalMessageDisplay.displayName = "SafetySignalMessageDisplay";
