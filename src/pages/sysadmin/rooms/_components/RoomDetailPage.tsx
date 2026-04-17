import type { rooms } from "#/schemas/chatDB-schema";
import { memo, useState } from "react";
import { DeleteRestoreSection } from "./DeleteRestoreSection";
import { EditNameSection } from "./EditNameSection";
import { RoomConfigSection } from "./RoomConfigSection";
import { RoomInfoPanel } from "./RoomInfoPanel";

type Room = typeof rooms.$inferSelect;
type CreatorInfo = { id: string; name: string | null; email: string };

type Props = {
  room: Room;
  creator: CreatorInfo | null;
};

export const RoomDetailPage = memo(({ room: initialRoom, creator }: Props) => {
  const [room, setRoom] = useState(initialRoom);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <RoomInfoPanel room={room} creator={creator} />
      <EditNameSection room={room} onRoomUpdated={setRoom} />
      <RoomConfigSection room={room} onRoomUpdated={setRoom} />
      <DeleteRestoreSection room={room} onRoomUpdated={setRoom} />
    </div>
  );
});

RoomDetailPage.displayName = "RoomDetailPage";
