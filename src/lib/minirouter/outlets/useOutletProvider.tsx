import type { OutletContextValue } from "../types";
import { OutletContext } from "./OutletContext";
import { type ReactNode, useCallback, useMemo, useState } from "react";

/**
 * The hook behind an Outlet. Render the returned `content` (which yields no
 * on-screen output as long as its children are only routes) and use `registry`
 * — a map of route id to active content — to render and orchestrate the active
 * routes however you like.
 */
export const useOutletProvider = (children: ReactNode) => {
  const [registry, setRegistry] = useState<Record<string, ReactNode>>({});

  const register = useCallback((id: string, content: ReactNode) => {
    setRegistry((prev) => ({ ...prev, [id]: content }));
  }, []);

  const unregister = useCallback((id: string) => {
    setRegistry((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  }, []);

  const outletContextValue = useMemo<OutletContextValue>(
    () => ({ register, unregister }),
    [register, unregister],
  );

  // Render the children inside the outlet context so they report back up to
  // here instead of rendering themselves.
  const content = (
    <OutletContext.Provider value={outletContextValue}>
      {children}
    </OutletContext.Provider>
  );
  return { content, registry };
};
