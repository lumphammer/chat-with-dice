/**
 * Stand-in for `astro:actions` during integration tests. Astro virtual modules
 * are not available in the workers vitest pool, so we alias the import to this
 * file. `defineAction` is reduced to identity so action handlers can be called
 * directly from tests as `action.handler(input, context)`.
 */

type ActionDefinition<TInput, TOutput> = {
  input?: unknown;
  accept?: string;
  handler: (input: TInput, context: unknown) => TOutput | Promise<TOutput>;
};

export function defineAction<TInput, TOutput>(
  def: ActionDefinition<TInput, TOutput>,
): ActionDefinition<TInput, TOutput> {
  return def;
}

export class ActionError extends Error {
  code: string;
  status?: number;
  constructor({ code, message }: { code: string; message?: string }) {
    super(message);
    this.code = code;
    this.name = "ActionError";
  }
}
