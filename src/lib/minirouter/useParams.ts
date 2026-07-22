import type { AnyDirection, Direction } from "./types";
import { useNavigationContext } from "./useNavigationContext";

type ParamsFromDirection<T extends AnyDirection> =
  T extends Direction<infer TParams> ? TParams : never;

/**
 * Read the params of the current step, or of any parent step, for a given
 * {@link Direction}. Typed from the Direction, so the result matches what was
 * passed when the step was created. Throws if no active step matches.
 */
export function useParams<TDirection extends AnyDirection>(
  direction: TDirection,
): ParamsFromDirection<TDirection> {
  const { currentStep, parentSteps } = useNavigationContext();
  const allSteps = [...parentSteps, ...(currentStep ? [currentStep] : [])];
  const params = allSteps.find((s) => s.direction === direction)?.params;

  if (params === undefined) {
    throw new Error(`Could not find step for ${direction.description}`);
  }
  return params;
}
