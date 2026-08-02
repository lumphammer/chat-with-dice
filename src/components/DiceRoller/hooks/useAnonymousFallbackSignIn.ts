import { authClient } from "#/auth/authClient.ts";
import { generateRandomName } from "#/utils/generateRandomName";
import { logger } from "#/utils/logger.ts";
import { useCallback, useEffect, useRef, type ReactNode } from "react";

/**
 * Visitors without an account get an anonymous one so they can join in. The
 * trigger for that has to be an actual *answer* from the server, though.
 *
 * better-auth's session atom reports a failed /get-session as
 * `{ isPending: false, data: null }` — byte-for-byte the same shape as "you are
 * logged out" — and /sign-in/anonymous only refuses when the caller is
 * *already* anonymous. So guessing wrong overwrites a perfectly good session
 * cookie with a fresh guest one, permanently. That's the mid-deployment logout
 * people kept reporting.
 *
 * We therefore only fall back to a guest account when the server has told us
 * there is no session, and only if we never saw one during this page's
 * lifetime. Every other route to `data === null` is reported rather than
 * papered over.
 */
export const useAnonymousFallbackSignIn = ({
  onError,
}: {
  onError: (title: ReactNode, details?: ReactNode) => void;
}) => {
  const { isPending, data: sessionData, error } = authClient.useSession();
  const hasEverHadSession = useRef(false);
  const isSigningIn = useRef(false);
  const hasReportedProblem = useRef(false);
  const hasAbandonedFallback = useRef(false);

  const anonSignIn = useCallback(async () => {
    const name = generateRandomName();
    const { error: signInError } = await authClient.signIn.anonymous();
    if (signInError) {
      hasAbandonedFallback.current = true;
      onError(
        signInError.message ??
          "Could not sign in anonymously. Please try refreshing.",
      );
      return;
    }

    const { error: updateError } = await authClient.updateUser({ name });
    if (updateError) {
      // The sign-in landed, so by now the session atom may well have picked up
      // the guest session we are about to throw away. Give up on the flow
      // before signing out, so the session going back to null is recognised as
      // our own cleanup rather than reported as the user being logged out.
      hasAbandonedFallback.current = true;
      onError(
        updateError.message ??
          "Could not sign in anonymously. Please try refreshing.",
      );
      await authClient.signOut();
    }
  }, [onError]);

  useEffect(() => {
    if (sessionData !== null) {
      hasEverHadSession.current = true;
      hasReportedProblem.current = false;
      hasAbandonedFallback.current = false;
      return;
    }
    if (isPending || isSigningIn.current) {
      return;
    }

    // The fallback ran and failed, and said so. Retrying would create an
    // anonymous user per attempt, and any of the messages below would either
    // repeat that or contradict it.
    if (hasAbandonedFallback.current) {
      return;
    }

    // We asked and didn't get an answer, so we know nothing about whether this
    // person is logged in. Say so instead of assuming the worst; the session
    // atom refetches on focus and when the browser comes back online.
    if (error) {
      logger.error(
        "session fetch failed, not falling back to anonymous",
        error,
      );
      if (!hasReportedProblem.current) {
        hasReportedProblem.current = true;
        onError(
          "Having trouble reaching the server.",
          "Your login is safe — try reloading in a moment.",
        );
      }
      return;
    }

    // A session we had has gone away. That's a real logout (an expired or
    // revoked session, or the server clearing the cookie), but silently
    // replacing their identity with a guest is how people ended up confused
    // about which account they were in.
    if (hasEverHadSession.current) {
      logger.error("session disappeared, not falling back to anonymous");
      if (!hasReportedProblem.current) {
        hasReportedProblem.current = true;
        onError(
          "You've been signed out.",
          "Sign in again to carry on with your account.",
        );
      }
      return;
    }

    isSigningIn.current = true;
    void anonSignIn().finally(() => {
      isSigningIn.current = false;
    });
  }, [isPending, sessionData, error, anonSignIn, onError]);
};
