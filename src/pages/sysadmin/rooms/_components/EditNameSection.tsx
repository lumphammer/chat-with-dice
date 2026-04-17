import type { rooms } from "#/schemas/chatDB-schema";
import { actions } from "astro:actions";
import { memo, useState } from "react";

type Room = typeof rooms.$inferSelect;

type Props = {
  room: Room;
  onRoomUpdated: (room: Room) => void;
};

export const EditNameSection = memo(({ room, onRoomUpdated }: Props) => {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    const { data, error } = await actions.admin.updateRoom({
      roomId: room.id,
      name: name.trim(),
      description: description.trim() || null,
    });
    setLoading(false);
    if (error || !data || !("room" in data)) {
      setFeedback({
        type: "error",
        message: error?.message ?? "Failed to update room.",
      });
    } else {
      onRoomUpdated(data.room as Room);
      setFeedback({ type: "success", message: "Saved." });
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">Name &amp; Description</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="label label-text text-xs" htmlFor="room-name">
              Name
            </label>
            <input
              id="room-name"
              type="text"
              className="input input-bordered"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="label label-text text-xs"
              htmlFor="room-description"
            >
              Description (optional)
            </label>
            <input
              id="room-description"
              type="text"
              className="input input-bordered"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={512}
              placeholder="Leave blank to clear"
            />
          </div>
          {feedback && (
            <div
              className={`alert ${feedback.type === "success" ? "alert-success" : "alert-error"}`}
            >
              {feedback.message}
            </div>
          )}
          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

EditNameSection.displayName = "EditNameSection";
