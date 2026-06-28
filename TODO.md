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
- [x] Quotas
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
  - [x] Admin: reset folder sizes
  - [x] Admin: purge orphans
  - [x] Trash/recycle bin UI for restoring/forever-deleting soft-deleted items
  - [x] check deletion cascade
  - [x] Periodic purge of deleted files
- [x] thumbnails could be a little higher quality
- [x] Show anon/full in admin area
- [x] Refresh button
- [x] Grid view is not sticking (I had rejected cookies)
- [x] Why is chat spanking my GPU?
- [x] Preview toolbar should be responsive
- [x] type FileNode should be renamed (StorageNode?)
- [x] Think about sanitizing node data so we're not sending BE data to client
- [x] Clear up a proliferation of small types
- [x] Download from node list menu
- [x] Show view mode as a toggle not both items
- [x] Admins cannot ban themselves or each other
- [x] Anon users cannot be admin
- [x] filemanager header should be sticky
- [x] in sidebar, file drop target is not full height
- [x] standalone filemanager has too much whitespace on mobile
- [x] "Reshare file..." should not have dots (and maybe pick a better verb?)
- [x] remove all console.logs
- [x] "Preview" should be "View" (or whole thing is the link)
- [x] websocket endpoint can move under `rooms` in pages tree
- [x] Fix flows for new user/login/etc.
- [x] "About" page, with deploy time, summary, and terms of service
- [x] Email-only login
- [x] Hide irrelevant parts of account admin for anons

- [ ] Cache usernames in ChatRoomDO?
- [ ] Finish havocDark theme
- [ ] Recent rooms list
- [ ] Annotation/alt text
- [ ] Cards

- [ ] Periodic purge of anon users
- [ ] Swipe to move between files in preview
- [ ] fix up MaybeError etc and use exclusively

- [ ] Unstack, or refactor, the nest of providers in DiceRoller
- [ ] Easier feedback channels (built-in?)
- [ ] Move capability state storage into drizzle
- [ ] Responsive Grids for admin
- [ ] Perf analysis on types

### Deferred file manager items

- [ ] Move
- [ ] Multi-select for bulk operations
- [ ] Multi-part uploads for large files
- [ ] Replace/overwrite existing files
- [ ] Search by filename
- [ ] Paging for large folders
- [ ] Copy
- [ ] Recursive folder upload from OS

## Capabilities

- [x] Basic rolls
- [x] Lasers & Feelings
- [ ] Havoc Engine
  - [ ] Objectives/Adversaries/Rolls
- [ ] FitD
  - [ ] Clocks
  - [ ] Rolls
- [ ] Roll tables
- [ ] Collaborative documents
- [ ] Whiteboards

## New features

- [ ] Preferences
  - [ ] Edit mode (delete messages)
  - [ ] Theme
- [x] Users online as a panel
- [ ] Themes
- [ ] Room-level roles (e.g. appoint extra admins)
- [ ] Private rooms
