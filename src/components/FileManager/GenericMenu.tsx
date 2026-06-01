import { Ellipsis, Menu, EllipsisVertical } from "lucide-react";
import {
  memo,
  useCallback,
  useId,
  useRef,
  type ButtonHTMLAttributes,
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
    genericMenu: {
      menuId,
      anchorName,
      menuRef,
    },
    handleMenuAction,
  };
};

export const GenericMenu = memo(
  ({
    children,
    genericMenu: { anchorName, menuId, menuRef },
    label,
    icon,
    ...rest
  }: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & {
      genericMenu: ReturnType<typeof useGenericMenu>["genericMenu"];
      label: string;
      icon: "hamburger" | "vertical_kebab" | "horizontal_kebab";
    }
  >) => {
    return (
      <>
        <button
          // knitting together the props we control vs generic button props
          // you could override type if you were sick
          type="button"
          // className is very overridable
          className="btn btn-ghost btn-sm btn-circle"
          // now all the standard button attributes
          {...rest}
          // we knit style together to incude the anchorName
          style={{ ...(rest.style || {}), anchorName }}
          // allow to override aria-label but use the main prop per default
          aria-label={rest["aria-label"] ?? label}
          // we control popoverTarget absolutely otherwise the menu makes no
          // sense
          popoverTarget={menuId}
        >
          {icon === "hamburger" && <Menu size={16} />}
          {icon === "vertical_kebab" && <EllipsisVertical size={16} />}
          {icon === "horizontal_kebab" && <Ellipsis size={16} />}
        </button>
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          className="dropdown dropdown-end rounded-box bg-base-100 ring-base-200
            w-fit shadow-lg ring-1"
          style={{ positionAnchor: anchorName }}
        >
          <ul className="menu p-1">{children}</ul>
        </div>
      </>
    );
  },
);

GenericMenu.displayName = "GenericMenu";
