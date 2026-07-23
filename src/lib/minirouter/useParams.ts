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
  // Check for the step itself, not its params — a parameterless Direction
  // stores `params: undefined`, which is still a match.
  const step = allSteps.find((s) => s.direction === direction);

  if (!step) {
    throw new Error(`Could not find step for ${direction.description}`);
  }
  return step.params;
}
