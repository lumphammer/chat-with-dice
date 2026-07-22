import type { OutletContextValue } from "../types";
import { createContext } from "react";

/**
 * The context an Outlet uses to let child routes report their content up to a
 * parent for coordinated rendering (e.g. transitions). Null when there is no
 * enclosing Outlet, in which case routes render themselves.
 */
export const OutletContext = createContext<OutletContextValue | null>(null);
