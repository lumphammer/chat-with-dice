import type { AnyStep, Direction, Step } from "./types";
import { nanoid } from "nanoid";

/**
 * Create a {@link Direction}. The `description` is only used for debugging and
 * error messages. Pass a type parameter to require params when the Direction is
 * turned into a {@link Step}: `createDirection<string>("card")` is called as
 * `card("abc")`.
 */
export const createDirection = function <TParams = void>(
  description: string,
): Direction<TParams> {
  const direction = (params: TParams): Step<TParams> => {
    return {
      direction,
      params,
      id: nanoid(),
    };
  };

  direction.description = description;
  direction.match = (step: AnyStep | undefined): step is Step<TParams> => {
    return step?.direction === direction;
  };

  return direction;
};
