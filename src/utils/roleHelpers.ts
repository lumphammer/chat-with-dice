import { ADMIN_ROLE, SUPERADMIN_ROLE } from "#/constants";
import { ActionError } from "astro:actions";

const parseRoles = (rolesString?: string | null) =>
  new Set(
    (rolesString ?? "")
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean),
  );

const adminRoles = new Set([ADMIN_ROLE, SUPERADMIN_ROLE]);

export const isSuperAdmin = (role: string | null | undefined) => {
  return parseRoles(role).has(SUPERADMIN_ROLE);
};

export const isAdminOrBetter = (role: string | null | undefined) => {
  return !parseRoles(role).isDisjointFrom(adminRoles);
};

export const isAdminOrBetterOrThrow = (role: string | null | undefined) => {
  if (!isAdminOrBetter(role)) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Forbidden",
    });
  }
};
