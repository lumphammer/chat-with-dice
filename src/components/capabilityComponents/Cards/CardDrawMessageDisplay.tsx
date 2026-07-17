import { cardDrawMessageDataValidator } from "#/capabilities/cards/common";
import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { buildFileUrl } from "#/components/FileManager/fileUrl";
import { logger } from "#/utils/logger.ts";
import type { JsonData } from "#/validators/jsonObjectValidator.ts";
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

    const { ownerUserId, deck, card } = parsed.data;
    const imageUrl = buildFileUrl(ownerUserId, card.nodeId, { roomId });

    return (
      <div className="mt-1 flex flex-col gap-1">
        <span className="text-base-content/60">Drew from {deck.name}</span>
        {failed ? (
          <span className="italic">Card unavailable</span>
        ) : (
          <img
            src={imageUrl}
            alt={card.name}
            onError={() => setFailed(true)}
            className="max-h-64 max-w-full self-start rounded-md object-contain"
          />
        )}
        <span className="font-medium wrap-anywhere">{card.name}</span>
      </div>
    );
  },
);

CardDrawMessageDisplay.displayName = "CardDrawMessageDisplay";
