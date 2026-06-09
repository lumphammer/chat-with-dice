import { authClient } from "#/auth/authClient";
import { AppWrapper } from "#/components/AppWrapper";
import { useStateWithRef } from "#/components/useStateWithRef";
import { GENERIC_ROOM_TYPE_NAME, type RoomTypeName } from "#/roomTypes";
import { generateRandomName } from "#/utils/generateRandomName.ts";
import { logger } from "#/utils/logger.ts";
import { RoomTypePicker } from "./RoomTypePicker";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { AlertTriangleIcon as AlertIcon, Dice6, User } from "lucide-react";
import { DicesIcon as DiceIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export const NewRoomForm = ({
  initialIsLoggedIn,
}: {
  initialIsLoggedIn: boolean;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [roomName, setRoomName, roomNameRef] = useStateWithRef<string>("");
  const [userDisplayName, setUserDisplayName, userDisplayNameRef] =
    useStateWithRef<string>("");
  const [roomType, setRoomType] = useState<RoomTypeName>(
    GENERIC_ROOM_TYPE_NAME,
  );
  const roomNameInputRef = useRef<HTMLInputElement>(null);
  const userDisplayNameInputRef = useRef<HTMLInputElement>(null);
  const [isLoggedIn, setIsLoggedIn, isLoggedInRef] =
    useStateWithRef(initialIsLoggedIn);
  const { isPending, data: userData } = authClient.useSession();
  useEffect(() => {
    if (!isPending) {
      setIsLoggedIn(userData !== null);
    }
  }, [isPending, userData, setIsLoggedIn]);

  const handleSubmit = useCallback(
    async (event: React.SubmitEvent) => {
      event.preventDefault();
      setError(null);

      if (!isLoggedInRef.current) {
        const trimmedUserDisplayName = userDisplayNameRef.current.trim();
        if (!trimmedUserDisplayName) {
          setError("Please enter a display name.");
          return;
        }
        const newUser = await authClient.signIn.anonymous();

        if (newUser.error) {
          setError(
            newUser.error.message ?? "Something went wrong. Please try again.",
          );
          return;
        }
        const { error: updateError } = await authClient.updateUser({
          name: trimmedUserDisplayName,
        });
        if (updateError) {
          setError(
            updateError.message ?? "Something went wrong. Please try again.",
          );
          return;
        }
        setIsLoggedIn(true);
      }

      const trimmedRoomName = roomNameRef.current.trim();
      if (!trimmedRoomName) {
        setError("Please enter a room name.");
        roomNameInputRef.current?.focus();
        return;
      }

      setLoading(true);

      try {
        const result = await actions.rooms.createChatWithDiceRoom({
          roomName: trimmedRoomName,
          type: roomType,
        });
        if (result.error) {
          setError(
            result.error.message ?? "Something went wrong. Please try again.",
          );
          logger.error(result.error);
        } else if (!(result.data instanceof Response)) {
          void navigate(`/rooms/${result.data.roomId}`);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      roomNameRef,
      roomType,
      userDisplayNameRef.current,
      isLoggedInRef,
      setIsLoggedIn,
    ],
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
          {!isLoggedIn && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                What shall we call you?
              </legend>
              <div className="join w-full">
                <label className="input join-item flex-1">
                  <User size={16} className="opacity-50" />
                  <input
                    ref={userDisplayNameInputRef}
                    type="text"
                    placeholder="Adventurous Badger"
                    value={userDisplayName}
                    onChange={(e) => setUserDisplayName(e.target.value)}
                    required
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-outline join-item" //
                  title="Generate random name"
                  aria-label="Generate random name"
                  onClick={() => setUserDisplayName(generateRandomName())}
                >
                  <Dice6 size={18} />
                </button>
              </div>
            </fieldset>
          )}
          {/*oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium">Room name</span>
            </div>
            <input
              value={roomName}
              ref={roomNameInputRef}
              onChange={(e) => setRoomName(e.target.value)}
              type="text"
              className="input input-bordered input-primary w-full"
              placeholder="e.g. Friday Night D&D"
              maxLength={80}
              required
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </label>

          <RoomTypePicker value={roomType} onChange={setRoomType} />

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

export const NewRoomFormWrapper = ({
  initialIsLoggedIn,
}: {
  initialIsLoggedIn: boolean;
}) => {
  return (
    <AppWrapper>
      <NewRoomForm initialIsLoggedIn={initialIsLoggedIn} />
    </AppWrapper>
  );
};
