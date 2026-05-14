# Use live room shares for file sharing

When a player shares a file or folder into a room, the room receives a live grant to the user-owned node rather than an immutable copied attachment. This keeps the UserData Durable Object authoritative for both the file tree and the sharing grant, while the ChatRoom Durable Object can cache share metadata for room browsing and chat rendering.
