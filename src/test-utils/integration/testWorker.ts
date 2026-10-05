/**
 * Minimal worker entry used by the vitest workers pool. The real production
 * entry (`src/workers/worker.ts`) pulls in `@astrojs/cloudflare/entrypoints/server`
 * which is an Astro build artifact that doesn't exist outside `astro build`.
 *
 * The pool needs `main:` to point at a script that exports our DO classes so
 * miniflare can register them and instantiate them in-process.
 *
 * The real `ChatRoomDO` is intentionally not re-exported here: its module graph
 * reaches `#/capabilities/capabilityRegistry`, which value-imports React sidebar
 * components and transitively `quikdown`, whose CJS/ESM interop blows up under
 * the workers pool's module loader. `CHAT_ROOM_DO` is bound to
 * `ChatRoomDOStub` below instead.
 */
import type { ChatRoomDO } from "#/workers/ChatRoomDO/ChatRoomDO";
import { DurableObject } from "cloudflare:workers";

export { UserDataDO } from "#/workers/UserDataDO/UserDataDO";

/** One RPC a `UserDataDO` made to a room, as recorded by `ChatRoomDOStub`. */
export type RoomNotification =
  | {
      method: "onShareAvailabilityChange";
      args: Parameters<ChatRoomDO["onShareAvailabilityChange"]>;
    }
  | {
      method: "onShareDeckStatusChange";
      args: Parameters<ChatRoomDO["onShareDeckStatusChange"]>;
    }
  | {
      method: "onSharesRemoved";
      args: Parameters<ChatRoomDO["onSharesRemoved"]>;
    };

export const ROOM_NOTIFICATIONS_KEY = "notifications";

/**
 * Stands in for `ChatRoomDO` as the target of the RPCs a `UserDataDO` pushes
 * to rooms. It records each call in its own storage, under
 * `ROOM_NOTIFICATIONS_KEY`, so a test can read them back with
 * `runInDurableObject`.
 */
export class ChatRoomDOStub extends DurableObject {
  private async record(notification: RoomNotification) {
    const notifications =
      (await this.ctx.storage.get<RoomNotification[]>(
        ROOM_NOTIFICATIONS_KEY,
      )) ?? [];
    notifications.push(notification);
    await this.ctx.storage.put(ROOM_NOTIFICATIONS_KEY, notifications);
  }

  async onShareAvailabilityChange(
    ...args: Parameters<ChatRoomDO["onShareAvailabilityChange"]>
  ) {
    await this.record({ method: "onShareAvailabilityChange", args });
  }

  async onShareDeckStatusChange(
    ...args: Parameters<ChatRoomDO["onShareDeckStatusChange"]>
  ) {
    await this.record({ method: "onShareDeckStatusChange", args });
  }

  async onSharesRemoved(...args: Parameters<ChatRoomDO["onSharesRemoved"]>) {
    await this.record({ method: "onSharesRemoved", args });
  }
}

export default {
  fetch() {
    return new Response("test-worker: HTTP routing is not wired in tests");
  },
};
