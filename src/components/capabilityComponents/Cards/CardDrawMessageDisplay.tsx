import { cardDrawMessageDataValidator } from "#/capabilities/cards/common";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { buildFileUrl } from "#/components/FileManager/fileUrl";
import { logger } from "#/utils/logger.ts";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
import { CardImagePreview } from "./CardImagePreview";
import { memo, useMemo, useState } from "react";

export const CardDrawMessageDisplay = memo(
  ({ capabilityData }: { capabilityData?: JsonData; messageId: string }) => {
    const parsed = useMemo(
      () => cardDrawMessageDataValidator.safeParse(capabilityData),
      [capabilityData],
    );
    const { roomId } = useRoomInfoContext();
    // The image is served (and re-authorised) through the files route. If the
    // Card was deleted from the Deck, or the Deck unshared, the request fails
    // and we fall back to a plain note rather than a broken image.
    const [failed, setFailed] = useState(false);

    if (!parsed.success) {
      logger.error("Unable to parse card draw message data", capabilityData);
      return null;
    }

    const { ownerUserId, deck, card, faceDown, inverted, back } = parsed.data;

    // A Face Down draw shows the back, not the front — that is the whole point.
    // The front is still in the message data (Face Down is presentation, not
    // secrecy) but we do not surface it here, so the draw reads as face down to
    // everyone looking at the log. If the back image is somehow missing we fall
    // back to the front rather than showing nothing.
    const showingBack = faceDown && back !== undefined;
    const shown = showingBack ? back : card;
    const imageUrl = buildFileUrl(ownerUserId, shown.nodeId, { roomId });

    // The Card's name is its source filename, which is noise in the log, so we
    // do not surface it. We label only the draw's notable states: "Face down"
    // when the back is showing and "Inverted" when the draw came up rotated —
    // both are independent, so a draw can be both (CONTEXT.md). When neither
    // applies there is nothing worth saying and the label is omitted. The alt
    // text mirrors the same combination, falling back to the name for a plain
    // face-up draw so the image is never left unlabelled.
    const labelParts: string[] = [];
    if (showingBack) labelParts.push("Face down");
    if (inverted) labelParts.push("Inverted");
    const label = labelParts.join(", ");
    const baseAlt = showingBack ? "Face down card" : card.name;
    const alt = inverted ? `${baseAlt}, inverted` : baseAlt;

    return (
      <div className="mt-1 flex flex-col gap-1">
        <span className="text-base-content/60">Drew from {deck.name}</span>
        {failed ? (
          <span className="italic">Card unavailable</span>
        ) : (
          <CardImagePreview
            src={imageUrl}
            alt={alt}
            label={label}
            inverted={inverted}
            onError={() => setFailed(true)}
          />
        )}
        {label && <span className="font-medium wrap-anywhere">{label}</span>}
      </div>
    );
  },
);

CardDrawMessageDisplay.displayName = "CardDrawMessageDisplay";
