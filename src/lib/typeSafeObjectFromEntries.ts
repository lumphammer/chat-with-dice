/**
 * Creates an object from an array of entries, with type safety.
 *
 * I.e. if the key pat of the pairs is typed more strongly that `string`,
 * the resulting object will have keys of that type rather than `string`.
 */
export const typeSafeObjectFromEntries = <
  const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
>(
  entries: T,
): { [K in T[number] as K[0]]: K[1] } => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(entries) as { [K in T[number] as K[0]]: K[1] };
};
