import type { ShareRemovalRow } from "./UserDataRepository";
import { logError } from "./utils";
import { env as cfEnv } from "cloudflare:workers";

/**
 * Tell every room holding one of these shares that its share is *gone* — the
 * node was hard-deleted, by a direct delete or the 24h purge. Unlike binning
 * (which pushes `onShareAvailabilityChange`), there is nothing left to restore,
 * so the room drops the share rather than marking it unavailable.
 *
 * Best-effort and non-fatal: capture the rows *before* the delete (the share
 * rows cascade away with the node), then fan out one RPC per room. A room that
 * cannot be reached keeps a dead entry in its sidebar — which 403s on click,
 * exactly as it did before this existed — but must never fail the delete or the
 * purge, so each RPC is caught and logged.
 */
export async function notifyRoomsOfShareRemoval(
  ownerUserId: string,
  rows: ShareRemovalRow[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  // One RPC per room, not per share: a room holding several shares under the
  // deleted folder should hear once.
  const byRoom = new Map<string, string[]>();
  for (const row of rows) {
    const nodeIds = byRoom.get(row.room_durable_object_id) ?? [];
    nodeIds.push(row.node_id);
    byRoom.set(row.room_durable_object_id, nodeIds);
  }

  await Promise.all(
    [...byRoom].map(async ([roomDurableObjectId, nodeIds]) => {
      try {
        const room = cfEnv.CHAT_ROOM_DO.get(
          cfEnv.CHAT_ROOM_DO.idFromString(roomDurableObjectId),
        );
        await room.onSharesRemoved(
          nodeIds.map((nodeId) => ({ ownerUserId, nodeId })),
        );
      } catch (cause) {
        logError(
          `Failed to notify room ${roomDurableObjectId} of share removal`,
          cause,
        );
      }
    }),
  );
}
