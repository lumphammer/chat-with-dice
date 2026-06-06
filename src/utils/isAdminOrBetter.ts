import { ADMIN_ROLE, SUPERADMIN_ROLE } from "#/constants.ts";

export const isAdminOrBetter = (role: string | null | undefined) => {
  return role && [ADMIN_ROLE, SUPERADMIN_ROLE].includes(role);
};

export const isAdminOrBetterOrThrow = (role: string | null | undefined) => {
  if (!isAdminOrBetter(role)) {
    throw new Error("Forbidden");
  }
};
