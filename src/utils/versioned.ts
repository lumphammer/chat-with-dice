import * as z from "zod/v4";

/**
 * Builder for a "versioned" validator: a union that tries the latest schema
 * first and falls back through older schemas, migrating each older shape up to
 * the latest.
 *
 * You don't construct this directly — start with {@link versioned} and chain
 * {@link VersionedBuilder.then} for each newer version, then call
 * {@link VersionedBuilder.build}.
 *
 * `Out` tracks the output type of the newest version added so far, so each
 * `.then(next, migrate)` can type-check `migrate` against both its input (the
 * current output) and its output (the next validator's output). A broken
 * migration is therefore a compile error on that exact line.
 */
class VersionedBuilder<Out> {
  constructor(
    /** Validators, oldest first. */
    private readonly validators: readonly z.ZodType[],
    /** `migrations[i]` lifts `validators[i]`'s output into `validators[i + 1]`'s. */
    private readonly migrations: readonly ((data: never) => unknown)[],
  ) {}

  /**
   * Add the next (newer) version. `migrate` receives the parsed output of the
   * current latest validator and must return the parsed output of `next`.
   */
  then<Next extends z.ZodType>(
    next: Next,
    migrate: (data: Out) => z.output<Next>,
  ): VersionedBuilder<z.output<Next>> {
    return new VersionedBuilder(
      [...this.validators, next],
      [...this.migrations, migrate as (data: never) => unknown],
    );
  }

  /**
   * Produce the final validator: a union that tries the newest schema first and
   * falls back through older schemas, migrating each up to the newest shape.
   */
  build(): z.ZodType<Out> {
    // For each validator, chain the migrations from its position onward so every
    // branch ends up producing the latest shape.
    const branches = this.validators.map((validator, i) => {
      let schema: z.ZodType = validator;
      for (let j = i; j < this.migrations.length; j++) {
        const migrate = this.migrations[j];
        schema = schema.transform((value) => migrate(value as never));
      }
      return schema;
    });

    // Try the latest first, then fall back through older versions.
    branches.reverse();

    const result =
      branches.length === 1
        ? branches[0]
        : z.union(branches as [z.ZodType, z.ZodType, ...z.ZodType[]]);

    return result as z.ZodType<Out>;
  }
}

/**
 * Start building a versioned validator from the oldest version. Chain
 * {@link VersionedBuilder.then} for each newer version and finish with
 * {@link VersionedBuilder.build}.
 *
 * @example
 * const filesStateValidator = versioned(filesStateValidatorV1)
 *   .then(filesStateValidatorV2, migrateStateV1ToV2)
 *   .then(filesStateValidatorV3, migrateStateV2ToV3)
 *   .then(filesStateValidatorV4, migrateStateV3ToV4)
 *   .build();
 */
export function versioned<V extends z.ZodType>(
  oldest: V,
): VersionedBuilder<z.output<V>> {
  return new VersionedBuilder([oldest], []);
}
