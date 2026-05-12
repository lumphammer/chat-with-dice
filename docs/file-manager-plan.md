# File manager plan

## Implementation context

### Key files

- **Astro page**: `src/pages/files/[...path].astro` — the entrypoint, catches all `/files/*` routes
- **React component**: `src/pages/files/_components/FileManager.tsx` — the client-only React island (stub exists)
- **Queries**: `src/pages/files/_components/queries.ts` — `getUserNodes(userId, folderId?)` fetches nodes for a folder
- **Schema**: `src/schemas/fileSystemSchema.ts` — defines `nodes`, `files`, `folders`, `roomResourceShares` tables
- **Relations**: `src/schemas/coreD1-schema.ts` — defines Drizzle relations between all tables
- **Existing action**: `src/actions/createFolder.ts` — partially implemented, good reference for new actions
- **Avatar upload**: `src/pages/api/upload-avatar.ts` — reference for upload endpoint pattern (but note: this buffers into memory via `formData()`, which we must NOT do — see streaming notes below)
- **R2 dev proxy**: `src/pages/api/r2/[...key].ts` — dev-only R2 read proxy, reference for streaming responses
- **Cloudflare config**: `wrangler.jsonc`

### Data model

The file system uses a **node** abstraction. Every file and folder is a `node` row:

- A node has either a `file_id` or a `folder_id` (never both, never neither — enforced by CHECK constraints)
- The node ID is always the same as its `file_id` or `folder_id` (also enforced by CHECK)
- `parent_folder_id` points to the parent folder (NULL for root-level items)
- `(parent_folder_id, name)` has a UNIQUE constraint — no duplicate names in the same folder
- `deleted_time` is NULL for live items, set to a timestamp for soft-deleted items
- `owner_user_id` identifies the owning user

The `files` table stores: `size_bytes`, `is_ready` (0 during upload, 1 when complete), `r2_key`, `content_type`.

The `folders` table stores: `recursive_size_bytes` (should stay in sync with children).

### R2 configuration

- **Private bucket binding**: `PRIVATE_R2` (use this for user files)
- **Public bucket binding**: `PUBLIC_R2` (used for avatars, not for user files)
- **Public URL**: `BUCKET_PUBLIC_URL` env var (for the public bucket only)

### Auth pattern

- In Astro pages/API routes: `Astro.locals.user` gives the current user (or `null` / anonymous)
- In actions: `context.locals.user`
- Always check `!user || user.isAnonymous` before allowing mutations

### Recursive CTE note

To resolve a URL path like `campaigns/maps` to a folder ID, use a recursive CTE in raw SQL. Drizzle ORM does not support recursive CTEs. **Ask the user about the CTE syntax** — they've been learning about them and want to be involved in that part.

## Navigation & URLs

- Client-side navigation within the React component, `pushState` to keep URLs in sync
- URLs reflect the full path: `/files/campaigns/maps/dungeon.png`
- Breadcrumb trail for orientation and upward navigation
- Recursive CTE (raw SQL) to resolve a URL path to a folder/file ID

## File display

- Simple list view — icon (from lucide-react), name, file size
- Folders sort above files
- Clicking a folder navigates into it; clicking a file opens a preview
- Image preview only for now; everything else gets a download card
- File preview has an X button that navigates up one level
- Friendly empty state message when a folder has no contents

## File operations

- Kebab menu (⋮) per row with delete and rename
- Delete is soft delete (`deleted_time`), no trash UI
- Rename is inline editing (Enter to save, Escape to cancel)
- Create Folder button in a toolbar above the file list
- Duplicate names rejected with an error

## Upload

- Upload button in the toolbar (opens file picker, `multiple` supported)
- Drag-and-drop with a full overlay ("drop files here to upload")
- Always uploads to the currently viewed folder
- Flat file list only — no recursive folder upload
- Streaming upload: raw file body to `POST /api/files/upload?folderId=xxx&filename=yyy`, piped directly to R2's `PRIVATE_R2`
- Two-phase: insert DB record → stream to R2 → set `is_ready = 1`
- 100MB limit
- Files appear in the list immediately in an "uploading" state

## Download / preview

- `GET /api/files/:nodeId` — streams from R2 through the worker
- Ownership + deletion check before serving
- Aggressive caching headers (`Cache-Control: private`)

## Bugs in need of fixing

- [x] loadFolder/refetchNodes can race when navigating quickly: a slower earlier request can resolve after a later one and overwrite nodes (and isLoading) with stale data. Consider tracking a request id/abort signal and only applying results for the latest navigation.
- [x] FileListItem renders a KebabMenu inside a button. nesting interactive HTML is invalid and bad for accessibility. Restructure so the KebabMenu is not inside the button.
- [x] in upload.ts, the size limit is only enforced via the Content-Length header, which may be absent/incorrect for streaming uploads. Consider checking r2Object.size after upload and deleting/rejecting files that exceed MAX_BYTES (and cleaning up both DB + R2) to enforce the limit reliably.
- [x] Uniqueness is not enforced for root nodes
- [x] Skeleton should fade in slowly to avoid a flash on fast transitions.
- [x] Uploading too-large files should be clearer about what went wrong.
- [ ] File preview should show file in breadcrumbs and allow breadcrumb navigation to containing folder.
- [ ] Paging for large folders.
- [x] Previews should be in a full-screen dialog

## Deferred for later

- [ ] Preview for PDFs, audio, text/markdown.
- [ ] Thumbnails.
- [ ] Grid view (larger thumbnail).
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
- [x] Goddammit, user data should be its own DO
