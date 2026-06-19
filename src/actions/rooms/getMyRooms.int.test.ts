import { getMyRooms } from "#/actions/rooms/getMyRooms";
import { db } from "#/db";
import { rooms } from "#/schemas/coreD1-schema";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { createTestUser } from "#/test-utils/integration/users";
import { nanoid } from "nanoid";
import { describe, expect, it } from "vitest";

const NAME_FRAGMENT_LENGTH = 6;
const HTTP_UNAUTHORIZED = 401;
const OLDER_ROOM_TIME = 1000;
const NEWER_ROOM_TIME = 2000;

async function insertRoom(opts: {
  userId: string;
  name?: string;
  deleted?: boolean;
  createdTime?: number;
}) {
  const id = nanoid();
  await db.insert(rooms).values({
    id,
    name: opts.name ?? `Room ${id.slice(0, NAME_FRAGMENT_LENGTH)}`,
    createdByUserId: opts.userId,
    createdTime: opts.createdTime ?? Date.now(),
    type: "generic",
    config: {},
    durableObjectId: nanoid(),
    deleted_time: opts.deleted ? Date.now() : null,
  });
  return id;
}

describe("getMyRooms", () => {
  it("returns the caller's non-deleted rooms, newest first", async () => {
    const user = await createTestUser();
    const other = await createTestUser();

    const older = await insertRoom({
      userId: user.id,
      createdTime: OLDER_ROOM_TIME,
    });
    const newer = await insertRoom({
      userId: user.id,
      createdTime: NEWER_ROOM_TIME,
    });
    await insertRoom({ userId: user.id, deleted: true });
    await insertRoom({ userId: other.id });

    const result = await callAction(
      getMyRooms,
      undefined,
      makeActionContext(user),
    );

    expect(Array.isArray(result)).toBe(true);
    const ids = (result as Array<{ id: string }>).map((r) => r.id);
    expect(ids).toEqual([newer, older]);
  });

  it("returns a 401 Response when there is no logged-in user", async () => {
    const result = await callAction(
      getMyRooms,
      undefined,
      makeActionContext(null),
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(HTTP_UNAUTHORIZED);
  });
});
