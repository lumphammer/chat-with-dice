import { roomTypeOptionsByType } from "#/components/roomTypeOptions";
import type { RoomType } from "#/types";
import { useQuery } from "@tanstack/react-query";
import { actions } from "astro:actions";
import { CalendarDays, DoorOpen, Plus } from "lucide-react";

type Room = {
  id: string;
  name: string;
  description: string | null;
  created_by_user_id: string;
  created_time: number;
  type: RoomType;
};

export const RoomList = () => {
  const {
    data: rooms = [],
    isPending,
    isError,
  } = useQuery({
    queryKey: ["myRooms"],
    queryFn: async () => {
      const result = await actions.getMyRooms();
      if (result.error) throw result.error;
      const data = result.data;
      if (!Array.isArray(data))
        throw new Error("Unexpected response from server");
      return data as Room[];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Rooms</h2>
        <a href="/roller/new" className="btn btn-primary btn-sm gap-2">
          <Plus size={16} />
          New Room
        </a>
      </div>

      {isError && (
        <div role="alert" className="alert alert-error">
          <span>Failed to load rooms. Please try refreshing the page.</span>
        </div>
      )}

      {isPending && (
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="card bg-base-200">
              <div className="card-body gap-3">
                <div className="skeleton h-5 w-2/5 rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
                <div className="flex items-center justify-between">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-8 w-24 rounded" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isPending && !isError && Array.isArray(rooms) && rooms.length === 0 && (
        <div
          className="flex flex-col items-center gap-4 py-16 text-center
            opacity-60"
        >
          <DoorOpen size={48} strokeWidth={1.5} />
          <div>
            <p className="text-lg font-semibold">No rooms yet</p>
            <p className="text-sm">Create a room to get started.</p>
          </div>
        </div>
      )}

      {!isPending && !isError && Array.isArray(rooms) && rooms.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </ul>
      )}
    </div>
  );
};

function RoomCard({ room }: { room: Room }) {
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(room.created_time));

  return (
    <li className="card bg-base-200 transition-shadow hover:shadow-md">
      <div className="card-body gap-2 py-4">
        <h3 className="card-title text-lg leading-tight">{room.name}</h3>
        {room.description && (
          <p className="text-sm opacity-70">{room.description}</p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs opacity-50">
            <CalendarDays size={12} />
            {formattedDate}
          </span>
          <RoomTypeBadge type={room.type} />
          <a
            href={`/roller/rooms/${room.id}`}
            className="btn btn-primary btn-sm gap-2"
          >
            <DoorOpen size={14} />
            Enter
          </a>
        </div>
      </div>
    </li>
  );
}

function RoomTypeBadge({ type }: { type: RoomType }) {
  const option = roomTypeOptionsByType[type];
  if (!option) return null;
  const { Icon, label } = option;
  return (
    <span className="flex items-center gap-1 text-xs opacity-50">
      <Icon size={12} />
      {label}
    </span>
  );
}
