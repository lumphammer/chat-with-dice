import { microscopeMessageValidator } from "#/capabilities/microscope/common";
import { logger } from "#/utils/logger.ts";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import { ToneIcon, newItemLabel } from "./presentation";
import { memo, useMemo } from "react";

/**
 * The chat-log record of something being added to the history. Creations only:
 * what the table wants a record of is somebody making a thing everyone now has
 * to live with, not somebody fixing a typo half an hour later.
 */
export const MicroscopeMessageDisplay = memo(
  ({ capabilityData }: { capabilityData?: JsonData }) => {
    const parsed = useMemo(
      () => microscopeMessageValidator.safeParse(capabilityData),
      [capabilityData],
    );

    if (!parsed.success) {
      logger.error("Unable to parse microscope message data", capabilityData);
      return null;
    }

    const data = parsed.data;

    return (
      <div className="min-w-0">
        {/* The icon is inline in the eyebrow rather than a column of its own.
            A bubble the viewer sent is right-aligned (`data-is-mine:text-right`
            on `ChatBubble`), and a flex row ignores that — the icon stayed
            pinned to the left edge with the words a bubble's width away.
            Inline, it goes wherever the text goes. */}
        <div className="muted text-xs tracking-wide uppercase">
          {data.kind === "itemCreated" && (
            <ToneIcon tone={data.tone} className="mr-1 inline align-middle" />
          )}
          {data.kind === "itemCreated"
            ? newItemLabel(data.tone, data.itemKind)
            : "New legacy"}
        </div>
        <div className="wrap-break-word">{data.text}</div>
      </div>
    );
  },
);

MicroscopeMessageDisplay.displayName = "MicroscopeMessageDisplay";
