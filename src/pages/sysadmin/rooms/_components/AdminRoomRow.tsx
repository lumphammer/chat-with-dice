import { roomTypes } from "#/roomTypes";
import type { rooms } from "#/schemas/chatDB-schema";
import { InfoIcon } from "lucide-react";
import { memo } from "react";

type AdminRoom = typeof rooms.$inferSelect & {
  creatorName: string | null;
  creatorEmail: string | null;
};

type Props = {
  room: AdminRoom;
};

export const AdminRoomRow = memo(({ room }: Props) => {
  const typeInfo = roomTypes[room.type];
  const creatorLabel = room.creatorName ?? room.creatorEmail ?? room.created_by_user_id;
  const isDeleted = room.deleted_time != null;

  return (
    <tr className={isDeleted ? "opacity-50" : undefined}>
      <td>
        <div className="flex items-center gap-2">
          {isDeleted && (
            <span className="badge badge-error badge-sm">Deleted</span>
          )}
          <a
            href={`/sysadmin/rooms/${room.id}/`}
            className="link link-hover font-medium"
          >
            {room.name}
          </a>
        </div>
        {room.description && (
          <div className="text-base-content/50 text-xs">{room.description}</div>
        )}
      </td>
      <td>
        <span className="badge badge-ghost gap-1">
          {typeInfo && <typeInfo.Icon className="h-3 w-3" />}
          {typeInfo?.label ?? room.type}
        </span>
      </td>
      <td>
        <a
          href={`/sysadmin/users/${room.created_by_user_id}/`}
          className="link link-hover text-sm"
        >
          {creatorLabel}
        </a>
      </td>
      <td className="text-sm">
        {new Date(room.created_time).toLocaleDateString()}
      </td>
      <td>
        <a
          href={`/sysadmin/rooms/${room.id}/`}
          className="btn btn-sm btn-outline"
          aria-label={`Manage ${room.name}`}
        >
          <InfoIcon className="h-4 w-4" />
          Manage
        </a>
      </td>
    </tr>
  );
});

AdminRoomRow.displayName = "AdminRoomRow";
