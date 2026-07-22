import { useNavigationContext } from "../useNavigationContext";
import { OutletContext } from "./OutletContext";
import { type ReactNode, useContext, useEffect, useId, useMemo } from "react";

/**
 * Wire a route's rendered content into an enclosing Outlet, if there is one.
 * When there is no Outlet, the content is returned to be rendered in place.
 */
export const useOutletRoute = (content: ReactNode) => {
  const routeId = useId();
  const outletContext = useContext(OutletContext);
  const { currentStep } = useNavigationContext();
  const stepId = currentStep?.id ?? "";

  // The effective id combines the step id and a per-route id. The step id alone
  // can't tell two routes apart; the route id alone can't tell two (differently
  // parameterised) steps apart.
  const id = useMemo(() => `${stepId}-${routeId}`, [routeId, stepId]);

  useEffect(() => {
    if (outletContext) {
      outletContext.register(id, content);
      return () => {
        outletContext.unregister(id);
      };
    }
  }, [content, outletContext, id]);
  return outletContext ? null : content;
};
