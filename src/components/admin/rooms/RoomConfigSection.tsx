import type { rooms } from "#/schemas/coreD1-schema";
import { actions } from "astro:actions";
import { memo, useState } from "react";

type Room = typeof rooms.$inferSelect;

type Props = {
  room: Room;
  onRoomUpdated: (room: Room) => void;
};

const toConfigText = (config: unknown): string => {
  if (config == null) return "{}";
  try {
    return JSON.stringify(config, null, 2);
  } catch {
    return "{}";
  }
};

export const RoomConfigSection = memo(({ room, onRoomUpdated }: Props) => {
  const [configText, setConfigText] = useState(() => toConfigText(room.config));
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFeedback(null);

    // Client-side JSON syntax check before sending
    try {
      JSON.parse(configText);
    } catch (err) {
      setFeedback({
        type: "error",
        message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    setLoading(true);
    const { data, error } = await actions.admin.updateRoom({
      roomId: room.id,
      config: configText,
    });
    setLoading(false);

    if (error || !data || !("room" in data)) {
      setFeedback({
        type: "error",
        message: error?.message ?? "Failed to update config.",
      });
    } else {
      onRoomUpdated(data.room as Room);
      // Reformat the saved config
      setConfigText(toConfigText((data.room as Room).config));
      setFeedback({ type: "success", message: "Config saved." });
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title text-base">Config</h2>
        <p className="text-base-content/60 text-xs">
          JSON is validated against the room config schema on save.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            className="textarea textarea-bordered font-mono text-xs"
            rows={12}
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            spellCheck={false}
          />
          {feedback && (
            <div
              className={`alert
              ${feedback.type === "success" ? "alert-success" : "alert-error"}`}
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
                "Save Config"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

RoomConfigSection.displayName = "RoomConfigSection";
