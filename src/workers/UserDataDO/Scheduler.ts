import { AbstractScheduler, type Event } from "../utils/AbstractScheduler";
import type { ShareRemovalRow } from "./UserDataRepository";
import type { UserDataRepository } from "./UserDataRepository";
import { env as cfEnv } from "cloudflare:workers";

const MS_IN_24H = 24 * 3600 * 1000;
const PURGE_CYCLE_MS = MS_IN_24H;

export class Scheduler extends AbstractScheduler {
  constructor(
    ctx: DurableObjectState,
    private repo: UserDataRepository,
    /**
     * Best-effort notify of every room whose share sat on a reaped node. Owned
     * by the DO because only it knows this user's id; the purge just hands over
     * the rows it gathered before deleting.
     */
    private notifyRoomsOfShareRemoval: (
      rows: ShareRemovalRow[],
    ) => Promise<void>,
  ) {
    super(ctx);
  }

  protected override async processEvent(event: Event) {
    if (event.id === "purge") {
      await this.purge();
    }
  }

  private async purge() {
    const now = Date.now();
    const cutoffTime = now - PURGE_CYCLE_MS;
    // get all the node Ids to be purged this time
    const nodeIds = await this.repo.findDeletedNodeIdsOlderThan(cutoffTime);
    // ...and their r2 keys
    const r2Keys = this.repo.recursivelyGetDescendantR2Keys(nodeIds);
    // ...and the shares about to cascade away with them, gathered before the
    // delete so we can still route the "your share is gone" notification.
    const shareRows = this.repo.findSharesAtOrBelowNodes(nodeIds);
    // nuke the nodes in the db
    await this.repo.hardDeleteNodes(nodeIds);
    // slice r2Keys up into batches of 1000
    const batches = r2Keys.reduce((acc, nodeId, index) => {
      if (index % 1000 === 0) acc.push([]);
      acc[acc.length - 1].push(nodeId);
      return acc;
    }, [] as string[][]);
    // and delete the assets in batches
    await Promise.all(
      batches.map(async (batch) => {
        await cfEnv.PRIVATE_R2?.delete(batch);
      }),
    );
    // Best-effort: after the rows are gone, tell the rooms that held them.
    await this.notifyRoomsOfShareRemoval(shareRows);
    const remainingDeletedNodeCount = await this.repo.getDeletedNodeCount();
    if (remainingDeletedNodeCount > 0) {
      await this.schedulePurge();
    }
  }

  async schedulePurge() {
    const existingEvents = await this.getEventsForId("purge");
    if (existingEvents.length === 0) {
      await this.scheduleEvent({
        id: "purge",
        runAt: Date.now() + PURGE_CYCLE_MS,
      });
    }
  }
}
