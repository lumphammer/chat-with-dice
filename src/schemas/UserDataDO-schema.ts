import { defineRelations, sql } from "drizzle-orm";
import {
  int,
  text,
  check,
  uniqueIndex,
  snakeCase,
  unique,
  primaryKey,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const folders = snakeCase.table("folders", {
  id: text()
    .primaryKey()
    .references((): AnySQLiteColumn => nodes.id, {
      onDelete: "cascade",
    }),
  recursiveSizeBytes: int().notNull(),
});

export const files = snakeCase.table("files", {
  id: text()
    .primaryKey()
    .references((): AnySQLiteColumn => nodes.id, {
      onDelete: "cascade",
    }),
  sizeBytes: int().notNull(),
  isReady: int().notNull().default(0),
  r2Key: text().notNull(),
  contentType: text().notNull(),
  thumbnailR2Key: text(),
  thumbnailContentType: text(),
  thumbnailSizeBytes: int(),
});

export const nodes = snakeCase.table(
  "nodes",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    parentFolderId: text().references(() => folders.id, {
      onDelete: "cascade",
    }),
    createdTime: int()
      .notNull()
      .default(sql`(unixepoch(CURRENT_TIMESTAMP) * 1000)`),
    deletedTime: int(),
    folderId: text().references(() => folders.id, { onDelete: "cascade" }),
    fileId: text().references(() => files.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("nodes_parent_name_live")
      .on(table.parentFolderId, table.name)
      .where(sql`${table.deletedTime} IS NULL`),
    uniqueIndex("nodes_root_name_live")
      .on(table.name)
      .where(
        sql`${table.parentFolderId} IS NULL AND ${table.deletedTime} IS NULL`,
      ),
    check(
      "id_equals_metadata_fk",
      sql`(
        (${table.fileId} IS NOT NULL)
        AND (${table.id} == ${table.fileId})
      )
      OR (
        (${table.folderId} IS NOT NULL)
        AND (${table.id} == ${table.folderId})
      )`,
    ),
    check(
      "nodes__file_id_or_folder_id",
      sql`(
        ${table.fileId} IS NOT NULL
        AND ${table.folderId} IS NULL
      )
      OR (
        ${table.fileId} IS NULL
        AND ${table.folderId} IS NOT NULL
      )`,
    ),
  ],
);

export const decks = snakeCase.table("decks", {
  id: text()
    .primaryKey()
    .references((): AnySQLiteColumn => folders.id, {
      onDelete: "cascade",
    }),
  // The Deck's Common Back: the node id of one image child used as the back of
  // every Card that has no back of its own (Individual Backs are a later slice).
  // Nullable — a Deck need not have one. Stored as a plain id, deliberately not a
  // foreign key: like the Pile's Discard (ADR-0001 decision 4), a Card Image the
  // owner has since deleted just goes inert. The Common Back is resolved against
  // the Deck's live image children at read time, so a stale id simply reads back
  // as "no Common Back" rather than dangling — and node ids are never reused.
  commonBackId: text(),
  // Deck configuration (ADR-0001 decision 6): whether Face Down draws are
  // permitted. Travels with the Deck into any Room because it lives here, not
  // room-side. `0` (not permitted) is the default.
  allowFaceDown: int().notNull().default(0),
});

export const deckIndividualBacks = snakeCase.table(
  "deck_individual_backs",
  {
    // The Deck the pairing belongs to. This one *is* a foreign key with cascade:
    // when the Deck folder is hard-deleted its `decks` row goes (folders → decks
    // cascade) and its pairings should go with it — there is no reason to keep a
    // pairing for a Deck that no longer exists.
    deckId: text()
      .notNull()
      .references((): AnySQLiteColumn => decks.id, { onDelete: "cascade" }),
    // The front Card Image and the image serving as its Individual Back. Stored
    // as plain ids, deliberately *not* foreign keys to `nodes` — exactly like the
    // Deck's Common Back (see the `decks` table). A pairing is resolved against
    // the Deck's live image children at read time (ADR-0001 decision 3: only the
    // pairings are stored, Cards stay derived). If either image is later deleted
    // the row simply goes inert and resolves to "no pairing", rather than
    // dangling — and node ids are `nanoid`s, never reused, so an inert row can
    // never match a different image.
    frontId: text().notNull(),
    backId: text().notNull(),
  },
  (table) => [
    // One Individual Back per front. A given front is either unpaired or points
    // at exactly one back. (A back serving exactly one front is enforced in the
    // DO write path, which clears any prior pairing using the same back image.)
    primaryKey({ columns: [table.deckId, table.frontId] }),
  ],
);

export const roomResourceShares = snakeCase.table(
  "room_resource_shares",
  {
    id: text().primaryKey(),
    roomId: text().notNull(),
    roomDurableObjectId: text().notNull(),
    nodeId: text()
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    sharedTime: int()
      .notNull()
      .default(sql`(unixepoch(CURRENT_TIMESTAMP) * 1000)`),
  },
  (table) => [
    unique("room_resource_shares__room_id__node_id_idx").on(
      table.roomId,
      table.nodeId,
    ),
  ],
);

export const relations = defineRelations(
  { nodes, files, folders, decks, deckIndividualBacks, roomResourceShares },
  (r) => ({
    nodes: {
      file: r.one.files({
        from: r.nodes.fileId,
        to: r.files.id,
      }),
      folder: r.one.folders({
        from: r.nodes.folderId,
        to: r.folders.id,
      }),
      parentFolder: r.one.folders({
        from: r.nodes.parentFolderId,
        to: r.folders.id,
      }),
      shares: r.many.roomResourceShares({
        from: r.nodes.id,
        to: r.roomResourceShares.nodeId,
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
      deck: r.one.decks({
        from: r.folders.id,
        to: r.decks.id,
      }),
    },
    decks: {
      folder: r.one.folders({
        from: r.decks.id,
        to: r.folders.id,
      }),
      individualBacks: r.many.deckIndividualBacks({
        from: r.decks.id,
        to: r.deckIndividualBacks.deckId,
      }),
    },
    deckIndividualBacks: {
      deck: r.one.decks({
        from: r.deckIndividualBacks.deckId,
        to: r.decks.id,
        optional: false,
      }),
    },
    roomResourceShares: {
      node: r.one.nodes({
        from: r.roomResourceShares.nodeId,
        to: r.nodes.id,
        optional: false,
      }),
    },
  }),
);
