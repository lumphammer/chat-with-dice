/**
 * Retrieves the values of the specified environment variables or throws an
 * error if any are missing.
 *
 * @param keys - An array of environment variable names to retrieve.
 * @returns A record mapping each key to its corresponding environment variable value.
 * @throws {Error} If any of the specified environment variables are not set.
 */
export function envOrDie<T extends string>(keys: T[]): Record<T, string> {
  const missingKeys = keys.filter((key) => !process.env[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `The following environment variables are not set: ${missingKeys.join(", ")}`,
    );
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(
    keys.map((key) => [key, process.env[key]!]),
  ) as Record<T, string>;
}
