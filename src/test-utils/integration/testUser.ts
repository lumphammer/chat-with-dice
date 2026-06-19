import { db } from "#/db";
import { sessions, users } from "#/schemas/auth-schema";
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

type TestUserOverrides = {
  name?: string;
  email?: string;
  emailVerified?: boolean;
  role?: string | null;
  isAnonymous?: boolean;
  storageQuotaBytes?: number;
};

export type TestUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  isAnonymous: boolean;
  sessionToken: string;
  headers: Headers;
};

/**
 * Insert a user + active session straight into D1, bypassing Better Auth's
 * sign-up flow. The returned `headers` carry the session cookie Better Auth
 * looks for, so `auth.api.getSession({ headers })` will resolve to this user.
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

  await db.insert(users).values({
    id: userId,
    name,
    email,
    emailVerified: overrides.emailVerified ?? true,
    role: overrides.role ?? null,
    isAnonymous: overrides.isAnonymous ?? false,
    storage_quota_bytes: overrides.storageQuotaBytes ?? DEFAULT_QUOTA_BYTES,
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
    role: overrides.role ?? null,
    isAnonymous: overrides.isAnonymous ?? false,
    sessionToken,
    headers,
  };
}

export type ActionContext = ReturnType<typeof makeActionContext>;

/**
 * Build a fake Astro action context that mimics what middleware would populate
 * after a logged-in request. Pass `user: null` for the unauthenticated case.
 */
export function makeActionContext(user: TestUser | null) {
  return {
    locals: {
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isAnonymous: user.isAnonymous,
          }
        : null,
      session: user ? { userId: user.id, token: user.sessionToken } : null,
    },
    request: new Request("http://localhost/"),
  };
}

type ActionHandler<TOutput> = (
  input: unknown,
  context: ActionContext,
) => Promise<TOutput> | TOutput;

/**
 * Invoke an Astro action's handler directly in tests.
 *
 * Astro's `defineAction` returns a callable client-side wrapper; the runtime
 * also has a `.handler` property but Astro's published types don't expose it.
 * Under our vitest `astro:actions` shim, actions ARE the `{ handler }` def
 * object, so this single cast is where we cross that gap.
 */
export async function callAction<TOutput>(
  action: unknown,
  input: unknown,
  context: ActionContext,
): Promise<TOutput> {
  const def = action as { handler: ActionHandler<TOutput> };
  return def.handler(input, context);
}
