import type { rooms } from "#/schemas/chatDB-schema";
import { actions } from "astro:actions";
import { memo, useState } from "react";

type Room = typeof rooms.$inferSelect;

type Props = {
  room: Room;
  onRoomUpdated: (room: Room) => void;
};

export const DeleteRestoreSection = memo(({ room, onRoomUpdated }: Props) => {
  const isDeleted = room.deleted_time != null;
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setFeedback(null);
    const { data, error } = await actions.admin.setRoomDeleted({
      roomId: room.id,
      deleted: !isDeleted,
    });
    setLoading(false);
    if (error || !data || !("room" in data)) {
      setFeedback({
        type: "error",
        message: error?.message ?? "Action failed.",
      });
    } else {
      onRoomUpdated(data.room as Room);
      setFeedback({
        type: "success",
        message: isDeleted ? "Room restored." : "Room soft-deleted.",
      });
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">
          {isDeleted ? "Restore Room" : "Delete Room"}
        </h2>
        <p className="text-base-content/70 text-sm">
          {isDeleted
            ? "This room is currently soft-deleted. Restoring it will make it visible to users again."
            : "Soft-deleting hides the room from all users. It can be restored at any time."}
        </p>
        {feedback && (
          <div
            className={`alert ${feedback.type === "success" ? "alert-success" : "alert-error"}`}
          >
            {feedback.message}
          </div>
        )}
        <div>
          <button
            type="button"
            className={`btn ${isDeleted ? "btn-success" : "btn-error"}`}
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm" />
            ) : isDeleted ? (
              "Restore Room"
            ) : (
              "Soft Delete Room"
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

DeleteRestoreSection.displayName = "DeleteRestoreSection";
