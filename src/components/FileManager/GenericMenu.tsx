import { Menu } from "lucide-react";
import {
  memo,
  useCallback,
  useId,
  useRef,
  type PropsWithChildren,
} from "react";

export const useGenericMenu = () => {
  const menuId = useId();
  const anchorName = `--file-toolbar-${menuId.replaceAll(":", "")}`;
  const menuRef = useRef<HTMLDivElement>(null);

  const handleMenuAction = useCallback((action: () => void) => {
    menuRef.current?.hidePopover();
    action();
  }, []);

  return {
    menuId,
    anchorName,
    menuRef,
    handleMenuAction,
  };
};

export const GenericMenu = memo(
  ({
    children,
    genericMenu: { anchorName, menuId, menuRef },
  }: PropsWithChildren<{ genericMenu: ReturnType<typeof useGenericMenu> }>) => {
    return (
      <>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="File actions"
          popoverTarget={menuId}
          style={{ anchorName }}
        >
          <Menu size={16} />
        </button>
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          className="dropdown dropdown-end rounded-box bg-base-100 ring-base-200
            w-48 shadow-lg ring-1"
          style={{ positionAnchor: anchorName }}
        >
          <ul className="menu p-1">{children}</ul>
        </div>
      </>
    );
  },
);

GenericMenu.displayName = "GenericMenu";
