import type { rooms } from "#/schemas/chatDB-schema";
import { memo, useState } from "react";
import { AdminRoomRow } from "./AdminRoomRow";

type AdminRoom = typeof rooms.$inferSelect & {
  creatorName: string | null;
  creatorEmail: string | null;
};

type Props = {
  rooms: AdminRoom[];
};

export const AdminRoomList = memo(({ rooms: allRooms }: Props) => {
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allRooms.filter((room) => {
    if (!showDeleted && room.deleted_time != null) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        room.name.toLowerCase().includes(q) ||
        (room.description ?? "").toLowerCase().includes(q) ||
        (room.creatorName ?? "").toLowerCase().includes(q) ||
        (room.creatorEmail ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const total = allRooms.length;
  const deletedCount = allRooms.filter((r) => r.deleted_time != null).length;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">
          {filtered.length} Room{filtered.length !== 1 ? "s" : ""}
          {search && <span className="text-base-content/50 ml-1 text-base font-normal">(filtered)</span>}
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="search"
            className="input input-bordered input-sm w-48"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Show deleted
            {deletedCount > 0 && (
              <span className="badge badge-error badge-sm">{deletedCount}</span>
            )}
          </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table-zebra table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Created by</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-base-content/50 text-center py-8">
                  {total === 0 ? "No rooms yet." : "No rooms match your filters."}
                </td>
              </tr>
            ) : (
              filtered.map((room) => <AdminRoomRow key={room.id} room={room} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

AdminRoomList.displayName = "AdminRoomList";
