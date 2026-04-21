import type { auth } from "#/auth";
import { emailOTPClient } from "better-auth/client/plugins";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient, type Atom } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    inferAdditionalFields<typeof auth>(),
    adminClient(),
  ],
});

export const sessionAtom = authClient.$store.atoms.session as Atom<
  // typeof authClient.$Infer.Session
  ReturnType<typeof authClient.useSession>
>;
