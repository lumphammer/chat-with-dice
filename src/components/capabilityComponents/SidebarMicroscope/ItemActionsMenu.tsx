import type { ItemKind, Placement } from "#/capabilities/microscope/common";
import { GenericMenu, useGenericMenu } from "#/components/GenericMenu";
import type { MoveOption } from "./moveOptions";
import { CHILD_KIND, ITEM_KIND_LABELS } from "./presentation";
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  CornerDownRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { memo } from "react";

const MOVE_ICONS = {
  up: ArrowUp,
  down: ArrowDown,
  sideways: ArrowRightLeft,
} as const satisfies Record<MoveOption["direction"], unknown>;

const ICON_SIZE = 14;

/**
 * Everything you can do to one card. Placement is expressed the way the game
 * thinks about it — before, after, or inside — rather than as a position, which
 * is also exactly what the action takes.
 *
 * The move entries stand in for dragging. They are not a stopgap: they are the
 * only way to reorder from a keyboard, so they stay whether or not a card can
 * be dragged.
 */
export const ItemActionsMenu = memo(
  ({
    kind,
    moveOptions,
    onEdit,
    onCreateBefore,
    onCreateAfter,
    onCreateInside,
    onMove,
    onDelete,
  }: {
    kind: ItemKind;
    moveOptions: MoveOption[];
    onEdit: () => void;
    onCreateBefore: () => void;
    onCreateAfter: () => void;
    /** Absent on a Scene, which has nothing to put inside it. */
    onCreateInside?: () => void;
    onMove: (placement: Placement) => void;
    onDelete: () => void;
  }) => {
    const { genericMenu, wrapMenuAction } = useGenericMenu();
    const kindLabel = ITEM_KIND_LABELS[kind];
    const childKind = CHILD_KIND[kind];

    return (
      <GenericMenu
        icon="vertical_kebab"
        label={`Actions for this ${kindLabel}`}
        genericMenu={genericMenu}
      >
        <li>
          <button type="button" onClick={wrapMenuAction(onEdit)}>
            <Pencil size={ICON_SIZE} />
            Edit this {kindLabel}
          </button>
        </li>
        <li>
          <button type="button" onClick={wrapMenuAction(onCreateBefore)}>
            <Plus size={ICON_SIZE} />
            New {kindLabel} before
          </button>
        </li>
        <li>
          <button type="button" onClick={wrapMenuAction(onCreateAfter)}>
            <Plus size={ICON_SIZE} />
            New {kindLabel} after
          </button>
        </li>
        {childKind && onCreateInside && (
          <li>
            <button type="button" onClick={wrapMenuAction(onCreateInside)}>
              <CornerDownRight size={ICON_SIZE} />
              New {ITEM_KIND_LABELS[childKind]} in this {kindLabel}
            </button>
          </li>
        )}
        {moveOptions.map((option) => {
          const Icon = MOVE_ICONS[option.direction];
          return (
            <li key={option.label}>
              <button
                type="button"
                onClick={wrapMenuAction(() => onMove(option.placement))}
              >
                <Icon size={ICON_SIZE} />
                {option.label}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            className="text-error-text"
            onClick={wrapMenuAction(onDelete)}
          >
            <Trash2 size={ICON_SIZE} />
            Delete this {kindLabel}
          </button>
        </li>
      </GenericMenu>
    );
  },
);

ItemActionsMenu.displayName = "ItemActionsMenu";
