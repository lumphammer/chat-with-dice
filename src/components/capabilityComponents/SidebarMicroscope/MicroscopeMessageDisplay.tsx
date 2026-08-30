import { microscopeMessageValidator } from "#/capabilities/microscope/common";
import { logger } from "#/utils/logger.ts";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import { ITEM_KIND_LABELS, ToneGlyph } from "./presentation";
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
      <div className="flex items-start gap-2">
        {data.kind === "itemCreated" && (
          <ToneGlyph tone={data.tone} className="mt-1 shrink-0" />
        )}
        <div className="min-w-0">
          <div className="muted text-xs tracking-wide uppercase">
            {data.kind === "itemCreated"
              ? `New ${ITEM_KIND_LABELS[data.itemKind]}`
              : "New legacy"}
          </div>
          <div className="wrap-break-word">{data.text}</div>
        </div>
      </div>
    );
  },
);

MicroscopeMessageDisplay.displayName = "MicroscopeMessageDisplay";
