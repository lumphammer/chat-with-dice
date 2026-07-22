import type { PropsWithChildrenAndDirection } from "./types";
import { useRoute } from "./useRoute";

/**
 * Render `children` when the enclosing router's current step matches
 * `direction`. Routes can be nested — a Route's children may contain further
 * Routes.
 */
export const Route = ({
  direction,
  children,
}: PropsWithChildrenAndDirection) => {
  return useRoute({ direction, children });
};

Route.displayName = "Route";
