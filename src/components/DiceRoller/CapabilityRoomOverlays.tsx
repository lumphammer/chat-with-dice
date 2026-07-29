import { useMountedCapabilities } from "#/capabilities/useMountedCapabilities";
import { memo } from "react";

/**
 * Renders the `RoomOverlayComponent` of every capability mounted in this room.
 *
 * Lives outside the sidebar and the chat log on purpose: a sidebar panel only
 * exists while its tab is selected, so a capability that has to react to
 * something the moment it happens — rather than when someone looks at it —
 * cannot do that from there.
 */
export const CapabilityRoomOverlays = memo(() => {
  const capabilities = useMountedCapabilities();

  return (
    <>
      {capabilities.map(([name, { RoomOverlayComponent }]) =>
        RoomOverlayComponent ? <RoomOverlayComponent key={name} /> : null,
      )}
    </>
  );
});

CapabilityRoomOverlays.displayName = "CapabilityRoomOverlays";
