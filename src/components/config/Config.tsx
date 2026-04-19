import {
  capabilityRegistry,
  type CapabilityName,
} from "#/capabilities/capabilityRegistry";
import { DeleteButton } from "#/components/capabilityComponents/shared/DeleteButton";
import { SidebarPanel } from "#/components/capabilityComponents/shared/SidebarPanel";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import { useRoomConfigContext } from "../DiceRoller/contexts/roomConfigContext";
import { actions } from "astro:actions";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

const capabilityNames = Object.keys(capabilityRegistry) as CapabilityName[];

function getCapabilityDefaultConfig(name: CapabilityName): unknown {
  return capabilityRegistry[name].capability.defaultConfig;
}

function setCapabilityEnabled(
  roomConfig: RoomConfig,
  capabilityName: CapabilityName,
  enabled: boolean,
): RoomConfig {
  const hasCapability = roomConfig.capabilities.some(
    ({ name }) => name === capabilityName,
  );

  if (hasCapability === enabled) {
    return roomConfig;
  }

  if (enabled) {
    return {
      ...roomConfig,
      capabilities: [
        ...roomConfig.capabilities,
        {
          name: capabilityName,
          config: getCapabilityDefaultConfig(capabilityName),
        },
      ],
    };
  }

  return {
    ...roomConfig,
    capabilities: roomConfig.capabilities.filter(
      ({ name }) => name !== capabilityName,
    ),
  };
}

export const Config = memo(() => {
  const { roomConfig, setRoomConfig, roomName, setRoomName, roomId } =
    useRoomConfigContext();

  const [roomNameDraft, setRoomNameDraft] = useState(roomName);
  const roomNameDraftRef = useRef(roomNameDraft);
  roomNameDraftRef.current = roomNameDraft;
  const lastSyncedRoomNameRef = useRef(roomName);
  const lastSubmittedRoomNameRef = useRef<string | null>(null);

  useEffect(() => {
    const previousRoomName = lastSyncedRoomNameRef.current;
    const lastSubmittedRoomName = lastSubmittedRoomNameRef.current;
    const shouldAdoptIncomingRoomName =
      roomNameDraftRef.current === previousRoomName ||
      roomName === lastSubmittedRoomName;

    if (shouldAdoptIncomingRoomName) {
      setRoomNameDraft(roomName);
    }

    if (roomName === lastSubmittedRoomName) {
      lastSubmittedRoomNameRef.current = null;
    }

    lastSyncedRoomNameRef.current = roomName;
  }, [roomName]);

  const trimmedName = roomNameDraft.trim();
  const canSubmitName = trimmedName.length > 0 && trimmedName !== roomName;

  const enabledCapabilities = useMemo(
    () => new Set(roomConfig.capabilities.map(({ name }) => name)),
    [roomConfig.capabilities],
  );

  const handleSubmitName = useCallback(() => {
    if (trimmedName.length === 0 || trimmedName === roomName) {
      setRoomNameDraft(roomName);
      return;
    }

    lastSubmittedRoomNameRef.current = trimmedName;
    setRoomNameDraft(trimmedName);
    setRoomName(trimmedName);
  }, [roomName, setRoomName, trimmedName]);

  const handleDeleteRoom = useCallback(async () => {
    await actions.deleteRoom({ roomId });
    window.location.href = "/roller/rooms";
  }, [roomId]);

  const handleToggleCapability = useCallback(
    (capabilityName: CapabilityName, enabled: boolean) => {
      const nextRoomConfig = setCapabilityEnabled(
        roomConfig,
        capabilityName,
        enabled,
      );

      if (nextRoomConfig !== roomConfig) {
        setRoomConfig(nextRoomConfig);
      }
    },
    [roomConfig, setRoomConfig],
  );

  return (
    <SidebarPanel title="Config" isSaving={false}>
      <p>{["primary", "secondary", "accent"]}</p>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitName();
        }}
      >
        <label
          htmlFor="config-room-name"
          className="mb-2 block text-sm font-medium"
        >
          Room name
        </label>
        <div className="join flex w-full">
          <input
            id="config-room-name"
            className="input input-primary join-item flex-1"
            value={roomNameDraft}
            onChange={(e) => setRoomNameDraft(e.target.value)}
            placeholder="Enter a room name"
            maxLength={80}
          />
          <button
            type="submit"
            className="btn btn-primary join-item"
            disabled={!canSubmitName}
          >
            Set name
          </button>
        </div>
      </form>

      <section className="mt-6">
        <h3 className="text-xl">Capabilities</h3>
        <ul className="mt-4 space-y-3">
          {capabilityNames.map((capabilityName) => {
            const isEnabled = enabledCapabilities.has(capabilityName);

            return (
              <li key={capabilityName}>
                <label
                  className="border-base-300 bg-base-100 rounded-box flex
                    cursor-pointer items-center justify-between border px-4 py-3
                    shadow-sm"
                >
                  <span className="font-medium">
                    {capabilityRegistry[capabilityName].capability.displayName}
                  </span>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) =>
                      handleToggleCapability(capabilityName, e.target.checked)
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-xl">Danger zone</h3>
        <div className="mt-4">
          <DeleteButton
            label="Delete room"
            itemType="room"
            challengePhrase={roomName}
            onDelete={handleDeleteRoom}
          />
        </div>
      </section>
    </SidebarPanel>
  );
});

Config.displayName = "Config";
