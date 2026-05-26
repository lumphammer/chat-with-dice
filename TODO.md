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
  - [x] Create a repository object for user data
  - [x] Fix the missing FK from files/folders -> nodes
  - [x] Keep user quota up to date
  - [x] Quota usage and control in admin
    - [x] Display quota usage
    - [x] Set quota
    - [x] "Check quota maths" button
    - [x] "Check R2 sizes" button
  - [x] Quota enforcement
  - [x] Quota and usage display in filemanager
  - [x] Anon users have quota 0
  - [x] Full users have quota 1GB
  - [x] Quota query in admin seems to be using local user
  - [x] Anon users cannot have quota
  - [ ] Admin: reset folder sizes
  - [ ] Admin: purge orphans
  - [ ] Trash/recycle bin UI for restoring/forever-deleting soft-deleted items
  - [ ] Periodic purge of deleted files
- [x] Show anon/full in admin area
- [ ] Admins cannot ban themselves or each other
- [ ] Responsive Grids for admin
- [ ] Periodic purge of anon users
- [ ] Anon users cannot be admin
- [ ] Grid view is not sticking
- [ ] filemanager header should be sticky
- [ ] standalone filemanager has too much whitespace on mobile
- [ ] "Reshare file..." should not have dots (and maybe pick a better verb?)
- [ ] Preview toolbar should be responsive
- [ ] remove all console.logs
- [ ] "Preview" should be "View"
- [ ] Unstack, or refactor, the nest of providers in DiceRoller
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
