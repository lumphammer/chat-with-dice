# File manager plan

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
- Streaming upload: raw file body to `POST /api/files/upload?folderId=xxx&filename=yyy`, piped directly to R2's `PrivateBucket`
- Two-phase: insert DB record → stream to R2 → set `is_ready = 1`
- 100MB limit
- Files appear in the list immediately in an "uploading" state

## Download / preview

- `GET /api/files/:nodeId` — streams from R2 through the worker
- Ownership + deletion check before serving
- Aggressive caching headers (`Cache-Control: private`)

## Deferred for later

- Grid/thumbnail view
- File copy and move
- Multi-select for bulk operations
- Recursive folder upload from OS
- Replace/overwrite existing files
- Sharing files to rooms (via `roomResourceShares`)
- Trash/recycle bin UI for restoring soft-deleted items
- Preview for PDFs, audio, text/markdown
