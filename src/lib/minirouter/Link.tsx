import type { AnyDirection, AnyStep, DirectionType } from "./types";
import { useNavigationContext } from "./useNavigationContext";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  type PropsWithChildren,
  useCallback,
} from "react";

type LinkProps = Omit<ComponentPropsWithoutRef<"button">, "onClick"> &
  PropsWithChildren<{
    from?: DirectionType;
    to?: AnyStep | AnyStep[] | "up";
  }>;

function isDirection(x: DirectionType): x is AnyDirection {
  return typeof x !== "string";
}

// A stable default for `to` so the empty case doesn't create a new array each
// render (which would break referential equality for memoised consumers).
const NO_STEPS: AnyStep[] = [];

/**
 * A navigation control for a minirouter. Renders a `<button>` (not an anchor):
 * these navigate an in-memory router with no URL, so they are semantically
 * buttons, which keeps the accessibility tree honest.
 *
 * @param from Where to navigate from — a {@link Direction}, `"root"`, or
 * `"here"` (the default).
 * @param to The step or steps to go to, or `"up"` to pop one level.
 */
export const Link = forwardRef<HTMLButtonElement, LinkProps>(
  (
    { children, from = "here", to = NO_STEPS, type = "button", ...otherProps },
    ref,
  ) => {
    const { navigate, parentSteps, currentStep } = useNavigationContext();
    if (isDirection(from)) {
      if (
        currentStep?.direction !== from &&
        !parentSteps.some((s) => s.direction === from)
      ) {
        throw new Error(
          `Link has "from" set to ${from.description} but the current step is not a descendant of that step`,
        );
      }
    }

    const onClick = useCallback(() => navigate(from, to), [from, navigate, to]);

    return (
      <button type={type} onClick={onClick} ref={ref} {...otherProps}>
        {children}
      </button>
    );
  },
);

Link.displayName = "Link";
