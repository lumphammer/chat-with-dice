# TODO

## Capabilities

- [x] Framework for defining capabilities, including config, state, and actions
- [x] Mechanisms for sending that to clients at the right moments
- [x] Client side is aggregating all state in an untyped way
- [x] put chat area in a max-width container
- [x] add a sidebar which opens to the side in desktop, or overlaying on mobile
- [x] in sidebar, check or load room config and render a default UI per capability type
- [x] probably add something to CapabilityDef to handle getting state from central store, validating it, making it available
- [x] each component can then use that to get state and display magic on screen
- [x] finally, close the circle by being able to dispatch the actions we have on the capability
- [x] ability to "mount" a capability client-side

## Small Items

- [x] Mobile layout
- [x] Help tab
- [x] Nanostores for room name, display name, etc.
- [x] limit connections per room (100?)
- [x] Fix websocket leakage & instability
- [x] Create proper relations for room owner
- [ ] Recent rooms list
- [ ] Swipable sidebar on mobile
- [ ] Easier feedback channels (built-in?)
- [ ] Move capability state storage into drizzle
- [ ] Room should check it exists in D1 and not deleted BEFORE running DB migrations
- [ ] ws endponut can stop checking d1 fircroom existence
- ws endopunt can move under room in oages tree

## Big items

- [x] Mission statement
- [x] Basic room admin (owner only)
  - [x] Rename
  - [x] Delete
  - [x] Manage capabilities
- [x] Roll Types to capabilities
- [x] Split chat form / UX work
- [x] System admin
  - [x] Admin users
  - [x] List rooms
- [x] CI / CD
- [x] "Currently online" / ~~"All visitors" view~~
- [x] Roles/permissions
- [x] Completely overhaul anonymous login system

## File Manager

- [x] File manager with upload, browse, preview, rename delete.
- [x] Preview for PDFs, audio, text/markdown.
- [x] Thumbnails.
- [x] Grid view (larger thumbnail).
- [x] Goddammit, user data should be its own DO

### Room Shares phased implementation plan

See `CONTEXT.md`, `docs/adr/0001-live-room-shares.md`, and `docs/adr/0002-coordinate-room-shares-through-rooms.md`.

#### Phase 1: UserDataDO source of truth

- [ ] Model Room Shares as live grants owned by the sharer's UserDataDO, with their own stable IDs.
- [ ] Update UserDataDO share storage so one active Room Share exists per `(roomId, ownerUserId, nodeId)`.
- [ ] Prevent nested active grants when an ancestor folder share already covers the node.
- [ ] Add UserDataDO methods for creating/getting Room Shares, removing Room Shares, listing shares for a room, dereferencing a shared node, and browsing descendants through a folder share.
- [ ] Enforce ready-file rules: pending files cannot be shared or highlighted, while shared folders can later reveal descendants once those files are ready.
- [ ] Cover UserDataDO behavior with focused tests for duplicate share requests, covered descendant sharing, deleted files, moved descendants, and ready-file handling.
- [ ] Run `pnpm run check`.

#### Phase 2: chat and room projection contracts

- [ ] Extend chat messages with a nullable Shared Item Message payload containing `roomShareId`, highlighted `nodeId`, kind, and snapshot display metadata.
- [ ] Add ChatRoomDO storage for a display-only Room Share summary cache.
- [ ] Add idempotent ChatRoomDO share commands with client correlation IDs so retries do not create duplicate grants or accidental duplicate Shared Item Messages.
- [ ] Add ChatRoomDO unshare/remove commands, allowing the share creator or room owner to remove a Room Share.
- [ ] Broadcast room-share cache updates to connected clients without treating unshare as a chat message.
- [ ] Cover room command behavior with focused tests where the current Durable Object test setup allows it.
- [ ] Run `pnpm run check`.

#### Phase 3: room-share access endpoints

- [ ] Add room-share file and thumbnail endpoints based on `roomId`, `roomShareId`, and `nodeId`, with generated URLs rather than persisted access URLs.
- [ ] Add room-share browse endpoints for flat share roots and folder descendants relative to one shared root.
- [ ] Ensure all file, thumbnail, and descendant access validates against UserDataDO, not the ChatRoomDO summary cache.
- [ ] Allow anonymous Room Participants to view room-shared files, while still blocking personal file tree access and share creation.
- [ ] Add lazy validation cleanup so stale ChatRoomDO cache entries are cleaned when UserDataDO reports removed, deleted, moved-out-of-subtree, or missing data.
- [ ] Cover endpoint behavior for anonymous viewing, owner-only personal files, removed shares, deleted files, and moved descendants.
- [ ] Run `pnpm run check`.

#### Phase 4: reusable file browser components

- [ ] Factor the existing FileManager into reusable browser components that can support both the standalone `/files` page and the in-room Files sidebar.
- [ ] Keep the standalone `/files` page behavior unchanged for upload, browse, preview, rename, delete, thumbnails, and history navigation.
- [ ] Add room-aware browser state for flat Room Share roots, browsing inside one shared folder at a time, and paths relative to the shared root.
- [ ] Keep component files short by extracting local subcomponents as needed.
- [ ] Run `pnpm run check`.

#### Phase 5: in-room Files sidebar UX

- [ ] Add one Files sidebar tab with `Room` and `Mine` views.
- [ ] Show `Room` to anonymous participants and signed-in users; show `Mine` only to signed-in non-anonymous users.
- [ ] Implement `Share in chat`, `Add to room files`, and `Unshare` UI flows.
- [ ] Make `Share in chat` reuse an existing ancestor folder share for descendant Shared Item Messages instead of creating nested grants.
- [ ] Render Shared Item Messages in chat with snapshot display metadata and generated preview/thumbnail URLs.
- [ ] Render unavailable Shared Item Messages when a Room Share is removed, deleted, or no longer covers the highlighted node.
- [ ] Run `pnpm run check`.

#### Phase 6: resync and hardening

- [ ] Add explicit Room Share cache resync paths using UserDataDO `listRoomShares(roomId)`.
- [ ] Make repeated share/unshare commands repair missing ChatRoomDO cache entries without duplicate grants or duplicate chat cards.
- [ ] Add room owner removal coverage for any Room Share in the room.
- [ ] Review failure modes around cross-DO RPC errors, stale Durable Object IDs, and missing owner users.
- [ ] Add or update tests for cache drift, retry behavior, room owner removal, and old Shared Item Message availability.
- [ ] Run `pnpm run check`.

Each phase should be implementable in a fresh chat by asking the agent to read the linked docs, complete that phase only, and leave later phases untouched.

### Deferred file manager items

- [ ] Paging for large folders.
- [ ] Copy.
- [ ] Move.
- [ ] Multi-select for bulk operations.
- [ ] Recursive folder upload from OS.
- [ ] Replace/overwrite existing files.
- [ ] Sharing files to rooms (via `roomResourceShares`).
- [ ] Trash/recycle bin UI for restoring soft-deleted items.
- [ ] Periodic purge of deleted files.
- [ ] Quota and usage display.
- [ ] Quota enforcement.
- [ ] Quota usage and control in admin.
- [ ] Search by filename.
- [ ] Annotation/alt text

## Capabilities

- [x] Basic rolls
- [x] Lasers & Feelings
- [ ] Havoc Engine
  - [ ] Objectives/Adversaries/Rolls
- [ ] FitD
  - [ ] Clocks
  - [ ] Rolls

## New features

- [ ] Preferences
  - [ ] Edit mode (delete messages)
  - [ ] Theme
- [x] Users online as a panel
- [ ] Themes
- [ ] File uploads
- [ ] Cards
- [ ] Roll tables
- [ ] Collaborative documents
- [ ] Whiteboards
- [ ] Room-level roles (e.g. appoint extra admins)
- [ ] Private rooms
