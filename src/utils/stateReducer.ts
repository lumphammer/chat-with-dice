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
 * The return type of `createStateReducer`. Holds the state validator,
 * action creators, and the reducer function.
 *
 * Use `InferState` to extract the state type from this.
 */
export type StateReducer<
  TValidator extends z.ZodType,
  TActions extends Record<string, (...args: any[]) => any>,
> = {
  stateValidator: TValidator;
  actions: TActions;
  reducer: (
    state: z.infer<TValidator>,
    action: AnyAction,
  ) => z.infer<TValidator>;
};

/**
 * Extracts the State type from a `StateReducer`.
 *
 * @example
 * const myReducer = createStateReducer(z.object({ count: z.number() }), ...);
 * type MyState = InferState<typeof myReducer>;
 */
export type InferReducerState<T> =
  T extends StateReducer<infer TValidator, any> ? z.infer<TValidator> : never;

/**
 * A minimal case for all actions - there will always be a `type` and a
 * `payload` property, but the payload may be `undefined`.
 */
export type AnyAction = {
  type: string;
  payload?: unknown;
};

/**
 * The object returned by the `create` function inside a `createSlice` builder
 * callback. Pairs a Zod payload validator with its reducer.
 */
type ActionDefinition<TState, TPayloadValidator extends z.ZodTypeAny> = {
  payloadValidator: TPayloadValidator;
  reducer: (draft: Draft<TState>, payload: z.infer<TPayloadValidator>) => void;
};

/**
 * The `create` function passed to the builder callback in `createSlice`.
 * Each call produces a typed `CaseDefinition`. Because `TPayloadValidator` is
 * inferred per-call from the validator argument, `payload` in the reducer is
 * always correctly typed.
 */
type ActionCreator<TState> = <TPayloadValidator extends z.ZodTypeAny>(
  payloadValidator: TPayloadValidator,
  reducer: (draft: Draft<TState>, payload: z.infer<TPayloadValidator>) => void,
) => ActionDefinition<TState, TPayloadValidator>;

/**
 * Internal: given a CaseDefinition and an action type string, produces:
 *
 * - `create`: an action creator
 * - `apply`: validates the payload with Zod and mutates an immer draft.
 *   Throws a descriptive error if the payload is invalid.
 */
function buildCase<TState, TPayloadValidator extends z.ZodTypeAny>(
  type: string,
  { payloadValidator, reducer }: ActionDefinition<TState, TPayloadValidator>,
) {
  const create = (payload?: z.infer<TPayloadValidator>) => ({ type, payload });
  const apply = (draft: Draft<TState>, action: AnyAction): void => {
    if (action.type !== type) return;
    const result = payloadValidator.safeParse(action.payload);
    if (!result.success) {
      throw new Error(
        `Invalid payload for action "${type}": ${result.error.message}`,
      );
    }
    reducer(draft, result.data);
  };
  return { create, apply };
}

/**
 * A minimal state machine with typed actions and reducers.
 *
 * The second argument is a builder callback that receives a typed `create`
 * function. Call `create(payloadValidator, reducer)` for each case — the key
 * you assign the result in the returned object becomes the action type string.
 *
 * @example
 * const myReducer = createStateReducer(
 *   z.object({ count: z.number() }),
 *   (create) => ({
 *     increment: create(z.object({ by: z.number() }), (draft, payload) => {
 *       draft.count += payload.by;
 *     }),
 *   }),
 * );
 *
 * Returns:
 * - `stateValidator` — the Zod validator, for validating state loaded from storage
 * - `creators`       — a typed dictionary of action creators, keyed by case name
 * - `reducer`        — the combined reducer for use with `useReducer`
 */
export const createStateReducer = <
  TValidator extends z.ZodTypeAny,
  TReducers extends Record<
    string,
    ActionDefinition<z.infer<TValidator>, z.ZodTypeAny>
  >,
>(
  stateValidator: TValidator,
  buildReducers: (create: ActionCreator<z.infer<TValidator>>) => TReducers,
): StateReducer<
  TValidator,
  {
    [key in keyof TReducers]: TReducers[key] extends ActionDefinition<
      z.infer<TValidator>,
      infer V
    >
      ? z.infer<V> extends undefined | void
        ? (payload?: z.infer<V>) => { type: string; payload: z.infer<V> }
        : (payload: z.infer<V>) => { type: string; payload: z.infer<V> }
      : never;
  }
> => {
  type TState = z.infer<TValidator>;

  const caseCreator: ActionCreator<TState> = (payloadValidator, reducer) => ({
    payloadValidator,
    reducer,
  });

  const reducerMap = buildReducers(caseCreator);

  const sliceCases = Object.entries(reducerMap).map(([key, definition]) => {
    const built = buildCase(key, definition);
    return [key, built] as const;
  });

  // O(1) lookup by action type instead of scanning all cases per dispatch
  const caseMap = new Map(sliceCases);

  // We need an explicit cast here because Object.fromEntries over a mapped
  // array loses per-key type information. The conditional extracts the
  // validator from each CaseDefinition in TReducers to derive the exact
  // creator signature per key.
  const actions = Object.fromEntries(
    sliceCases.map(([key, { create }]) => [key, create]),
  ) as {
    [key in keyof TReducers]: TReducers[key] extends ActionDefinition<
      TState,
      infer V
    >
      ? z.infer<V> extends undefined | void
        ? (payload?: z.infer<V>) => { type: string; payload: z.infer<V> }
        : (payload: z.infer<V>) => { type: string; payload: z.infer<V> }
      : never;
  };

  const reducer = (state: TState, action: AnyAction): TState => {
    const sliceCase = caseMap.get(action.type);
    if (!sliceCase) return state;
    return produce(state, (draft) => {
      sliceCase.apply(draft, action);
    });
  };

  return {
    /**
     * The Zod validator for this slice's state. Use this to validate state
     * loaded from persistent storage (e.g. a Durable Object) before trusting it.
     */
    stateValidator,
    /**
     * A dictionary of action creators, keyed by the name of the case.
     */
    actions,
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
