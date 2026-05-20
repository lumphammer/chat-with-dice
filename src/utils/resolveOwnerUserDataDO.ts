import { db as d1 } from "#/db";
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";

export const SELF_OWNER_SEGMENT = "~";

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type OwnerUserDataDOStub = ReturnType<typeof env.USER_DATA_DO.get>;

export type ResolveOwnerResult =
  | { ok: true; ownerUserDataDO: OwnerUserDataDOStub }
  | { ok: false; response: Response };

/**
 * Resolve the owner user's `UserDataDO` for a file-read request, performing
 * cross-user authorization when `ownerUserIdParam` is not the `~` sentinel.
 *
 * When `ownerUserIdParam === "~"` (or matches the caller) the caller is
 * reading their own data and we just return their DO. Otherwise we look up
 * the owner's DO ID in D1 and ask the owner DO whether `nodeId` is reachable
 * from any share rooted at `roomId` (an ancestor walk inside the owner's db).
 *
 * NOTE: we do not verify the caller is actually in `roomId`. Room IDs are
 * opaque enough that knowing one is a reasonable proxy for membership today,
 * but if that ever changes this becomes the place to add a membership check.
 */
export async function resolveOwnerUserDataDOForRead(
  ctx: APIContext,
  ownerUserIdParam: string,
  nodeId: string,
): Promise<ResolveOwnerResult> {
  const user = ctx.locals.user;
  if (!user) {
    return {
      ok: false,
      response: jsonError("Unauthorized", HTTP_UNAUTHORIZED),
    };
  }

  const isSelf =
    (!user.isAnonymous && ownerUserIdParam === SELF_OWNER_SEGMENT) ||
    ownerUserIdParam === user.id;

  if (isSelf) {
    if (!user.userDataDOId) {
      return {
        ok: false,
        response: jsonError(
          "User does not have a durable object id",
          HTTP_NOT_FOUND,
        ),
      };
    }
    return {
      ok: true,
      ownerUserDataDO: env.USER_DATA_DO.get(
        env.USER_DATA_DO.idFromString(user.userDataDOId),
      ),
    };
  }

  const roomId = ctx.url.searchParams.get("roomId");
  if (!roomId) {
    return {
      ok: false,
      response: jsonError(
        "Missing roomId for cross-user file access",
        HTTP_BAD_REQUEST,
      ),
    };
  }

  const owner = await d1.query.users.findFirst({
    where: { id: ownerUserIdParam },
  });
  if (!owner?.user_data_do_id) {
    return {
      ok: false,
      response: jsonError("Owner not found", HTTP_NOT_FOUND),
    };
  }

  const ownerDO = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(owner.user_data_do_id),
  );

  const accessible = await ownerDO.isNodeAccessibleFromRoom({ nodeId, roomId });
  if (!accessible) {
    return {
      ok: false,
      response: jsonError("Forbidden", HTTP_FORBIDDEN),
    };
  }

  return { ok: true, ownerUserDataDO: ownerDO };
}
