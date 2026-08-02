import { adminConfig } from "#/auth/adminConfig.ts";
import type { auth } from "#/auth/auth.ts";
import {
  HTTP_BAD_GATEWAY,
  HTTP_GATEWAY_TIMEOUT,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_REQUEST_TIMEOUT,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_TOO_MANY_REQUESTS,
} from "#/constants";
import { magicLinkClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 2000;

/**
 * Statuses that mean "ask again in a moment" rather than "your request was
 * wrong". Notably absent: 401, which is a real answer about the session.
 */
const RETRYABLE_STATUSES = new Set([
  HTTP_REQUEST_TIMEOUT,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_GATEWAY,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_GATEWAY_TIMEOUT,
]);

/**
 * Only idempotent reads get retried, and we recognise them by path because
 * better-fetch hands `shouldRetry` the Response and nothing else — there is no
 * request method available to inspect. Replaying a POST the server may already
 * have applied would be a worse bug than the one this is fixing.
 */
const RETRYABLE_PATHS = ["/get-session"];

const isRetryableResponse = (response: Response | null) => {
  if (!response?.url || !RETRYABLE_STATUSES.has(response.status)) {
    return false;
  }
  const { pathname } = new URL(response.url);
  return RETRYABLE_PATHS.some((path) => pathname.endsWith(path));
};

export const authClient = createAuthClient({
  fetchOptions: {
    // A deployment (or any brief server wobble) that fails /get-session leaves
    // better-auth's session atom at `{ isPending: false, data: null }`, which
    // is indistinguishable from a genuine logged-out state — see
    // useAnonymousFallbackSignIn for the damage that caused. Riding out
    // transient failures here closes most of that window.
    //
    // This only covers failed *responses*: better-fetch doesn't catch a thrown
    // fetch (an unreachable server), so callers still have to treat "errored"
    // as distinct from "logged out".
    retry: {
      type: "exponential",
      attempts: RETRY_ATTEMPTS,
      baseDelay: RETRY_BASE_DELAY_MS,
      maxDelay: RETRY_MAX_DELAY_MS,
      shouldRetry: isRetryableResponse,
    },
  },
  plugins: [
    magicLinkClient(),
    inferAdditionalFields<typeof auth>(),
    adminClient(adminConfig),
    anonymousClient(),
  ],
});
