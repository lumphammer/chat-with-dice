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

    const { kind, unattributed } = parsed.data;
    const { Icon, label, colorClass, borderClass } = SIGNAL_PRESENTATION[kind];

    return (
      <div
        className={`rounded-box flex items-center gap-3 border-2 px-4 py-3
          ${borderClass} ${colorClass}`}
      >
        <Icon className="h-10 w-10 shrink-0" />
        <div className="text-left">
          <div className="text-xl font-bold">{label}</div>
          {unattributed && (
            <div className="text-sm opacity-80">Sent anonymously</div>
          )}
        </div>
      </div>
    );
  },
);

SafetySignalMessageDisplay.displayName = "SafetySignalMessageDisplay";
