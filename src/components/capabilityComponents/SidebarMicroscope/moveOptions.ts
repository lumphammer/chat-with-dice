import {
  type MicroscopeState,
  type Placement,
  findItem,
} from "#/capabilities/microscope/common";

export type MoveOption = {
  label: string;
  /** Which arrow the menu draws beside it. */
  direction: "up" | "down" | "sideways";
  placement: Placement;
};

/**
 * The move offered in the card menu, in place of dragging.
 *
 * Sideways moves walk a *flat* list of containers — every Period for an Event,
 * every Event in the whole history for a Scene — so "move to the next event"
 * carries a Scene over a Period boundary without needing a separate command for
 * it. Landing at the end of the destination is the predictable answer; the up
 * and down moves are there to place it exactly.
 */
export function buildMoveOptions(
  state: MicroscopeState,
  id: string,
): MoveOption[] {
  const slot = findItem(state, id);
  if (slot === undefined) {
    return [];
  }

  const options: MoveOption[] = [];
  const { siblings, index } = slot;

  if (index > 0) {
    options.push({
      label: "Move up",
      direction: "up",
      placement: { relation: "before", targetId: siblings[index - 1].id },
    });
  }
  if (index < siblings.length - 1) {
    options.push({
      label: "Move down",
      direction: "down",
      placement: { relation: "after", targetId: siblings[index + 1].id },
    });
  }

  if (slot.kind === "event") {
    const containerIndex = state.periods.findIndex((period) =>
      period.events.some((event) => event.id === id),
    );
    addContainerMoves(options, state.periods, containerIndex, "period");
  }

  if (slot.kind === "scene") {
    const events = state.periods.flatMap((period) => period.events);
    const containerIndex = events.findIndex((event) =>
      event.scenes.some((scene) => scene.id === id),
    );
    addContainerMoves(options, events, containerIndex, "event");
  }

  return options;
}

function addContainerMoves(
  options: MoveOption[],
  containers: { id: string }[],
  containerIndex: number,
  containerLabel: string,
): void {
  if (containerIndex === -1) {
    return;
  }
  if (containerIndex > 0) {
    options.push({
      label: `Move to previous ${containerLabel}`,
      direction: "sideways",
      placement: {
        relation: "in",
        targetId: containers[containerIndex - 1].id,
      },
    });
  }
  if (containerIndex < containers.length - 1) {
    options.push({
      label: `Move to next ${containerLabel}`,
      direction: "sideways",
      placement: {
        relation: "in",
        targetId: containers[containerIndex + 1].id,
      },
    });
  }
}
