import { isAdminOrBetter } from "./roleHelpers";
import { ActionError } from "astro:actions";

// this needs to be in a separate file to the role helpers so that the auth
// config (used from CLI) doesn't try to import from astro:actions

/**
 * Helper for actions to quickly throw if the user is not privileged
 */
export const isAdminOrBetterOrThrow = (role: string | null | undefined) => {
  if (!isAdminOrBetter(role)) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Forbidden",
    });
  }
};
