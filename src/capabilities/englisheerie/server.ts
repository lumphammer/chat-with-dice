import { createServerCapability } from "#/capabilities/createServerCapability";
import {
  D10_SIDES,
  TRACK_LENGTH,
  buildStoryDeck,
  englishEerieCommon,
  evaluateObstructionRoll,
  hasUnrolledObstruction,
} from "./common";

// Fisher–Yates over a copy, so the caller's array is left alone and
// `buildStoryDeck` stays pure with this passed in.
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function rollD10(): number {
  return Math.floor(Math.random() * D10_SIDES) + 1;
}

export const englisheerieServer = createServerCapability(englishEerieCommon, {
  actionEffects: {
    // Leaving setup. Server-side because a first deck needs randomness, and
    // because the mode and the deck have to move together — a room in play with
    // no deck has nothing to do.
    //
    // Only a room without a story gets a fresh one. The condition also lets a
    // room stored in setup by an older version resume its existing story.
    beginPlay: ({ stateDraft }) => {
      stateDraft.mode = "play";
      if (stateDraft.stack.length === 0 && stateDraft.drawn.length === 0) {
        stateDraft.stack = buildStoryDeck(shuffle);
        stateDraft.lastObstruction = null;
      }
    },
    // Rebuilding the deck abandons whatever story was in progress — the sidebar
    // asks first.
    setUpDeck: ({ stateDraft }) => {
      stateDraft.stack = buildStoryDeck(shuffle);
      stateDraft.drawn = [];
      stateDraft.lastObstruction = null;
      stateDraft.obstructionRollers = {};
    },
    drawCard: ({ stateDraft, userId, broadcaster, sendChatMessage }) => {
      if (hasUnrolledObstruction(stateDraft)) {
        broadcaster.sendErrorToUserId(
          userId,
          "Roll against the current obstruction before drawing another card.",
        );
        return;
      }
      const top = stateDraft.stack.shift();
      if (!top) {
        broadcaster.sendErrorToUserId(
          userId,
          "The story deck is empty. Set it up again to start a new story.",
        );
        return;
      }
      // A plain copy, not the immer draft: this card outlives the draft in the
      // chat message, and reading a revoked draft proxy later would throw.
      const card = { ...top };
      stateDraft.drawn.push(card);

      // Only an Obstruction becomes the thing rolls are made against. Once it
      // has been rolled, later non-obstructing cards leave it as the last one.
      if (card.difficulty !== undefined) {
        stateDraft.lastObstruction = {
          cardId: card.id,
          difficulty: card.difficulty,
        };
      }

      const greyLadyNumber =
        card.kind === "greyLady"
          ? stateDraft.drawn.filter((drawn) => drawn.kind === "greyLady").length
          : undefined;

      sendChatMessage({
        kind: "draw",
        card,
        cardsRemaining: stateDraft.stack.length,
        greyLadyNumber,
      });
    },
    rollObstruction: ({
      stateDraft,
      payload,
      userId,
      displayName,
      broadcaster,
      sendChatMessage,
    }) => {
      const obstruction = stateDraft.lastObstruction;
      if (!obstruction) {
        broadcaster.sendErrorToUserId(
          userId,
          "There is no obstruction to roll against yet — draw a card first.",
        );
        return;
      }
      const previousRoller = stateDraft.obstructionRollers[obstruction.cardId];
      if (previousRoller !== undefined) {
        broadcaster.sendErrorToUserId(
          userId,
          `This obstruction was already rolled by ${previousRoller}.`,
        );
        return;
      }
      // Clamped rather than rejected: the sidebar caps the stepper, so a spend
      // over the top only happens when somebody else spent in between.
      const spentBefore = Math.min(
        payload.resolveSpentBefore,
        stateDraft.resolve,
      );
      stateDraft.resolve -= spentBefore;

      const die = rollD10();
      const { total, success } = evaluateObstructionRoll({
        die,
        difficulty: obstruction.difficulty,
        spentBefore,
        spentAfter: 0,
      });
      const spiritLost = !success && stateDraft.spirit > 0;
      if (spiritLost) {
        stateDraft.spirit -= 1;
      }

      stateDraft.obstructionRollers[obstruction.cardId] = displayName;
      sendChatMessage({
        kind: "roll",
        difficulty: obstruction.difficulty,
        die,
        spentBefore,
        spentAfter: 0,
        spiritLost,
        total,
        success,
      });
    },
    // The "spend Resolve 1:1 after the roll" half, driven from the roll's own
    // chat bubble the way `cards` turns a drawn card over.
    boostRoll: async ({ payload, userId, editChatMessage, stateDraft }) => {
      const available = stateDraft.resolve;
      // `editChatMessage` aborts silently when the updater returns undefined and
      // tells us nothing, so the updater reports back through this. It runs
      // synchronously inside the call, so it is settled by the time we read it —
      // and a refused edit must not cost anybody Resolve.
      let applied = 0;
      let reimburseSpirit = false;

      await editChatMessage(payload.messageId, (data, message) => {
        if (
          // Only the roller spends their own Resolve on their own roll.
          message.userId !== userId ||
          data.kind !== "roll" ||
          // Before or after, never both.
          data.spentBefore > 0 ||
          // Nothing to buy: the roll already made it.
          data.success ||
          payload.spend > available
        ) {
          return undefined;
        }
        const spentAfter = data.spentAfter + payload.spend;
        const { total, success } = evaluateObstructionRoll({
          die: data.die,
          difficulty: data.difficulty,
          spentBefore: 0,
          spentAfter,
        });
        applied = payload.spend;
        reimburseSpirit = success && data.spiritLost;
        return {
          ...data,
          spentAfter,
          spiritLost: reimburseSpirit ? false : data.spiritLost,
          total,
          success,
        };
      });

      if (applied > 0) {
        stateDraft.resolve -= applied;
        if (reimburseSpirit) {
          stateDraft.spirit = Math.min(stateDraft.spirit + 1, TRACK_LENGTH);
        }
      }
    },
  },
});
