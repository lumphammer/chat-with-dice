/**
 * Given a value, if it's a string, attempt to parse it as a date and return
 * the epoch millisecends equivalent. If it's a number, just return the number.
 * Otherwise return 1.
 *
 * The point of this tomfoolery is to be used with `z.preprocess(...)` to fix
 * cases where a faulty db schema has been producing string timestamps instead
 * of numbers, and in any other situation where we're taking maybe-questionable
 * data that may be a surprise string and the type system can't help us.
 */
export const fixStringTimestampThatShouldBeEpochMs = (x: unknown): number => {
  if (typeof x === "number") {
    return x;
  }
  if (typeof x === "string") {
    try {
      return new Date(x).getTime();
    } catch {
      return 1;
    }
  }
  return 1;
};
