import { users, relations as authRelations } from "./auth-schema";
import { nodes, files, folders, roomResourceShares } from "./fileSystemSchema";
import { rooms } from "./roomSchema";
import { defineRelationsPart } from "drizzle-orm";

export { accounts, sessions, users, verifications } from "./auth-schema";
export { rooms, nodes, files, folders, roomResourceShares };

// Auth schema is generated and includes a `relations` object. We need to
// define our own "relations part" and merge it in to the auth one. See
// https://orm.drizzle.team/docs/relations-v2#relations-parts
//
// We're  doing it here for all of "our" tables because otherwise the import
// diagram gets a bit loopy.
const relationsPart = defineRelationsPart(
  { users, rooms, nodes, files, folders, roomResourceShares },
  (r) => ({
    rooms: {
      creator: r.one.users({
        from: r.rooms.created_by_user_id,
        to: r.users.id,
      }),
      shares: r.many.nodes({
        from: r.rooms.id.through(r.roomResourceShares.room_id),
        to: r.nodes.id.through(r.roomResourceShares.node_id),
      }),
    },
    users: {
      rooms: r.many.rooms({
        from: r.users.id,
        to: r.rooms.created_by_user_id,
      }),
      rootNodes: r.many.nodes({
        from: r.users.id,
        to: r.nodes.owner_user_id,
        where: {
          parent_folder_id: {
            isNull: true,
          },
        },
      }),
      /**
       * WARNING this will retrieve ALL the user's files - Drizzle relations
       * don't have a way to filter on the junction table.
       */
      files: r.many.files({
        from: r.users.id.through(r.nodes.owner_user_id),
        to: r.files.id.through(r.nodes.id),
      }),
      /**
       * WARNING this will retrieve ALL the user's files - Drizzle relations
       * don't have a way to filter on the junction table.
       */
      folders: r.many.folders({
        from: r.users.id.through(r.nodes.owner_user_id),
        to: r.folders.id.through(r.nodes.id),
      }),
    },
    nodes: {
      file: r.one.files({
        from: r.nodes.file_id,
        to: r.files.id,
      }),
      folder: r.one.folders({
        from: r.nodes.folder_id,
        to: r.folders.id,
      }),
      parentFolder: r.one.folders({
        from: r.nodes.parent_folder_id,
        to: r.folders.id,
      }),
      owner: r.one.users({
        from: r.nodes.owner_user_id,
        to: r.users.id,
      }),
    },
    files: {
      node: r.one.nodes({
        from: r.files.id,
        to: r.nodes.id,
      }),
    },
    folders: {
      node: r.one.nodes({
        from: r.folders.id,
        to: r.nodes.id,
      }),
    },
  }),
);

export const relations = { ...authRelations, ...relationsPart };
