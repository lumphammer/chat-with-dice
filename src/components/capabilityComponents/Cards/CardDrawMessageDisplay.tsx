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

    const { ownerUserId, deck, card, faceDown, back } = parsed.data;

    // A Face Down draw shows the back, not the front — that is the whole point.
    // The front is still in the message data (Face Down is presentation, not
    // secrecy) but we do not surface it here, so the draw reads as face down to
    // everyone looking at the log. If the back image is somehow missing we fall
    // back to the front rather than showing nothing.
    const showingBack = faceDown && back !== undefined;
    const shown = showingBack ? back : card;
    const imageUrl = buildFileUrl(ownerUserId, shown.nodeId, { roomId });

    return (
      <div className="mt-1 flex flex-col gap-1">
        <span className="text-base-content/60">Drew from {deck.name}</span>
        {failed ? (
          <span className="italic">Card unavailable</span>
        ) : (
          <CardImagePreview
            src={imageUrl}
            alt={showingBack ? "Face down card" : card.name}
            onError={() => setFailed(true)}
          />
        )}
        <span className="font-medium wrap-anywhere">
          {showingBack ? "Face down" : card.name}
        </span>
      </div>
    );
  },
);

CardDrawMessageDisplay.displayName = "CardDrawMessageDisplay";
