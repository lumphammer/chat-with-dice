import { useRoomInfoContext } from "#/components/DiceRoller/contexts/roomInfoContext";
import { type CapabilityName, isCapabilityName } from "./capabilityNames";
import { clientCapabilityRegistry } from "./clientCapabilityRegistry";
import { useMemo } from "react";

/**
 * The capabilities mounted in the current room, sorted by display name.
 *
 * Two sources, because the room config only records opt-in/out: the config's
 * own list, plus every `"always"` capability the config doesn't already name.
 * That mirrors `CapabilityService#mountAll` on the server, and both the sidebar
 * and the room overlays need to agree with it — hence one hook rather than the
 * same memo written twice.
 */
export function useMountedCapabilities() {
  const { roomConfig } = useRoomInfoContext();

  return useMemo(() => {
    const configCapabilityNames = roomConfig.capabilities.flatMap(({ name }) =>
      isCapabilityName(name) ? [name] : [],
    );
    const alwaysCapabilityNames = (
      Object.keys(clientCapabilityRegistry) as CapabilityName[]
    ).filter(
      (name) =>
        clientCapabilityRegistry[name].visibility === "always" &&
        !configCapabilityNames.includes(name),
    );
    return [...configCapabilityNames, ...alwaysCapabilityNames]
      .sort((a, b) =>
        clientCapabilityRegistry[a].displayName.localeCompare(
          clientCapabilityRegistry[b].displayName,
        ),
      )
      .map((name) => [name, clientCapabilityRegistry[name]] as const);
  }, [roomConfig.capabilities]);
}
