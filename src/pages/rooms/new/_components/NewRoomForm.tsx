import { authClient } from "#/auth/authClient";
import { AppWrapper } from "#/components/AppWrapper";
import { useStateWithRef } from "#/components/useStateWithRef";
import {
  GENERIC_ROOM_PRESET_NAME,
  type RoomPresetName,
} from "#/roomPresets.tsx";
import { generateRandomName } from "#/utils/generateRandomName.ts";
import { RoomPresetPicker } from "./RoomPresetPicker";
import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import {
  AlertTriangleIcon as AlertIcon,
  Dice6,
  Loader,
  User,
} from "lucide-react";
import { Dices, Boxes } from "lucide-react";
import { useCallback, useEffect } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";

type Inputs = {
  userDisplayName: string;
  roomName: string;
  preset: RoomPresetName;
  root: string;
};

export const NewRoomForm = ({
  initialIsLoggedIn,
}: {
  initialIsLoggedIn: boolean;
}) => {
  const {
    register,
    handleSubmit,
    // watch,
    formState: { errors },
    setValue,
    setError,
    clearErrors,

    control,
  } = useForm<Inputs>({
    defaultValues: {
      userDisplayName: "",
      roomName: "",
      preset: GENERIC_ROOM_PRESET_NAME,
    },
  });

  // states
  const [isSubmitting, setIsSubmitting, isSubmittingRef] =
    useStateWithRef(false);
  const [isLoggedIn, setIsLoggedIn, isLoggedInRef] =
    useStateWithRef(initialIsLoggedIn);

  // session handling
  const { isPending: isSessionPending, data: userData } =
    authClient.useSession();

  useEffect(() => {
    if (!isSessionPending && !isSubmittingRef.current) {
      setIsLoggedIn(userData !== null);
    }
  }, [isSessionPending, userData, setIsLoggedIn, isSubmittingRef]);

  // big submit function
  const onSubmit: SubmitHandler<Inputs> = useCallback(
    async (data) => {
      let shouldLogOutOnerror = false;

      clearErrors("root");

      // if not logged in, start by making an anon login
      if (!isLoggedInRef.current) {
        setIsSubmitting(true);

        // log in
        const newUser = await authClient.signIn.anonymous({
          query: { cache: "no-store" },
        });
        if (newUser.error) {
          setError("root", {
            type: "manual",
            message:
              newUser.error.message ??
              "Something went wrong. Please try again.",
          });
          setIsSubmitting(false);
          return;
        }

        // set username
        const { error: updateError } = await authClient.updateUser({
          name: data.userDisplayName.trim(),
        });
        if (updateError) {
          setError("root", {
            type: "manual",
            message:
              updateError?.message ?? "Something went wrong. Please try again.",
          });
          try {
            await authClient.deleteUser();
          } catch {}
          setIsSubmitting(false);
          return;
        }
        shouldLogOutOnerror = true;
      }

      // now we're going to make the room
      setIsSubmitting(true);
      const result = await actions.rooms.createChatWithDiceRoom({
        roomName: data.roomName,
        type: data.preset,
      });
      if (result.error) {
        setError("root", {
          message:
            result.error.message ?? "Something went wrong. Please try again.",
        });
        if (shouldLogOutOnerror) {
          try {
            await authClient.deleteUser();
          } catch {}
        }
        setIsSubmitting(false);
        return;
      }
      void navigate(`/rooms/${result.data.roomId}`);
    },
    [clearErrors, setError, isLoggedInRef, setIsSubmitting],
  );

  return (
    <div className="card bg-base-100 w-full max-w-md shadow-xl">
      <div className="card-body bg-base-200 gap-6">
        {/*<!-- Error banner -->*/}
        <div
          id="errorBanner"
          data-error={errors["root"] ? "" : undefined}
          role="alert"
          className="alert alert-error text-error-content hidden flex-row gap-3
            data-error:flex"
          aria-live="polite"
        >
          <AlertIcon className="inline" />
          {errors.root?.message}
        </div>

        {/*<!-- Form -->*/}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
          noValidate
        >
          {isSubmitting && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center
                justify-center gap-4 backdrop-blur"
            >
              {/* spinner */}
              <Loader size="48" className="animate-spin" />
              Submitting...
            </div>
          )}
          {!isLoggedIn && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">
                <User size={16} className="opacity-50" />
                What shall we call you?
              </legend>
              {errors.userDisplayName && (
                <div className="text-error-text">
                  {errors.userDisplayName.message}
                </div>
              )}
              <div className="join w-full">
                <input
                  className="input join-item flex-1"
                  type="text"
                  disabled={isSubmitting}
                  {...register("userDisplayName", {
                    required: isLoggedIn ? undefined : "This is required.",
                    setValueAs: (value) => value.trim(),
                  })}
                  // oxlint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus={!isLoggedIn}
                />
                <button
                  type="button"
                  className="btn btn-neutral btn-outline join-item" //
                  title="Generate random name"
                  aria-label="Generate random name"
                  disabled={isSubmitting}
                  onClick={() =>
                    setValue("userDisplayName", generateRandomName())
                  }
                >
                  <Dice6 size={18} />
                </button>
              </div>
            </fieldset>
          )}
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">
              <Boxes size={16} className="opacity-50" />
              What shall we call your chat room?
            </legend>
            {errors.roomName && (
              <div className="text-error-text">{errors.roomName.message}</div>
            )}
            <input
              type="text"
              disabled={isSubmitting}
              className="input input-bordered w-full"
              placeholder="e.g. Friday Night D&D"
              {...register("roomName", {
                required: "This is required.",
                maxLength: {
                  message: "Maximum length is 80 characters.",
                  value: 80,
                },
                setValueAs: (value) => value.trim(),
              })}
              // oxlint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={isLoggedIn}
            />
          </fieldset>

          <Controller
            name="preset"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <RoomPresetPicker
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />

          <button
            id="submitBtn"
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary disabled:btn-disabled w-full gap-2"
          >
            <Dices />
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
