import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";

export type NodeRow = {
  id: string;
  name: string;
  deleted_time: number | null;
  parent_folder_id: string | null;
};

/**
 * Read a single row from a user's UserDataDO `nodes` table for assertions in
 * tests. Returns `null` when no row matches — useful for asserting a node was
 * hard-deleted (`expect(await peekNode(...)).toBeNull()`).
 */
export async function peekNode(
  userDataDOId: string,
  nodeId: string,
): Promise<NodeRow | null> {
  const stub = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(userDataDOId),
  );
  return runInDurableObject(stub, async (_instance, state) => {
    const rows = state.storage.sql
      .exec(
        "SELECT id, name, deleted_time, parent_folder_id FROM nodes WHERE id = ?",
        nodeId,
      )
      .toArray() as NodeRow[];
    return rows[0] ?? null;
  });
}
