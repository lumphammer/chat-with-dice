// oxlint-disable-next-line no-unused-vars
declare type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
    ? { [K in keyof O]: O[K] }
    : never;

/**
 * Recursively expand all members of T
 */
// oxlint-disable-next-line no-unused-vars
declare type RecursiveExpand<T> = T extends (...args: infer A) => infer R
  ? (...args: RecursiveExpand<A>) => RecursiveExpand<R>
  : T extends object
    ? T extends infer O
      ? { [K in keyof O]: RecursiveExpand<O[K]> }
      : never
    : T;
