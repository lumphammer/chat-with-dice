import { messageDataValidator } from "#/capabilities/englisheerie/common";
import { logger } from "#/utils/logger";
import type { JsonData } from "#/validators/jsonObjectValidator";
import { ObstructionRollMessage } from "./ObstructionRollMessage";
import { StoryCardMessage } from "./StoryCardMessage";
import { memo, useMemo } from "react";

export const EnglishEerieMessageDisplay = memo(
  ({
    capabilityData,
    messageId,
    messageUserId,
  }: {
    capabilityData?: JsonData;
    messageId: string;
    messageUserId: string;
  }) => {
    const parsed = useMemo(
      () => messageDataValidator.safeParse(capabilityData),
      [capabilityData],
    );

    if (!parsed.success) {
      logger.error(
        "Unable to parse English Eerie message data",
        capabilityData,
      );
      return null;
    }

    if (parsed.data.kind === "draw") {
      return (
        <StoryCardMessage
          card={parsed.data.card}
          cardsRemaining={parsed.data.cardsRemaining}
          greyLadyNumber={parsed.data.greyLadyNumber}
          greyLadyLoss={parsed.data.greyLadyLoss}
          difficultyBonus={parsed.data.difficultyBonus}
          messageId={messageId}
        />
      );
    }

    return (
      <ObstructionRollMessage
        data={parsed.data}
        messageId={messageId}
        messageUserId={messageUserId}
      />
    );
  },
);

EnglishEerieMessageDisplay.displayName = "EnglishEerieMessageDisplay";
