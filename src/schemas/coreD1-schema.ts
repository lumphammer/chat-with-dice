import { users, authRelations } from "./auth-schema";
import { rooms } from "./roomSchema";
import { defineRelations } from "drizzle-orm";

export { accounts, sessions, users, verifications } from "./auth-schema";
export { rooms };

// Auth schema is generated and includes a `relations` object. We need to
// define our own "relations part" and merge it in to the auth one. See
// https://orm.drizzle.team/docs/relations-v2#relations-parts
//
// We're  doing it here for all of "our" tables because otherwise the import
// diagram can get a bit loopy.
const appRelations = defineRelations({ users, rooms }, (r) => ({
  rooms: {
    creator: r.one.users({
      from: r.rooms.createdByUserId,
      to: r.users.id,
    }),
  },
  users: {
    rooms: r.many.rooms({
      from: r.users.id,
      to: r.rooms.createdByUserId,
    }),
  },
}));

// deep merging these relations parts is pain right now
export const relations = {
  ...appRelations,
  ...authRelations,
  users: {
    ...authRelations.users,
    relations: {
      ...appRelations.users.relations,
      ...authRelations.users.relations,
    },
  },
};
