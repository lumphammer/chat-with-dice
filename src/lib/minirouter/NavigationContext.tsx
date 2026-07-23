import type { NavigationContextValue } from "./types";
import { createContext } from "react";

/**
 * The core context that makes everything happen. One is provided per layer of
 * the router (by {@link Router} at the root and {@link useRoute} for each
 * nested route).
 */
export const NavigationContext = createContext<NavigationContextValue | null>(
  null,
);
