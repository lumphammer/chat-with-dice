import { NavigationContext } from "./NavigationContext";
import type { AnyStep, NavigationContextValue } from "./types";
import { type PropsWithChildren, useMemo, useState } from "react";

function deepEquals(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The root of a router. Wrap any routed UI in a `Router`; its state is a list
 * of {@link Step}s (like a path), held in memory only — it never touches the
 * browser history, so multiple independent routers can coexist.
 */
export const Router = ({ children }: PropsWithChildren) => {
  const [currentPath, setCurrentPath] = useState<AnyStep[]>([]);
  const navigationContextValue = useMemo<NavigationContextValue>(
    () => ({
      navigate: (from, to) => {
        const isUp = to === "up";
        const toArray = isUp ? [] : Array.isArray(to) ? to : [to];
        setCurrentPath((path) => {
          // Build the new path according to whichever "from" mode we're in.
          let newPath: AnyStep[];
          if (from === "root" || from === "here") {
            newPath = toArray;
          } else {
            const fromIndex = path.findLastIndex(
              (step) => step.direction === from,
            );
            if (fromIndex === -1) {
              throw new Error(`Cannot navigate from ${from.description}`);
            }
            return [...path.slice(0, fromIndex + 1), ...toArray];
          }
          if (to === "up") {
            if (newPath.length === 0) {
              throw new Error("Cannot navigate up from root (says Router)");
            }
            newPath = path.slice(0, path.length - 1);
          }
          // Steps are recreated on every render, so a fresh step can have a
          // different id from the one already in the path. Where a new step
          // matches the old path in all but id, keep the old one so navigation
          // (and any id-keyed animation) stays stable.
          newPath = newPath.map((step, i) => {
            if (
              path[i] &&
              step.direction === path[i].direction &&
              (step.params === path[i].params ||
                deepEquals(step.params, path[i].params))
            ) {
              return path[i];
            } else {
              return step;
            }
          });
          return newPath;
        });
      },
      currentStep: currentPath[0],
      parentSteps: [],
      childSteps: currentPath.slice(1),
    }),
    [currentPath],
  );
  return (
    <NavigationContext.Provider value={navigationContextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

Router.displayName = "Router";
