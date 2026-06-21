declare type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
    ? { [K in keyof O]: O[K] }
    : never;

/**
 * Recursively expand all members of T
 */
declare type RecursiveExpand<T> = T extends (...args: infer A) => infer R
  ? (...args: RecursiveExpand<A>) => RecursiveExpand<R>
  : T extends object
    ? T extends infer O
      ? { [K in keyof O]: RecursiveExpand<O[K]> }
      : never
    : T;

declare module "*.svg?react&variant=illustration" {
  import type { ComponentType, SVGProps } from "react";
  const c: ComponentType<SVGProps<SVGSVGElement>>;
  export default c;
}

declare module "*.svg?react" {
  import type { ComponentType, SVGProps } from "react";
  const c: ComponentType<SVGProps<SVGSVGElement>>;
  export default c;
}
