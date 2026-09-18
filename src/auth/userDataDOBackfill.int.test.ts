import { HTTP_OK } from "#/constants";
import { db } from "#/db";
import { ALL } from "#/pages/api/auth/[...all]";
import { verifications } from "#/schemas/auth-schema";
import { createTestUser, type TestUser } from "#/test-utils/integration/users";
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const BASE = "http://localhost/api/auth";

/**
 * Drive the real auth entrypoint. The route only reads `context.request`, but
 * `APIContext` has ~20 required members and Astro offers no way to build a
 * partial one, so we narrow by cast rather than stub the whole surface.
 */
function callAuthRoute(request: Request): Promise<Response> {
  return Promise.resolve(ALL({ request } as unknown as APIContext));
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Better Auth rejects state-changing requests without a trusted origin.
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

async function readUserDataDOId(userId: string): Promise<string | null> {
  const row = await db.query.users.findFirst({
    where: { id: userId },
    columns: { user_data_do_id: true },
  });
  return row?.user_data_do_id ?? null;
}

/**
 * Better Auth matches sign-ins on the normalised (lower-cased) address, and
 * `createTestUser` derives its default email from a mixed-case nanoid - which
 * would never match, and would silently sign us in as a brand new user.
 */
function createMagicLinkUser(): Promise<TestUser> {
  return createTestUser({
    email: `magic-link-${crypto.randomUUID()}@test.example`,
  });
}

/**
 * Complete a magic-link sign-in without an inbox. `sendMagicLink` only fires
 * the mail off, so we take the token Better Auth persisted alongside it (it
 * lands in the verification row's `identifier`) and follow the link ourselves.
 *
 * The table is shared with every other test in the run and timestamps collide
 * at millisecond resolution, so we diff the rows rather than take the newest.
 */
async function signInByMagicLink(email: string): Promise<void> {
  const before = new Set(
    (await db.select({ id: verifications.id }).from(verifications)).map(
      (row) => row.id,
    ),
  );

  const sendResponse = await callAuthRoute(
    jsonRequest("/sign-in/magic-link", { email, callbackURL: "/" }),
  );
  expect(sendResponse.status).toBe(HTTP_OK);

  const issued = (
    await db
      .select({ id: verifications.id, identifier: verifications.identifier })
      .from(verifications)
  ).filter((row) => !before.has(row.id));
  expect(issued).toHaveLength(1);

  const verifyResponse = await callAuthRoute(
    // The emailed link carries the callback URL through; without it the
    // endpoint answers with JSON instead of a redirect.
    new Request(
      `${BASE}/magic-link/verify?token=${issued[0].identifier}&callbackURL=/`,
    ),
  );
  // Signing in successfully redirects to the callback URL; a failure would
  // redirect to an error URL instead, so assert we landed where we meant to.
  expect(verifyResponse.headers.get("location")).toBe("http://localhost/");
}

describe("user_data_do_id backfill (databaseHooks.session.create.after)", () => {
  it("allocates an id for a user created by the anonymous sign-in route", async () => {
    // The route `authClient.signIn.anonymous()` hits. It creates a session
    // without any credential flow, so it is the path most easily missed by a
    // hook keyed off sign-in endpoints.
    const response = await callAuthRoute(jsonRequest("/sign-in/anonymous", {}));
    expect(response.status).toBe(HTTP_OK);

    const { user } = await response.json<{ user: { id: string } }>();
    const userDataDOId = await readUserDataDOId(user.id);

    expect(userDataDOId).toEqual(expect.any(String));
    expect(userDataDOId).not.toBe("");
    // Opaque, not derived from the user id - nothing may reconstruct it.
    expect(userDataDOId).not.toBe(
      env.USER_DATA_DO.idFromName(user.id).toString(),
    );
    // It has to round-trip, because that is how every reader reaches the DO.
    expect(() =>
      env.USER_DATA_DO.idFromString(userDataDOId ?? ""),
    ).not.toThrow();
  });

  it("backfills an existing user that has no id yet", async () => {
    const user = await createMagicLinkUser();
    expect(await readUserDataDOId(user.id)).toBeNull();

    await signInByMagicLink(user.email);

    const userDataDOId = await readUserDataDOId(user.id);
    expect(userDataDOId).toEqual(expect.any(String));
    expect(userDataDOId).not.toBe("");
  });

  it("does not overwrite an id the user already has", async () => {
    const user = await createMagicLinkUser();
    await signInByMagicLink(user.email);
    const firstId = await readUserDataDOId(user.id);
    expect(firstId).toEqual(expect.any(String));

    await signInByMagicLink(user.email);

    // A fresh id here would strand everything stored in the first DO.
    expect(await readUserDataDOId(user.id)).toBe(firstId);
  });
});
