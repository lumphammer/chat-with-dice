export const isAdminOrBetter = (role: string | null | undefined) => {
  return role && ["admin", "superadmin"].includes(role);
};

export const isAdminOrBetterOrThrow = (role: string | null | undefined) => {
  if (!isAdminOrBetter(role)) {
    throw new Error("Forbidden");
  }
};
