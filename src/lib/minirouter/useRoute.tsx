import { NavigationContext } from "./NavigationContext";
import { OutletContext } from "./outlets/OutletContext";
import { useOutletRoute } from "./outlets/useOutletRoute";
import type { AnyDirection, AnyStep, NavigationContextValue } from "./types";
import { useNavigationContext } from "./useNavigationContext";
import { type PropsWithChildren, useMemo } from "react";

type UseRouteArgs = PropsWithChildren<{
  direction: AnyDirection;
}>;

/**
 * The engine behind {@link Route}: renders `children` (inside a fresh
 * navigation context for the next layer down) when the enclosing router's
 * current step matches `direction`, and `null` otherwise. Roll your own route
 * component on top of this to control how content mounts and unmounts.
 */
export function useRoute({ direction, children }: UseRouteArgs) {
  const outerContext = useNavigationContext();
  const navigationContextValue = useMemo<NavigationContextValue>(
    () => ({
      navigate: (from, to) => {
        const isUp = to === "up";
        const toArray = isUp ? [] : Array.isArray(to) ? to : [to];
        let rootTo: AnyStep[];

        if (from === "root") {
          rootTo = toArray;
        } else if (from === "here") {
          // Navigating from "here" glues `to` onto the path down to this layer.
          rootTo = [
            ...outerContext.parentSteps,
            ...(outerContext.currentStep ? [outerContext.currentStep] : []),
            ...toArray,
          ];
        } else if (from.match(outerContext.currentStep)) {
          // Navigating from a Direction that happens to be the current step:
          // keep the parents and this step, then apply `to`.
          rootTo = [
            ...outerContext.parentSteps,
            outerContext.currentStep,
            ...toArray,
          ];
        } else {
          // Navigating from a parent step needs a little more surgery.
          const fromIndex = outerContext.parentSteps.findLastIndex(
            (step) => step.direction === from,
          );
          if (fromIndex === -1) {
            throw new Error(`Cannot navigate from ${from.description}`);
          }
          rootTo = [
            ...outerContext.parentSteps.slice(0, fromIndex + 1),
            ...toArray,
          ];
        }
        if (isUp) {
          if (rootTo.length === 0) {
            throw new Error("Cannot navigate up from root (from useRoute)");
          }
          rootTo = rootTo.slice(0, -1);
        }
        outerContext.navigate("root", rootTo);
      },
      currentStep: outerContext.childSteps[0],
      parentSteps: outerContext.currentStep
        ? [...outerContext.parentSteps, outerContext.currentStep]
        : [],
      childSteps: outerContext.childSteps.slice(1),
    }),
    [outerContext],
  );

  const content =
    outerContext.currentStep?.direction === direction ? (
      <NavigationContext.Provider value={navigationContextValue}>
        <OutletContext.Provider value={null}>{children}</OutletContext.Provider>
      </NavigationContext.Provider>
    ) : null;

  return useOutletRoute(content);
}
