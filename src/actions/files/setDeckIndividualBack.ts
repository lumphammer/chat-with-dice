import { z } from "astro/zod";
import { ActionError, defineAction } from "astro:actions";
import { env } from "cloudflare:workers";

/**
 * Pair a front Card Image with an Individual Back, or clear the pairing with
 * `backNodeId: null`. Owner-only — Deck configuration lives in the owner's file
 * store. The DO validates that both ids are ready images inside the Deck and
 * that a back serves only one front, so this action just forwards and maps the
 * typed rejections to a fixed, safe client error.
 */
export const setDeckIndividualBack = defineAction({
  input: z.object({
    nodeId: z.string(),
    frontNodeId: z.string(),
    backNodeId: z.string().nullable(),
  }),
  handler: async ({ nodeId, frontNodeId, backNodeId }, context) => {
    const user = context.locals.user;
    if (!user || user.isAnonymous) {
      throw new ActionError({ code: "UNAUTHORIZED", message: "Unauthorized" });
    }
    if (!user.userDataDOId) {
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "User data DO id not found",
      });
    }

    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    // Every known-bad outcome maps to BAD_REQUEST with a fixed, safe message; an
    // unexpected store failure throws out of the DO and surfaces as a generic
    // INTERNAL_SERVER_ERROR instead of being reported back as the caller's fault.
    const result = await userDataDO.setDeckIndividualBack(
      nodeId,
      frontNodeId,
      backNodeId,
    );
    if (result.result === "not-a-deck") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "That folder is not a deck",
      });
    }
    if (result.result === "invalid-front") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message: "The card must be a ready image in this deck",
      });
    }
    if (result.result === "invalid-back") {
      throw new ActionError({
        code: "BAD_REQUEST",
        message:
          "The individual back must be a different ready image in this deck",
      });
    }
  },
});
