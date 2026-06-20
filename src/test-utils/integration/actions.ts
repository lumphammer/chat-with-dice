import type { TestUser } from "./users";

export type ActionContext = ReturnType<typeof makeActionContext>;

/**
 * Build a fake Astro action context that mimics what middleware would populate
 * after a logged-in request. Pass `user: null` for the unauthenticated case.
 *
 * In production the `checkSession` middleware sets `locals.user` to the full
 * Better Auth `User` object; we do the same here by stripping the test-only
 * fields (`sessionToken`, `headers`) from `TestUser`.
 *
 * The session is currently a minimal stub — fine because no action reads more
 * than `session.userId`. Expand if/when an action reaches for a richer field.
 */
export function makeActionContext(testUser: TestUser | null) {
  if (!testUser) {
    return {
      locals: { user: null, session: null },
      request: new Request("http://localhost/"),
    };
  }
  const { sessionToken, headers: _headers, ...user } = testUser;
  return {
    locals: {
      user,
      session: { userId: user.id, token: sessionToken },
    },
    request: new Request("http://localhost/"),
  };
}

type ActionLike<TInput, TOutput> = {
  orThrow: (input: TInput) => Promise<TOutput>;
};

/**
 * Invoke an Astro action's handler directly in tests.
 *
 * Astro's `defineAction` returns a wrapper whose `.orThrow(input)` form calls
 * the underlying handler, runs input validation, and throws on error. It uses
 * `this` for the action context, so we bind ours via `.call`.
 *
 * Input and output types are inferred from the action itself, so callers get
 * full type checking on `input` and don't need to annotate the result type.
 */
export async function callAction<TInput, TOutput>(
  action: ActionLike<TInput, TOutput>,
  input: TInput,
  context: ActionContext,
): Promise<TOutput> {
  return action.orThrow.call(context, input);
}
