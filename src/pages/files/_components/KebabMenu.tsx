import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { memo, useId, useRef } from "react";

export const KebabMenu = memo(
  ({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) => {
    const menuId = useId();
    const anchorName = `--kebab-${menuId.replaceAll(":", "")}`;
    const menuRef = useRef<HTMLDivElement>(null);

    const handleAction = (action: () => void) => {
      menuRef.current?.hidePopover();
      action();
    };

    return (
      <>
        <button
          className="btn btn-ghost btn-xs btn-circle"
          popoverTarget={menuId}
          style={{ anchorName } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <EllipsisVertical size={14} />
        </button>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- popover menu, keyboard handled by menu items */}
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          className="dropdown rounded-box bg-base-100 ring-base-200 w-44
            shadow-lg ring-1"
          style={{ positionAnchor: anchorName } as React.CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="menu p-1">
            <li>
              <button onClick={() => handleAction(onRename)}>
                <Pencil size={14} />
                Rename
              </button>
            </li>
            <li>
              <button
                className="text-error"
                onClick={() => handleAction(onDelete)}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </li>
          </ul>
        </div>
      </>
    );
  },
);

KebabMenu.displayName = "KebabMenu";
