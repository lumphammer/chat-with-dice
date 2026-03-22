import { type Draft, produce } from "immer";
import {
  type Context,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { z } from "zod";

/**
 * A minimal case for all actions - there will always be a `type` and a
 * `payload` property, but the payload may be `undefined`.
 */
export type AnyAction = {
  type: string;
  payload?: unknown;
};

/**
 * A minimal reimplementation of the `createAction` function from
 * `@reduxjs/toolkit`.
 *
 * Given a unique string (danger will robinson!) and a reducer function, returns
 * an object with
 *
 *  * a `create` method that returns an action object
 *  * an `apply` function, which take a state and an action and applies the
 *    relevant reducer if the action matches the case
 */
function createCase<TState, TPayloadValidator extends z.ZodAny>(
  type: string,
  payloadValidator: TPayloadValidator,
  reducer: (draft: TState, payload: z.infer<TPayloadValidator>) => void,
) {
  const create = (payload: z.infer<TPayloadValidator>) => ({ type, payload });
  const match = (
    action: AnyAction,
  ): action is { type: string; payload: z.infer<TPayloadValidator> } =>
    action.type === type;
  const apply = (state: TState, action: AnyAction) => {
    if (match(action)) {
      return reducer ? reducer(state, action.payload) : state;
    }
    return state;
  };
  return {
    /** Create an action (to be dispatched with `dispatch` from `useReducer` */
    create,
    /**
     * given a mutable draft object of S, and action, mutate the draft if the
     * action is from this slice.
     */
    apply,
  };
}

type ReducerObject<TState, TPayloadValidator extends z.ZodAny = z.ZodAny> = {
  payloadValidator: TPayloadValidator;
  reducer: (state: Draft<TState>, payload: z.infer<TPayloadValidator>) => void;
};

type Reducers<TState> = {
  [key: string]: ReducerObject<TState>;
};

// export type CreateSliceArgs = {
//   onError?: (error: unknown) => void;
//   log?: (...args: unknown[]) => void;
// };

/**
 * A minimal reimagination of the `createSlice` function from
 * `@reduxjs/toolkit`.
 * This function is curried so that we can specify S (state) but allow R
 * (reducers) to be inferred.
 */
export const createSlice = <
  TValidator extends z.ZodTypeAny,
  TReducers extends Reducers<z.infer<TValidator>>,
>(
  validator: TValidator,
  reducers: TReducers,
) => {
  // turn all the reducers into cases (so they can be created and applied)
  const sliceCases = Object.entries(reducers).map(
    ([key, { payloadValidator, reducer }]) => {
      const action = createCase(key, payloadValidator, reducer);
      return [key, action] as const;
    },
  );
  // turn those cases back into an object of creators.
  const creators = Object.fromEntries(
    sliceCases.map(([key, action]) => [key, action.create]),
  ) as {
    // we need this mad cast because `map` can't give us accurate types.
    // we're just knitting together the `typeof createCase<...>["create"]`
    // and working out the payload type using inference.
    [key in keyof TReducers]: ReturnType<
      typeof createCase<
        S,
        TReducers[key] extends (state: unknown) => void
          ? void
          : TReducers[key] extends (state: unknown, payload: infer P1) => void
            ? P1
            : never
      >
    >["create"];
  };
  // `useDispatch` takes the initial state as an argument, so we don't need to
  // provide a default argument for `state` here (unlike e.g. a Redux
  // reducer).
  const reducer = (state: S, action: AnyAction) => {
    try {
      const newState = produce(state, (draft) => {
        for (const [, sliceCase] of sliceCases) {
          sliceCase.apply(draft, action);
        }
      });

      return newState;
    } catch (e) {
      // in the event of an error, we will try to keep going rather than just
      // exploding
      console.error(e);
      return state;
    }
  };

  return {
    /**
     * A dictionary of action creators, keyed by the name of the case.
     */
    creators,
    /**
     * The reducer function for this slice.
     */
    reducer,
  };
};

/**
 * Create a `useSelector` hook that uses the given `context`.
 */
export const createUseSelectorHook = <TState>(context: Context<TState>) => {
  return <TValue>(selector: (state: TState) => TValue) => {
    const state = useContext(context);
    const [value, setValue] = useState<TValue>(selector(state));
    const frozenRef = useRef(false);
    useEffect(() => {
      if (!frozenRef.current) {
        setValue(selector(state));
      }
    }, [selector, state]);
    const freeze = useCallback(() => {
      frozenRef.current = true;
    }, []);
    return { value, freeze };
  };
};
