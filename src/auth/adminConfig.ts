import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc as defaultAdminAc,
  userAc,
} from "better-auth/plugins/admin/access";

// see https://better-auth.com/docs/plugins/admin#custom-permissions for docs
// and examples.

// we could just use the defaultStatements, but it feels right to have this as
// a place to add our own resources and permissions if we decide to in future,
// seeing as we're building almost everything else from scratch in here.
const permissionStatements = {
  ...defaultStatements,
} as const;

const ac = createAccessControl(permissionStatements);

// superadmin is a new role (not standard in better-auth's admin plugin.) It has
// all the powers of a default admin, plus impersonate-admins
const superadminAc = ac.newRole({
  ...defaultAdminAc.statements,
  user: ["impersonate-admins", ...defaultAdminAc.statements.user],
});

// our version of the admin role copies everything from the default one, but
// without "set-role". regular admins can't set other users' role.
const adminAc = ac.newRole({
  ...defaultAdminAc.statements,
  user: defaultAdminAc.statements.user.filter((p) => p !== "set-role"),
});

// this gets passed to the auth config and the auth client
export const adminConfig = {
  ac,
  roles: {
    // our new role
    superadmin: superadminAc,
    // our customized version of a default role
    admin: adminAc,
    // yeah, we recycle the default user role because we're not changing it
    user: userAc,
  },
};
