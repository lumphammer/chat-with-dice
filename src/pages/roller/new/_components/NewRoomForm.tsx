import { AppWrapper } from "#/components/AppWrapper";
import { useStateWithRef } from "#/components/useStateWithRef";
import { GENERIC_ROOM_TYPE } from "#/constants";
import type { RoomType } from "#/types";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { AlertTriangleIcon as AlertIcon } from "lucide-react";
import { DicesIcon as DiceIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";

// function init() {
//   function showError(message: string) {
//     if (errorBanner && errorMessage) {
//       errorMessage.textContent = message;
//       errorBanner.classList.remove("hidden");
//       errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
//     }
//   }

//   function hideError() {
//     errorBanner?.classList.add("hidden");
//   }

//   function setLoading(loading: boolean) {
//     if (submitBtn instanceof HTMLButtonElement) {
//       submitBtn.disabled = loading;
//       submitBtn.classList.toggle("loading", loading);
//     }
//   }

//   formElement.addEventListener("submit");
// }

// init();

export const NewRoomForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomName, setRoomName, roomNameRef] = useStateWithRef<string>("");
  const [roomType, setRoomType] = useState<RoomType>(GENERIC_ROOM_TYPE);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    async (event: React.SubmitEvent) => {
      event.preventDefault();
      setError(null);

      const trimmed = roomNameRef.current.trim();
      if (!trimmed) {
        setError("Please enter a room name.");
        inputRef.current?.focus();
        return;
      }

      setLoading(true);

      try {
        const result = await actions.createChatWithDiceRoom({
          roomName: trimmed,
          type: GENERIC_ROOM_TYPE,
        });
        if (result.error) {
          setError(
            result.error.message ?? "Something went wrong. Please try again.",
          );
          console.error(result.error);
        } else if (!(result.data instanceof Response)) {
          void navigate(`/roller/rooms/${result.data.roomId}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [roomNameRef],
  );

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body bg-base-200 gap-6">
        {/*<!-- Error banner -->*/}
        <div
          id="errorBanner"
          data-error={error ? "" : undefined}
          role="alert"
          className="alert alert-error text-error-content hidden flex-row gap-3
            data-error:flex"
          aria-live="polite"
        >
          <AlertIcon className="inline" />
          {error}
        </div>

        {/*<!-- Form -->*/}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
          noValidate
        >
          {/*oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">Room name</span>
            </div>
            <input
              value={roomName}
              ref={inputRef}
              onChange={(e) => setRoomName(e.target.value)}
              type="text"
              className="input input-bordered input-primary w-full"
              placeholder="e.g. Friday Night D&D"
              maxLength={80}
              required
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <div className="label">
              <span className="label-text-alt text-base-content/50">
                Up to 80 characters
              </span>
            </div>
          </label>

          <button
            id="submitBtn"
            disabled={loading || roomName.trim() === ""}
            type="submit"
            className="btn btn-primary disabled:btn-disabled w-full gap-2"
          >
            <DiceIcon />
            Create Room
          </button>
        </form>
      </div>
    </div>
  );
};

export const NewRoomFormWrapper = () => {
  return (
    <AppWrapper>
      <NewRoomForm />
    </AppWrapper>
  );
};
