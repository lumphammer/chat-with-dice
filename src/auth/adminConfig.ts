import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  adminAc,
  userAc,
  defaultAc,
} from "better-auth/plugins/admin/access";

// https://better-auth.com/docs/plugins/admin#custom-permissions
// // we could just use the defaults of course
const permissionStatements = {
  ...defaultStatements,
} as const;

const ac = createAccessControl(permissionStatements);

const superadminAc = defaultAc.newRole({
  ...adminAc.statements,
  user: ["impersonate-admins", ...adminAc.statements.user],
});

export const adminConfig = {
  ac,
  roles: {
    superadmin: superadminAc,
    admin: adminAc,
    user: userAc,
  },
};
