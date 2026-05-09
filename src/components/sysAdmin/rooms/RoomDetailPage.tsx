import type { rooms } from "#/schemas/coreD1-schema";
import { DeleteRestoreSection } from "./DeleteRestoreSection";
import { EditNameSection } from "./EditNameSection";
import { RoomConfigSection } from "./RoomConfigSection";
import { RoomInfoPanel } from "./RoomInfoPanel";
import type { User } from "better-auth";
import { memo, useState } from "react";

type Room = typeof rooms.$inferSelect;

export const RoomDetailPage = memo(
  ({ room: initialRoom, creator }: { room: Room; creator: User | null }) => {
    const [room, setRoom] = useState(initialRoom);

    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <RoomInfoPanel room={room} creator={creator} />
        <EditNameSection room={room} onRoomUpdated={setRoom} />
        <RoomConfigSection room={room} onRoomUpdated={setRoom} />
        <DeleteRestoreSection room={room} onRoomUpdated={setRoom} />
      </div>
    );
  },
);

RoomDetailPage.displayName = "RoomDetailPage";
