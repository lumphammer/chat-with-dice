# TODO

- [x] Mobile layout
- [x] Help tab
- [x] Nanostores for room name, display name, etc.
- [x] limit connections per room (100?)
- [x] Fix websocket leakage & instability
- [x] Create proper relations for room owner
- [x] websocket endpoint can stop checking d1 for room existence (WONTFIX - still need to fetch authoritative DO id)
- [x] Swipable sidebar on mobile
- [x] Room should check it exists in D1 and not deleted BEFORE running DB migrations
- [x] grid view storage should be a gated atom
- [x] Sharing files to rooms (via `roomResourceShares`)
- [ ] Quotas
  - [ ] Keep user quota up to date
  - [ ] Quota usage and control in admin
    - [ ] Display quota usage
    - [ ] Set quota
    - [ ] "Check quota maths" button
    - [ ] "Check R2 sizes" button
  - [ ] Quota and usage display in filemanager
  - [ ] Quota enforcement
  - [ ] Trash/recycle bin UI for restoring/forever-deleting soft-deleted items
  - [ ] Periodic purge of deleted files
- [ ] Recent rooms list
- [ ] Easier feedback channels (built-in?)
- [ ] Move capability state storage into drizzle
- [ ] websocket endpoint can move under `rooms` in pages tree

### Deferred file manager items

- [ ] Annotation/alt text
- [ ] Paging for large folders
- [ ] Copy
- [ ] Move
- [ ] Multi-select for bulk operations
- [ ] Recursive folder upload from OS
- [ ] Multi-part uploads for large files
- [ ] Replace/overwrite existing files
- [ ] Search by filename

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
- [ ] Cards
- [ ] Roll tables
- [ ] Collaborative documents
- [ ] Whiteboards
- [ ] Room-level roles (e.g. appoint extra admins)
- [ ] Private rooms
