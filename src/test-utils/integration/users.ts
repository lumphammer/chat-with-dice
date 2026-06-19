import type { User } from "#/auth/auth";
import { db } from "#/db";
import { sessions, users } from "#/schemas/auth-schema";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const SESSION_LIFETIME_DAYS = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const SESSION_LIFETIME_MS =
  SESSION_LIFETIME_DAYS *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MS_PER_SECOND;

const SESSION_TOKEN_LENGTH = 32;
const NAME_FRAGMENT_LENGTH = 6;
const DEFAULT_QUOTA_BYTES = 1_073_741_824;

/**
 * Subset of Better Auth's `User` fields that `createTestUser` knows how to
 * thread into the inserted row. Add to the `Pick` if a test needs to set a new
 * field (e.g. `banned`, `image`) — the goal is for unsupported overrides to be
 * a TS error rather than a silent no-op.
 */
type TestUserOverrides = Partial<
  Pick<
    User,
    | "name"
    | "email"
    | "emailVerified"
    | "role"
    | "isAnonymous"
    | "storageQuotaBytes"
  >
>;

/**
 * Better Auth's view of the user (camelCase, includes our `additionalFields`)
 * plus the bits a test needs to drive an authenticated request.
 */
export type TestUser = User & {
  sessionToken: string;
  headers: Headers;
};

/**
 * Insert a user + active session straight into D1, bypassing Better Auth's
 * sign-up flow. The returned `headers` carry the session cookie Better Auth
 * looks for, so `auth.api.getSession({ headers })` will resolve to this user.
 *
 * The user has no `userDataDOId` — pass the result through `attachUserDataDO`
 * if the test needs to invoke a DO-touching action.
 */
export async function createTestUser(
  overrides: TestUserOverrides = {},
): Promise<TestUser> {
  const userId = nanoid();
  const sessionToken = nanoid(SESSION_TOKEN_LENGTH);
  const now = new Date();
  const email = overrides.email ?? `${userId}@test.example`;
  const name =
    overrides.name ?? `Test User ${userId.slice(0, NAME_FRAGMENT_LENGTH)}`;
  const emailVerified = overrides.emailVerified ?? true;
  const role = overrides.role ?? null;
  const isAnonymous = overrides.isAnonymous ?? false;
  const storageQuotaBytes = overrides.storageQuotaBytes ?? DEFAULT_QUOTA_BYTES;

  await db.insert(users).values({
    id: userId,
    name,
    email,
    emailVerified,
    role,
    isAnonymous,
    user_data_do_id: null,
    storage_quota_bytes: storageQuotaBytes,
    storage_used_bytes: 0,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(sessions).values({
    id: nanoid(),
    userId,
    token: sessionToken,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    createdAt: now,
    updatedAt: now,
  });

  const headers = new Headers();
  headers.set("cookie", `better-auth.session_token=${sessionToken}`);

  return {
    id: userId,
    name,
    email,
    emailVerified,
    image: null,
    role,
    banned: null,
    banReason: null,
    banExpires: null,
    isAnonymous,
    userDataDOId: null,
    storageQuotaBytes,
    storageUsedBytes: 0,
    createdAt: now,
    updatedAt: now,
    sessionToken,
    headers,
  };
}

/**
 * Allocate a `USER_DATA_DO` id for the user and persist it (mirroring the
 * Better Auth post-sign-in hook in `auth.ts`). Returns the user with its
 * `userDataDOId` narrowed to `string`.
 */
export async function attachUserDataDO(
  user: TestUser,
): Promise<TestUser & { userDataDOId: string }> {
  const userDataDOId = env.USER_DATA_DO.idFromName(user.id).toString();
  await db
    .update(users)
    .set({ user_data_do_id: userDataDOId })
    .where(eq(users.id, user.id));
  return { ...user, userDataDOId };
}
