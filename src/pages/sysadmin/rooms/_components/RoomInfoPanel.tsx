import { roomTypes } from "#/roomTypes";
import type { rooms } from "#/schemas/chatDB-schema";
import { memo } from "react";

type Room = typeof rooms.$inferSelect;
type CreatorInfo = { id: string; name: string | null; email: string };

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
      {label}
    </dt>
    <dd className="text-base-content text-sm">{children}</dd>
  </div>
);

type Props = {
  room: Room;
  creator: CreatorInfo | null;
};

export const RoomInfoPanel = memo(({ room, creator }: Props) => {
  const typeInfo = roomTypes[room.type];
  const isDeleted = room.deleted_time != null;

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">
          Room Info
          {isDeleted && <span className="badge badge-error ml-2">Deleted</span>}
        </h2>
        <dl className="grid grid-cols-2 gap-4">
          <Field label="ID">
            <span className="font-mono text-xs break-all">{room.id}</span>
          </Field>
          <Field label="Name">{room.name}</Field>
          <Field label="Description">
            {room.description ?? <span className="text-base-content/50">—</span>}
          </Field>
          <Field label="Type">
            <span className="badge badge-ghost gap-1">
              {typeInfo && <typeInfo.Icon className="h-3 w-3" />}
              {typeInfo?.label ?? room.type}
            </span>
          </Field>
          <Field label="Created by">
            {creator ? (
              <a
                href={`/sysadmin/users/${creator.id}/`}
                className="link link-hover"
              >
                {creator.name ?? creator.email}
              </a>
            ) : (
              <span className="font-mono text-xs">{room.created_by_user_id}</span>
            )}
          </Field>
          <Field label="Created">
            {new Date(room.created_time).toLocaleString()}
          </Field>
          <Field label="Durable Object ID">
            {room.durableObjectId ? (
              <span className="font-mono text-xs break-all">
                {room.durableObjectId}
              </span>
            ) : (
              <span className="text-base-content/50">—</span>
            )}
          </Field>
          <Field label="Deleted">
            {room.deleted_time ? (
              new Date(room.deleted_time).toLocaleString()
            ) : (
              <span className="text-base-content/50">—</span>
            )}
          </Field>
          <Field label="Open in app">
            {!isDeleted ? (
              <a
                href={`/roller/${room.id}/`}
                className="link link-hover"
                target="_blank"
                rel="noopener noreferrer"
              >
                /roller/{room.id}
              </a>
            ) : (
              <span className="text-base-content/50">Room is deleted</span>
            )}
          </Field>
        </dl>
      </div>
    </div>
  );
});

RoomInfoPanel.displayName = "RoomInfoPanel";
