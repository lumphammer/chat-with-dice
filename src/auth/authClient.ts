import { adminConfig } from "#/auth/adminConfig.ts";
import type { auth } from "#/auth/auth.ts";
import { magicLinkClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { anonymousClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    inferAdditionalFields<typeof auth>(),
    adminClient(adminConfig),
    anonymousClient(),
  ],
});
