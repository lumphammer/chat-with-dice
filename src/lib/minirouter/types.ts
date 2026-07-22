import type { PropsWithChildren } from "react";

/**
 * A Direction is an identifier for a *way* the user can navigate — on its own
 * it specifies no content. Calling a Direction with its params produces a
 * {@link Step}. `match` is a type guard so a Step's params can be recovered
 * with full typing (see {@link useParams}).
 */
export type Direction<TParams = void> = {
  description: string;
  match: (step: AnyStep | undefined) => step is Step<TParams>;
} & ((params: TParams) => Step<TParams>);

/**
 * A general type that can accept any `Direction<...>`.
 */
export type AnyDirection = Direction<any>;

/**
 * A Step is a concrete piece of the current router state: a Direction plus the
 * params (if any) that go with it, and a stable id.
 */
export type Step<TParams = void> = {
  direction: AnyDirection;
  params: TParams;
  id: string;
};

/**
 * A general type that can accept any `Step<...>`.
 */
export type AnyStep = Step<any>;

/**
 * Options for the `from` prop of a {@link Link} (or the first argument to
 * `navigate`). `root` means "navigate from the root then apply `to`"; `here`
 * means "append `to` to the current path".
 */
type LogicalDirection = "root" | "here";

/**
 * A value accepted as the `from` prop of a {@link Link} or the first argument
 * to `navigate`.
 */
export type DirectionType = AnyDirection | LogicalDirection;

/**
 * Each layer of the router is wrapped in a context. This is that context's
 * value.
 */
export type NavigationContextValue = {
  /**
   * Move the current state of the router.
   *
   * @param from Where to start navigation from.
   * @param to The step or steps to go to, or "up" to pop one level.
   */
  navigate: (from: DirectionType, to: AnyStep | AnyStep[] | "up") => void;
  /**
   * The step at this layer of the router (the one a mounted `Route` matches
   * against).
   */
  currentStep: AnyStep | undefined;
  /**
   * Steps from the root down to (and including) the step above this layer.
   */
  parentSteps: AnyStep[];
  /**
   * Steps below the current step (you usually won't have to think about these).
   */
  childSteps: AnyStep[];
};

/**
 * Convenience type for the props of a Route implementation.
 */
export type PropsWithChildrenAndDirection<T = unknown> =
  PropsWithChildren<T> & {
    direction: AnyDirection;
  };

/**
 * An Outlet is context-driven machinery that lets a parent control the
 * rendering of child routes (e.g. to orchestrate transitions). This is its
 * context value.
 */
export type OutletContextValue = {
  register: (id: string, content: React.ReactNode) => void;
  unregister: (id: string) => void;
};
