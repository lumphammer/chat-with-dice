import { expectTypeOf, test } from "vitest";
import * as z from "zod";

/**
 * This type test is to confirm that two approaches to making a zod union with
 * common elements between each part are equivalent, type-wise.
 *
 * See also union.bench.ts to compare TS complexity
 */

// approach 1 is a separate validator for the common parts, which is
// `.extend`ed in both cases of the discriminated union
const core = z.object({
  name: z.string(),
  nodeId: z.string(),
});

const validator1 = z.discriminatedUnion("kind", [
  core.extend({
    kind: z.literal("file"),
    r2Key: z.string(),
  }),
  core.extend({
    kind: z.literal("folder"),
    viewMode: z.enum(["list", "grid"]),
  }),
]);

type State1 = z.infer<typeof validator1>;

// approach 2 is an intersection of a common parts object and a discriminated
// union
const validator2 = z.intersection(
  z.object({
    name: z.string(),
    nodeId: z.string(),
  }),
  z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("file"),
      r2Key: z.string(),
    }),
    z.object({
      kind: z.literal("folder"),
      viewMode: z.enum(["list", "grid"]),
    }),
  ]),
);

type State2 = z.infer<typeof validator2>;

// the tests start here
test("State types are equivalent", () => {
  expectTypeOf<State1>().toExtend<State2>();
  expectTypeOf<State2>().toExtend<State1>();
});

test("State1 discriminates based on kind", () => {
  expectTypeOf<Extract<State1, { kind: "file" }>>().toHaveProperty("r2Key");
  expectTypeOf<Extract<State1, { kind: "file" }>>().not.toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State1, { kind: "folder" }>>().toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State1, { kind: "folder" }>>().not.toHaveProperty(
    "r2Key",
  );
});

test("State2 discriminates based on kind", () => {
  expectTypeOf<Extract<State2, { kind: "file" }>>().toHaveProperty("r2Key");
  expectTypeOf<Extract<State2, { kind: "file" }>>().not.toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State2, { kind: "folder" }>>().toHaveProperty(
    "viewMode",
  );
  expectTypeOf<Extract<State2, { kind: "folder" }>>().not.toHaveProperty(
    "r2Key",
  );
});
