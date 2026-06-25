import type { User } from "./auth.ts";

/**
 * The minimal, JSON-serializable subset of the auth user that we hand to client
 * islands as `initialUser`. Keeping this narrow means we only ever serialize
 * these fields into the page HTML — never the full server-side user record.
 */
export type ClientUser = {
  name: string | null;
  email: string;
  image: string | null;
  isAnonymous: boolean;
};

/**
 * Normalize a server-side `Astro.locals.user` into the {@link ClientUser} shape
 * for passing to a hydrated React island, or `null` for a logged-out visitor.
 *
 * `undefined` fields are coerced to `null`/`false` so the values survive JSON
 * serialization across the server→client boundary (keys set to `undefined` are
 * dropped entirely, which would break the island's `string | null` contract).
 */
export function toClientUser(user: null): null;
export function toClientUser(user: User): ClientUser;
export function toClientUser(user: User | null): ClientUser | null;
export function toClientUser(user: User | null): ClientUser | null {
  if (!user) {
    return null;
  }
  return {
    name: user.name ?? null,
    email: user.email,
    image: user.image ?? null,
    isAnonymous: user.isAnonymous ?? false,
  };
}
